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
