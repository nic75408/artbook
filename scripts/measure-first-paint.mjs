// 验收标准 1（CEO 修正后口径）：
// Paint Timing API `first-paint`（Playwright + CDP Network.emulateNetworkConditions，
// latency=150ms / downloadThroughput=1474560 bps），5 次测量中位数 < 500ms。
//
// 用法：BASE=http://127.0.0.1:8899/artbook/ node scripts/measure-first-paint.mjs
import { chromium, devices } from "@playwright/test";

const BASE = process.env.BASE || "http://127.0.0.1:8899/artbook/";
const RUNS = Number(process.env.RUNS || 5);

async function measureOnce(browser) {
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 1474560,
    uploadThroughput: 1474560,
  });
  await page.goto(BASE, { waitUntil: "load" });
  const fp = await page.evaluate(() => {
    const entries = performance.getEntriesByType("paint");
    const e = entries.find((p) => p.name === "first-paint");
    return e ? e.startTime : null;
  });
  await context.close();
  return fp;
}

const browser = await chromium.launch();
const results = [];
for (let i = 0; i < RUNS; i++) {
  results.push(await measureOnce(browser));
}
await browser.close();

const sorted = [...results].filter((v) => v != null).sort((a, b) => a - b);
const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;

console.log(JSON.stringify({ base: BASE, runs: RUNS, results, median }, null, 2));
const ok = median != null && median < 500;
console.log(ok ? `PASS: median first-paint = ${median}ms < 500ms` : `FAIL: median first-paint = ${median}ms`);
process.exit(ok ? 0 : 1);
