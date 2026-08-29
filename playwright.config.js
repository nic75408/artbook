// Playwright 配置文件 - 艺术手册布局验证
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  // 自动启动本地服务器用于测试
  webServer: {
    command: 'python3 -m http.server 8888',
    port: 8888,
    timeout: 10000,
    reuseExistingServer: true,
  },
  expect: {
    timeout: 5000,
  },
  use: {
    // 基础 URL 设置为本地服务器
    baseURL: 'http://localhost:8888/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  reporter: [['html', { open: 'never' }], ['list']],
  projects: [
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        viewport: { width: 375, height: 812 },
      },
    },
  ],
  outputDir: 'test-results/',
});
