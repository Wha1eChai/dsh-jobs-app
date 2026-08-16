# AGENTS

Independent DSH Jobs App. Peer on `@dshapps/webpage`. Do not import Webpage source paths; use the public `/client` export for types only.

## Invariants

- App ID is `dshapps.jobs`.
- `ctx.pages.register()` is metadata-only. Navigation is `ctx.pages.open` / `close`.
- Data comes from `jobsBySession`. No RPC, cancel, streamed output, or Host remotes.
- Do not fork `@deepseek-ai/dsh-client-ui-jobs`. The header action is a deep-link, not a popover list.
- Pin DSH packages to `0.1.0-rc.6`. Package manager is `pnpm@11.7.0`.
- Client bundle purity: type-only conversation and Webpage imports; value imports stay on Loader externals.

## Layout

- `src/index.ts` — host `apply()` and the `dshapps.jobs.actions` slot declaration
- `src/client/` — App UI, header launcher, locales
- `cordis.patch.yml` — webpage then jobs-app
- `tests/` — unit composition and UI
- `scripts/` — lint, packed payload, packed-install, browser
