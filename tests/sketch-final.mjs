// 定稿方案：间距 B (20/20/36) + scrubber s1 (50% 短轨道 · 3px track · 12px 金色大点)
// 出：before/after 全图对比 + 底部特写 + 顶部特写
import { chromium, devices } from 'playwright';
import fs from 'fs';

const iPhone = devices['iPhone 12'];
const browser = await chromium.launch();
const base = process.env.BASE_URL || 'http://localhost:8892';
const outDir = 'tests/evidence/sketches-t_645b44c2/final';
fs.mkdirSync(outDir, { recursive: true });

const FINAL_CSS = `
  /* === 间距方案 B (20/20/36) === */
  .essay { padding-bottom: 0 !important; }
  .credit {
    margin-top: 20px !important;
    padding-top: 0 !important;
  }
  .action-row {
    margin-top: 20px !important;
    padding-bottom: 0 !important;
    text-align: center !important;
  }
  .action-row .fav-tool {
    display: inline-flex !important;
  }
  .related {
    padding-top: 36px !important;
    border-top: none !important;
  }
  /* === scrubber 升级 s1 短轨道 === */
  .artwork-info-card .detail-scrubber {
    height: 12px !important;
    width: 50% !important;
    margin: 0 auto 16px auto !important;
  }
  .artwork-info-card .detail-scrubber__track {
    height: 3px !important;
    background: rgba(29, 27, 22, 0.10) !important;
    border-radius: 1.5px !important;
  }
  .artwork-info-card .detail-scrubber__dot {
    width: 12px !important; height: 12px !important;
    background: var(--gold) !important;
    box-shadow: 0 0 0 3px var(--bg-card), 0 1px 3px rgba(29, 27, 22, 0.18) !important;
  }
`;

async function fullSnap(name, applyCss) {
  const ctx = await browser.newContext({
    ...iPhone, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/index.html#/work/cma-129386`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.detail .essay', { timeout: 10000 });
  await page.waitForTimeout(1200);
  if (applyCss) await page.addStyleTag({ content: FINAL_CSS });
  await page.waitForTimeout(300);

  // 测量
  const m = await page.evaluate(() => {
    const box = (el) => el ? {
      top: Math.round(el.getBoundingClientRect().top + window.scrollY),
      bot: Math.round(el.getBoundingClientRect().bottom + window.scrollY),
    } : null;
    const essay = document.querySelector('.essay');
    const lastPara = essay ? essay.lastElementChild : null;
    const relatedTitle = document.querySelector('.related .section-title, .related h2');
    const scrubber = document.querySelector('.artwork-info-card .detail-scrubber');
    return {
      red_top: box(document.querySelector('.credit')).top - box(lastPara).bot,
      red_bot: box(document.querySelector('.action-row')).top - box(document.querySelector('.credit')).bot,
      yellow: (relatedTitle ? box(relatedTitle).top : box(document.querySelector('.related')).top) - box(document.querySelector('.action-row')).bot,
      scrubberW: scrubber ? Math.round(scrubber.getBoundingClientRect().width) : null,
      actionCenter: (() => {
        const btn = document.querySelector('.action-row .fav-tool');
        const row = document.querySelector('.action-row');
        if (!btn || !row) return null;
        const b = btn.getBoundingClientRect();
        const r = row.getBoundingClientRect();
        return { rowW: Math.round(r.width), btnLeft: Math.round(b.left - r.left), btnRight: Math.round(r.right - b.right) };
      })(),
    };
  });

  // 完整长截图
  await page.screenshot({ path: `${outDir}/${name}-full.png`, fullPage: true });

  // 底部特写
  const eb = await page.evaluate(() => Math.round(document.querySelector('.essay').getBoundingClientRect().bottom + window.scrollY));
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, eb - 300));
  await page.waitForTimeout(200);
  await page.screenshot({
    path: `${outDir}/${name}-bottom.png`,
    clip: { x: 0, y: 0, width: 390, height: 500 },
  });

  // scrubber 特写
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const cardTop = await page.evaluate(() => Math.round(document.querySelector('.artwork-info-card').getBoundingClientRect().top));
  await page.screenshot({
    path: `${outDir}/${name}-scrubber.png`,
    clip: { x: 0, y: Math.max(0, cardTop - 20), width: 390, height: 130 },
  });

  await ctx.close();
  return m;
}

console.log('=== BEFORE ===');
const b = await fullSnap('before', false);
console.log(b);
console.log('=== AFTER (final: B + s1) ===');
const a = await fullSnap('after', true);
console.log(a);

console.log('\n=== 验收对照 ===');
console.log(`红上=红下: ${a.red_top}px == ${a.red_bot}px  ${a.red_top === a.red_bot ? '✓' : '✗'}`);
console.log(`黄/红上 >= 1.5: ${(a.yellow/a.red_top).toFixed(2)}  ${a.yellow >= a.red_top*1.5 ? '✓' : '✗'}`);
console.log(`scrubber 宽度: ${a.scrubberW}px (viewport 390 的 ${(a.scrubberW/390*100).toFixed(0)}%)  ${a.scrubberW < 390*0.8 ? '✓（短）' : '✗（仍太宽）'}`);
console.log(`收藏按钮居中: left=${a.actionCenter.btnLeft} right=${a.actionCenter.btnRight}  差 ${Math.abs(a.actionCenter.btnLeft - a.actionCenter.btnRight)}px  ${Math.abs(a.actionCenter.btnLeft - a.actionCenter.btnRight) <= 2 ? '✓' : '✗'}`);

await browser.close();
console.log(`\n输出：${outDir}/`);
