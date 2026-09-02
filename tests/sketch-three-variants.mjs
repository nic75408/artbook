// 三案对比图生成器：真站点为画布，注入不同的 CSS 覆盖
// 出三张 iPhone 390×844 底部截图 + 三张 scrubber 顶部特写
import { chromium, devices } from 'playwright';
import fs from 'fs';

const iPhone = devices['iPhone 12'];
const browser = await chromium.launch();

const VARIANTS = {
  'A-tight': {
    label: 'A · 紧凑辅助层 (X=12, Y=22)',
    css: `
      .essay { padding-bottom: 0 !important; }
      .credit { margin-top: 12px !important; padding-top: 0 !important; }
      .action-row { margin-top: 12px !important; padding-bottom: 0 !important;
                    text-align: center !important; }
      .action-row .fav-tool { display: inline-flex !important; }
      .related { padding-top: 22px !important; border-top: none !important; }
    `,
  },
  'B-airy': {
    label: 'B · 舒展呼吸 (X=20, Y=36)',
    css: `
      .essay { padding-bottom: 0 !important; }
      .credit { margin-top: 20px !important; padding-top: 0 !important; }
      .action-row { margin-top: 20px !important; padding-bottom: 0 !important;
                    text-align: center !important; }
      .action-row .fav-tool { display: inline-flex !important; }
      .related { padding-top: 36px !important; border-top: none !important; }
    `,
  },
  'C-medium': {
    label: 'C · 中庸古籍 (X=16, Y=28)',
    css: `
      .essay { padding-bottom: 0 !important; }
      .credit { margin-top: 16px !important; padding-top: 0 !important; }
      .action-row { margin-top: 16px !important; padding-bottom: 0 !important;
                    text-align: center !important; }
      .action-row .fav-tool { display: inline-flex !important; }
      .related { padding-top: 28px !important; border-top: none !important; }
    `,
  },
};

// scrubber 升级：短轨道（居中 50% 宽），track 3px，金色 dot 10px
const SCRUBBER_CSS = `
  .artwork-info-card .detail-scrubber {
    height: 10px !important;
    margin: 0 auto 16px auto !important;
    width: 50% !important;  /* 从 100% 缩到 50%，暗示性而非全宽进度条 */
  }
  .artwork-info-card .detail-scrubber__track {
    height: 3px !important;
    background: rgba(29, 27, 22, 0.08) !important;
    border-radius: 1.5px !important;
  }
  .artwork-info-card .detail-scrubber__dot {
    width: 10px !important; height: 10px !important;
    background: var(--gold) !important;
    box-shadow: 0 0 0 3px var(--bg-card), 0 1px 3px rgba(29, 27, 22, 0.18) !important;
  }
`;

const base = process.env.BASE_URL || 'http://localhost:8892';
const outDir = 'tests/evidence/sketches-t_645b44c2';
fs.mkdirSync(outDir, { recursive: true });

