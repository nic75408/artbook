// 首屏冷加载性能测量（t_a450af65）
//
// 目的：在本地 http-server 上以「全新 context（无 SW / 无缓存）+ 移动视口」
// 测量首页首屏，产出可复现的量化指标：
//   - DOMContentLoaded / load
//   - FCP（首次内容绘制）、LCP
//   - firstContentMs：#view 内出现真实首屏内容（画作图片元素 + 标题 + 作者 + 日期控件）的时刻
//   - 请求瀑布（同源请求数与关键请求时序）
//
// 用法：BASE=http://127.0.0.1:8899/artbook/ node tests/perf-cold-load.mjs [--runs 3] [--json out.json] [--rtt 100]
//
// --rtt N：给每个请求注入 N 毫秒往返延迟（CDP Network.emulateNetworkConditions）。
// 本地 http-server 的 RTT 近乎 0，会把「串行请求瀑布」这个白屏的真正成因完全掩盖；
// 真机上每个额外的串行往返都是实打实的白屏时间。所以除了卡片要求的无延迟档，
// 还要跑一档带延迟的，才能证明首屏改造是真的把串行链路砍短了。
//
// 注意：必须用带 /artbook/ 子路径的地址（与 GitHub Pages 部署一致），
// 直接用域名根会掩盖根相对路径问题（HERMES.md 部署事实 1）。
import { chromium, devices } from "@playwright/test";
import { writeFileSync } from "node:fs";

const BASE = process.env.BASE || "http://127.0.0.1:8899/artbook/";
const args = process.argv.slice(2);
const runs = Number(getArg("--runs") || 3);
const jsonOut = getArg("--json");
const rtt = Number(getArg("--rtt") || 0);

function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

// 首屏「真实内容可见」判定：画作 img 有 src、标题非空、作者非空、日期胶囊非空
const FIRST_CONTENT_PROBE = `(() => {
  const slide = document.querySelector('.feed-scroller .slide');
  if (!slide) return false;
  const img = slide.querySelector('img');
  const title = slide.querySelector('.names .work-title');
  const artist = slide.querySelector('.names .meta-text');
  const capsule = document.getElementById('date-capsule');
  if (!img || !title || !artist || !capsule) return false;
  if (!(img.getAttribute('src') || '').trim()) return false;
  if (!title.textContent.trim()) return false;
  if (!artist.textContent.trim()) return false;
  if (!capsule.textContent.trim()) return false;
  return true;
})()`;

async function measureOnce(browser, url) {
  // 全新 context = 无 SW、无 Cache Storage、无 HTTP 缓存（等价于删掉重装首开）
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    serviceWorkers: "allow",
    // 本地 HTTP/2 测量服务器用自签名证书
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  // 注入 RTT：模拟真机网络下的往返延迟，暴露串行请求瀑布
  if (rtt > 0) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: rtt,
      downloadThroughput: (10 * 1024 * 1024) / 8, // 10Mbps，只压 RTT 不压带宽
      uploadThroughput: (5 * 1024 * 1024) / 8,
    });
  }

  const sameOriginRequests = [];
  const errors = [];
  page.on("requestfinished", (req) => {
    const u = new URL(req.url());
    if (u.origin === new URL(url).origin) sameOriginRequests.push(u.pathname);
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (res) => {
    if (res.status() >= 400) errors.push(`${res.status()} ${res.url()}`);
  });

  const t0 = Date.now();
  await page.goto(url, { waitUntil: "commit" });

  // 轮询首屏真实内容出现的时刻（相对导航开始）
  let firstContentMs = null;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await page.evaluate(FIRST_CONTENT_PROBE)) {
      firstContentMs = await page.evaluate(() => performance.now());
      break;
    }
    await page.waitForTimeout(10);
  }

  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(300);

  const timings = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] || {};
    const paints = {};
    for (const p of performance.getEntriesByType("paint")) paints[p.name] = p.startTime;
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint") || [];
    return {
      domContentLoaded: nav.domContentLoadedEventEnd ?? null,
      load: nav.loadEventEnd ?? null,
      responseEnd: nav.responseEnd ?? null,
      fcp: paints["first-contentful-paint"] ?? null,
      lcp: lcpEntries.length ? lcpEntries[lcpEntries.length - 1].startTime : null,
    };
  });

  const result = {
    ...timings,
    firstContentMs,
    wallMs: Date.now() - t0,
    sameOriginRequestCount: sameOriginRequests.length,
    sameOriginRequests,
    errors,
  };
  await context.close();
  return result;
}

const browser = await chromium.launch();
const all = [];
for (let i = 0; i < runs; i++) {
  all.push(await measureOnce(browser, BASE));
}
await browser.close();

const num = (k) => all.map((r) => r[k]).filter((v) => typeof v === "number");
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const round = (v) => (v == null ? null : Math.round(v * 10) / 10);

const summary = {
  base: BASE,
  runs,
  rtt,
  medianDomContentLoaded: round(median(num("domContentLoaded"))),
  medianFcp: round(median(num("fcp"))),
  medianLcp: round(median(num("lcp"))),
  medianFirstContent: round(median(num("firstContentMs"))),
  medianLoad: round(median(num("load"))),
  medianSameOriginRequests: median(num("sameOriginRequestCount")),
  errors: all.flatMap((r) => r.errors),
};

console.log(JSON.stringify(summary, null, 2));
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ summary, all }, null, 2));

// 首屏预算：真实内容 500ms 内可见，且 DOMContentLoaded ≤ 500ms
const ok =
  summary.medianFirstContent != null &&
  summary.medianFirstContent <= 500 &&
  summary.medianDomContentLoaded != null &&
  summary.medianDomContentLoaded <= 500 &&
  summary.errors.length === 0;
console.log(ok ? "PASS: 首屏预算达标" : "FAIL: 首屏预算未达标");
process.exit(ok ? 0 : 1);
