// t_e05a68be 三案对比：首页 4 项调整（去 emblem / 画框精致 / 间距 / 居中） + 字体三案
// 用 Playwright 把 3 套 CSS 覆盖注入到线上生产站点，抓 iPhone 390×844 关键帧对比。
// 每案 4 张：极窄卷轴（ratio 4.072 达摩）/ 方形（1.001 龙虎）/ 标准竖（1.727 十字架）/ 横幅（0.569 黄光）
// 用法：BASE=http://127.0.0.1:8791/ node tests/capture-homepage-4items-3variants.mjs
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE || 'http://127.0.0.1:8791/';
const OUT = fileURLToPath(new URL('../evidence/homepage-4items-3variants/', import.meta.url));
mkdirSync(OUT, { recursive: true });

// 共通改动 CSS —— 4 项赤拔要求（去 emblem + 画框感 + 间距 + 居中），字体除外
const COMMON_CSS = `
/* 1) 去掉 emblem，只保留 wordmark */
.brand-lockup__emblem { display: none !important; }
.brand-lockup { gap: 0 !important; }

/* 2) 顶部标题左对齐到页面 gutter 22px（与 slide 内容基准线一致） */
.feed-header {
  padding: calc(var(--space-md) + var(--safe-t))
           calc(var(--page-gutter) + var(--safe-r)) 0
           calc(var(--page-gutter) + var(--safe-l)) !important;
}

/* 3) 画框宽度：极窄卷轴 vs 常规画都统一在 320px（原 280px）
      → 极窄卷轴左右留白从 55px 收到 35px，四边一致 */
.frame-wrapper {
  width: min(320px, 92vw) !important;
}
.slide .names {
  width: min(320px, 92vw) !important;
  text-align: center !important;  /* 4) 画作名称与作者居中 */
}
.frame .ph {
  width: min(320px, 92vw, calc((100dvh - var(--pad-t) - var(--pad-b) - 220px) / var(--r, 1.2))) !important;
}
/* 画框描边更精致：内衬缩到 6px（原 8px），描边更贴近画作 */
.frame {
  padding: 6px !important;
}

/* 5) 「了解更多」与画作名称的间距加大：28px → 44px */
.learn-inline {
  margin-top: 44px !important;
}

/* 6) 热区扩大：整个 slide 除 header 与 date-capsule 外都可点
      —— 视觉上不变，仅 cursor 提示（真机点击由 JS 绑定 slide 全域） */
.slide { cursor: pointer; }
.frame-wrapper { cursor: pointer; }
`;

// 三案字体差异
const VARIANTS = {
  A: {
    label: 'ZCOOL XiaoWei（细长瘦金骨）',
    fontHref: 'https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&text=艺术手册&display=swap',
    css: `
      .brand-lockup__wordmark {
        font-family: 'ZCOOL XiaoWei', var(--serif-zh) !important;
        font-size: 26px !important;
        font-weight: 400 !important;
        letter-spacing: 0.15em !important;
        color: var(--ink) !important;
      }
    `,
  },
  B: {
    label: 'Ma Shan Zheng（毛笔挥洒）',
    fontHref: 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&text=艺术手册&display=swap',
    css: `
      .brand-lockup__wordmark {
        font-family: 'Ma Shan Zheng', var(--serif-zh) !important;
        font-size: 24px !important;
        font-weight: 400 !important;
        letter-spacing: 0.12em !important;
        color: var(--ink) !important;
      }
    `,
  },
  C: {
    label: 'LXGW WenKai（霞鹜文楷·清雅）',
    fontHref: 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-lite-webfont@1.7.0/style.css',
    css: `
      .brand-lockup__wordmark {
        font-family: 'LXGW WenKai Lite', var(--serif-zh) !important;
        font-size: 24px !important;
        font-weight: 300 !important;
        letter-spacing: 0.18em !important;
        color: var(--ink) !important;
      }
    `,
  },
};

