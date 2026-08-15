import { afterEach, describe, expect, it, vi } from 'vitest'
import { apply as applyHost } from '../src/index.js'
import { apply as applyInvariant, inject as invariantInject, name as invariantName } from '../src/invariant.js'
import { apply, inject, JobsAppBody, name } from '../src/client/index.js'
import { JobsHeaderAction } from '../src/client/JobsHeaderAction.js'
import { en, zh } from '../src/client/locales.js'

describe('Jobs App composition', () => {
  afterEach(() => vi.restoreAllMocks())

  it('registers metadata, locale, the App body, and a header deep-link in one effect', () => {
    const unregisterPage = vi.fn()
    const unregisterLocale = vi.fn()
    const unregisterApp = vi.fn()
    const unregisterHeader = vi.fn()
    const pageRegister = vi.fn(() => unregisterPage)
    const localeRegister = vi.fn(() => unregisterLocale)
    const slotRegister = vi.fn((options: { name: string }) => (
      options.name === 'webpage.app' ? unregisterApp : unregisterHeader
    ))
    const slotInject = vi.fn((_name: string, callback: () => (() => void)) => callback())
    const open = vi.fn()
    const list = { getSnapshot: () => undefined, subscribe: () => () => {} }
    const cleanups: Array<() => void> = []
    const effect = vi.fn((execute: () => () => void) => {
      cleanups.push(execute())
    })
    const ctx = {
      pages: { register: pageRegister, open },
      locale: { register: localeRegister },
      slots: { inject: slotInject, register: slotRegister },
      sessions: { list },
      effect,
    }

    apply(ctx as never)

    expect(name).toBe('@wha1echai/dsh-jobs-app')
    expect(inject).toEqual(['pages', 'slots', 'locale', 'sessions'])
    expect(effect).toHaveBeenCalledOnce()
    expect(pageRegister).toHaveBeenCalledWith(expect.objectContaining({
      id: 'wha1echai.jobs',
      label: 'Jobs',
      surface: 'panel',
    }))
    expect(localeRegister).toHaveBeenCalledWith('jobs', { zh, en })
    expect(slotInject).toHaveBeenCalledWith('webpage.app', expect.any(Function))
    expect(slotInject).toHaveBeenCalledWith('conversation.session.header.actions', expect.any(Function))
    expect(slotRegister).toHaveBeenCalledWith({
      name: 'webpage.app',
      key: 'wha1echai.jobs',
      locale: 'jobs',
      children: {
        'wha1echai.jobs.actions': { kind: 'list', scope: 'root' },
      },
      inject: expect.any(Function),
    }, JobsAppBody)
    expect(slotRegister).toHaveBeenCalledWith({
      name: 'conversation.session.header.actions',
      id: 'wha1echai.jobs',
      order: 25,
      locale: 'jobs',
      inject: expect.any(Function),
    }, JobsHeaderAction)

    const appFace = (slotRegister.mock.calls[0]![0] as { inject(): { hooks: { sessions: unknown } } }).inject()
    expect(appFace.hooks.sessions).toBe(list)
    const headerFace = (slotRegister.mock.calls[1]![0] as { inject(): { openJobs(): void } }).inject()
    headerFace.openJobs()
    expect(open).toHaveBeenCalledWith('wha1echai.jobs', '/')

    cleanups[0]!()
    expect(unregisterHeader).toHaveBeenCalledOnce()
    expect(unregisterApp).toHaveBeenCalledOnce()
    expect(unregisterPage).toHaveBeenCalledOnce()
    expect(unregisterLocale).toHaveBeenCalledOnce()
  })

  it('keeps English keys identical to the Chinese source of truth', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })
})

describe('Jobs App host and invariant entries', () => {
  it('contributes no host behavior and reserves package ownership', async () => {
    expect(applyHost).not.toThrow()
    expect(invariantName).toBe('dsh-jobs-app-invariant')
    expect(invariantInject).toEqual(['invariants'])
    const register = vi.fn(() => () => {})
    const disposer = await applyInvariant({ invariants: { register } } as never)
    expect(register).toHaveBeenCalledWith('@wha1echai/dsh-jobs-app', expect.any(Function))
    register.mock.calls[0]![1]()
    disposer()
  })
})
