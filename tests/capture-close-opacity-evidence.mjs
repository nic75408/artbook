// 采集 t_ac61cb9a 交付证据：详情页顶部控件（.detail-close / .folio）
// 降透明度后的 iPhone 390×844 首屏截图 + 计算样式实测值。
//
// 用法（BASE 必须是 /artbook/ 子路径，否则测不出根相对路径问题）：
//   BASE=http://127.0.0.1:8137/artbook/ node tests/capture-close-opacity-evidence.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:8137/artbook/';
// 注意：仓库路径含中文，import.meta.url.pathname 会是 percent-encoded 的，
// 必须走 fileURLToPath 还原，否则截图落到一个 %E4%BA%BA... 的假目录里。
const OUT = fileURLToPath(new URL('../evidence/detail-close-opacity-impl/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

await page.goto(BASE);
await page.waitForSelector('.card, .artwork-card, main', { timeout: 15000 });

// 取当日全部作品，按主色亮度挑最暗/最亮两幅做对照
// （palette 是十六进制主色数组，取第一个算相对亮度）
const ids = await page.evaluate(async () => {
  const mod = await import('./js/data.js');
  const idx = await mod.loadIndex();
  const issue = await mod.loadIssue(idx.latest);
  const lumOf = (hex) => {
    if (!hex) return null;
    const n = parseInt(hex.replace('#', ''), 16);
    return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  };
  return (issue.works || issue.items || []).map((w) => ({
    id: w.id,
    lum: lumOf(Array.isArray(w.palette) ? w.palette[0] : null),
  }));
});

const withLum = ids.filter((x) => x.lum != null).sort((a, b) => a.lum - b.lum);
const picks = withLum.length >= 2
  ? [{ tag: 'dark', ...withLum[0] }, { tag: 'light', ...withLum[withLum.length - 1] }]
  : ids.slice(0, 2).map((x, i) => ({ tag: i ? 'b' : 'a', ...x }));

const report = [];
for (const p of picks) {
  await page.goto(`${BASE}#/work/${p.id}`);
  await page.waitForSelector('.detail .detail-hero');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}${p.tag}-firstpaint.png` });

  const m = await page.evaluate(() => {
    const g = (s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        background: cs.backgroundColor,
        border: cs.border,
        backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
        boxShadow: cs.boxShadow,
        color: cs.color,
        rect: { top: r.top, left: r.left, w: r.width, h: r.height },
      };
    };
    return { close: g('.detail-close'), folio: g('.folio') };
  });
  report.push({ ...p, measured: m });
}

// prefers-reduced-transparency 降级实测
const ctx2 = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  reducedMotion: 'no-preference',
});
const p2 = await ctx2.newPage();
await p2.emulateMedia({ forcedColors: 'none' });
await p2.goto(`${BASE}#/work/${picks[0].id}`);
await p2.waitForSelector('.detail .detail-hero');
// Playwright 无 reduced-transparency 开关，用 CDP 直接注入该媒体特性
const cdp = await ctx2.newCDPSession(p2);
await cdp.send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
});
await p2.waitForTimeout(300);
const fallback = await p2.evaluate(() => {
  const g = (s) => {
    const cs = getComputedStyle(document.querySelector(s));
    return { background: cs.backgroundColor, backdropFilter: cs.backdropFilter };
  };
  return { close: g('.detail-close'), folio: g('.folio') };
});
await p2.screenshot({ path: `${OUT}reduced-transparency.png` });

writeFileSync(`${OUT}measurements.json`, JSON.stringify({ BASE, picks: report, fallback }, null, 2));
console.log(JSON.stringify({ picks: report, fallback }, null, 2));

await browser.close();
