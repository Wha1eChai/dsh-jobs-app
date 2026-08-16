// @vitest-environment jsdom

import { Suspense } from 'react'
import { cleanup, fireEvent, render, screen, act, waitFor } from '@testing-library/react'
import type { JobView, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { JobsAppBody } from '../src/client/index.js'
import { JobsApp, type JobsAppProps } from '../src/client/JobsApp.js'
import { en } from '../src/client/locales.js'

const SESSION = 'session-1'

function job(overrides: Partial<JobView> & Pick<JobView, 'id' | 'status'>): JobView {
  return {
    kind: 'bash',
    label: `label-${overrides.id}`,
    startedAt: 1_000,
    ...overrides,
  }
}

function state(jobs: readonly JobView[] | undefined, current: string | undefined = SESSION): SessionListState {
  return {
    ids: current === undefined ? [] : [current],
    byId: {},
    current: current as SessionListState['current'],
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: jobs === undefined || current === undefined ? {} : { [current]: jobs },
    currentAddress: undefined,
  }
}

function props(
  appPath: string,
  snapshot: SessionListState,
  renderSlot = vi.fn(() => null),
  navigate = vi.fn(),
  close = vi.fn(),
): JobsAppProps {
  return {
    appId: 'dshapps.jobs',
    appPath,
    search: '',
    hash: '',
    navigate,
    close,
    renderSlot: renderSlot as unknown as JobsAppProps['renderSlot'],
    t: (key, params) => {
      const template = en[key]
      if (params === undefined) return template
      return Object.entries(params).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        template,
      )
    },
    useSessions: select => select(snapshot),
  } as JobsAppProps
}

