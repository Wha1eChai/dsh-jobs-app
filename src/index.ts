/** Owner data passed to Jobs App action contributions. */
export interface JobsAppOwner {
  readonly appPath: string
  readonly jobId?: string
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    /** Kind-specific actions contributed under the Jobs App. */
    'dshapps.jobs.actions': {
      kind: 'list'
      scope: 'root'
      owner: JobsAppOwner
    }
  }
}

/** Host-side lifecycle entry; the App is a client composition contribution. */
export function apply(): void {}
