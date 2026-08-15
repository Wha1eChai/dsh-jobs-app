import type { JobView } from '@deepseek-ai/dsh-client-runtime/client'

/** Status marker colors used by the Jobs App list and detail. */
export type JobMarkState = 'done' | 'warning' | 'ongoing' | 'error'

/** Stable empty list so a session with no jobs keeps one array identity. */
export const NO_JOBS: readonly JobView[] = []

/** A job the registry still holds open, and whose duration therefore ticks. */
export function isLive(job: JobView): boolean {
  return job.status === 'running' || job.status === 'stopping'
}

/** Elapsed milliseconds for a live clock or a settled start/finish pair. */
export function elapsedMs(job: JobView, now: number): number {
  if (isLive(job)) return Math.max(0, now - job.startedAt)
  return Math.max(0, (job.finishedAt ?? job.startedAt) - job.startedAt)
}

/**
 * Live rows first in start order, then settled rows newest-first. Two jobs
 * that settled in the same millisecond fall back to start order.
 */
export function ordered(jobs: readonly JobView[]): JobView[] {
  return [...jobs].sort((left, right) => {
    const liveLeft = isLive(left)
    if (liveLeft !== isLive(right)) return liveLeft ? -1 : 1
    if (liveLeft) return left.startedAt - right.startedAt
    const finished = (right.finishedAt ?? right.startedAt) - (left.finishedAt ?? left.startedAt)
    return finished !== 0 ? finished : left.startedAt - right.startedAt
  })
}

/** App-local path `/` has no job id; every other `/<id>` keeps the remainder. */
export function jobIdFromPath(appPath: string): string | undefined {
  if (!appPath.startsWith('/') || appPath === '/') return undefined
  return appPath.slice(1)
}

/** Status marker semantics aligned with the official Jobs glance colors. */
export function dotState(status: JobView['status']): JobMarkState {
  switch (status) {
    case 'running': return 'ongoing'
    case 'stopping': return 'warning'
    case 'completed': return 'done'
    case 'killed': return 'warning'
    case 'failed': return 'error'
  }
}

/** Human status word for the row, detail fallback, and accessible name. */
export function statusKey(status: JobView['status']): `status.${JobView['status']}` {
  switch (status) {
    case 'running': return 'status.running'
    case 'stopping': return 'status.stopping'
    case 'completed': return 'status.completed'
    case 'killed': return 'status.killed'
    case 'failed': return 'status.failed'
  }
}

/** Elapsed time in at most two adjacent units, hours being the widest. */
export function formatDuration(
  elapsed: number,
  t: (key: 'duration.seconds' | 'duration.minutes' | 'duration.hours', params: Record<string, number>) => string,
): string {
  const total = Math.max(0, Math.floor(elapsed / 1_000))
  const seconds = total % 60
  const minutes = Math.floor(total / 60) % 60
  const hours = Math.floor(total / 3_600)
  if (hours > 0) return t('duration.hours', { hours, minutes })
  if (minutes > 0) return t('duration.minutes', { minutes, seconds })
  return t('duration.seconds', { seconds })
}
