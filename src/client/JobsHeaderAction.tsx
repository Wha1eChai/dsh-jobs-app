import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import styles from './JobsHeaderAction.module.css'

interface JobsHeaderInjection {
  openJobs(): void
}

export type JobsHeaderActionProps =
  PropsRuntime<'conversation.session.header.actions'>
  & PropsLocale<'jobs'>
  & InjectFace<JobsHeaderInjection>

/** Session-header launcher that deep-links into the Jobs App. */
export function JobsHeaderAction({ openJobs, t }: JobsHeaderActionProps): JSX.Element {
  const label = t('headerAria')
  return (
    <button
      type="button"
      className={styles.trigger}
      aria-label={label}
      title={label}
      onClick={openJobs}
    >
      {t('header')}
    </button>
  )
}
