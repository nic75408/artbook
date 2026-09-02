// 落盘后实测：抓 4 张 iPhone 390×844 首屏截图（不同画作比例），
// 验证 t_e05a68be 的四项调整（去 emblem + 楷体字标 + 画框精致 + 名称居中 + 间距加大 + 热区扩大）
// 用法：BASE=http://127.0.0.1:8934/ node tests/capture-t_e05a68be-final.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const BASE = process.env.BASE || 'http://127.0.0.1:8934/';
const OUT = fileURLToPath(new URL('../evidence/t_e05a68be-final/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const idx = JSON.parse(readFileSync(fileURLToPath(new URL('../data/index.json', import.meta.url))));
const issue = JSON.parse(readFileSync(fileURLToPath(new URL(`../data/issues/${idx.latest}.json`, import.meta.url))));
const byR = (min, max) => issue.works.find((w) => w.image?.ratio > min && w.image?.ratio <= max);
const picks = [
  { tag: '1-scroll-narrow', ...byR(3.0, 10) },    // 达摩 4.072（赤拔截图那张）
  { tag: '2-square',        ...byR(0.95, 1.10) }, // 龙虎 1.001
  { tag: '3-portrait-tall', ...byR(1.60, 1.85) }, // 十字架 1.727
  { tag: '4-landscape',     ...byR(0.40, 0.75) }, // 黄光 0.569
].filter((p) => p.id);
console.log('picks:', picks.map((p) => `${p.tag}=${p.id} ratio=${p.image.ratio}`));

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

// Grab console errors/warnings for debugging
const consoleErrors = [];
page.on('pageerror', (err) => consoleErrors.push(String(err)));
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

await page.goto(BASE);
await page.waitForSelector('.feed-scroller', { timeout: 15000 });
await page.waitForTimeout(1500); // 等 font 加载 + 首图

// 实测品牌字标计算样式 —— 确认字体真的落到 LXGW WenKai Lite
const brandInfo = await page.evaluate(async () => {
  const el = document.querySelector('.brand-lockup__wordmark');
  if (!el) return { found: false };
  const cs = getComputedStyle(el);
  await document.fonts.ready;
  const loaded = document.fonts.check(`${cs.fontSize} "LXGW WenKai Lite"`, '艺术手册');
  const rect = el.getBoundingClientRect();
  return {
    found: true,
    text: el.textContent,
    fontFamily: cs.fontFamily,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    letterSpacing: cs.letterSpacing,
    color: cs.color,
    lxgwLoaded: loaded,
    rect: { left: rect.left, top: rect.top, w: rect.width, h: rect.height },
  };
});
console.log('brand-lockup__wordmark:', JSON.stringify(brandInfo, null, 2));

// 实测 slide 关键几何：画框宽度、留白、names 对齐、learn-inline margin-top
const results = [];
for (const p of picks) {
  const scrolled = await page.evaluate((id) => {
    const scroller = document.querySelector('.feed-scroller');
    const slides = scroller.querySelectorAll('.slide');
    let idx = -1;
    slides.forEach((s, i) => { if (s.dataset.id === id) idx = i; });
    if (idx < 0) return { ok: false };
    scroller.scrollTop = idx * scroller.clientHeight;
    return { ok: true, idx };
  }, p.id);
  if (!scrolled.ok) { console.log('  skip', p.tag); continue; }
  await page.waitForTimeout(1600);

  // 采集实测几何 + 检查热区
  const measured = await page.evaluate(() => {
    const slide = [...document.querySelectorAll('.slide')].find((s) =>
      s.getBoundingClientRect().top < 200 && s.getBoundingClientRect().top > -200
    );
    if (!slide) return null;
    const q = (sel) => slide.querySelector(sel);
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { left: r.left, top: r.top, w: r.width, h: r.height,
        marginTop: cs.marginTop, padding: cs.padding, textAlign: cs.textAlign, cursor: cs.cursor };
    };
    return {
      slideId: slide.dataset.id,
      slide: rect(slide),
      frameWrapper: rect(q('.frame-wrapper')),
      frame: rect(q('.frame')),
      names: rect(q('.names')),
      artistZh: rect(q('.artist-zh')),
      titleEn: rect(q('.title-en')),
      learnInline: rect(q('.learn-inline')),
      hasEmblem: !!q('.brand-lockup__emblem'),
    };
  });

  const outPath = `${OUT}${p.tag}.png`;
  await page.screenshot({ path: outPath, fullPage: false });
  const md5 = crypto.createHash('md5').update(readFileSync(outPath)).digest('hex');
  results.push({ tag: p.tag, id: p.id, ratio: p.image.ratio, path: outPath, md5, measured });
  console.log(`  ${p.tag} → md5=${md5.slice(0,8)}  frame.w=${measured?.frame?.w}  names.textAlign=${measured?.names?.textAlign}  learn.marginTop=${measured?.learnInline?.marginTop}`);
}

// 热区抽样：模拟点击画作左侧留白（frame-wrapper 外、slide 内的空白区）
await page.goto(BASE);
await page.waitForSelector('.slide', { timeout: 10000 });
await page.waitForTimeout(1200);
const hotzoneTest = await page.evaluate(() => {
  const slide = document.querySelector('.slide');
  const cs = getComputedStyle(slide);
  return { slideCursor: cs.cursor, wrapperCursor: getComputedStyle(document.querySelector('.frame-wrapper')).cursor };
});
console.log('hotzone cursors:', hotzoneTest);

// 实测点击空白区能进详情页
const clickTest = await page.evaluate(() => {
  return new Promise((resolve) => {
    const before = location.hash;
    const slide = document.querySelector('.slide');
    // 点击画作左边空白区（frame-wrapper 之外）
    const r = slide.getBoundingClientRect();
    slide.click();  // 直接 click 元素
    setTimeout(() => resolve({ before, after: location.hash, navigated: location.hash !== before }), 300);
  });
});
console.log('click-hotzone:', clickTest);

writeFileSync(`${OUT}manifest.json`, JSON.stringify({
  BASE, brandInfo, results, hotzoneTest, clickTest, consoleErrors
}, null, 2));
console.log('\nmanifest:', `${OUT}manifest.json`);
if (consoleErrors.length) console.log('page errors:', consoleErrors);

await browser.close();
