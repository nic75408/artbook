// 用改后的真实 CSS（不注入）复测所有验收指标
import { chromium, devices } from 'playwright';
import fs from 'fs';

const iPhone = devices['iPhone 12'];
const browser = await chromium.launch();
const base = process.env.BASE_URL || 'http://localhost:8892';
const outDir = 'tests/evidence/sketches-t_645b44c2/after';
fs.mkdirSync(outDir, { recursive: true });

async function measurePage(idx) {
  const ctx = await browser.newContext({
    ...iPhone, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  // 每期 30 幅，取第 idx 幅（0-indexed）—— 用真实数据 index.json 里 cma-129386 是第一幅
  // 试几个 id 覆盖 index 0, ~15, 29
  const ids = { first: 'cma-129386' };
  await page.goto(`${base}/index.html#/work/${ids.first}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.detail .essay', { timeout: 10000 });
  await page.waitForTimeout(1500);  // wait for essay content

  const m = await page.evaluate(() => {
    const box = (el) => el ? {
      top: Math.round(el.getBoundingClientRect().top + window.scrollY),
      bot: Math.round(el.getBoundingClientRect().bottom + window.scrollY),
      w: Math.round(el.getBoundingClientRect().width),
      cs: (k) => getComputedStyle(el)[k],
    } : null;
    const essay = document.querySelector('.essay');
    const lastPara = essay ? essay.lastElementChild : null;
    const credit = document.querySelector('.credit');
    const actionRow = document.querySelector('.action-row');
    const relatedTitle = document.querySelector('.related .section-title, .related h2');
    const related = document.querySelector('.related');
    const scrubber = document.querySelector('.artwork-info-card .detail-scrubber');
    const dot = document.querySelector('.artwork-info-card .detail-scrubber__dot');
    const track = document.querySelector('.artwork-info-card .detail-scrubber__track');
    const favBtn = document.querySelector('.action-row .fav-tool');
    const total = scrubber ? +scrubber.getAttribute('aria-valuemax') : 0;
    const cur = scrubber ? +scrubber.getAttribute('aria-valuenow') : 0;

    const brelated = related.getBoundingClientRect();
    const bactionRow = actionRow.getBoundingClientRect();
    const brelTitle = relatedTitle.getBoundingClientRect();
    const bfav = favBtn.getBoundingClientRect();
    const baction = actionRow.getBoundingClientRect();

    return {
      spacing: {
        red_top: box(credit).top - box(lastPara).bot,
        red_bot: box(actionRow).top - box(credit).bot,
        yellow: brelTitle.top + window.scrollY - (bactionRow.bottom + window.scrollY),
      },
      alignment: {
        favBtn_leftInRow: Math.round(bfav.left - baction.left),
        favBtn_rightInRow: Math.round(baction.right - bfav.right),
      },
      scrubber: scrubber ? {
        width: Math.round(scrubber.getBoundingClientRect().width),
        widthPct: (scrubber.getBoundingClientRect().width / 390 * 100).toFixed(1),
        trackHeight: track.getBoundingClientRect().height.toFixed(1),
        dotSize: `${Math.round(dot.getBoundingClientRect().width)}×${Math.round(dot.getBoundingClientRect().height)}`,
        dotBgColor: getComputedStyle(dot).background,
        dotBoxShadow: getComputedStyle(dot).boxShadow,
        total, cur,
      } : null,
      related: {
        borderTop: getComputedStyle(related).borderTopWidth + ' ' + getComputedStyle(related).borderTopStyle,
        paddingTop: getComputedStyle(related).paddingTop,
      },
      tokens: {
        helperLayer: getComputedStyle(document.documentElement).getPropertyValue('--helper-layer').trim(),
        helperToModule: getComputedStyle(document.documentElement).getPropertyValue('--helper-to-module').trim(),
      },
    };
  });

  // full page + bottom + top screenshots
  await page.screenshot({ path: `${outDir}/after-full.png`, fullPage: true });
  const eb = await page.evaluate(() => Math.round(document.querySelector('.essay').getBoundingClientRect().bottom + window.scrollY));
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, eb - 300));
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${outDir}/after-bottom.png`, clip: { x: 0, y: 0, width: 390, height: 500 } });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const cardTop = await page.evaluate(() => Math.round(document.querySelector('.artwork-info-card').getBoundingClientRect().top));
  await page.screenshot({ path: `${outDir}/after-scrubber.png`, clip: { x: 0, y: Math.max(0, cardTop - 20), width: 390, height: 130 } });

  await ctx.close();
  return m;
}

const m = await measurePage();
console.log(JSON.stringify(m, null, 2));

const s = m.spacing;
console.log('\n=== 验收 ===');
console.log(`[1] 红上=红下: ${s.red_top}=${s.red_bot} ${s.red_top === s.red_bot ? '✓' : '✗'}`);
console.log(`[2] 黄/红上>=1.5: ${(s.yellow/s.red_top).toFixed(2)} ${s.yellow >= s.red_top*1.5 ? '✓' : '✗'}`);
console.log(`[3] 收藏按钮居中: L=${m.alignment.favBtn_leftInRow} R=${m.alignment.favBtn_rightInRow} 差 ${Math.abs(m.alignment.favBtn_leftInRow - m.alignment.favBtn_rightInRow)}px ${Math.abs(m.alignment.favBtn_leftInRow - m.alignment.favBtn_rightInRow) <= 2 ? '✓' : '✗'}`);
console.log(`[4] related border-top 已去除: ${m.related.borderTop} ${m.related.borderTop.startsWith('0px') ? '✓' : '✗'}`);
console.log(`[5] scrubber 宽度: ${m.scrubber.width}px (${m.scrubber.widthPct}% viewport) ${m.scrubber.width < 390*0.6 ? '✓（短）' : '✗'}`);
console.log(`[6] scrubber dot 尺寸: ${m.scrubber.dotSize} (要求 12×12) ${m.scrubber.dotSize === '12×12' ? '✓' : '✗'}`);
console.log(`[7] helper tokens: --helper-layer=${m.tokens.helperLayer}, --helper-to-module=${m.tokens.helperToModule}`);

await browser.close();
