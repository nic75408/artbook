// Playwright 配置文件 - 艺术手册布局验证
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  use: {
    // 基础 URL 设置为当前目录（通过 file:// 协议访问）
    baseURL: 'file://' + process.cwd() + '/',
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