// 挑 4 幅代表不同比例的作品做对比
// 从 index.json 当期取真实 ID
const idx = JSON.parse(readFileSync(fileURLToPath(new URL('../data/index.json', import.meta.url))));
const issue = JSON.parse(readFileSync(fileURLToPath(new URL(`../data/issues/${idx.latest}.json`, import.meta.url))));
// 找出 4 类：极窄 / 方形 / 竖幅 / 横幅
const byR = (min, max) => issue.works.find((w) => w.image?.ratio > min && w.image?.ratio <= max);
const picks = [
  { tag: 'scroll-narrow', ...byR(3.0, 10) },  // 达摩 4.072
  { tag: 'square',        ...byR(0.95, 1.10) }, // 龙虎 1.001
  { tag: 'portrait-tall', ...byR(1.60, 1.85) }, // 十字架 1.727
  { tag: 'landscape',     ...byR(0.40, 0.75) }, // 黄光 0.569 / 或圣佩德罗 0.643
].filter((p) => p.id);
console.log('picks:', picks.map((p) => `${p.tag}=${p.id} ratio=${p.image.ratio}`));

const browser = await chromium.launch();
const results = [];

for (const [key, v] of Object.entries(VARIANTS)) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(BASE);
  await page.waitForSelector('.feed-scroller', { timeout: 15000 });
  await page.waitForTimeout(400);

  // 注入 web font <link> —— @import 必须在 stylesheet 顶部，addStyleTag content
  // 里放 @import 会被浏览器丢弃，必须走 addStyleTag({url})
  await page.addStyleTag({ url: v.fontHref });
  await page.addStyleTag({ content: `${COMMON_CSS}\n${v.css}` });
  // 用 document.fonts.load 明确等待「艺术手册」四字在指定字体上的字形加载完
  const fontFamily = key === 'A' ? '"ZCOOL XiaoWei"' : key === 'B' ? '"Ma Shan Zheng"' : '"LXGW WenKai Lite"';
  const loaded = await page.evaluate(async ({ family, sz }) => {
    // 触发一次实际渲染保证 CSSOM 能感知
    const probe = document.createElement('div');
    probe.textContent = '艺术手册';
    probe.style.cssText = `position:absolute;left:-9999px;top:-9999px;font-family:${family},serif;font-size:${sz}px`;
    document.body.appendChild(probe);
    try {
      await document.fonts.load(`${sz}px ${family}`, '艺术手册');
      const ok = document.fonts.check(`${sz}px ${family}`, '艺术手册');
      return { ok, count: document.fonts.size };
    } catch (e) { return { ok: false, err: e.message }; }
  }, { family: fontFamily, sz: 26 });
  console.log(`  [${key}] font ${fontFamily} loaded=${loaded.ok} count=${loaded.count}`);
  await page.waitForTimeout(300);

  // 每个作品跳到对应 slide 截图（首页是 scroll snap，直接改 scroll top）
  for (const p of picks) {
    // 让 feed.js 内部找到该作品对应的 slide index，滚过去
    const scrolled = await page.evaluate((id) => {
      const scroller = document.querySelector('.feed-scroller');
      const slides = scroller.querySelectorAll('.slide');
      let idx = -1;
      slides.forEach((s, i) => { if (s.dataset.id === id) idx = i; });
      if (idx < 0) return { ok: false, reason: 'not-in-loaded' };
      scroller.scrollTop = idx * scroller.clientHeight;
      return { ok: true, idx };
    }, p.id);
    if (!scrolled.ok) {
      console.log('  skip', p.tag, p.id, scrolled.reason);
      continue;
    }
    // 等图片落地
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      // 兜底：如果 img 还未挂载 src，强制触发 ensureImages
      const slide = document.querySelector('.slide[data-issue]');
      if (!slide) return;
    });
    const outPath = `${OUT}${key}-${p.tag}.png`;
    await page.screenshot({ path: outPath, fullPage: false });
    const md5 = crypto.createHash('md5').update(readFileSync(outPath)).digest('hex');
    results.push({ variant: key, label: v.label, tag: p.tag, id: p.id, ratio: p.image.ratio, path: outPath, md5 });
    console.log(`  ${key} ${p.tag} → md5=${md5.slice(0,8)}`);
  }

  await ctx.close();
}

writeFileSync(`${OUT}manifest.json`, JSON.stringify({ BASE, VARIANTS: Object.fromEntries(Object.entries(VARIANTS).map(([k,v]) => [k,v.label])), picks: picks.map(({image,...r})=>({...r, ratio: image?.ratio})), results }, null, 2));
console.log('\nDone. Manifest:', `${OUT}manifest.json`);

await browser.close();
