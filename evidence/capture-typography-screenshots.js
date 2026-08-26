const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const VIEWPORT = { name: 'iphone-14-pro', width: 390, height: 844 };

const PAGES = [
  { 
    name: 'feed', 
    url: 'http://127.0.0.1:8765/',
    selector: '.brand-title',
    selector2: '.slide .names .title-en'
  },
  { 
    name: 'detail', 
    url: 'http://127.0.0.1:8765/#/work/1',
    selector: '.work-title',
    selector2: '.essay .body-text'
  },
  { 
    name: 'collection', 
    url: 'http://127.0.0.1:8765/#/artist/1',
    selector: '.page-header .title',
    selector2: '.grid .card .t'
  },
  { 
    name: 'favorites', 
    url: 'http://127.0.0.1:8765/#/favs',
    selector: '.page-header .title',
    selector2: '.grid .card .t'
  }
];

const OUTPUT_DIR = path.join(__dirname, 'typography-measurements');

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const measurements = {
    viewport: VIEWPORT,
    timestamp: new Date().toISOString(),
    pages: []
  };

  for (const pageSpec of PAGES) {
    console.log(`Capturing ${pageSpec.name}...`);
    
    const context = await browser.newContext({
      viewport: VIEWPORT
    });
    const page = await context.newPage();
    
    await page.goto(pageSpec.url, { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Wait for specific elements to be visible
    try {
      await page.waitForSelector(pageSpec.selector, { state: 'visible', timeout: 5000 });
    } catch (e) {
      console.log(`  Warning: ${pageSpec.selector} not found on ${pageSpec.name}`);
    }
    
    // Extract computed styles for key elements
    const extractStyles = async (selector) => {
      return await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const styles = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          selector: sel,
          fontSize: styles.fontSize,
          fontFamily: styles.fontFamily,
          fontWeight: styles.fontWeight,
          letterSpacing: styles.letterSpacing,
          lineHeight: styles.lineHeight,
          paddingTop: styles.paddingTop,
          paddingRight: styles.paddingRight,
          paddingBottom: styles.paddingBottom,
          paddingLeft: styles.paddingLeft,
          marginTop: styles.marginTop,
          marginRight: styles.marginRight,
          marginBottom: styles.marginBottom,
          marginLeft: styles.marginLeft,
          width: rect.width,
          height: rect.height
        };
      }, selector);
    };
    
    const primaryStyles = await extractStyles(pageSpec.selector);
    const secondaryStyles = await extractStyles(pageSpec.selector2);
    
    // Capture full page screenshot
    const screenshotPath = path.join(OUTPUT_DIR, `typography-${pageSpec.name}-${VIEWPORT.width}x${VIEWPORT.height}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    // Capture element screenshots with bounding box
    if (primaryStyles) {
      const primaryEl = await page.$(pageSpec.selector);
      if (primaryEl) {
        const primaryBoxPath = path.join(OUTPUT_DIR, `typography-${pageSpec.name}-primary-box.png`);
        await primaryEl.screenshot({ path: primaryBoxPath });
      }
    }
    
    if (secondaryStyles) {
      const secondaryEl = await page.$(pageSpec.selector2);
      if (secondaryEl) {
        const secondaryBoxPath = path.join(OUTPUT_DIR, `typography-${pageSpec.name}-secondary-box.png`);
        await secondaryEl.screenshot({ path: secondaryBoxPath });
      }
    }
    
    measurements.pages.push({
      name: pageSpec.name,
      url: pageSpec.url,
      primaryElement: {
        selector: pageSpec.selector,
        styles: primaryStyles
      },
      secondaryElement: {
        selector: pageSpec.selector2,
        styles: secondaryStyles
      },
      screenshots: {
        fullPage: `typography-${pageSpec.name}-${VIEWPORT.width}x${VIEWPORT.height}.png`,
        primaryBox: primaryStyles ? `typography-${pageSpec.name}-primary-box.png` : null,
        secondaryBox: secondaryStyles ? `typography-${pageSpec.name}-secondary-box.png` : null
      }
    });
    
    await context.close();
  }

  await browser.close();
  
  // Write measurements JSON
  const jsonPath = path.join(OUTPUT_DIR, 'typography-measurements.json');
  fs.writeFileSync(jsonPath, JSON.stringify(measurements, null, 2));
  
  console.log(`\nMeasurements saved to ${jsonPath}`);
  console.log(`Screenshots saved to ${OUTPUT_DIR}/`);
}

main().catch(console.error);
