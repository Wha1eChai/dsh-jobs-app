# dsh-jobs-app

[English](README.md) | 中文

历史示例。包名 `@dshapps/jobs-app`。App ID `dshapps.jobs`，`surface: 'panel'`。故意不放进常驻 web profile。

独立的 DeepSeek Harness App，只读当前会话的后台 jobs。它读所选 session 的 `jobsBySession`。不取消 job、不流式输出、不加 Host remotes。不 fork、不替代官方 `@deepseek-ai/dsh-client-ui-jobs` 弹出层。

这是 Webpage 的消费者，不是 Webpage 的功能。它 peer `@dshapps/webpage`，注册 App ID `dshapps.jobs`。pack 只插入本插件。

## 做什么

- `/apps/dshapps.jobs` — 只读列出所选 session 的 `jobsBySession`
- `/apps/dshapps.jobs/<jobId>` — 只读详情（kind、label、status、detail、duration）
- 声明 `surface: 'panel'`，对话继续看得见
- 使用可选的 `@dshapps/webpage/ui` 套件
- 未知 job id 留在 URL 上，显示不可用状态
- 标题栏动作调用 `ctx.pages.open('dshapps.jobs', '/')`
- 子槽 `dshapps.jobs.actions` 留给按 kind 的扩展；空着时不渲染这一节

## 要求

- DSH `0.1.0-rc.6`
- Node `^22.19.0 || >=24.0.0`
- pnpm `11.7.0`
- profile 里先有 `@dshapps/webpage` `0.2.0`

## 安装

这一家都还没上 npm。构建后打包这个 App，再加到已经有 `@dshapps/webpage` 的 web profile：

```powershell
dsh plugin --profile web add .\dshapps-webpage-0.2.0.tgz
dsh plugin --profile web add .\dshapps-jobs-app-0.2.0.tgz
```

`@dshapps/webpage` 已经装好时，只加 Jobs App 的 tarball 也可以。bundle patch 会插入这个 App。先装 `@dshapps/webpage`，让内核已经在 profile 里。

## 校验

```powershell
corepack pnpm@11.7.0 install --frozen-lockfile
corepack pnpm@11.7.0 run verify
```

这个仓库还有可选车道：`node scripts/packed-install.mjs` 和 `node scripts/browser.mjs`。浏览器车道钉死应用内目录选择器（`dsh web --patch`），好让 Playwright 连上 workspace。

有些机器上嵌套的 `pnpm run` 会按 `packageManager: pnpm@11.7.0` 解析到 pnpm `11.0.9`，这时直接跑：`node scripts/check.mjs --lint`、`node scripts/check.mjs --pack`、`node node_modules/vitest/vitest.mjs run --coverage`，以及 `node scripts/browser.mjs`。

## 这一家

平台仓库 [dsh-webpage](https://github.com/dshapps/dsh-webpage) 放内核、写作合同和文档。新 App 从 [dsh-app-template](https://github.com/dshapps/dsh-app-template) 起步。App 故意各自独立成库。

使用 [MIT License](LICENSE)。
