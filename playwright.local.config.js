// 本地跑全量测试用：复用主配置，但把 baseURL 指到手动起的端口，
// 并关掉 webServer（端口 8888 常被别的 worktree 占用）。
// 用法：BASE_URL=http://localhost:8791 npx playwright test --config=playwright.local.config.js
const base = require('./playwright.config.js');

module.exports = {
  ...base,
  testDir: './tests',
  use: { ...base.use, baseURL: process.env.BASE_URL || 'http://localhost:8791' },
  webServer: undefined,
};
