// capture-devtools-screenshots.js
// Uses Playwright to capture screenshots with DevTools-style measurement overlays
// Run: node capture-devtools-screenshots.js

const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();
  
  console.log('Server already running on http://localhost:8765');
  
  // Navigate to pages and capture with measurement overlay
  const pages = [
    { url: 'http://localhost:8765/', name: 'feed', selector: '.brand-title' },
    { url: 'http://localhost:8765/#/work/1', name: 'detail', selector: '.work-title' },
    { url: 'http://localhost:8765/#/artist/monet', name: 'collection', selector: '.page-header .title' }
  ];
  
  for (const { url, name, selector } of pages) {
    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
    // Inject measurement overlay
    await page.evaluate((sel) => {
      const element = document.querySelector(sel);
      if (!element) return;
      
      const rect = element.getBoundingClientRect();
      const styles = window.getComputedStyle(element);
      
      // Create measurement badge
      const badge = document.createElement('div');
      badge.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        font-family: monospace;
        font-size: 11px;
        padding: 8px 12px;
        border-radius: 4px;
        z-index: 99999;
        line-height: 1.6;
        max-height: 80vh;
        overflow: auto;
      `;
      
      badge.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 6px; border-bottom: 1px solid #555; padding-bottom: 4px;">
          DevTools Computed
        </div>
        <div><strong>Element:</strong> ${element.className || element.tagName}</div>
        <div style="margin-top: 4px;"><strong>font-size:</strong> ${styles.fontSize}</div>
        <div><strong>font-family:</strong> ${styles.fontFamily}</div>
        <div><strong>line-height:</strong> ${styles.lineHeight}</div>
        <div><strong>letter-spacing:</strong> ${styles.letterSpacing}</div>
        <div style="margin-top: 4px;"><strong>width:</strong> ${rect.width.toFixed(1)}px</div>
        <div><strong>height:</strong> ${rect.height.toFixed(1)}px</div>
        <div><strong>padding:</strong> ${styles.padding}</div>
        <div><strong>margin:</strong> ${styles.margin}</div>
      `;
      
      document.body.appendChild(badge);
      
      // Highlight the element
      element.style.outline = '2px solid #00bcd4';
      element.style.outlineOffset = '2px';
    }, selector);
    
    await page.waitForTimeout(500);
    
    // Capture screenshot
    const screenshotPath = path.join(__dirname, 'evidence', `devtools-${name}-390x844.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Saved: ${screenshotPath}`);
  }
  
  await browser.close();
  console.log('Done!');
})();
