import { lazy } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { AppDescriptor } from '@wha1echai/dsh-webpage/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'

import { JobsHeaderAction } from './JobsHeaderAction.js'
import { en, zh } from './locales.js'

/** App body is a lazy module so a throw or suspend stays inside Webpage's AppBoundary. */
export const JobsAppBody = lazy(async () => {
  const module = await import('./JobsApp.js')
  return { default: module.JobsApp }
})

const descriptor = Object.freeze({
  id: 'wha1echai.jobs',
  label: 'Jobs',
  description: 'Current-session background jobs as an addressable Webpage App.',
  order: 20,
  categories: ['system', 'jobs'],
  surface: 'panel',
}) satisfies AppDescriptor

const LOCALE_NAMESPACE = 'jobs'
const APP_ID = 'wha1echai.jobs'

/** Stable Loader identity used for Cordis fiber provenance. */
export const name = '@wha1echai/dsh-jobs-app'

/** Client services required by the Jobs App and its header launcher. */
export const inject = ['pages', 'slots', 'locale', 'sessions']

/** Register App metadata, the keyed Webpage body, and the header deep-link. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    const unregisterLocale = ctx.locale.register(LOCALE_NAMESPACE, { zh, en })
    const unregisterPage = ctx.pages.register(descriptor)
    const unregisterApp = ctx.slots.inject('webpage.app', () => ctx.slots.register({
      name: 'webpage.app',
      key: APP_ID,
      locale: LOCALE_NAMESPACE,
      children: {
        'wha1echai.jobs.actions': { kind: 'list', scope: 'root' },
      },
      inject: () => ({
        hooks: { sessions: ctx.sessions.list },
      }),
    }, JobsAppBody))
    const unregisterHeader = ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'wha1echai.jobs',
      order: 25,
      locale: LOCALE_NAMESPACE,
      inject: () => ({
        openJobs: () => ctx.pages.open(APP_ID, '/'),
      }),
    }, JobsHeaderAction))

    return () => {
      unregisterHeader()
      unregisterApp()
      unregisterPage()
      unregisterLocale()
    }
  }, 'dsh-jobs-app: composition')
}

export type { JobsAppProps } from './JobsApp.js'
export type { JobsHeaderActionProps } from './JobsHeaderAction.js'
