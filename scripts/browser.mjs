import { spawn, spawnSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPackedJobsProfile } from '../tests/packed-profile.mjs'

const BROWSE_PICKER_PATCH = fileURLToPath(new URL('../tests/pin-browse-picker.overlay.yml', import.meta.url))

const READY_PATTERN = /dsh web: (http:\/\/[^\s]+)/u
const READY_TIMEOUT_MS = 120_000
const STOP_TIMEOUT_MS = 15_000
const JOBS_PATH = '/apps/wha1echai.jobs'
const UNKNOWN_JOB_PATH = '/apps/wha1echai.jobs/missing-job'

function fail(message, cause) {
  const error = new Error(message)
  if (cause !== undefined) error.cause = cause
  throw error
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function appendOutput(output, chunk) {
  output.value += chunk.toString()
}

function waitForReady(child, output) {
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (callback, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.stdout?.off('data', onData)
      child.stderr?.off('data', onData)
      child.off('error', onError)
      child.off('exit', onExit)
      callback(value)
    }
    const onData = () => {
      const match = READY_PATTERN.exec(output.value)
      if (match?.[1] !== undefined) finish(resolve, { url: match[1], output: output.value })
    }
    const onError = error => finish(reject, new Error(`dsh Web process failed before ready:\n${output.value}`, { cause: error }))
    const onExit = (code, signal) => finish(reject, new Error(`dsh Web process exited before ready (code ${String(code)}, signal ${String(signal)}):\n${output.value}`))
    const timer = setTimeout(() => finish(reject, new Error(`dsh Web was not ready within ${READY_TIMEOUT_MS}ms:\n${output.value}`)), READY_TIMEOUT_MS)
    timer.unref?.()
    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)
    child.on('error', onError)
    child.on('exit', onExit)
  })
}

function waitForClose(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve()
  return new Promise(resolve => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      child.off('close', finish)
      resolve()
    }
    const timer = setTimeout(finish, timeoutMs)
    timer.unref?.()
    child.once('close', finish)
  })
}

async function stopProcess(child) {
  if (child === undefined || child.exitCode !== null || child.signalCode !== null) return
  child.kill('SIGTERM')
  await waitForClose(child, STOP_TIMEOUT_MS)
  if (child.exitCode === null && child.signalCode === null && child.pid !== undefined) {
    if (process.platform === 'win32') {
      spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      })
    } else {
      child.kill('SIGKILL')
    }
    await waitForClose(child, STOP_TIMEOUT_MS)
  }
}

async function pageDiagnostics(page) {
  let body = '(body unavailable)'
  try {
    body = (await page.locator('body').innerText({ timeout: 2_000 })).slice(0, 8_000)
  } catch {
    // Keep the original assertion as the primary failure.
  }
  return `URL: ${page.url()}\nBody text:\n${body}`
}

async function waitForVisible(page, locator, label, timeout = 30_000) {
  try {
    await locator.waitFor({ state: 'visible', timeout })
  } catch (error) {
    fail(`${label} was not visible within ${timeout}ms\n${await pageDiagnostics(page)}`, error)
  }
}

async function waitForUrl(page, expected, label) {
  const expectedUrl = new URL(expected, page.url()).href
  try {
    await page.waitForFunction(url => window.location.href === url, expectedUrl, { timeout: 30_000 })
  } catch (error) {
    fail(`${label} did not reach ${expectedUrl}\n${await pageDiagnostics(page)}`, error)
  }
}

async function rememberConversation(page) {
  await page.evaluate(() => {
    const element = document.querySelector('[data-conversation-scroll]')
    if (element === null) throw new Error('data-conversation-scroll is absent')
    Object.defineProperty(window, '__jobsConversationElement', {
      configurable: true,
      value: element,
    })
  })
}

async function assertConversationPreserved(page, label) {
  const result = await page.evaluate(() => {
    const current = document.querySelector('[data-conversation-scroll]')
    const remembered = window.__jobsConversationElement
    return {
      connected: remembered?.isConnected === true,
      present: current !== null,
      same: remembered !== undefined && remembered === current,
    }
  })
  assert(result.connected, `${label}: preserved conversation element is no longer connected`)
  assert(result.present, `${label}: [data-conversation-scroll] is no longer present`)
  assert(result.same, `${label}: [data-conversation-scroll] was replaced instead of preserved`)
}

async function dismissNotice(page) {
  const continueButton = page.getByRole('button', { name: 'Continue', exact: true })
  try {
    await continueButton.waitFor({ state: 'visible', timeout: 5_000 })
  } catch {
    return
  }
  await continueButton.click()
  await continueButton.waitFor({ state: 'hidden', timeout: 5_000 })
}

