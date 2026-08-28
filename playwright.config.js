// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  
  // 测试超时时间
  timeout: 30 * 1000,
  
  // 每个测试用例的超时时间
  expect: {
    timeout: 5000
  },
  
  // 失败后重试次数
  retries: 0,
  
  // 并行工作数
  workers: 1,
  
  // 报告器
  reporter: 'list',
  
  // 自动启动本地服务器
  webServer: {
    command: 'npx http-server -p 8888 .',
    url: 'http://localhost:8888/index.html',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
  },
  
  use: {
    // 基础 URL（与 webServer 端口一致）
    baseURL: 'http://localhost:8888',
    
    // 收集追踪信息以便调试
    trace: 'retain-on-failure',
    
    // 失败时截图
    screenshot: 'only-on-failure',
  },

  // 移动端设备配置
  projects: [
    {
      name: 'Mobile',
      use: {
        ...devices['iPhone 14 Pro'],
      },
    },
  ],
});
