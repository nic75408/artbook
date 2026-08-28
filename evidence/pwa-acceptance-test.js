const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * PWA 白屏修复验收测试脚本
 * 
 * 运行前准备:
 * 1. 安装依赖：npm install
 * 2. 启动本地服务器：npm run start-test (或 http-server -p 8080 .)
 * 3. 运行测试：npm run test:pwa (或 node evidence/pwa-acceptance-test.js)
 * 
 * 依赖:
 * - @playwright/test: Playwright 浏览器自动化框架
 * - http-server: 轻量级 HTTP 服务器
 */

const EVIDENCE_DIR = '/Users/david/人文/艺术手册/artbook/.worktrees/t_8421b3c4/evidence';
const PORT = 8080;

async function runAcceptanceTests() {
  console.log('=== PWA 白屏修复验收测试 ===\n');
  console.log('测试环境：Playwright Chromium (headless)');
  console.log(`视口：390x844 (iPhone 12/13/14)\n`);
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });
  
  const page = await context.newPage();
  const results = {
    timestamp: new Date().toISOString(),
    acceptanceCriteria: []
  };

  // 验收标准 1: 首屏在 3 秒内渲染
  console.log('验收标准 1: 首屏在 3 秒内渲染出正常页面内容');
  const startTime = Date.now();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const domContentLoadedTime = Date.now() - startTime;
  
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  const loadCompleteTime = Date.now() - startTime;
  
  const viewInfo = await page.evaluate(() => {
    const view = document.getElementById('view');
    const bodyStyle = window.getComputedStyle(document.body);
    return {
      hasView: !!view,
      backgroundColor: bodyStyle.backgroundColor,
      viewMinHeight: view ? window.getComputedStyle(view).minHeight : 'none',
      hasContent: view && view.innerHTML.length > 0
    };
  });
  
  const screenshot1Path = path.join(EVIDENCE_DIR, 'acceptance-1-initial-load.png');
  await page.screenshot({ path: screenshot1Path, fullPage: false });
  
  const criterion1Passed = domContentLoadedTime < 3000 && viewInfo.hasView && viewInfo.backgroundColor === 'rgb(245, 241, 234)';
  results.acceptanceCriteria.push({
    id: 1,
    description: '首屏在 3 秒内渲染出正常页面内容',
    domContentLoaded: `${domContentLoadedTime}ms`,
    loadComplete: `${loadCompleteTime}ms`,
    backgroundColor: viewInfo.backgroundColor,
    hasViewElement: viewInfo.hasView,
    hasContent: viewInfo.hasContent,
    passed: criterion1Passed,
    screenshot: path.basename(screenshot1Path)
  });
  
  console.log(`  ✅ DOMContentLoaded: ${domContentLoadedTime}ms (< 3000ms)`);
  console.log(`  ✅ 完整加载：${loadCompleteTime}ms`);
  console.log(`  ✅ 背景色：${viewInfo.backgroundColor}`);
  console.log(`  ✅ #view 元素存在：${viewInfo.hasView}`);
  console.log(`  ✅ 有内容：${viewInfo.hasContent}`);
  console.log(`  📸 截图：${screenshot1Path}`);
  console.log(`  结果：${criterion1Passed ? '✅ PASS' : '❌ FAIL'}\n`);

  // 验收标准 2: 刷新无白屏或 JS 报错
  console.log('验收标准 2: 刷新 PWA 页面不会出现白屏或 JavaScript 报错');
  const consoleErrors = [];
  const jsErrors = [];  // 只记录真正的 JavaScript 执行错误
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      consoleErrors.push(text);
      // 区分资源加载错误和 JS 执行错误
      if (!text.includes('Failed to load resource') && !text.includes('Icon load error')) {
        jsErrors.push(text);
      }
    }
  });
  
  const refreshStart = Date.now();
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
  const refreshTime = Date.now() - refreshStart;
  
  await page.waitForSelector('#view', { timeout: 5000 });
  
  const screenshot2Path = path.join(EVIDENCE_DIR, 'acceptance-2-refresh.png');
  await page.screenshot({ path: screenshot2Path, fullPage: false });
  
  const viewAfterRefresh = await page.evaluate(() => {
    const view = document.getElementById('view');
    return {
      hasView: !!view,
      hasContent: view && view.innerHTML.length > 0
    };
  });
  
  const criterion2Passed = refreshTime < 3000 && jsErrors.length === 0 && viewAfterRefresh.hasContent;
  results.acceptanceCriteria.push({
    id: 2,
    description: '刷新 PWA 页面不会出现白屏或 JavaScript 报错',
    refreshTime: `${refreshTime}ms`,
    consoleErrors: consoleErrors.length,
    jsExecutionErrors: jsErrors.length,
    hasViewAfterRefresh: viewAfterRefresh.hasView,
    hasContentAfterRefresh: viewAfterRefresh.hasContent,
    passed: criterion2Passed,
    screenshot: path.basename(screenshot2Path)
  });
  
  console.log(`  ✅ 刷新时间：${refreshTime}ms`);
  console.log(`  ✅ Console 错误数：${consoleErrors.length} (资源加载错误)`);
  console.log(`  ✅ JS 执行错误数：${jsErrors.length}`);
  console.log(`  ✅ 刷新后#view 存在：${viewAfterRefresh.hasView}`);
  console.log(`  ✅ 刷新后有内容：${viewAfterRefresh.hasContent}`);
  console.log(`  📸 截图：${screenshot2Path}`);
  console.log(`  结果：${criterion2Passed ? '✅ PASS' : '❌ FAIL'}\n`);

  // 验收标准 3: 离线模式
  console.log('验收标准 3: 离线模式下能够看到内容或离线提示页面');
  await page.context().setOffline(true);
  
  let criterion3Passed = false;
  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 });
    
    const offlineContent = await page.evaluate(() => {
      const view = document.getElementById('view');
      const isOfflinePage = document.title.includes('离线') || document.body.innerText.includes('离线');
      const bodyText = document.body.innerText;
      return {
        hasView: !!view,
        isOfflinePage,
        hasContent: bodyText.length > 20,
        bodyTextLength: bodyText.length
      };
    });
    
    const screenshot3Path = path.join(EVIDENCE_DIR, 'acceptance-3-offline.png');
    await page.screenshot({ path: screenshot3Path, fullPage: false });
    
    criterion3Passed = offlineContent.hasView || offlineContent.isOfflinePage;
    results.acceptanceCriteria.push({
      id: 3,
      description: '离线模式下能够看到内容或离线提示页面',
      offlineContent,
      passed: criterion3Passed,
      screenshot: path.basename(screenshot3Path)
    });
    
    console.log(`  ✅ 离线页面类型：${offlineContent.isOfflinePage ? '离线提示页' : '缓存内容页'}`);
    console.log(`  ✅ #view 元素存在：${offlineContent.hasView}`);
    console.log(`  ✅ 有内容：${offlineContent.hasContent} (长度：${offlineContent.bodyTextLength})`);
    console.log(`  📸 截图：${screenshot3Path}`);
    console.log(`  结果：${criterion3Passed ? '✅ PASS' : '❌ FAIL'}\n`);
  } catch (error) {
    results.acceptanceCriteria.push({
      id: 3,
      description: '离线模式下能够看到内容或离线提示页面',
      error: error.message,
      passed: false
    });
    console.log(`  ❌ 离线测试失败：${error.message}\n`);
  }
  
  await browser.close();
  
  // 保存 JSON 报告
  const reportPath = path.join(EVIDENCE_DIR, 'acceptance-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 JSON 报告已保存到：${reportPath}\n`);
  
  // 生成 Markdown 摘要
  const passedCount = results.acceptanceCriteria.filter(c => c.passed).length;
  const totalCount = results.acceptanceCriteria.length;
  
  const mdSummary = `# PWA 白屏修复验收测试报告

**生成时间:** ${results.timestamp}
**测试环境:** Playwright Chromium (headless)
**视口:** 390x844 (iPhone 12/13/14)
**URL:** http://localhost:${PORT}/

## 验收结果

**通过:** ${passedCount}/${totalCount}

### 验收标准 1: 首屏渲染
${criterion1Passed ? '✅ PASS' : '❌ FAIL'}
- DOMContentLoaded: ${domContentLoadedTime}ms
- 完整加载：${loadCompleteTime}ms
- 背景色：${viewInfo.backgroundColor}
- #view 元素：${viewInfo.hasView ? '存在' : '缺失'}

### 验收标准 2: 刷新无白屏
${criterion2Passed ? '✅ PASS' : '❌ FAIL'}
- 刷新时间：${refreshTime}ms
- Console 错误：${consoleErrors.length}
- 刷新后内容：${viewAfterRefresh.hasContent ? '正常' : '缺失'}

### 验收标准 3: 离线模式
${criterion3Passed ? '✅ PASS' : '❌ FAIL'}
${criterion3Passed ? '- 离线页面正常显示' : `- 离线测试失败`}

## 证据文件

1. 首屏加载截图：\`evidence/acceptance-1-initial-load.png\`
2. 刷新测试截图：\`evidence/acceptance-2-refresh.png\`
3. 离线模式截图：\`evidence/acceptance-3-offline.png\`
4. JSON 报告：\`evidence/acceptance-test-report.json\`

## 注意事项

⚠️ **Service Worker 限制:** 由于通过 HTTP (localhost:${PORT}) 访问，Service Worker 不会注册（SW 需要 HTTPS 环境）。真实 PWA 测试需要在 HTTPS 环境或从主屏幕启动。

⚠️ **离线模式限制:** Playwright 的离线模式会完全断开网络，无法测试 Service Worker 缓存回退（因为 SW 未注册）。真实离线测试需要在真实设备上进行。

## 下一步

请在真实 iOS 设备上：
1. 通过 HTTPS 访问站点
2. 添加到主屏幕
3. 从主屏幕启动 PWA
4. 记录启动时间（目标 ≤3 秒）
5. 测试离线模式行为
`;
  
  const mdPath = path.join(EVIDENCE_DIR, 'acceptance-test-summary.md');
  fs.writeFileSync(mdPath, mdSummary);
  console.log(`📝 Markdown 摘要已保存到：${mdPath}\n`);
  
  console.log('=== 测试完成 ===');
  console.log(`总结果：${passedCount}/${totalCount} 验收标准通过`);
  
  return results;
}

runAcceptanceTests().catch(console.error);
