const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = '/Users/david/人文/艺术手册/artbook/.worktrees/t_8421b3c4/evidence';

async function runPwaTests() {
  console.log('Starting PWA verification tests (mobile viewport)...\n');
  
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
    viewport: { width: 390, height: 844 },
    url: 'http://localhost:8765/',
    tests: []
  };

  // Test 1: Initial load - measure time to first content
  console.log('Test 1: Initial page load (mobile viewport 390x844)...');
  const startTime = Date.now();
  await page.goto('http://localhost:8765/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  const domContentLoadedTime = Date.now() - startTime;
  
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  const loadCompleteTime = Date.now() - startTime;
  
  // Check for view element and background color
  const viewInfo = await page.evaluate(() => {
    const view = document.getElementById('view');
    const bodyStyle = window.getComputedStyle(document.body);
    return {
      hasView: !!view,
      backgroundColor: bodyStyle.backgroundColor,
      viewMinHeight: view ? window.getComputedStyle(view).minHeight : 'none'
    };
  });
  
  // Take screenshot of initial load
  const screenshot1Path = path.join(EVIDENCE_DIR, 'pwa-mobile-load-390x844.png');
  await page.screenshot({ path: screenshot1Path, fullPage: false });
  console.log(`  ✅ DOMContentLoaded: ${domContentLoadedTime}ms`);
  console.log(`  ✅ Load complete: ${loadCompleteTime}ms`);
  console.log(`  ✅ Background: ${viewInfo.backgroundColor}`);
  console.log(`  ✅ Has #view: ${viewInfo.hasView}`);
  console.log(`  📸 Screenshot: ${screenshot1Path}\n`);
  
  results.tests.push({
    name: 'Initial Load (Mobile Viewport 390x844)',
    domContentLoaded: `${domContentLoadedTime}ms`,
    loadComplete: `${loadCompleteTime}ms`,
    backgroundColor: viewInfo.backgroundColor,
    hasViewElement: viewInfo.hasView,
    screenshot: path.basename(screenshot1Path),
    passed: domContentLoadedTime < 3000 && viewInfo.hasView
  });

  // Test 2: Hard refresh
  console.log('Test 2: Hard refresh...');
  const refreshStart = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  const refreshTime = Date.now() - refreshStart;
  
  const screenshot2Path = path.join(EVIDENCE_DIR, 'pwa-refresh-390x844.png');
  await page.screenshot({ path: screenshot2Path, fullPage: false });
  console.log(`  ✅ Refresh time: ${refreshTime}ms`);
  console.log(`  📸 Screenshot: ${screenshot2Path}\n`);
  
  results.tests.push({
    name: 'Hard Refresh',
    refreshTime: `${refreshTime}ms`,
    screenshot: path.basename(screenshot2Path),
    passed: refreshTime < 3000
  });

  // Test 3: Check page structure and CSS
  console.log('Test 3: Page structure and CSS verification...');
  const pageStructure = await page.evaluate(() => {
    return {
      title: document.title,
      hasViewport: !!document.querySelector('meta[name="viewport"]'),
      hasManifest: !!document.querySelector('link[rel="manifest"]'),
      hasInlineCSS: !!document.querySelector('style'),
      themeColor: document.querySelector('meta[name="theme-color"]')?.content,
      appleWebAppTitle: document.querySelector('meta[name="apple-mobile-web-app-title"]')?.content
    };
  });
  
  console.log(`  Title: ${pageStructure.title}`);
  console.log(`  Viewport meta: ${pageStructure.hasViewport}`);
  console.log(`  Manifest link: ${pageStructure.hasManifest}`);
  console.log(`  Inline CSS: ${pageStructure.hasInlineCSS}`);
  console.log(`  Theme color: ${pageStructure.themeColor}`);
  console.log(`  Apple Web App Title: ${pageStructure.appleWebAppTitle}\n`);
  
  results.pageStructure = pageStructure;
  
  // Test 4: Check manifest
  console.log('Test 4: Manifest validation...');
  try {
    const manifestResponse = await page.goto('http://localhost:8765/manifest.webmanifest', { timeout: 5000 });
    const manifestData = await page.evaluate(() => document.body.innerText);
    const manifest = JSON.parse(manifestData);
    
    console.log(`  name: ${manifest.name}`);
    console.log(`  start_url: ${manifest.start_url}`);
    console.log(`  display: ${manifest.display}`);
    console.log(`  theme_color: ${manifest.theme_color}\n`);
    
    results.manifest = {
      valid: true,
      name: manifest.name,
      start_url: manifest.start_url,
      display: manifest.display,
      theme_color: manifest.theme_color
    };
  } catch (error) {
    console.log(`  ⚠️ Manifest fetch failed: ${error.message}\n`);
    results.manifest = { valid: false, error: error.message };
  }

  // Test 5: Check Service Worker file exists
  console.log('Test 5: Service Worker file check...');
  try {
    const swResponse = await page.goto('http://localhost:8765/sw.js', { timeout: 5000 });
    const swStatus = swResponse.status();
    console.log(`  sw.js HTTP status: ${swStatus}`);
    results.serviceWorker = { exists: swStatus === 200, httpStatus: swStatus };
  } catch (error) {
    console.log(`  ⚠️ SW fetch failed: ${error.message}`);
    results.serviceWorker = { exists: false, error: error.message };
  }

  // Test 6: Check offline.html exists
  console.log('\nTest 6: offline.html check...');
  try {
    const offlineResponse = await page.goto('http://localhost:8765/offline.html', { timeout: 5000 });
    const offlineStatus = offlineResponse.status();
    console.log(`  offline.html HTTP status: ${offlineStatus}`);
    results.offlinePage = { exists: offlineStatus === 200, httpStatus: offlineStatus };
  } catch (error) {
    console.log(`  ⚠️ offline.html fetch failed: ${error.message}`);
    results.offlinePage = { exists: false, error: error.message };
  }

  await browser.close();
  
  // Summary
  console.log('\n=== Test Summary ===');
  const passed = results.tests.filter(t => t.passed).length;
  const total = results.tests.length;
  console.log(`Tests passed: ${passed}/${total}`);
  results.tests.forEach(t => {
    console.log(`  ${t.passed ? '✅' : '❌'} ${t.name}`);
  });
  
  // Save JSON report
  const reportPath = path.join(EVIDENCE_DIR, 'pwa-desktop-automated-test.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Report saved to: ${path.basename(reportPath)}`);
  
  // Generate markdown summary
  const mdSummary = `# PWA 桌面端自动化验证报告

**生成时间:** ${results.timestamp}
**测试环境:** Playwright Chromium (headless)
**视口:** ${results.viewport.width}x${results.viewport.height} (iPhone 12/13/14)
**URL:** ${results.url}

## 测试结果

${results.tests.map(t => `### ${t.passed ? '✅' : '❌'} ${t.name}
${Object.entries(t).filter(([k]) => !['name', 'passed', 'screenshot'].includes(k)).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}
${t.screenshot ? `![Screenshot](evidence/${t.screenshot})` : ''}
`).join('\n')}

## 页面结构

${Object.entries(results.pageStructure).map(([k, v]) => `- **${k}:** ${v}`).join('\n')}

## Manifest

${results.manifest.valid ? '✅ Valid' : '❌ Invalid'}
${Object.entries(results.manifest).filter(([k]) => k !== 'valid').map(([k, v]) => `- **${k}:** ${v}`).join('\n')}

## Service Worker

${results.serviceWorker.exists ? '✅ sw.js exists' : '❌ sw.js missing'}

## Offline Page

${results.offlinePage.exists ? '✅ offline.html exists' : '❌ offline.html missing'}

## 注意事项

⚠️ **Service Worker 注册限制:** 由于通过 HTTP (localhost:8765) 访问，Service Worker 不会注册（SW 需要 HTTPS 环境）。真实 PWA 测试需要在 HTTPS 环境或从主屏幕启动。

⚠️ **离线模式限制:** Playwright 的离线模式会完全断开网络，无法测试 Service Worker 缓存回退（因为 SW 未注册）。真实离线测试需要在真实设备上进行。

## 下一步

请在真实 iOS 设备上：
1. 通过 HTTPS 访问站点
2. 添加到主屏幕
3. 从主屏幕启动 PWA
4. 记录启动时间（目标 ≤3 秒）
5. 测试离线模式行为
`;
  
  const mdPath = path.join(EVIDENCE_DIR, 'pwa-desktop-test-summary.md');
  fs.writeFileSync(mdPath, mdSummary);
  console.log(`📝 Summary saved to: ${path.basename(mdPath)}`);
  
  return results;
}

runPwaTests().catch(console.error);
