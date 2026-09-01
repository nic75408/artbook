// 视觉证据：模拟 iOS standalone 下 default vs black-translucent 两种状态栏的观感差异。
// 做法：在 390×844 详情页首屏上叠一层"状态栏模拟层"——
//   default        → 顶部 59px 不透明 theme-color（#F5F1EA）色块，即赤拔截图里的米色空白条
//   black-translucent → 顶部 59px 透明，画作直接透出
// 两张图并排即可看出「米色条消失、图片顶到最上面」。
import { chromium } from '@playwright/test';

const BASE = process.env.BASE || 'http://localhost:8791';
const WORK = process.env.WORK_ID || 'met-435809';
const SAFE = 59;
const OUT = 'evidence/hero-top-bleed';

const b = await chromium.launch();

async function shot(mode) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/index.html#/work/${WORK}`, { waitUntil: 'load' });
  await p.waitForSelector('#view .detail-hero img', { state: 'attached', timeout: 20000 });
  await p.waitForTimeout(2500);
  // 注入真机的 safe-area-inset-top（桌面 Chromium 没有），关闭按钮应随之下移
  await p.addStyleTag({ content: `:root{--safe-t:${SAFE}px !important;}` });
  // 状态栏模拟层：default 时不透明遮住内容，black-translucent 时完全透明
  await p.addStyleTag({
    content: `
      #__statusbar{position:fixed;top:0;left:0;right:0;height:${SAFE}px;z-index:9999;
        display:flex;align-items:flex-end;justify-content:space-between;
        padding:0 26px 6px;font:600 15px -apple-system,sans-serif;pointer-events:none;
        background:${mode === 'default' ? '#F5F1EA' : 'transparent'};
        color:${mode === 'default' ? '#1D1B16' : '#fff'};
        text-shadow:${mode === 'default' ? 'none' : '0 0 3px rgba(0,0,0,.5)'};}
    `,
  });
  await p.evaluate(() => {
    const d = document.createElement('div');
    d.id = '__statusbar';
    d.innerHTML = '<span>16:09</span><span>▮▮▮ ᯤ 98</span>';
    document.body.appendChild(d);
  });
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${OUT}-${mode}.png` });
  // 量一次，把数字连同截图一起留档
  const m = await p.evaluate((safe) => {
    const r = (s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { top: +b.top.toFixed(1), left: +b.left.toFixed(1), width: +b.width.toFixed(1) };
    };
    return {
      safeT: getComputedStyle(document.documentElement).getPropertyValue('--safe-t').trim(),
      hero: r('#view .detail-hero'),
      img: r('#view .detail-hero img'),
      close: r('#view .detail-close'),
      closeBelowSafeArea: r('#view .detail-close').top >= safe,
      noHorizontalOverflow: document.documentElement.scrollWidth === window.innerWidth,
    };
  }, SAFE);
  console.log(mode.padEnd(18), JSON.stringify(m));
  await ctx.close();
}

const { default: fs } = await import('node:fs');
fs.mkdirSync('evidence', { recursive: true });
await shot('default');
await shot('black-translucent');
console.log(`\n截图：${OUT}-default.png（改动前观感）/ ${OUT}-black-translucent.png（改动后观感）`);
await b.close();
