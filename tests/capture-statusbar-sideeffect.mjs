// 副作用取证：black-translucent 下状态栏符号恒为白色（iOS 无「透明 + 黑字」选项）。
// 详情页头图深色，白字可读；但首页/收藏夹是暖纸米色底，白字对比度低。
// 本脚本把首页顶部按 black-translucent 的白字模拟出来，供小Z/赤拔判断是否需要后续处理。
import { chromium } from '@playwright/test';

const BASE = process.env.BASE || 'http://localhost:8791';
const SAFE = 59;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(`${BASE}/index.html#/`, { waitUntil: 'load' });
await p.waitForSelector('#view .slide', { timeout: 20000 });
await p.waitForTimeout(2500);
await p.addStyleTag({ content: `:root{--safe-t:${SAFE}px !important;}` });
await p.addStyleTag({
  content: `#__sb{position:fixed;top:0;left:0;right:0;height:${SAFE}px;z-index:9999;
    display:flex;align-items:flex-end;justify-content:space-between;padding:0 26px 6px;
    font:600 15px -apple-system,sans-serif;color:#fff;background:transparent;pointer-events:none;}`,
});
await p.evaluate(() => {
  const d = document.createElement('div');
  d.id = '__sb';
  d.innerHTML = '<span>16:09</span><span>▮▮▮ ᯤ 98</span>';
  document.body.appendChild(d);
});
await p.waitForTimeout(200);
await p.screenshot({ path: 'evidence/sideeffect-feed-white-statusbar.png' });
// 首页顶部内容是否被透明状态栏压住（.feed-header 已含 safe-t 内边距，应当没有）
const m = await p.evaluate((safe) => {
  const h = document.querySelector('.feed-header');
  const cs = getComputedStyle(h);
  const kid = [...h.children].map((c) => c.getBoundingClientRect().top).sort((a, b) => a - b)[0];
  return {
    feedHeaderPaddingTop: parseFloat(cs.paddingTop),
    firstChildTop: +kid.toFixed(1),
    firstChildClearsStatusBar: kid >= safe,
  };
}, SAFE);
console.log(JSON.stringify(m));
console.log('截图：evidence/sideeffect-feed-white-statusbar.png');
await b.close();
