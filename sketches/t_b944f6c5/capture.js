// Screenshot the three sketches at full frame width
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const sketches = [
  { name: 'A-strong-context', title: '方案 A · 强上下文派' },
  { name: 'B-publication', title: '方案 B · 出版物派（推荐）' },
  { name: 'C-breadcrumb', title: '方案 C · 记忆锚点派' },
];

(async () => {
  const dir = path.resolve(__dirname);
  const outDir = path.join(dir, 'evidence');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  // 三案共 3×390 + 4×32 gap + 2×40 padding = 1170 + 128 + 80 = ~1378
  // 让 viewport 宽一点 + deviceScaleFactor 2
  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 970 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  for (const s of sketches) {
    const url = 'file://' + path.join(dir, s.name + '.html');
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const out = path.join(outDir, s.name + '.png');
    await page.screenshot({ path: out, fullPage: true });
    console.log('written', out);
  }

  await browser.close();
})();
