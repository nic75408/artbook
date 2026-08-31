// capture-controls-demo.js
// 拍摄控件演示页的截图
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, 'controls-screenshots');
const DEMO_PAGE = 'file://' + path.join(__dirname, 'controls-demo.html');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function main() {
  console.log('🎨 开始拍摄控件演示截图...\n');
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 450, height: 1200 }
  });
  const page = await context.newPage();

  await page.goto(DEMO_PAGE, { waitUntil: 'networkidle' });
  
  // 拍摄完整页面截图
  const fullPath = path.join(OUTPUT_DIR, 'controls-demo-full.png');
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`📸 完整演示页：${fullPath}`);

  // 拍摄每个 section 的截图
  const sections = [
    { selector: '.demo-section:nth-child(2)', name: '01-feed-header-button' },
    { selector: '.demo-section:nth-child(3)', name: '02-date-capsule' },
    { selector: '.demo-section:nth-child(4)', name: '03-detail-close' },
    { selector: '.demo-section:nth-child(5)', name: '04-fav-tool-button' },
    { selector: '.demo-section:nth-child(6)', name: '05-action-button' }
  ];

  for (const section of sections) {
    const el = await page.$(section.selector);
    if (el) {
      const sectionPath = path.join(OUTPUT_DIR, `${section.name}.png`);
      await el.screenshot({ path: sectionPath });
      console.log(`📸 ${section.name}: ${sectionPath}`);
    }
  }

  await browser.close();
  
  console.log('\n✅ 完成！所有截图保存在：' + OUTPUT_DIR);
}

main().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
