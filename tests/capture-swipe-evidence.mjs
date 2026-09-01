// t_bae32c2e：详情页手势翻页交付证据截图（390×844 iPhone 视口）
// 用法：BASE_URL=http://127.0.0.1:8931/artbook/ node tests/capture-swipe-evidence.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8931/artbook/';
const OUT = 'evidence/detail-swipe';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
});
const page = await ctx.newPage();

async function openWork(offset) {
  await page.goto(BASE);
  const info = await page.evaluate(async () => {
    const idx = await (await fetch('data/index.json', { cache: 'no-cache' })).json();
    const iss = await (await fetch(`data/issues/${idx.latest}.json`, { cache: 'no-cache' })).json();
    return iss.works.map((w) => w.id);
  });
  const id = info[offset < 0 ? info.length + offset : offset];
  await page.goto(`${BASE}#/work/${id}`);
  await page.waitForSelector('.detail-hero img');
  await page.waitForTimeout(1200);
  return info;
}

// 1. 常驻页码 1／30
await openWork(0);
await page.screenshot({ path: `${OUT}/01-folio-first.png` });

// 2. 拖动中：opacity 衰减 + 右缘金色羽箭
await page.mouse.move(195, 500);
await page.mouse.down();
await page.mouse.move(165, 500);
await page.mouse.move(135, 500);
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/02-drag-fade-hint.png` });
await page.mouse.up();
await page.waitForTimeout(1500);

// 3. 翻页后：页码变 2／30，滚回顶部
await page.screenshot({ path: `${OUT}/03-after-swipe-folio-2.png` });

// 4. 边界软胶囊：第 1 幅右滑
await openWork(0);
await page.mouse.move(195, 500);
await page.mouse.down();
for (let x = 195; x <= 315; x += 30) await page.mouse.move(x, 500);
await page.mouse.up();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/04-end-notice-first.png` });

// 5. 边界软胶囊：末幅左滑
const ids = await openWork(-1);
await page.mouse.move(195, 500);
await page.mouse.down();
for (let x = 195; x >= 75; x -= 30) await page.mouse.move(x, 500);
await page.mouse.up();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/05-end-notice-last.png` });

console.log(`证据已保存到 ${OUT}/（该期共 ${ids.length} 幅）`);
await browser.close();
