# HANDOFF

## Goal

Ship `dshapps.jobs` as the first ecosystem Webpage App: list + read-only detail + header deep-link, installed independently of the Webpage kernel.

## Current Phase

v0.1 of this App is accepted against Webpage Phase 0.2. Webpage kernel navigation and Inspector panes are the substrate.

## Completed

- Client composition: metadata `dshapps.jobs`, keyed `webpage.app`, child slot `dshapps.jobs.actions`, header action order 25.
- Read-only list/detail over `jobsBySession`. Unknown job ids stay on the URL, including when no session is selected.
- Packed-install into a disposable web profile: webpage tarball first, then jobs-app; `dump-config` has one webpage row then one jobs-app row; bundle order `dsh-base` → `dsh-web-app` → webpage → jobs-app.
- Browser: header `Open Jobs app` opens `/apps/dshapps.jobs`; conversation `[data-conversation-scroll]` identity is retained; `/apps/dshapps.jobs/missing-job` stays on the URL with Job unavailable.

## Pending

Later slices only: job cancel, streamed output, Host remotes, kind-specific `dshapps.jobs.actions` occupants.

## Decisions / Constraints

- Target DSH `0.1.0-rc.6`; Node `^22.19.0 || >=24.0.0`; pnpm `11.7.0`.
- Peer `@dshapps/webpage` `0.2.0`. Do not import Webpage internals.
- Official jobs popover stays in `@deepseek-ai/dsh-client-ui-jobs`.
- No CPA/gateway, no Host remotes, no job cancel.

## Verification

- `node scripts/check.mjs --lint` and `node scripts/check.mjs --pack` (16-file tarball)
- `node node_modules/vitest/vitest.mjs run --coverage` — 17 tests, 100% coverage
- `node scripts/browser.mjs` — packed profile + Chromium header deep-link

Prefer `node scripts/…` over nested `pnpm run` on this machine: `packageManager: pnpm@11.7.0` can spawn pnpm `11.0.9` and fail the version gate.