async function connectFreshWorkspace(page, root, name = 'workspace') {
  const workspacePath = join(root, name)
  await mkdir(workspacePath, { recursive: true })
  await page.getByRole('textbox', { name: 'Choose workspace' }).click()
  const dialog = page.getByRole('dialog', { name: 'Select Workspace Directory' })
  await waitForVisible(page, dialog, 'workspace directory dialog')
  await dialog.getByRole('button', { name: 'Edit path' }).click()
  const pathInput = dialog.getByRole('textbox', { name: 'Edit path' })
  await pathInput.fill(workspacePath)
  await pathInput.press('Enter')
  await dialog.getByRole('button', { name: 'Open', exact: true }).click()
  await waitForVisible(
    page,
    page.locator('textarea:enabled[placeholder="Describe what you want to build"]'),
    'live composer after workspace connect',
  )
}

async function revealSessionHeader(page) {
  const composer = page.locator('textarea:enabled[placeholder="Describe what you want to build"]')
  await waitForVisible(page, composer, 'hero composer')
  await composer.fill('jobs-app header probe')
  await page.getByRole('button', { name: 'Send message', exact: true }).click()
}

async function runScenarios() {
  let profile
  let child
  let browser
  try {
    profile = await createPackedJobsProfile()
    const env = {
      ...profile.dshInvocation.env,
      DEEPSEEK_API_KEY: 'jobs-app-browser-no-model-calls',
      DSH_AGENTS_HOME: `${profile.tempRoot}/agents`,
    }
    const output = { value: '' }
    child = spawn(profile.dshInvocation.executable, [
      profile.dshInvocation.script,
      'web',
      '--patch',
      BROWSE_PICKER_PATCH,
      '--port',
      '0',
    ], {
      cwd: profile.dshInvocation.cwd,
      env,
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout?.on('data', chunk => appendOutput(output, chunk))
    child.stderr?.on('data', chunk => appendOutput(output, chunk))
    const ready = await waitForReady(child, output)
    const startup = await fetch(ready.url)
    assert(startup.status === 200, `DSH Web startup expected HTTP 200, got ${startup.status}`)

    const playwright = await import('playwright')
    browser = await playwright.chromium.launch()
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width: 1680, height: 1000 },
    })
    const page = await context.newPage()
    await page.goto(ready.url)
    await waitForVisible(page, page.getByRole('button', { name: 'Apps', exact: true }), 'Apps launcher')
    await dismissNotice(page)
    await waitForVisible(page, page.locator('[data-conversation-scroll]'), 'conversation tree')
    await rememberConversation(page)
    await connectFreshWorkspace(page, profile.tempRoot)
    await revealSessionHeader(page)

    const header = page.getByRole('button', { name: 'Open Jobs app', exact: true })
    await waitForVisible(page, header, 'Jobs header action')
    await header.click()
    await waitForUrl(page, JOBS_PATH, 'Jobs App root')
    const dialog = page.getByRole('dialog', { name: 'Jobs', exact: true })
    await waitForVisible(page, dialog, 'Jobs App dialog')
    assert(await dialog.getAttribute('data-surface') === 'panel', 'Jobs App must declare the panel surface')
    await waitForVisible(page, page.getByRole('heading', { name: 'Jobs in this session', exact: true }), 'Jobs list heading')
    const conversationBox = await page.locator('[data-conversation-scroll]').boundingBox()
    assert(conversationBox !== null && conversationBox.width > 240, 'panel surface must leave the conversation visible')
    await assertConversationPreserved(page, 'after header deep-link')

    const unknownUrl = new URL(UNKNOWN_JOB_PATH, ready.url).href
    await page.evaluate(url => {
      history.pushState(null, '', url)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, unknownUrl)
    await waitForUrl(page, UNKNOWN_JOB_PATH, 'unknown job id')
    await waitForVisible(page, page.getByRole('heading', { name: 'Job unavailable', exact: true }), 'unknown job unavailable state')
    assert(page.url() === unknownUrl || page.url().endsWith(UNKNOWN_JOB_PATH), 'unknown job id must stay on the URL')
    await assertConversationPreserved(page, 'after unknown job deep-link')

    console.log('Jobs App browser: header deep-link, unknown job URL preserved, conversation identity retained.')
  } finally {
    const failures = []
    if (browser !== undefined) await browser.close().catch(error => failures.push(error))
    await stopProcess(child).catch(error => failures.push(error))
    await profile?.dispose().catch(error => failures.push(error))
    if (failures.length > 0) throw new AggregateError(failures, 'Jobs App browser cleanup failed')
  }
}

try {
  await runScenarios()
} catch (error) {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
}
