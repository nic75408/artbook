import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..');
const outDir = `${root}/evidence/t_4c2a874b`;

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
});
const page = await ctx.newPage();

for (const name of ['A-dual-pill', 'B-inline-serif', 'C-hairline-ring']) {
  const url = `file://${root}/sketches/${name}/index.html`;
  await page.goto(url, { waitUntil: 'networkidle' });
  const shot = `${outDir}/sketch-${name}.png`;
  await page.screenshot({ path: shot, fullPage: false });
  console.log(name, '->', shot);
}
await browser.close();