describe('JobsApp', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('renders an empty list and still exposes the child actions slot', () => {
    const renderSlot = vi.fn(() => <button type="button">Kind action</button>)
    render(<JobsApp {...props('/', state(undefined), renderSlot)} />)

    expect(screen.getByRole('article').getAttribute('data-route')).toBe('/')
    expect(screen.getByText('No jobs')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Close app' })).toBeNull()
    expect(renderSlot).toHaveBeenCalledWith('dshapps.jobs.actions', { appPath: '/' })
    expect(screen.getByRole('button', { name: 'Kind action' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Extension actions' })).toBeTruthy()
  })

  it('does not render the actions heading when the slot is empty', () => {
    render(<JobsApp {...props('/', state([]))} />)
    expect(screen.queryByRole('heading', { name: 'Extension actions' })).toBeNull()
  })

  it('does not render the actions heading when the slot returns an empty host', () => {
    render(<JobsApp {...props('/', state([]), vi.fn(() => <div />))} />)
    expect(screen.queryByRole('heading', { name: 'Extension actions' })).toBeNull()
  })

  it('lists live jobs before settled jobs and opens a detail route', () => {
    const navigate = vi.fn()
    const jobs = [
      job({ id: 'bash-done', status: 'completed', startedAt: 1_000, finishedAt: 2_000, detail: 'exit 0' }),
      job({ id: 'bash-live', status: 'running', startedAt: 1_500 }),
    ]
    render(<JobsApp {...props('/', state(jobs), vi.fn(() => null), navigate)} />)

    const rows = screen.getAllByRole('button').filter(button => button.getAttribute('data-job-id'))
    expect(rows[0]!.getAttribute('data-job-id')).toBe('bash-live')
    fireEvent.click(rows[0]!)
    expect(navigate).toHaveBeenCalledWith('/bash-live')
  })

  it('shows read-only detail fields and returns to the list', () => {
    const navigate = vi.fn()
    const close = vi.fn()
    const jobs = [job({
      id: 'bash-1',
      status: 'completed',
      kind: 'pwsh',
      label: 'Get-Process',
      startedAt: 1_000,
      finishedAt: 4_000,
    })]
    const renderSlot = vi.fn(() => null)
    render(<JobsApp {...props('/bash-1', state(jobs), renderSlot, navigate, close)} />)

    expect(screen.getByRole('article').getAttribute('data-route')).toBe('/bash-1')
    expect(screen.getByRole('heading', { name: 'Get-Process' })).toBeTruthy()
    expect(screen.getByText('pwsh')).toBeTruthy()
    expect(document.querySelector('[data-field="status"]')?.textContent).toContain('completed')
    expect(document.querySelector('[data-field="detail"]')?.textContent).toContain('completed')
    expect(renderSlot).toHaveBeenCalledWith('dshapps.jobs.actions', { appPath: '/bash-1', jobId: 'bash-1' })
    fireEvent.click(screen.getByRole('button', { name: 'Back to list' }))
    expect(screen.queryByRole('button', { name: 'Close app' })).toBeNull()
    expect(navigate).toHaveBeenCalledWith('/')
    expect(close).not.toHaveBeenCalled()
  })

  it('keeps an unknown job id on the URL as an unavailable state', () => {
    const navigate = vi.fn()
    const close = vi.fn()
    render(<JobsApp {...props('/missing-job', state([]), vi.fn(() => null), navigate, close)} />)

    expect(screen.getByRole('article').getAttribute('data-route')).toBe('unavailable')
    expect(screen.getByRole('heading', { name: 'Job unavailable' })).toBeTruthy()
    expect(screen.getByText('/missing-job')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back to list' }))
    expect(screen.queryByRole('button', { name: 'Close app' })).toBeNull()
    expect(navigate).toHaveBeenCalledWith('/')
    expect(close).not.toHaveBeenCalled()
  })

  it('keeps an unknown job id unavailable even when no session is selected', () => {
    const snapshot = {
      ...state([]),
      ids: [],
      current: undefined,
      jobsBySession: {},
    }
    render(<JobsApp {...props('/missing-job', snapshot)} />)

    expect(screen.getByRole('article').getAttribute('data-route')).toBe('unavailable')
    expect(screen.getByRole('heading', { name: 'Job unavailable' })).toBeTruthy()
    expect(screen.getByText('/missing-job')).toBeTruthy()
  })

  it('renders the no-session state when nothing is selected', () => {
    const close = vi.fn()
    const snapshot = {
      ...state([]),
      ids: [],
      current: undefined,
      jobsBySession: {},
    }
    render(<JobsApp {...props('/', snapshot, vi.fn(() => null), vi.fn(), close)} />)

    expect(screen.getByRole('article').getAttribute('data-route')).toBe('no-session')
    expect(screen.getByRole('heading', { name: 'No session' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Close app' })).toBeNull()
    expect(close).not.toHaveBeenCalled()
  })

  it('ticks live duration while a running job is visible', () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_000)
    const jobs = [job({ id: 'bash-live', status: 'running', startedAt: 1_000 })]
    const view = render(<JobsApp {...props('/', state(jobs))} />)
    expect(screen.getByTitle('Running for 9s')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(screen.getByTitle('Running for 10s')).toBeTruthy()
    view.unmount()
  })

  it('covers stopping, killed, and completed status copy on the list', () => {
    const jobs = [
      job({ id: 'stop', status: 'stopping', startedAt: 1_000 }),
      job({ id: 'kill', status: 'killed', startedAt: 500, finishedAt: 800 }),
      job({ id: 'done', status: 'completed', startedAt: 100, finishedAt: 400 }),
    ]
    render(<JobsApp {...props('/', state(jobs))} />)
    expect(screen.getByTitle('stopping')).toBeTruthy()
    expect(screen.getByTitle('cancelled')).toBeTruthy()
    expect(screen.getByTitle('completed')).toBeTruthy()
  })

  it('lazy-loads the Jobs body through the client entry', async () => {
    render(
      <Suspense fallback={<div>loading</div>}>
        <JobsAppBody {...props('/', state([]))} />
      </Suspense>,
    )
    await waitFor(() => expect(screen.getByText('No jobs')).toBeTruthy())
  })
})