async function snap(name, variant, opts = {}) {
  const ctx = await browser.newContext({
    ...iPhone, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  // 多幅一期，取第 3 幅让 scrubber 有金色进度
  await page.goto(`${base}/index.html#/work/cma-129386`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.detail .essay', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // 注入变体 CSS + scrubber 通用升级
  await page.addStyleTag({ content: variant.css + SCRUBBER_CSS });
  await page.waitForTimeout(300);

  // 测量三个间距
  const m = await page.evaluate(() => {
    const box = (el) => el ? {
      top: Math.round(el.getBoundingClientRect().top + window.scrollY),
      bot: Math.round(el.getBoundingClientRect().bottom + window.scrollY),
    } : null;
    const essay = document.querySelector('.essay');
    const lastPara = essay ? essay.lastElementChild : null;
    const credit = document.querySelector('.credit');
    const actionRow = document.querySelector('.action-row');
    const related = document.querySelector('.related');
    const relatedTitle = document.querySelector('.related .section-title, .related h2');
    // 修正"红上"：credit 的第一行文字 baseline top（credit.top + padding-top），
    // 而不是元素 top；credit 的第一个子节点或 credit 自身文字 baseline
    // 但 padding-top:0 后，credit.top 就是文字上边缘
    return {
      red_top: box(credit).top - box(lastPara).bot,
      red_bot: box(actionRow).top - box(credit).bot,
      yellow: (relatedTitle ? box(relatedTitle).top : box(related).top) - box(actionRow).bot,
    };
  });

  // 底部截图：从正文最后几行到 related 第一行
  const bounds = await page.evaluate(() => {
    const essay = document.querySelector('.essay');
    const related = document.querySelector('.related');
    const relatedScroll = document.querySelector('.related-scroll');
    return {
      essayBottom: Math.round(essay.getBoundingClientRect().bottom + window.scrollY),
      relatedTop: Math.round(related.getBoundingClientRect().top + window.scrollY),
      relatedTitleBottom: relatedScroll ? Math.round(relatedScroll.getBoundingClientRect().top + window.scrollY) : Math.round(related.getBoundingClientRect().top + window.scrollY) + 80,
    };
  });
  // 让底部区域进入 viewport（scroll 到 essayBottom - 300px）
  const cropTop = Math.max(0, bounds.essayBottom - 300);
  await page.evaluate((y) => window.scrollTo(0, y), cropTop);
  await page.waitForTimeout(200);
  await page.screenshot({
    path: `${outDir}/${name}-bottom.png`,
    clip: { x: 0, y: 0, width: 390, height: 500 },
  });

  // scrubber 特写：滚回顶部
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const infoCard = await page.evaluate(() => {
    const c = document.querySelector('.artwork-info-card');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { top: Math.round(r.top), left: 0 };
  });
  if (infoCard) {
    await page.screenshot({
      path: `${outDir}/${name}-scrubber.png`,
      clip: { x: 0, y: Math.max(0, infoCard.top - 10), width: 390, height: 120 },
    });
  }

  await ctx.close();
  return m;
}

async function snapBefore() {
  const ctx = await browser.newContext({
    ...iPhone, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/index.html#/work/cma-129386`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.detail .essay', { timeout: 10000 });
  await page.waitForTimeout(1200);

  const m = await page.evaluate(() => {
    const box = (el) => el ? {
      top: Math.round(el.getBoundingClientRect().top + window.scrollY),
      bot: Math.round(el.getBoundingClientRect().bottom + window.scrollY),
    } : null;
    const essay = document.querySelector('.essay');
    const lastPara = essay ? essay.lastElementChild : null;
    const relatedTitle = document.querySelector('.related .section-title, .related h2');
    return {
      red_top: box(document.querySelector('.credit')).top - box(lastPara).bot,
      red_bot: box(document.querySelector('.action-row')).top - box(document.querySelector('.credit')).bot,
      yellow: (relatedTitle ? box(relatedTitle).top : box(document.querySelector('.related')).top) - box(document.querySelector('.action-row')).bot,
    };
  });

  const bounds = await page.evaluate(() => ({
    essayBottom: Math.round(document.querySelector('.essay').getBoundingClientRect().bottom + window.scrollY),
  }));
  const cropTop = Math.max(0, bounds.essayBottom - 300);
  await page.evaluate((y) => window.scrollTo(0, y), cropTop);
  await page.waitForTimeout(200);
  await page.screenshot({
    path: `${outDir}/before-bottom.png`,
    clip: { x: 0, y: 0, width: 390, height: 500 },
  });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const infoCard = await page.evaluate(() => {
    const c = document.querySelector('.artwork-info-card');
    const r = c.getBoundingClientRect();
    return { top: Math.round(r.top) };
  });
  await page.screenshot({
    path: `${outDir}/before-scrubber.png`,
    clip: { x: 0, y: Math.max(0, infoCard.top - 10), width: 390, height: 120 },
  });

  await ctx.close();
  return m;
}

console.log('\n===== BEFORE (线上) =====');
const before = await snapBefore();
console.log(before);
console.log(`红上/红下/黄 = ${before.red_top}/${before.red_bot}/${before.yellow}`);
console.log(`比例：红下/红上 = ${(before.red_bot/before.red_top).toFixed(2)} (目标 1.00)`);
console.log(`比例：黄/红上   = ${(before.yellow/before.red_top).toFixed(2)} (目标 ≥ 1.50)`);

for (const [name, v] of Object.entries(VARIANTS)) {
  console.log(`\n===== ${v.label} =====`);
  const m = await snap(name, v);
  console.log(`红上/红下/黄 = ${m.red_top}/${m.red_bot}/${m.yellow}`);
  const eq = m.red_top === m.red_bot ? '✓' : '✗';
  const ratio = (m.yellow / m.red_top).toFixed(2);
  const yOk = m.yellow >= m.red_top * 1.5 ? '✓' : '✗';
  console.log(`红上=红下 ${eq}  |  黄/红上 = ${ratio} (≥1.50) ${yOk}`);
}

await browser.close();
console.log(`\n输出目录：${outDir}/`);
