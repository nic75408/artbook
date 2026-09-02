// scrubber 三方向对比：短轨 vs 分档 vs 点阵
import { chromium, devices } from 'playwright';
import fs from 'fs';

const browser = await chromium.launch();
const outDir = 'tests/evidence/sketches-t_645b44c2/scrubber';
fs.mkdirSync(outDir, { recursive: true });
const base = process.env.BASE_URL || 'http://localhost:8892';

const SCRUBBER_VARIANTS = {
  's1-shorttrack': {
    label: 's1 · 短轨道 (50% 宽 + 大金点)',
    css: `
      .artwork-info-card .detail-scrubber {
        height: 12px !important;
        margin: 0 auto 16px auto !important;
        width: 50% !important;
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
    `,
    jsPost: null,
  },
  's2-segments': {
    label: 's2 · 分档小胶囊 (N 段横线)',
    // JS 把 scrubber 内容替换成 N 个胶囊段
    css: `
      .artwork-info-card .detail-scrubber-seg {
        display: flex !important; justify-content: center !important;
        gap: 6px !important; margin: 0 auto 16px auto !important; height: 12px !important;
        align-items: center !important;
      }
      .artwork-info-card .detail-scrubber-seg .seg {
        width: 20px; height: 3px; border-radius: 1.5px;
        background: rgba(29, 27, 22, 0.12);
      }
      .artwork-info-card .detail-scrubber-seg .seg.on {
        background: var(--gold);
        box-shadow: 0 0 0 1px rgba(140, 109, 63, 0.15);
      }
    `,
    jsPost: (page) => page.evaluate(() => {
      // 假设 5 幅，当前第 2 幅（index=1）
      const orig = document.querySelector('.artwork-info-card .detail-scrubber');
      if (!orig) return;
      const seg = document.createElement('div');
      seg.className = 'detail-scrubber-seg';
      const total = 5, cur = 1;
      for (let i = 0; i < total; i++) {
        const s = document.createElement('span');
        s.className = 'seg' + (i === cur ? ' on' : '');
        seg.appendChild(s);
      }
      orig.replaceWith(seg);
    }),
  },
  's3-dots': {
    label: 's3 · 点阵 (N 个小点 · 暗示性)',
    css: `
      .artwork-info-card .detail-scrubber-dots {
        display: flex !important; justify-content: center !important;
        gap: 10px !important; margin: 0 auto 16px auto !important; height: 12px !important;
        align-items: center !important;
      }
      .artwork-info-card .detail-scrubber-dots .dot {
        width: 5px; height: 5px; border-radius: 50%;
        background: rgba(29, 27, 22, 0.18);
      }
      .artwork-info-card .detail-scrubber-dots .dot.on {
        width: 7px; height: 7px;
        background: var(--gold);
        box-shadow: 0 0 0 2px rgba(140, 109, 63, 0.10);
      }
    `,
    jsPost: (page) => page.evaluate(() => {
      const orig = document.querySelector('.artwork-info-card .detail-scrubber');
      if (!orig) return;
      const wrap = document.createElement('div');
      wrap.className = 'detail-scrubber-dots';
      const total = 5, cur = 1;
      for (let i = 0; i < total; i++) {
        const d = document.createElement('span');
        d.className = 'dot' + (i === cur ? ' on' : '');
        wrap.appendChild(d);
      }
      orig.replaceWith(wrap);
    }),
  },
};

async function snap(name, variant) {
  const iPhone = devices['iPhone 12'];
  const ctx = await browser.newContext({
    ...iPhone, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/index.html#/work/cma-129386`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.detail .artwork-info-card', { timeout: 10000 });
  await page.waitForTimeout(1000);
  await page.addStyleTag({ content: variant.css });
  if (variant.jsPost) await variant.jsPost(page);
  await page.waitForTimeout(300);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  // 找 info-card 顶部
  const cardTop = await page.evaluate(() => {
    const c = document.querySelector('.artwork-info-card');
    return Math.round(c.getBoundingClientRect().top);
  });
  await page.screenshot({
    path: `${outDir}/${name}.png`,
    clip: { x: 0, y: Math.max(0, cardTop - 20), width: 390, height: 130 },
  });
  await ctx.close();
}

for (const [name, v] of Object.entries(SCRUBBER_VARIANTS)) {
  console.log(`  ${v.label}`);
  await snap(name, v);
}
await browser.close();
console.log(`输出目录：${outDir}/`);
