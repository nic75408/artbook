#!/usr/bin/env node
// Playwright 测试启动器：为本次运行分配一个空闲端口，避免与机器上其他
// worktree 的 http-server（或任何占用 8888 的无关进程）撞车。
//
// 背景（真实事故，2026-09-01 t_21405dfd Round-1 被打回）：
// playwright.config.js 里 `reuseExistingServer: !CI` 只探测「端口能否连上」，
// 不校验对面是不是我们的静态服务器。当时 8888 上蹲着一个不相干的 Python
// 进程，能建连但不回数据，于是 Playwright 认为服务已就绪、直接开跑，
// 84 个用例全部 `net::ERR_EMPTY_RESPONSE`。
//
// 两道防线：
//   1. 本脚本每次挑一个当前空闲的端口，从源头避开抢占；
//   2. config 里 reuseExistingServer:false + webServer.url 做真 HTTP 健康检查，
//      万一还是撞上，会明确报「webServer 启动失败」，而不是伪装成用例失败。

import { createServer } from 'node:net';
import { spawn } from 'node:child_process';

/** 向内核要一个当前空闲的回环端口 */
function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

const port = process.env.ARTBOOK_TEST_PORT
  ? Number(process.env.ARTBOOK_TEST_PORT)
  : await findFreePort();

const baseURL = `http://127.0.0.1:${port}`;
console.log(`[run-playwright] 本次测试端口: ${port} (${baseURL})`);

const child = spawn('npx', ['playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, ARTBOOK_TEST_PORT: String(port), BASE_URL: baseURL },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
