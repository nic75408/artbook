const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-14-pro', width: 390, height: 844 },
  { name: 'android', width: 360, height: 800 }
];

const ARTWORKS = [
  { id: '1', name: '星月夜' },
  { id: '2', name: '蒙娜丽莎' },
  { id: '3', name: '戴珍珠耳环的少女' },
  { id: '4', name: '神奈川冲浪里' },
  { id: '5', name: '最后的晚餐' }
];

const OUTPUT_DIR = path.join(__dirname, 'ui-artwork-info');
const BASE_URL = 'http://127.0.0.1:8889/index.html';

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const artwork of ARTWORKS) {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height }
      });
      const page = await context.newPage();

      const url = `${BASE_URL}#work-${artwork.id}`;
      console.log(`Capturing: ${artwork.name} @ ${viewport.name} (${viewport.width}x${viewport.height})`);

      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        const filename = `artwork-${artwork.id}-${viewport.name}.png`;
        const filepath = path.join(OUTPUT_DIR, filename);
        await page.screenshot({ path: filepath, fullPage: false });

        results.push({
          artworkId: artwork.id,
          artworkName: artwork.name,
          viewport: viewport.name,
          viewportSize: `${viewport.width}x${viewport.height}`,
          url: url,
          screenshot: filename,
          timestamp: new Date().toISOString()
        });

        console.log(`  -> ${filename}`);
      } catch (err) {
        console.error(`  FAILED: ${err.message}`);
        results.push({
          artworkId: artwork.id,
          artworkName: artwork.name,
          viewport: viewport.name,
          error: err.message
        });
      }

      await context.close();
    }
  }

  await browser.close();

  const manifestPath = path.join(OUTPUT_DIR, 'artwork-info-card-screenshots.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalScreenshots: results.filter(r => !r.error).length,
    totalExpected: ARTWORKS.length * VIEWPORTS.length,
    results: results
  }, null, 2));

  console.log(`\nManifest written to: ${manifestPath}`);
  return results;
}

captureScreenshots().catch(console.error);
