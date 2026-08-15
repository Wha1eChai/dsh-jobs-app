import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { JobView, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { HostObservable, InjectFace, PropsLocale, PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import type { WebpageAppSlotProps } from '@wha1echai/dsh-webpage/client'
import { AppEmpty, AppField, AppFields, AppList, AppPage, AppRow } from '@wha1echai/dsh-webpage/ui'
import type { JobsAppOwner } from '../index.js'
import { JobDuration, JobKindMark, JobStatus } from './JobFields.js'
import { isLive, jobIdFromPath, NO_JOBS, ordered, statusKey } from './job-view.js'
import styles from './JobsApp.module.css'

interface JobsAppInject {
  hooks: {
    sessions: HostObservable<SessionListState>
  }
}

export type JobsAppProps =
  WebpageAppSlotProps
  & PropsRenderSlots<'wha1echai.jobs.actions'>
  & PropsLocale<'jobs'>
  & InjectFace<JobsAppInject>

type Translate = JobsAppProps['t']

interface PageProps {
  actions: ReactNode
  appPath: string
  navigate: JobsAppProps['navigate']
  t: Translate
}

function ListPage({
  actions,
  jobs,
  navigate,
  now,
  t,
}: PageProps & { jobs: readonly JobView[]; now: number }): ReactNode {
  const rows = useMemo(() => ordered(jobs), [jobs])
  return (
    <article data-route="/">
      <AppPage title={t('listTitle')} actions={actions} actionsLabel={t('actions')}>
        {rows.length === 0
          ? <AppEmpty>{t('listEmpty')}</AppEmpty>
          : (
            <AppList dense label={t('listTitle')}>
              {rows.map(job => {
                const live = isLive(job)
                return (
                  <AppRow
                    key={job.id}
                    dense
                    className={live ? undefined : styles.rowSettled}
                    data-job-id={job.id}
                    title={job.label}
                    description={<JobStatus job={job} t={t} />}
                    leading={<JobKindMark job={job} />}
                    trailing={<JobDuration job={job} now={now} t={t} />}
                    onClick={() => navigate(`/${job.id}`)}
                  />
                )
              })}
            </AppList>
          )}
      </AppPage>
    </article>
  )
}

function DetailPage({
  actions,
  job,
  navigate,
  now,
  t,
}: PageProps & { job: JobView; now: number }): ReactNode {
  return (
    <article data-route={`/${job.id}`}>
      <AppPage title={job.label} actions={actions} actionsLabel={t('actions')}>
        <AppFields>
          <AppField field="kind" label={t('kind')} value={job.kind} />
          <AppField field="label" label={t('label')} value={job.label} />
          <AppField field="status" label={t('status')} value={t(statusKey(job.status))} />
          <AppField field="detail" label={t('detail')} value={job.detail ?? t(statusKey(job.status))} />
          <AppField field="duration" label={t('duration')} value={<JobDuration job={job} now={now} t={t} />} />
        </AppFields>
        <div className={styles.controls}>
          <Button variant="primary" onClick={() => navigate('/')}>{t('backToList')}</Button>
        </div>
      </AppPage>
    </article>
  )
}

function UnavailablePage({ actions, appPath, navigate, t }: PageProps): ReactNode {
  return (
    <article data-route="unavailable">
      <AppPage title={t('unavailableTitle')} description={t('unavailableDescription')} actions={actions} actionsLabel={t('actions')}>
        <code className={styles.path}>{appPath}</code>
        <div className={styles.controls}>
          <Button variant="primary" onClick={() => navigate('/')}>{t('backToList')}</Button>
        </div>
      </AppPage>
    </article>
  )
}

function NoSessionPage({ actions, t }: Pick<PageProps, 'actions' | 't'>): ReactNode {
  return (
    <article data-route="no-session">
      <AppPage title={t('noSession')} actions={actions} actionsLabel={t('actions')} />
    </article>
  )
}

/** Render the current-session job list or a read-only job detail. */
export function JobsApp({ appPath, navigate, renderSlot, t, useSessions }: JobsAppProps): ReactNode {
  const sessionId = useSessions(state => state.current)
  const jobs = useSessions(state => (sessionId === undefined ? NO_JOBS : state.jobsBySession[sessionId] ?? NO_JOBS))
  const jobId = jobIdFromPath(appPath)
  const job = jobId === undefined ? undefined : jobs.find(entry => entry.id === jobId)
  const owner: JobsAppOwner = Object.freeze(jobId === undefined ? { appPath } : { appPath, jobId })
  const actions = renderSlot('wha1echai.jobs.actions', owner)
  const liveCount = jobs.filter(isLive).length
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (liveCount === 0) return
    setNow(Date.now())
    const timer = setInterval(() => { setNow(Date.now()) }, 1_000)
    return () => { clearInterval(timer) }
  }, [liveCount])

  const pageProps = { actions, appPath, navigate, t }

  if (jobId !== undefined) {
    if (job === undefined) return <UnavailablePage {...pageProps} />
    return <DetailPage {...pageProps} job={job} now={now} />
  }
  if (sessionId === undefined) return <NoSessionPage actions={actions} t={t} />
  return <ListPage {...pageProps} jobs={jobs} now={now} />
}
