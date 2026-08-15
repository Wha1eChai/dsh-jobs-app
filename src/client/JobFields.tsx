import type { JobView } from '@deepseek-ai/dsh-client-runtime/client'
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  dotState,
  elapsedMs,
  formatDuration,
  isLive,
  statusKey,
} from './job-view.js'
import type { JobsLocaleKey } from './locales.js'
import styles from './JobsApp.module.css'

type Translate = (key: JobsLocaleKey, params?: Record<string, string | number>) => string

export function JobDuration({ job, now, t }: { job: JobView; now: number; t: Translate }): JSX.Element {
  const live = isLive(job)
  const duration = formatDuration(elapsedMs(job, now), (key, params) => t(key, params))
  return (
    <span
      className={styles.duration}
      title={t(live ? 'duration.title.live' : 'duration.title.done', { duration })}
    >
      {duration}
    </span>
  )
}

export function JobStatus({ job, t }: { job: JobView; t: Translate }): JSX.Element {
  const status = t(statusKey(job.status))
  return (
    <span className={styles.status} title={job.detail ?? status}>
      {job.detail ?? status}
    </span>
  )
}

export function JobKindMark({ job }: { job: JobView }): JSX.Element {
  return (
    <>
      <StateDot state={dotState(job.status)} />
      <span className={styles.kind}>{job.kind}</span>
    </>
  )
}
