import { spawnSync } from 'node:child_process'
import { constants, existsSync, statSync } from 'node:fs'
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const jobsRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const webpageRoot = resolve(jobsRoot, '..', 'dsh-webpage')
const webpagePackage = join(webpageRoot, 'packages', 'webpage')
const expectedDshVersion = '0.1.0-rc.6'
const profileName = 'web'

export const packageNames = Object.freeze({
  webpage: '@wha1echai/dsh-webpage',
  jobs: '@wha1echai/dsh-jobs-app',
})

const packageDirectories = Object.freeze({
  webpage: webpagePackage,
  jobs: jobsRoot,
})

function fail(message) {
  throw new Error(`Jobs App packed profile failed: ${message}`)
}

function assert(condition, message) {
  if (!condition) fail(message)
}

function normalized(path) {
  return process.platform === 'win32' ? path.toLowerCase() : path
}

function isWithin(parent, candidate) {
  const parentPath = resolve(parent)
  const candidatePath = resolve(candidate)
  const child = normalized(relative(parentPath, candidatePath))
  return child === '' || (!child.startsWith(`..${sep}`) && child !== '..' && !isAbsolute(child))
}

function commandOutput(result) {
  return [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
}

function runSync(command, args, options, label) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  })
  if (result.error) fail(`${label} failed to start: ${result.error.message}`)
  if (result.status !== 0) {
    const output = commandOutput(result)
    fail(`${label} exited with ${result.status}${output ? `:\n${output}` : ''}`)
  }
  return result.stdout
}

async function createTempRoot() {
  const tempBase = resolve(await realpath(tmpdir()))
  assert(statSync(tempBase).isDirectory(), `system temp root is not a directory: ${tempBase}`)
  const created = await mkdtemp(join(tempBase, 'dsh-jobs-app-pack-'))
  const canonical = resolve(await realpath(created))
  assert(canonical !== tempBase && isWithin(tempBase, canonical), 'validated temp root escaped the system temp directory')
  return canonical
}

function currentPnpmCommand() {
  const cli = process.env.npm_execpath
  if (typeof cli === 'string' && cli.length > 0 && existsSync(cli)) {
    const version = runSync(process.execPath, [cli, '--version'], {}, 'pnpm --version').trim()
    if (version === '11.7.0') return Object.freeze({ cli: resolve(cli), prefix: Object.freeze([]) })
  }

  if (process.platform === 'win32') {
    const commands = runSync('where.exe', ['corepack.cmd'], {}, 'where.exe corepack.cmd')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    for (const command of commands) {
      const corepackCli = join(dirname(command), 'node_modules', 'corepack', 'dist', 'corepack.js')
      if (!existsSync(corepackCli)) continue
      const prefix = Object.freeze(['pnpm@11.7.0'])
      const version = runSync(process.execPath, [corepackCli, ...prefix, '--version'], {}, 'corepack pnpm@11.7.0 --version').trim()
      assert(version === '11.7.0', `corepack resolved pnpm ${version}`)
      return Object.freeze({ cli: corepackCli, prefix })
    }
  }

  fail('could not locate pnpm 11.7.0 through npm_execpath or Corepack')
}

async function createPnpmShim(tempRoot, pnpm) {
  const binDirectory = join(tempRoot, 'bin')
  await mkdir(binDirectory, { recursive: true })
  if (process.platform === 'win32') {
    const shim = join(binDirectory, 'pnpm.cmd')
    const prefix = pnpm.prefix.map((value) => ` "${value}"`).join('')
    await writeFile(shim, `@echo off\r\n"${process.execPath}" "${pnpm.cli}"${prefix} %*\r\n`, 'utf8')
    return binDirectory
  }

  const shim = join(binDirectory, 'pnpm')
  const prefix = pnpm.prefix.map((value) => ` "${value}"`).join('')
  await writeFile(shim, `#!/bin/sh\nexec "${process.execPath}" "${pnpm.cli}"${prefix} "$@"\n`, { encoding: 'utf8', mode: 0o755 })
  return binDirectory
}

function locateDshInstallation() {
  if (process.platform !== 'win32') {
    const executable = runSync('which', ['dsh'], {}, 'which dsh').trim()
    const packageRoot = resolve(dirname(awaitRealpathSync(executable)), '..')
    return validateDshInstallation(packageRoot)
  }

  const matches = runSync('where.exe', ['dsh.cmd'], {}, 'where.exe dsh.cmd')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  assert(matches.length > 0, 'where.exe found no dsh.cmd')
  for (const command of matches) {
    const packageRoot = join(dirname(command), 'node_modules', '@deepseek-ai', 'dsh')
    if (existsSync(join(packageRoot, 'package.json'))) return validateDshInstallation(packageRoot)
  }
  fail(`could not resolve @deepseek-ai/dsh beside: ${matches.join(', ')}`)
}

