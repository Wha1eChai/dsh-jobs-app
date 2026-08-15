/** Package-owned invariant companion for the Jobs App bundle. */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@wha1echai/dsh-jobs-app'

/** Cordis companion plugin name. */
export const name = 'dsh-jobs-app-invariant'
/** Service required before package ownership can be reserved. */
export const inject = ['invariants']

const install: InvariantInstaller = () => {}

/** Register the package's invariant companion. */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
