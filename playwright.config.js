// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// 端口由 scripts/run-playwright.mjs 动态分配（避开机器上其他 worktree 的
// http-server）。直接 `npx playwright test` 时回落到 8888。
const PORT = Number(process.env.ARTBOOK_TEST_PORT) || 8888;
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${PORT}`;

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  /* 只收集 .spec.js 作为 Playwright 用例。
     tests/ 下还有若干独立的 Node 脚本（*.test.mjs / perf-*.mjs），
     它们由 npm scripts 直接用 node 运行、并会调用 process.exit()。
     Playwright 默认的 testMatch 会把 *.test.mjs 也当成用例文件去 import，
     那些脚本的顶层代码就在「收集阶段」被执行 —— 一旦其中调用 process.exit()，
     整个 runner 会被静默杀死，结果是「0 个用例、退出码 0」的假绿
     （t_a450af65 踩到：28 个真实用例被整体跳过而 CI 显示通过）。 */
  testMatch: '**/*.spec.js',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'list',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: BASE_URL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* 关掉 Service Worker（真实事故：t_ac61cb9a Round-2 被打回）。
       原因链：
         1. 每个用例都开全新 context → 每次都重新注册 sw.js；
         2. sw.js install 时 best-effort 预取博物馆图片（prefetchImages），
            目标是 openaccess-cdn.clevelandart.org / images.metmuseum.org 真外网；
         3. 且 SW 的 fetch handler 用 networkFirst 接管全部同源请求 ——
            SW 自己被那几十路跨洋图片请求拖住时，页面的
            fetch('data/issues/*.json') 也跟着排队。
       并行 3 个 worker 跑全套时，随机某个用例的详情页就渲染不出来，
       `.detail-hero` / `.folio` 等满 30s 超时。
       关键鉴别特征：每次挂的用例都不同，且在 origin/main 上同样复现
       （main 连跑 4 次挂 3 次）—— 是环境竞态，不是某次样式改动的回归。
       注意 page.route 拦不住这个：Playwright 的路由不拦截 SW 发起的请求。
       这些 .spec.js 无一断言 SW 行为（grep serviceWorker 全为 0），
       SW 与离线能力由 tests/sw-cache-offline.test.mjs 单独覆盖，
       故此处屏蔽 SW 不损失任何覆盖率。 */
    serviceWorkers: 'block',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Start local dev server before starting the tests.
     - url（而非 port）：Playwright 会真发一次 HTTP 请求确认拿到 2xx/3xx，
       光能建 TCP 连接不算就绪，杜绝「陌生进程占端口 → 全量 ERR_EMPTY_RESPONSE」。
     - reuseExistingServer: false：永远起自己的服务器，绝不复用来路不明的进程。 */
  webServer: {
    command: `npx http-server -p ${PORT} -c-1 --silent .`,
    url: `${BASE_URL}/index.html`,
    timeout: 60000,
    reuseExistingServer: false,
    ignoreHTTPSErrors: true,
  },
});
