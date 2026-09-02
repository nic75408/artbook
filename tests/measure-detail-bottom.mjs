// 实测详情页底部间距：正文末段 → credit → 收藏按钮 → 相关推荐
import { chromium, devices } from 'playwright';

const iPhone = devices['iPhone 12'];
const browser = await chromium.launch();
const ctx = await browser.newContext({
  ...iPhone,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const base = process.env.BASE_URL || 'http://localhost:8892';
await page.goto(`${base}/index.html#/work/cma-129386`, { waitUntil: 'networkidle' });
await page.waitForSelector('.detail .essay', { timeout: 8000 });
await page.waitForTimeout(1200);

// 滚到底部让相关推荐入视口
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(500);

const m = await page.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      top: Math.round(r.top + window.scrollY),
      bottom: Math.round(r.bottom + window.scrollY),
      height: Math.round(r.height),
      marginTop: cs.marginTop,
      marginBottom: cs.marginBottom,
      paddingTop: cs.paddingTop,
      paddingBottom: cs.paddingBottom,
      borderTop: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
      textAlign: cs.textAlign,
    };
  };
  const essay = q('.essay');
  const lastPara = essay ? essay.lastElementChild : null;
  const credit = q('.credit');
  const actionRow = q('.action-row');
  const favBtn = q('.action-row .fav-tool');
  const related = q('.related');
  return {
    lastPara: box(lastPara),
    credit: box(credit),
    actionRow: box(actionRow),
    favBtn: box(favBtn),
    related: box(related),
    detailBody: box(q('.detail-body')),
    scrubberBox: box(q('.detail-scrubber')),
    scrubberDot: box(q('.detail-scrubber__dot')),
  };
});

console.log(JSON.stringify(m, null, 2));

// 计算三个关键间距
const red_top = m.credit.top - m.lastPara.bottom;
const red_bot = m.actionRow.top - m.credit.bottom;
const yellow = m.related.top - m.actionRow.bottom;
console.log('\n=== 关键间距（gap = 下元素.top - 上元素.bottom）===');
console.log(`红框(上)  正文末段.bottom → credit.top      = ${red_top}px`);
console.log(`红框(下)  credit.bottom → actionRow.top    = ${red_bot}px`);
console.log(`黄框      actionRow.bottom → related.top   = ${yellow}px`);
console.log(`比例：红下/红上 = ${(red_bot/red_top).toFixed(2)} （目标：1.00）`);
console.log(`比例：黄/红上   = ${(yellow/red_top).toFixed(2)} （目标：≥ 1.50）`);
console.log(`收藏按钮 text-align: ${m.favBtn ? '(button 本身，看父)' : ''} actionRow.textAlign = ${m.actionRow.textAlign}`);
console.log(`related border-top = ${m.related.borderTop}`);

await page.screenshot({ path: 'tests/evidence/before-t_645b44c2-full.png', fullPage: true });
// 只截底部：从正文末段附近到 related 头
const cropTop = Math.max(0, m.lastPara.top - 40);
const cropBot = m.related.top + 60;
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate((y) => window.scrollTo(0, y), cropTop);
await page.waitForTimeout(200);
await page.screenshot({ path: 'tests/evidence/before-t_645b44c2-bottom.png' });

await browser.close();
