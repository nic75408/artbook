// capture-controls-screenshots.js
// 捕获首页与详情页控件的各种状态截图
// Run: node capture-controls-screenshots.js

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, 'controls-screenshots');
const BASE_URL = 'http://127.0.0.1:8080';

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// 控件定义
const controls = [
  {
    name: 'feed-header-button',
    title: '首页收藏夹入口按钮',
    selector: '.feed-header button',
    page: 'feed',
    states: ['normal', 'hover', 'active']
  },
  {
    name: 'date-capsule',
    title: '日期胶囊',
    selector: '.date-capsule',
    page: 'feed',
    states: ['normal', 'hover', 'active']
  },
  {
    name: 'detail-close',
    title: '详情页关闭按钮',
    selector: '.detail-close',
    page: 'detail',
    states: ['normal', 'hover', 'active']
  },
  {
    name: 'fav-tool-button',
    title: '收藏工具按钮',
    selector: '.action-row .fav-tool',
    page: 'detail',
    states: ['normal', 'hover', 'active', 'disabled']
  },
  {
    name: 'action-button',
    title: '主要操作按钮',
    selector: '.action-btn',
    page: 'detail',
    states: ['normal', 'hover', 'active']
  }
];

async function captureState(page, control, state) {
  const selector = control.selector;
  
  // 等待元素可见
  await page.waitForSelector(selector, { state: 'visible' });
  const element = await page.$(selector);
  
  if (!element) {
    console.log(`  ⚠️ 元素未找到：${control.name} (${state})`);
    return null;
  }

  // 应用状态
  if (state === 'hover') {
    await element.hover();
  } else if (state === 'active') {
    await element.evaluate(el => {
      el.style.setProperty('transform', 'scale(0.98)', 'important');
      el.style.setProperty('transition', 'none');
    });
  } else if (state === 'disabled') {
    await element.evaluate(el => {
      el.disabled = true;
      el.style.setProperty('opacity', '0.5');
      el.style.setProperty('pointer-events', 'none');
    });
  }

  // 等待一小段时间让过渡完成
  await page.waitForTimeout(300);

  // 获取元素边界框
  const box = await element.boundingBox();
  if (!box) {
    console.log(`  ⚠️ 无法获取边界框：${control.name} (${state})`);
    return null;
  }

  // 裁剪截图（元素周围加一些边距）
  const padding = 20;
  const screenshotPath = path.join(OUTPUT_DIR, `${control.name}-${state}.png`);
  await page.screenshot({
    path: screenshotPath,
    clip: {
      x: Math.max(0, box.x - padding),
      y: Math.max(0, box.y - padding),
      width: box.width + padding * 2,
      height: box.height + padding * 2
    }
  });

  // 重置状态
  if (state === 'active' || state === 'disabled') {
    await element.evaluate(el => {
      el.style.removeProperty('transform');
      el.style.removeProperty('transition');
      el.disabled = false;
      el.style.removeProperty('opacity');
      el.style.removeProperty('pointer-events');
    });
  }

  console.log(`  ✓ ${control.name} - ${state}`);
  return screenshotPath;
}

async function main() {
  console.log('🎨 开始捕获控件状态截图...\n');
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  const page = await context.newPage();

  const results = {};

  for (const control of controls) {
    console.log(`📸 ${control.title} (${control.name})`);
    
    // 导航到对应页面
    if (control.page === 'feed') {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    } else if (control.page === 'detail') {
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      // 点击第一个作品进入详情页
      await page.click('.slide:first-of-type');
      await page.waitForSelector('.detail-close', { state: 'visible' });
    }

    results[control.name] = {};

    for (const state of control.states) {
      const screenshotPath = await captureState(page, control, state);
      if (screenshotPath) {
        results[control.name][state] = path.basename(screenshotPath);
      }
    }

    console.log('');
  }

  await browser.close();

  // 保存结果 JSON
  const jsonPath = path.join(OUTPUT_DIR, 'controls-screenshots.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`✅ 完成！截图保存在：${OUTPUT_DIR}/`);
  console.log(`📄 结果 JSON: ${jsonPath}`);
}

main().catch(err => {
  console.error('❌ 错误:', err);
  process.exit(1);
});
