const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const VIEWPORT = { name: 'iphone-14-pro', width: 390, height: 844 };

const PAGES = [
  { 
    name: 'feed', 
    url: 'http://127.0.0.1:8765/', 
    selector: '.feed-header .wordmark',
    additionalSelectors: ['.artist-zh', '.title-en']
  },
  { 
    name: 'detail', 
    url: 'http://127.0.0.1:8765/#/work/monet-1840-1', 
    selector: '.artwork-info-card .work-title',
    additionalSelectors: ['.work-meta-label', '.work-meta-value', '.tag-pill', '.credit']
  },
  { 
    name: 'collection', 
    url: 'http://127.0.0.1:8765/#/artist/impressionism', 
    selector: '.page-header .title',
    additionalSelectors: ['.grid .t', '.grid .a']
  },
  {
    name: 'favorites',
    url: 'http://127.0.0.1:8765/#/favs',
    selector: '.page-header .title',
    additionalSelectors: ['.grid .t', '.grid .a']
  }
];

const OUTPUT_DIR = path.join(__dirname, 'typography-measurements');

async function captureScreenshots() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const pageSpec of PAGES) {
    const context = await browser.newContext({
      viewport: { width: VIEWPORT.width, height: VIEWPORT.height }
    });
    const page = await context.newPage();

    console.log(`Capturing: ${pageSpec.name} @ ${VIEWPORT.name} (${VIEWPORT.width}x${VIEWPORT.height})`);

    try {
      await page.goto(pageSpec.url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Inject ruler overlay for DevTools-like measurement visualization
      await page.evaluate(() => {
        const ruler = document.createElement('div');
        ruler.style.cssText = `
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 99999;
          background: 
            linear-gradient(to right, rgba(255,0,0,0.1) 1px, transparent 1px) 0 0 / 10px 100%,
            linear-gradient(to bottom, rgba(0,255,0,0.1) 1px, transparent 1px) 0 0 / 100% 10px;
        `;
        document.body.appendChild(ruler);
      });

      const filename = `typography-${pageSpec.name}-${VIEWPORT.name}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);
      await page.screenshot({ path: filepath, fullPage: false });

      // Extract computed styles for key elements
      const extractStyles = async (selector) => {
        return await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          const computed = getComputedStyle(el);
          return {
            fontSize: computed.fontSize,
            fontFamily: computed.fontFamily,
            fontWeight: computed.fontWeight,
            letterSpacing: computed.letterSpacing,
            lineHeight: computed.lineHeight,
            color: computed.color,
            width: el.offsetWidth,
            height: el.offsetHeight
          };
        }, selector);
      };

      const primaryStyles = await extractStyles(pageSpec.selector);
      
      const additionalStyles = {};
      for (const sel of (pageSpec.additionalSelectors || [])) {
        const el = await page.$(sel);
        if (el) {
          additionalStyles[sel] = await extractStyles(sel);
        }
      }

      results.push({
        page: pageSpec.name,
        url: pageSpec.url,
        viewport: `${VIEWPORT.width}x${VIEWPORT.height}`,
        primarySelector: pageSpec.selector,
        primaryStyles: primaryStyles,
        additionalStyles: additionalStyles,
        screenshot: filename,
        timestamp: new Date().toISOString()
      });

      console.log(`  -> ${filename}`);
      console.log(`  Primary: ${JSON.stringify(primaryStyles)}`);
      if (Object.keys(additionalStyles).length > 0) {
        console.log(`  Additional: ${JSON.stringify(additionalStyles)}`);
      }
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      results.push({
        page: pageSpec.name,
        error: err.message
      });
    }

    await context.close();
  }

  await browser.close();

  const manifestPath = path.join(OUTPUT_DIR, 'typography-measurements.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    viewport: VIEWPORT,
    totalScreenshots: results.filter(r => !r.error).length,
    results: results
  }, null, 2));

  console.log(`\nManifest written to: ${manifestPath}`);
  
  // Print summary for verification
  console.log('\n=== TYPOGRAPHY VERIFICATION SUMMARY ===');
  for (const r of results) {
    if (r.primaryStyles) {
      console.log(`\n${r.page.toUpperCase()}:`);
      console.log(`  Font-size: ${r.primaryStyles.fontSize}`);
      console.log(`  Font-family: ${r.primaryStyles.fontFamily}`);
      console.log(`  Font-weight: ${r.primaryStyles.fontWeight}`);
    }
  }
  
  return results;
}

captureScreenshots().catch(console.error);
