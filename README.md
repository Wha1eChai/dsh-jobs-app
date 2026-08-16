# dsh-jobs-app

Historical example. Package `@dshapps/jobs-app`. App ID `dshapps.jobs`, `surface: 'panel'`. Deliberately not in the standing web profile.

An independent DeepSeek Harness App for the current session's background jobs. It reads `jobsBySession` for the selected session read-only. It does not cancel jobs, stream output, or add Host remotes. It does not fork or replace the official `@deepseek-ai/dsh-client-ui-jobs` popover.

This package is a Webpage consumer, not a Webpage feature. It peers on `@dshapps/webpage` and registers App ID `dshapps.jobs`. The pack inserts only this plugin.

## What it does

- `/apps/dshapps.jobs` — read-only list of `jobsBySession` for the selected session
- `/apps/dshapps.jobs/<jobId>` — read-only detail (kind, label, status, detail, duration)
- Declares `surface: 'panel'` so the conversation stays visible
- Uses the optional `@dshapps/webpage/ui` kit
- Unknown job ids stay on the URL and show an unavailable state
- Header action calls `ctx.pages.open('dshapps.jobs', '/')`
- Child slot `dshapps.jobs.actions` for later kind-specific extensions; the section is omitted when empty

## Requirements

- DSH `0.1.0-rc.6`
- Node `^22.19.0 || >=24.0.0`
- pnpm `11.7.0`
- `@dshapps/webpage` `0.2.0` present in the profile first

## Install

Nothing in this family is published to npm yet. Pack this App after a build, then add the tarball to a web profile that already has `@dshapps/webpage`:

```powershell
dsh plugin --profile web add .\dshapps-webpage-0.2.0.tgz
dsh plugin --profile web add .\dshapps-jobs-app-0.2.0.tgz
```

Adding the Jobs App tarball also works when `@dshapps/webpage` is already installed. The bundle patch inserts this App. Install `@dshapps/webpage` first so the kernel is already in the profile.

## Verify

```powershell
corepack pnpm@11.7.0 install --frozen-lockfile
corepack pnpm@11.7.0 run verify
```

Optional extra lanes in this repo: `node scripts/packed-install.mjs` and `node scripts/browser.mjs`. The browser lane pins the in-app directory picker (`dsh web --patch`) so Playwright can connect a workspace.

On machines where nested `pnpm run` resolves pnpm `11.0.9` against `packageManager: pnpm@11.7.0`, invoke the scripts directly: `node scripts/check.mjs --lint`, `node scripts/check.mjs --pack`, `node node_modules/vitest/vitest.mjs run --coverage`, and `node scripts/browser.mjs`.

## Family

The platform repository [dsh-webpage](https://github.com/dshapps/dsh-webpage) holds the kernel, the authoring contract, and the docs. Start a new App from [dsh-app-template](https://github.com/dshapps/dsh-app-template). Apps live in their own repositories on purpose.
