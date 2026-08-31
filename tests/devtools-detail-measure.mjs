// DevTools 测量脚本 - 输出详情页关键元素的 bounding box 数值
// 用于与 docs/layout-grid-spec.md 对照验证

import { chromium } from 'playwright';

const IPHONE_14_PRO = { width: 390, height: 844 };
const BASE_URL = 'http://localhost:8080';
const TEST_WORK_ID = 'met-435809'; // 收割者 - 勃鲁盖尔

async function measureDetailPage() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: IPHONE_14_PRO
  });
  const page = await context.newPage();

  console.log('=== 详情页 DevTools 测量报告 ===\n');
  console.log(`测试作品：${TEST_WORK_ID} (收割者 - 勃鲁盖尔)\n`);

  // 导航到详情页
  await page.goto(`${BASE_URL}/index.html#/work/${TEST_WORK_ID}`);
  await page.waitForSelector('#view .detail-hero img', { timeout: 10000 });
  
  // 等待数据加载完成
  await page.waitForTimeout(1000);

  // 测量所有关键元素
  const measurements = await page.evaluate(() => {
    const view = document.querySelector('#view');
    const detailHero = document.querySelector('#view .detail-hero');
    const detailBody = document.querySelector('#view .detail-body');
    const relatedScroll = document.querySelector('#view .related-scroll');
    
    // 标题元素（使用实际的类名）
    const titleEl = document.querySelector('#view .work-title');
    const artistEl = document.querySelector('#view .work-meta-value .artist-link');
    const infoEl = document.querySelector('#view .work-meta-compact');
    const sectionTitle = document.querySelector('#view .detail-body .section-title');
    
    if (!view || !detailHero || !detailBody || !relatedScroll || !titleEl || !artistEl || !infoEl || !sectionTitle) {
      return { error: 'Missing elements' };
    }
    
    const viewRect = view.getBoundingClientRect();
    const heroRect = detailHero.getBoundingClientRect();
    const bodyRect = detailBody.getBoundingClientRect();
    const relatedRect = relatedScroll.getBoundingClientRect();
    const titleRect = titleEl.getBoundingClientRect();
    const artistRect = artistEl.getBoundingClientRect();
    const infoRect = infoEl.getBoundingClientRect();
    const sectionTitleRect = sectionTitle.getBoundingClientRect();
    
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      view: {
        width: view.offsetWidth,
        paddingLeft: parseFloat(getComputedStyle(view).paddingLeft) || 0
      },
      hero: {
        width: detailHero.offsetWidth,
        left: heroRect.left
      },
      body: {
        paddingLeft: parseFloat(getComputedStyle(detailBody).paddingLeft) || 0
      },
      related: {
        left: relatedRect.left,
        leftOffsetFromBody: relatedRect.left - bodyRect.left
      },
      elements: {
        title: { left: titleRect.left },
        artist: { left: artistRect.left },
        info: { left: infoRect.left },
        sectionTitle: { left: sectionTitleRect.left }
      }
    };
  });

  if (measurements.error) {
    console.error('无法获取测量数据:', measurements.error);
    await browser.close();
    return false;
  }

  // 输出测量结果
  console.log('视口尺寸:', measurements.viewport);
  console.log('\n#view 容器:');
  console.log(`  - 宽度：${measurements.view.width}px (期望：390px, 满视口)`);
  console.log(`  - 左内边距：${measurements.view.paddingLeft}px`);
  
  console.log('\n.detail-hero:');
  console.log(`  - 宽度：${measurements.hero.width}px (期望：390px, 满视口)`);
  console.log(`  - 左边界：${measurements.hero.left}px (期望：0, 满视口布局)`);
  
  console.log('\n.detail-body:');
  console.log(`  - 左内边距：${measurements.body.paddingLeft}px (期望：22px)`);
  
  console.log('\n.related-scroll:');
  console.log(`  - 左边界：${measurements.related.left}px`);
  console.log(`  - 距离 .detail-body 左边缘：${measurements.related.leftOffsetFromBody}px (期望：≈22px)`);
  
  console.log('\n元素左对齐测量 (相对于视口左边):');
  console.log(`  - 标题 .work-title 左边界：${measurements.elements.title.left}px`);
  console.log(`  - 作者 .artist-link 左边界：${measurements.elements.artist.left}px`);
  console.log(`  - 信息块 .work-meta-compact 左边界：${measurements.elements.info.left}px`);
  console.log(`  - 小标题 .section-title 左边界：${measurements.elements.sectionTitle.left}px`);
  
  // 计算对齐误差（相对于 detail-body 的 padding）
  const baseLeft = measurements.body.paddingLeft;
  console.log('\n左对齐误差 (相对于 .detail-body padding-left):');
  console.log(`  - 标题误差：${Math.abs(measurements.elements.title.left - baseLeft)}px (期望：≤2px)`);
  console.log(`  - 作者误差：${Math.abs(measurements.elements.artist.left - baseLeft)}px (期望：≤2px)`);
  console.log(`  - 信息误差：${Math.abs(measurements.elements.info.left - baseLeft)}px (期望：≤2px)`);
  console.log(`  - 小标题误差：${Math.abs(measurements.elements.sectionTitle.left - baseLeft)}px (期望：≤2px)`);
  console.log(`  - 相关推荐误差：${Math.abs(measurements.related.leftOffsetFromBody - baseLeft)}px (期望：≤2px)`);
  
  // 验证所有对齐
  const allAligned = 
    Math.abs(measurements.elements.title.left - baseLeft) <= 2 &&
    Math.abs(measurements.elements.artist.left - baseLeft) <= 2 &&
    Math.abs(measurements.elements.info.left - baseLeft) <= 2 &&
    Math.abs(measurements.elements.sectionTitle.left - baseLeft) <= 2 &&
    Math.abs(measurements.related.leftOffsetFromBody - baseLeft) <= 2;
  
  console.log(`\n${allAligned ? '✓ 所有元素左对齐符合规范 (page-gutter: 22px)' : '✗ 存在对齐偏差'}`);
  
  await browser.close();
  return allAligned;
}

// 启动服务器并运行测量
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function startServer(port) {
  return new Promise((resolve) => {
    const server = spawn('npx', ['http-server', '-p', String(port), '.'], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    setTimeout(() => resolve(server), 2000);
  });
}

async function main() {
  const server = await startServer(8081);
  console.log('服务器已启动在 http://localhost:8081\n');
  
  try {
    const aligned = await measureDetailPage();
    process.exit(aligned ? 0 : 1);
  } catch (error) {
    console.error('测量失败:', error);
    process.exit(1);
  } finally {
    server.kill();
  }
}

main();