function awaitRealpathSync(path) {
  const result = spawnSync(process.execPath, ['-e', 'process.stdout.write(require("node:fs").realpathSync(process.argv[1]))', path], {
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (result.status !== 0) fail(`could not resolve dsh executable ${path}: ${commandOutput(result)}`)
  return result.stdout
}

function validateDshInstallation(packageRoot) {
  const manifestPath = join(packageRoot, 'package.json')
  const manifest = JSON.parse(runSync(process.execPath, ['-e', 'process.stdout.write(require("node:fs").readFileSync(process.argv[1], "utf8"))', manifestPath], {}, 'read installed DSH manifest'))
  assert(manifest.name === '@deepseek-ai/dsh', `resolved CLI package is ${manifest.name}`)
  assert(manifest.version === expectedDshVersion, `expected DSH ${expectedDshVersion}, found ${manifest.version}`)
  const binPath = join(packageRoot, manifest.bin?.dsh ?? 'lib/bin.js')
  assert(existsSync(binPath), `installed DSH bin does not exist: ${binPath}`)
  const reportedVersion = runSync(process.execPath, [binPath, '--version'], {}, 'dsh --version').trim()
  assert(reportedVersion === expectedDshVersion, `DSH bin reports ${reportedVersion}`)
  return Object.freeze({ packageRoot: resolve(packageRoot), binPath: resolve(binPath), version: manifest.version })
}

function buildArtifacts(pnpm) {
  runSync(
    process.execPath,
    [pnpm.cli, ...pnpm.prefix, 'run', 'build'],
    { cwd: webpageRoot, env: process.env, shell: false },
    'pnpm run build (webpage kernel)',
  )
  runSync(
    process.execPath,
    [join(jobsRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '-b', 'tsconfig.json'],
    { cwd: jobsRoot, env: process.env, shell: false },
    'tsc -b (jobs app)',
  )
  runSync(
    process.execPath,
    [join(jobsRoot, 'node_modules', 'tsdown', 'dist', 'run.mjs')],
    { cwd: jobsRoot, env: process.env, shell: false },
    'tsdown (jobs app)',
  )
}

async function packAll(tempRoot, pnpm) {
  const packsRoot = join(tempRoot, 'packs')
  await mkdir(packsRoot, { recursive: true })
  const archives = {}
  for (const key of Object.keys(packageDirectories)) {
    const destination = join(packsRoot, key)
    await mkdir(destination, { recursive: true })
    runSync(
      process.execPath,
      [pnpm.cli, ...pnpm.prefix, 'pack', '--pack-destination', destination],
      { cwd: packageDirectories[key], env: process.env },
      `pnpm pack ${key}`,
    )
    const tarballs = (await readdir(destination, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.tgz'))
    assert(tarballs.length === 1, `${key} pack produced ${tarballs.length} tarballs`)
    archives[key] = join(destination, tarballs[0].name)
    assert(isWithin(tempRoot, archives[key]), `${key} tarball escaped the temp root`)
  }
  return Object.freeze(archives)
}

async function configureLocalOverrides(profileDirectory, archives) {
  const manifestPath = join(profileDirectory, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const overrides = Object.fromEntries(Object.entries(packageNames).map(([key, name]) => [name, `file:${archives[key].replaceAll('\\', '/')}`]))
  manifest.packageManager = 'pnpm@11.7.0'
  manifest.pnpm = { ...manifest.pnpm, overrides }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  const yamlOverrides = Object.entries(overrides)
    .map(([name, value]) => `  ${JSON.stringify(name)}: ${JSON.stringify(value)}`)
    .join('\n')
  await writeFile(join(profileDirectory, 'pnpm-workspace.yaml'), `packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\noverrides:\n${yamlOverrides}\n`, 'utf8')
}

async function resolvedPackageRoot(profileDirectory, tempRoot, packageName) {
  const manifestPath = join(profileDirectory, 'node_modules', ...packageName.split('/'), 'package.json')
  await access(manifestPath, constants.F_OK)
  const canonicalManifest = await realpath(manifestPath)
  const root = dirname(canonicalManifest)
  assert(isWithin(tempRoot, root), `${packageName} resolved outside the disposable temp root: ${root}`)
  assert(!isWithin(jobsRoot, root), `${packageName} resolved back into the jobs-app checkout`)
  assert(!isWithin(webpageRoot, root), `${packageName} resolved back into the webpage checkout`)
  return root
}

function assertDumpConfig(dump) {
  const expectedRows = [
    "name: '@wha1echai/dsh-webpage'",
    "name: '@wha1echai/dsh-jobs-app'",
  ]
  let previous = -1
  for (const row of expectedRows) {
    const matches = dump.split(row).length - 1
    assert(matches === 1, `dump-config expected exactly one ${row}, found ${matches}`)
    const index = dump.indexOf(row)
    assert(index > previous, `dump-config row order is wrong at ${row}`)
    previous = index
  }
}

export async function createPackedJobsProfile() {
  const tempRoot = await createTempRoot()
  let disposed = false
  try {
    const pnpm = currentPnpmCommand()
    const dsh = locateDshInstallation()
    const shimDirectory = await createPnpmShim(tempRoot, pnpm)
    const dshHome = join(tempRoot, 'home')
    const profileDirectory = join(dshHome, 'profiles', profileName)
    const storeDirectory = join(tempRoot, 'pnpm-store')
    await mkdir(dshHome, { recursive: true })
    await mkdir(storeDirectory, { recursive: true })
    const pathValue = `${shimDirectory}${sep === '\\' ? ';' : ':'}${process.env.PATH ?? ''}`
    const env = Object.freeze({
      ...process.env,
      DSH_HOME: dshHome,
      DSH_TELEMETRY_DISABLED: '1',
      PATH: pathValue,
    })
    const runDsh = (args, options = {}) => runSync(
      process.execPath,
      [dsh.binPath, ...args],
      { cwd: jobsRoot, env, ...options },
      `dsh ${args.join(' ')}`,
    )
    buildArtifacts(pnpm)
    const archives = await packAll(tempRoot, pnpm)
    const pnpmOptions = ['--ignore-scripts', '--config.auto-install-peers=false', '--lockfile=false', '--offline', '--store-dir', storeDirectory]
    runDsh(['plugin', '--profile', profileName, 'install', ...pnpmOptions])
    assert(existsSync(join(profileDirectory, 'package.json')), 'real DSH did not initialize the web profile')
    await configureLocalOverrides(profileDirectory, archives)
    runDsh(['plugin', '--profile', profileName, 'add', archives.webpage, ...pnpmOptions])
    runDsh(['plugin', '--profile', profileName, 'add', archives.jobs, ...pnpmOptions])

    const manifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
    const whaDependencies = Object.keys(manifest.dependencies ?? {}).filter((name) => name.startsWith('@wha1echai/')).sort()
    assert(JSON.stringify(whaDependencies) === JSON.stringify([packageNames.jobs, packageNames.webpage].sort()), `top-level plugin dependencies must contain webpage and jobs-app, found ${JSON.stringify(whaDependencies)}`)
    const expectedBundles = ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', packageNames.webpage, packageNames.jobs]
    assert(JSON.stringify(manifest.dsh?.profile?.bundles) === JSON.stringify(expectedBundles), `profile bundles changed: ${JSON.stringify(manifest.dsh?.profile?.bundles)}`)

    const packageRoots = {}
    for (const [key, name] of Object.entries(packageNames)) {
      packageRoots[key] = await resolvedPackageRoot(profileDirectory, tempRoot, name)
    }
    const profileRequire = createRequire(join(profileDirectory, 'package.json'))
    for (const name of Object.values(packageNames)) {
      const clientManifest = profileRequire.resolve(`${name}/package.json`)
      assert(isWithin(tempRoot, clientManifest), `${name} client manifest resolved outside the disposable temp root`)
    }
    const dumpConfig = runDsh(['--profile', profileName, '--dump-config'])
    assertDumpConfig(dumpConfig)

    const dispose = async () => {
      if (disposed) return
      disposed = true
      const tempBase = resolve(await realpath(tmpdir()))
      assert(tempRoot !== tempBase && isWithin(tempBase, tempRoot), `refusing to remove unsafe packed-install root: ${tempRoot}`)
      await rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    }

    return Object.freeze({
      archives,
      dispose,
      dsh: Object.freeze({
        ...dsh,
        bin: dsh.binPath,
        manifest: Object.freeze({ version: dsh.version }),
      }),
      dshInvocation: Object.freeze({
        cwd: jobsRoot,
        env,
        executable: process.execPath,
        profile: profileName,
        script: dsh.binPath,
      }),
      home: dshHome,
      profileDir: profileDirectory,
      profileName,
      packageRoots: Object.freeze(packageRoots),
      tempRoot,
    })
  } catch (error) {
    if (!disposed) {
      const tempBase = resolve(await realpath(tmpdir()))
      if (tempRoot !== tempBase && isWithin(tempBase, tempRoot)) {
        await rm(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
      }
    }
    throw error
  }
}
