const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = '/Users/david/人文/艺术手册/artbook/.worktrees/t_8421b3c4/evidence';

async function runPwaTests() {
  console.log('Starting PWA verification tests...\n');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 12/13/14
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });
  
  const page = await context.newPage();
  const results = {
    timestamp: new Date().toISOString(),
    tests: []
  };

  // Test 1: Initial load with Service Worker
  console.log('Test 1: Initial page load with Service Worker...');
  const startTime = Date.now();
  await page.goto('http://localhost:8765/', { waitUntil: 'networkidle', timeout: 30000 });
  const loadTime = Date.now() - startTime;
  
  // Wait for content to render
  await page.waitForSelector('#view', { timeout: 5000 });
  const renderTime = Date.now() - startTime;
  
  // Check for white screen (measure background color)
  const backgroundColor = await page.evaluate(() => {
    const view = document.getElementById('view');
    if (!view) return 'no-view-element';
    const style = window.getComputedStyle(document.body);
    return style.backgroundColor;
  });
  
  // Check console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  // Take screenshot
  const screenshot1Path = path.join(EVIDENCE_DIR, 'pwa-mobile-load-390x844.png');
  await page.screenshot({ path: screenshot1Path, fullPage: false });
  
  // Get Service Worker status
  const swStatus = await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      return {
        registered: !!registration,
        active: !!(registration && registration.active),
        state: registration?.active?.state || 'none'
      };
    }
    return { registered: false };
  });
  
  results.tests.push({
    name: 'Initial Load (Mobile Viewport)',
    loadTime: `${loadTime}ms`,
    renderTime: `${renderTime}ms`,
    backgroundColor,
    consoleErrors: consoleErrors.length,
    serviceWorker: swStatus,
    screenshot: screenshot1Path,
    passed: renderTime < 3000 && backgroundColor !== 'no-view-element'
  });
  
  console.log(`  Load time: ${loadTime}ms`);
  console.log(`  Render time: ${renderTime}ms`);
  console.log(`  Background: ${backgroundColor}`);
  console.log(`  SW registered: ${swStatus.registered}, active: ${swStatus.active}`);
  console.log(`  Screenshot: ${screenshot1Path}\n`);

  // Test 2: Hard refresh with Service Worker active
  console.log('Test 2: Hard refresh with active Service Worker...');
  const refreshStart = Date.now();
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  const refreshTime = Date.now() - refreshStart;
  
  // Wait for view to render
  await page.waitForSelector('#view', { timeout: 5000 });
  
  const screenshot2Path = path.join(EVIDENCE_DIR, 'pwa-refresh-sw-active-390x844.png');
  await page.screenshot({ path: screenshot2Path, fullPage: false });
  
  results.tests.push({
    name: 'Hard Refresh (SW Active)',
    refreshTime: `${refreshTime}ms`,
    screenshot: screenshot2Path,
    passed: refreshTime < 3000
  });
  
  console.log(`  Refresh time: ${refreshTime}ms`);
  console.log(`  Screenshot: ${screenshot2Path}\n`);

  // Test 3: Offline mode
  console.log('Test 3: Offline mode test...');
  await page.context().setOffline(true);
  
  try {
    await page.reload({ waitUntil: 'networkidle', timeout: 10000 });
    
    // Check if page loaded (either cached content or offline.html)
    const offlineContent = await page.evaluate(() => {
      const view = document.getElementById('view');
      const isOfflinePage = document.title.includes('离线') || document.body.innerText.includes('离线');
      return {
        hasView: !!view,
        isOfflinePage,
        hasContent: document.body.innerText.length > 50
      };
    });
    
    const screenshot3Path = path.join(EVIDENCE_DIR, 'pwa-offline-mode-390x844.png');
    await page.screenshot({ path: screenshot3Path, fullPage: false });
    
    results.tests.push({
      name: 'Offline Mode',
      offlineContent,
      screenshot: screenshot3Path,
      passed: offlineContent.hasView || offlineContent.isOfflinePage
    });
    
    console.log(`  Offline content: ${JSON.stringify(offlineContent)}`);
    console.log(`  Screenshot: ${screenshot3Path}\n`);
  } catch (error) {
    results.tests.push({
      name: 'Offline Mode',
      error: error.message,
      passed: false
    });
    console.log(`  Offline test failed: ${error.message}\n`);
  }

  // Test 4: Check cache storage
  console.log('Test 4: Cache Storage inspection...');
  const cacheInfo = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    const cacheDetails = {};
    
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      cacheDetails[name] = keys.length;
    }
    
    return {
      cacheNames,
      cacheDetails,
      hasAppCache: cacheNames.some(n => n.includes('artbook-app'))
    };
  });
  
  results.cacheInfo = cacheInfo;
  console.log(`  Caches: ${JSON.stringify(cacheInfo)}\n`);

  await browser.close();
  
  // Save JSON report
  const reportPath = path.join(EVIDENCE_DIR, 'pwa-automated-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`Report saved to: ${reportPath}`);
  
  // Summary
  console.log('\n=== Test Summary ===');
  const passed = results.tests.filter(t => t.passed).length;
  const total = results.tests.length;
  console.log(`Passed: ${passed}/${total}`);
  
  results.tests.forEach(t => {
    console.log(`  ${t.passed ? '✅' : '❌'} ${t.name}`);
  });
  
  return results;
}

runPwaTests().catch(console.error);
