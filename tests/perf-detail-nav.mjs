// 详情页导航耗时测量（t_a450af65 验收标准 2 后半段）
//
// 「从首页点进任意详情页，内容瞬间显示无加载等待」需要量化。
// 本脚本测的是：点击首页卡片 → 详情页标题/正文/主图各自可见的耗时，
// 并统计这次导航产生了多少网络请求（理想是 0，全部命中缓存）。
//
// 用法：BASE=http://127.0.0.1:8121/artbook/ node tests/perf-detail-nav.mjs [--rtt 100]
import { chromium, devices } from "@playwright/test";

const BASE = process.env.BASE || "http://127.0.0.1:8121/artbook/";
const args = process.argv.slice(2);
const rttIdx = args.indexOf("--rtt");
const rtt = rttIdx >= 0 ? Number(args[rttIdx + 1]) : 0;

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 13"],
  serviceWorkers: "allow",
  ignoreHTTPSErrors: true,
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Network.enable");
if (rtt > 0) {
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false, latency: rtt,
    downloadThroughput: (10 * 1024 * 1024) / 8, uploadThroughput: (5 * 1024 * 1024) / 8,
  });
}

await page.goto(BASE, { waitUntil: "load" });
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 }).catch(() => {});
await page.waitForSelector(".feed-scroller .slide img[src]", { timeout: 15000 });
await page.waitForTimeout(5000); // 等后台预取当期图片完成

// 统计点击之后发出的请求，并区分「走网络」与「SW 缓存命中」
const reqs = [];
const fromNetwork = [];
page.on("request", (r) => reqs.push(r.url()));
page.on("response", async (res) => {
  // fromServiceWorker() 为真 = 由 SW 应答（缓存命中），没有真正出网
  try {
    if (!res.fromServiceWorker() && res.url().includes("/data/")) fromNetwork.push(res.url());
  } catch {
    /* 响应已失效，忽略 */
  }
});

const t0 = await page.evaluate(() => performance.now());
await page.click(".slide .frame");

// 文字内容可见
await page.waitForFunction(
  () => {
    const t = document.querySelector(".detail .work-title-zh");
    const p = document.querySelector(".detail .essay .body-text");
    return t && t.textContent.trim() && p && p.textContent.trim();
  },
  null,
  { timeout: 15000 }
);
const textMs = (await page.evaluate(() => performance.now())) - t0;

// 主图真正解码出来
await page.waitForFunction(
  () => {
    const im = document.querySelector(".detail .detail-hero img");
    return im && im.complete && im.naturalWidth > 0;
  },
  null,
  { timeout: 15000 }
).catch(() => {});
const imgMs = (await page.evaluate(() => performance.now())) - t0;

const dataReqs = reqs.filter((u) => u.includes("/data/"));
console.log(JSON.stringify({
  base: BASE,
  rtt,
  detailTextVisibleMs: Math.round(textMs * 10) / 10,
  detailImageVisibleMs: Math.round(imgMs * 10) / 10,
  requestsAfterClick: reqs.length,
  dataRequestsAfterClick: dataReqs.length,
  dataRequestUrls: dataReqs,
  // 真正出网的数据请求（未被 SW 缓存应答）——这才是用户能感知到的延迟
  dataRequestsFromNetwork: fromNetwork.length,
  dataRequestsFromNetworkUrls: fromNetwork,
}, null, 2));

await browser.close();
// 判定：详情页正文/主图所需的数据必须全部来自缓存，用户不等网络。
// catalog.json 可能因「相关推荐」而请求，但必须由 SW 缓存应答（不出网）。
const ok = fromNetwork.length === 0 && textMs <= 300;
console.log(ok ? "PASS: 详情页无出网数据请求且文字即时可见" : "FAIL: 详情页仍需等网络或文字显示偏慢");
process.exit(ok ? 0 : 1);
