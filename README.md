# dsh-jobs-app

An independent DeepSeek Harness App for the current session's background jobs.

This package is a Webpage consumer, not a Webpage feature. It peers on `@wha1echai/dsh-webpage`, registers App ID `wha1echai.jobs`, and deep-links from a session-header action. The official `@deepseek-ai/dsh-client-ui-jobs` popover remains the glance list; this App does not fork or replace it.

## What it does

- `/apps/wha1echai.jobs` — read-only list of `jobsBySession` for the selected session
- `/apps/wha1echai.jobs/<jobId>` — read-only detail (kind, label, status, detail, duration)
- Declares `surface: 'panel'` so the conversation stays visible
- Uses the optional `@wha1echai/dsh-webpage/ui` kit
- Unknown job ids stay on the URL and show an unavailable state
- Header action calls `ctx.pages.open('wha1echai.jobs', '/')`
- Child slot `wha1echai.jobs.actions` for later kind-specific extensions; the section is omitted when empty

It does not cancel jobs, stream output, or add Host remotes.

## Requirements

- DSH `0.1.0-rc.6`
- Node `^22.19.0 || >=24.0.0`
- pnpm `11.7.0`
- `@wha1echai/dsh-webpage` `0.1.0` (listed first in this package's Pack)

## Install

Webpage is not on npm yet. Pack both packages, then add this App to a disposable or chosen web profile:

```powershell
dsh plugin --profile web add .\wha1echai-dsh-webpage-0.1.0.tgz
dsh plugin --profile web add .\wha1echai-dsh-jobs-app-0.1.0.tgz
```

Adding the Jobs App tarball also works when `@wha1echai/dsh-webpage` is already installed. The bundle patch inserts this App. Install `@wha1echai/dsh-webpage` first so the kernel is already in the profile.

## Verify

```powershell
pnpm install --frozen-lockfile
pnpm verify
pnpm test:packed-install
pnpm test:browser
```

On machines where nested `pnpm run` resolves pnpm `11.0.9` against `packageManager: pnpm@11.7.0`, invoke the scripts directly: `node scripts/check.mjs --lint`, `node scripts/check.mjs --pack`, `node node_modules/vitest/vitest.mjs run --coverage`, and `node scripts/browser.mjs`. The browser lane pins the in-app directory picker (`dsh web --patch`) so Playwright can connect a workspace.
