// SW 缓存与离线验收（t_a450af65 验收标准 4、5）
//
// 用真浏览器 + 真 Service Worker 验证，而不是桩测试：
//   验收 4：首页加载完成后，Cache Storage 里确实有当期作品数据和 feed 图片
//   验收 5：断网后从首页点进详情页，文字和图片都完整显示
//
// 断网用 CDP Network.emulateNetworkConditions offline=true，
// 它连 SW 发起的 fetch 一起断，是真的断网，不是 route 拦截的假象。
//
// 用法：BASE=http://127.0.0.1:8121/artbook/ node tests/sw-cache-offline.test.mjs
import { chromium, devices } from "@playwright/test";

const BASE = process.env.BASE || "http://127.0.0.1:8121/artbook/";
let failures = 0;
const check = (name, cond, detail = "") => {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
};

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 13"],
  serviceWorkers: "allow",
});
const page = await context.newPage();

console.log("== 首页加载 + SW 接管 ==");
await page.goto(BASE, { waitUntil: "load" });

// 等 SW 真正接管（controller 非空）——没接管就谈不上缓存验收
await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
  timeout: 15000,
}).catch(() => {});
check("Service Worker 已接管页面", await page.evaluate(() => !!navigator.serviceWorker.controller));

// 首屏图片渲染出来 + 给后台预取留出时间
await page.waitForSelector(".feed-scroller .slide img[src]", { timeout: 15000 });
await page.waitForTimeout(6000);

console.log("\n== 验收 4：Cache Storage 内容 ==");
const cacheState = await page.evaluate(async () => {
  const names = await caches.keys();
  const out = {};
  for (const n of names) {
    const c = await caches.open(n);
    out[n] = (await c.keys()).map((r) => r.url);
  }
  return out;
});
const allUrls = Object.values(cacheState).flat();
const appCacheName = Object.keys(cacheState).find((n) => n.startsWith("artbook-app"));
const imgCacheName = Object.keys(cacheState).find((n) => n.startsWith("artbook-img"));

// 当期期号从页面数据里取，不硬编码日期（否则明天就失效）
const latest = await page.evaluate(async () => {
  const r = await fetch("data/index.json", { cache: "no-cache" });
  return (await r.json()).latest;
});

check(`App 缓存桶存在（${appCacheName || "无"}）`, !!appCacheName);
check(`图片缓存桶存在（${imgCacheName || "无"}）`, !!imgCacheName);
check(
  `当期作品数据已缓存（issues/${latest}.json）`,
  allUrls.some((u) => u.includes(`issues/${latest}.json`)),
  `缓存内容：${allUrls.filter((u) => u.includes("data/")).join(", ")}`
);
check("catalog.json 已缓存", allUrls.some((u) => u.includes("catalog.json")));
check("index.html 已缓存", allUrls.some((u) => u.endsWith("/artbook/index.html") || u.endsWith("/artbook/")));

const cachedImages = (cacheState[imgCacheName] || []).filter((u) =>
  /clevelandart|metmuseum/.test(u)
);
check(
  `feed 图片已缓存（实际 ${cachedImages.length} 张）`,
  cachedImages.length >= 10,
  `期望后台预取当期图片，实际只有 ${cachedImages.length} 张`
);

console.log("\n== 验收 5：断网后点进详情页 ==");
// 记录首页第一张卡片对应的作品 id
const firstId = await page.evaluate(() => document.querySelector(".slide")?.dataset.id);
check("取到首页首张作品 id", !!firstId);

// 真断网：SW 发起的请求也一并断
const cdp = await context.newCDPSession(page);
await cdp.send("Network.enable");
await cdp.send("Network.emulateNetworkConditions", {
  offline: true,
  latency: 0,
  downloadThroughput: 0,
  uploadThroughput: 0,
});

const offlineFailures = [];
page.on("requestfailed", (r) => offlineFailures.push(r.url()));

// 点进详情页（走 hash 路由，不发导航请求）
await page.click(".slide .frame");
await page.waitForSelector(".detail", { timeout: 15000 }).catch(() => {});

const detailState = await page.evaluate(() => {
  const d = document.querySelector(".detail");
  if (!d) return null;
  const img = d.querySelector(".detail-hero img");
  const essay = d.querySelectorAll(".essay .body-text");
  return {
    title: (d.querySelector(".work-title-zh")?.textContent || "").trim(),
    artist: (d.querySelector(".artist-link")?.textContent || "").trim(),
    essayParas: essay.length,
    essayChars: [...essay].reduce((n, p) => n + p.textContent.trim().length, 0),
    // naturalWidth > 0 = 图片真的解码出来了，不是空占位
    imgLoaded: !!img && img.complete && img.naturalWidth > 0,
    imgSrc: img?.getAttribute("src") || "",
  };
});

check("断网后详情页渲染成功", !!detailState, "detail 容器未出现");
if (detailState) {
  check(`断网后标题有内容（"${detailState.title}"）`, detailState.title.length > 0);
  check(`断网后作者有内容（"${detailState.artist}"）`, detailState.artist.length > 0);
  check(
    `断网后赏析正文有内容（${detailState.essayParas} 段 / ${detailState.essayChars} 字）`,
    detailState.essayChars > 50
  );
  check(
    "断网后主图完整显示（naturalWidth > 0）",
    detailState.imgLoaded,
    `img src=${detailState.imgSrc} 未能从缓存解码`
  );
}

await browser.close();
console.log(failures === 0 ? "\nSW 缓存与离线验收：全部通过" : `\nSW 缓存与离线验收：${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
