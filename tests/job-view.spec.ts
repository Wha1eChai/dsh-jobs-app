import type { JobView } from '@deepseek-ai/dsh-client-runtime/client'
import { describe, expect, it } from 'vitest'
import {
  dotState,
  elapsedMs,
  formatDuration,
  isLive,
  jobIdFromPath,
  NO_JOBS,
  ordered,
  statusKey,
} from '../src/client/job-view.js'

const translations = {
  'duration.seconds': '{seconds}s',
  'duration.minutes': '{minutes}m {seconds}s',
  'duration.hours': '{hours}h {minutes}m',
} as const

function t(key: keyof typeof translations, params: Record<string, number>): string {
  return translations[key]
    .replace('{hours}', String(params.hours ?? ''))
    .replace('{minutes}', String(params.minutes ?? ''))
    .replace('{seconds}', String(params.seconds ?? ''))
}

function job(overrides: Partial<JobView> & Pick<JobView, 'id' | 'status'>): JobView {
  return {
    kind: 'bash',
    label: overrides.id,
    startedAt: 1_000,
    ...overrides,
  }
}

describe('job view helpers', () => {
  it('treats running and stopping as live and clamps negative elapsed time', () => {
    expect(isLive(job({ id: 'bash-1', status: 'running' }))).toBe(true)
    expect(isLive(job({ id: 'bash-2', status: 'stopping' }))).toBe(true)
    expect(isLive(job({ id: 'bash-3', status: 'completed', finishedAt: 2_000 }))).toBe(false)
    expect(elapsedMs(job({ id: 'bash-1', status: 'running', startedAt: 5_000 }), 1_000)).toBe(0)
    expect(elapsedMs(job({ id: 'bash-1', status: 'running', startedAt: 1_000 }), 4_000)).toBe(3_000)
    expect(elapsedMs(job({ id: 'bash-2', status: 'completed', startedAt: 5_000 }), 1_000)).toBe(0)
    expect(elapsedMs(job({ id: 'bash-3', status: 'completed', startedAt: 1_000, finishedAt: 2_500 }), 9_000)).toBe(1_500)
    expect(elapsedMs(job({ id: 'bash-4', status: 'failed', startedAt: 1_000 }), 9_000)).toBe(0)
    expect(NO_JOBS).toEqual([])
  })

  it('orders live jobs by start time and settled jobs newest-first with start-time ties', () => {
    const runningEarly = job({ id: 'live-early', status: 'running', startedAt: 1 })
    const runningLate = job({ id: 'live-late', status: 'running', startedAt: 2 })
    const doneNew = job({ id: 'done-new', status: 'completed', startedAt: 3, finishedAt: 30 })
    const doneOld = job({ id: 'done-old', status: 'failed', startedAt: 4, finishedAt: 20 })
    const tiedLeft = job({ id: 'tied-a', status: 'completed', startedAt: 5, finishedAt: 40 })
    const tiedRight = job({ id: 'tied-b', status: 'killed', startedAt: 6, finishedAt: 40 })

    expect(ordered([doneOld, runningLate, tiedRight, doneNew, runningEarly, tiedLeft]).map(entry => entry.id)).toEqual([
      'live-early',
      'live-late',
      'tied-a',
      'tied-b',
      'done-new',
      'done-old',
    ])
    const missingFinishLeft = job({ id: 'no-finish-a', status: 'completed', startedAt: 8 })
    const missingFinishRight = job({ id: 'no-finish-b', status: 'completed', startedAt: 9 })
    expect(ordered([missingFinishRight, missingFinishLeft]).map(entry => entry.id)).toEqual([
      'no-finish-b',
      'no-finish-a',
    ])
  })

  it('parses App-local job ids without rewriting unknown paths', () => {
    expect(jobIdFromPath('/')).toBeUndefined()
    expect(jobIdFromPath('missing')).toBeUndefined()
    expect(jobIdFromPath('/bash-1')).toBe('bash-1')
    expect(jobIdFromPath('/missing/job')).toBe('missing/job')
  })

  it('maps every wire status to a marker and locale key', () => {
    expect(dotState('running')).toBe('ongoing')
    expect(dotState('stopping')).toBe('warning')
    expect(dotState('completed')).toBe('done')
    expect(dotState('killed')).toBe('warning')
    expect(dotState('failed')).toBe('error')
    expect(statusKey('running')).toBe('status.running')
    expect(statusKey('stopping')).toBe('status.stopping')
    expect(statusKey('completed')).toBe('status.completed')
    expect(statusKey('killed')).toBe('status.killed')
    expect(statusKey('failed')).toBe('status.failed')
  })

  it('formats duration in seconds, minutes, and hours', () => {
    expect(formatDuration(0, t)).toBe('0s')
    expect(formatDuration(45_000, t)).toBe('45s')
    expect(formatDuration(65_000, t)).toBe('1m 5s')
    expect(formatDuration(3_721_000, t)).toBe('1h 2m')
  })
})
