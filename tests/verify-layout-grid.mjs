// 布局网格验证脚本 — 测量并报告实际布局数值
// 验收标准：
// - page-gutter: 22px
// - content-max: 340px
// - section-v: 24px
// - 主内容列宽：296px (content-max - page-gutter × 2)

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = path.join(__dirname, 'evidence');

const IPHONE_14_PRO = { width: 390, height: 844 };
let BASE_URL = 'http://localhost:8080';
let SERVER_PORT = 8080;

async function measureLayout() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: IPHONE_14_PRO
  });
  const page = await context.newPage();

  console.log('=== 布局网格验证报告 ===\n');

  // 访问首页
  await page.goto(BASE_URL + '/index.html');
  await page.waitForSelector('.slide', { timeout: 5000 });

  // 测量 page-gutter (左右边距)
  const pageGutter = await page.evaluate(() => {
    const slide = document.querySelector('.slide');
    const style = getComputedStyle(slide);
    return parseFloat(style.paddingLeft);
  });
  console.log(`1. page-gutter (左右边距): ${pageGutter}px (期望: 22px)`);

  // 测量 content-max (最大内容宽度)
  const contentMax = await page.evaluate(() => {
    const container = document.querySelector('.slide');
    return container.offsetWidth;
  });
  console.log(`2. content-max (内容区宽度): ${contentMax}px (期望: 340px)`);

  // 计算主内容列宽 (content-max - page-gutter × 2)
  const contentColumnWidth = contentMax - pageGutter * 2;
  console.log(`3. 主内容列宽 (content-max - gutter×2): ${contentColumnWidth}px (期望: 296px)`);

  // 测量 section-v (垂直间距)
  const sectionV = await page.evaluate(() => {
    const names = document.querySelector('.slide .names');
    const style = getComputedStyle(names);
    return parseFloat(style.marginTop);
  });
  console.log(`4. section-v (画作到题名间距): ${sectionV}px (期望: 24px)`);

  // 测量画框左边距（相对于 .slide 内容区）
  const frameLeft = await page.evaluate(() => {
    const slide = document.querySelector('.slide');
    const frame = document.querySelector('.slide .frame');
    const slideRect = slide.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    return frameRect.left - slideRect.left;
  });
  console.log(`5. 画框左边界距离 .slide 左边缘：${frameLeft}px (期望：≈22px，与 page-gutter 一致)`);

  // 测量题名区左边距（相对于 .slide 内容区）
  const namesLeft = await page.evaluate(() => {
    const slide = document.querySelector('.slide');
    const names = document.querySelector('.slide .names');
    const slideRect = slide.getBoundingClientRect();
    const namesRect = names.getBoundingClientRect();
    return namesRect.left - slideRect.left;
  });
  console.log(`6. 题名区左边界距离 .slide 左边缘：${namesLeft}px (期望：≈22px，与画框对齐)`);

  // 验证对齐误差
  const alignmentError = Math.abs(frameLeft - namesLeft);
  console.log(`7. 画框与题名左边界对齐误差: ${alignmentError}px (期望: ≤2px)`);

  // 测量详情页
  console.log('\n=== 详情页布局验证 ===\n');
  
  // 直接使用 catalog 中存在的作品 ID（避免 issue 文件与 catalog 不一致）
  const testWorkId = 'met-435809'; // 收割者 - 勃鲁盖尔
  await page.goto(`${BASE_URL}/index.html#/work/${testWorkId}`);
  await page.waitForFunction(() => location.hash.startsWith('#/work/'), { timeout: 5000 });
  console.log(`hash 已变为：${await page.evaluate(() => location.hash)}`);
  
  // 等待足够长时间让异步 mount 完成（包括可能的缓存读取）
  await page.waitForTimeout(2000);
  
  // 检查 #view 内是否有内容
  const viewContent = await page.evaluate(() => document.querySelector('#view').innerHTML);
  console.log(`#view 内容长度：${viewContent.length} chars`);
  console.log(`#view 前 200 字符：${viewContent.substring(0, 200)}`);
  
  // 等待 .detail-hero 渲染完成（数据加载后）
  await page.waitForSelector('#view .detail-hero img', { timeout: 10000 });
  console.log('.detail-hero img 已渲染');

  // 详情页头图：页面级贴边，铺满视口宽（卡 t_a9d35e89 改版）
  const detailHeroWidth = await page.evaluate(() => {
    const hero = document.querySelector('.detail-hero');
    return hero.offsetWidth;
  });
  const detailHeroLeft = await page.evaluate(() => {
    return document.querySelector('.detail-hero').getBoundingClientRect().left;
  });
  console.log(`8. 详情页头图宽度：${detailHeroWidth}px (期望：390px, 满视口出血)`);
  console.log(`   详情页头图左边界：${detailHeroLeft}px (期望：0, 完全贴边)`);

  // 详情页 page-gutter
  const detailPageGutter = await page.evaluate(() => {
    const body = document.querySelector('.detail-body');
    const style = getComputedStyle(body);
    return parseFloat(style.paddingLeft);
  });
  console.log(`9. 详情页 page-gutter: ${detailPageGutter}px (期望: 22px)`);

  // 相关推荐区左边界（改版后：模块自管内边距，直接对齐视口 page-gutter）
  const relatedLeft = await page.evaluate(() => {
    const scroll = document.querySelector('.related-scroll');
    return parseFloat(getComputedStyle(scroll).paddingLeft);
  });
  console.log(`10. 相关推荐区左内边距：${relatedLeft}px (期望：22px)`);
  const relatedRight = await page.evaluate(() => {
    const scroll = document.querySelector('.related-scroll');
    return parseFloat(getComputedStyle(scroll).paddingRight);
  });
  console.log(`11. 相关推荐区右内边距：${relatedRight}px (期望：0px，右侧贴边)`);

  // 捕获详情页布局证据截图（可选）
  try {
    const detailHero = await page.$('.detail-hero');
    if (detailHero) {
      const detailBox = await detailHero.boundingBox();
      if (detailBox) {
        await page.screenshot({
          path: path.join(EVIDENCE_DIR, 'layout-grid-detail-hero.png'),
          clip: detailBox
        });
        console.log('\n已保存详情页布局证据截图：layout-grid-detail-hero.png');
      }
    }
  } catch (e) {
    console.log('\n跳过详情页截图（元素可能已滚动出视口）');
  }

  await browser.close();

  // 验证所有测量值
  console.log('\n=== 验证结果 ===\n');
  const checks = [
    { name: 'page-gutter', actual: pageGutter, expected: 22, tolerance: 0 },
    { name: 'content-max', actual: contentMax, expected: 340, tolerance: 0 },
    { name: '主内容列宽', actual: contentColumnWidth, expected: 296, tolerance: 0 },
    { name: 'section-v', actual: sectionV, expected: 24, tolerance: 0 },
    { name: '画框左边界', actual: frameLeft, expected: 22, tolerance: 1 },
    { name: '题名区左边界', actual: namesLeft, expected: 22, tolerance: 1 },
    { name: '对齐误差', actual: alignmentError, expected: 0, max: 2 },
    { name: '详情页头图宽度', actual: detailHeroWidth, expected: 390, tolerance: 0 },
    { name: '详情页头图左边界', actual: detailHeroLeft, expected: 0, tolerance: 0 },
    { name: '详情页 page-gutter', actual: detailPageGutter, expected: 22, tolerance: 0 },
    { name: '相关推荐区左内边距', actual: relatedLeft, expected: 22, tolerance: 0 },
    { name: '相关推荐区右内边距', actual: relatedRight, expected: 0, tolerance: 0 },
  ];

  let allPassed = true;
  for (const check of checks) {
    let passed;
    if ('max' in check) {
      passed = check.actual <= check.max;
    } else {
      passed = Math.abs(check.actual - check.expected) <= (check.tolerance || 0);
    }
    const status = passed ? '✓' : '✗';
    if (!passed) allPassed = false;
    console.log(`${status} ${check.name}: ${check.actual}px ${passed ? '' : `(期望: ${check.expected}${check.max ? ` (最大: ${check.max})` : `±${check.tolerance}`})`}`);
  }

  console.log('\n' + (allPassed ? '所有布局验证通过！' : '部分验证未通过，请检查 CSS。'));
  
  return allPassed;
}

// 启动本地服务器并运行测试
import { spawn } from 'child_process';
import net from 'net';

// 查找可用端口（从指定端口开始尝试）
async function findAvailablePort(startPort = 8080) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, '127.0.0.1', () => {
      server.close(() => resolve(startPort));
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(startPort + 1); // 递归尝试下一个端口
      } else {
        reject(err);
      }
    });
  });
}

function startServer(port) {
  return new Promise((resolve, reject) => {
    const server = spawn('npx', ['http-server', '-p', String(port), '.'], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let started = false;
    
    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Hit CTRL-C to stop the server')) {
        started = true;
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      const errOutput = data.toString();
      if (errOutput.includes('EADDRINUSE') && !started) {
        reject(new Error(`端口 ${port} 已被占用`));
      }
    });

    // 超时处理
    setTimeout(() => {
      if (!started) {
        reject(new Error(`服务器启动超时，可能端口 ${port} 不可用`));
      }
    }, 5000);
  });
}

async function main() {
  let server;
  let attempts = 0;
  const maxAttempts = 10;
  
  try {
    while (attempts < maxAttempts) {
      try {
        console.log(`查找可用端口 (尝试 ${attempts + 1}/${maxAttempts})...`);
        SERVER_PORT = await findAvailablePort(8080 + attempts);
        BASE_URL = `http://localhost:${SERVER_PORT}`;
        console.log(`使用端口：${SERVER_PORT}\n`);
        
        console.log('启动本地服务器...');
        server = await startServer(SERVER_PORT);
        console.log(`服务器已启动在 ${BASE_URL}\n`);
        break; // 服务器启动成功，退出循环
      } catch (err) {
        if (err.message.includes('已被占用') || err.message.includes('超时')) {
          attempts++;
          console.log(`端口不可用，准备尝试下一个端口...\n`);
          if (server) {
            server.kill();
            server = null;
          }
        } else {
          throw err; // 其他错误直接抛出
        }
      }
    }
    
    if (!server) {
      throw new Error(`无法在 8080-${8080 + maxAttempts - 1} 范围内找到可用端口`);
    }
    
    const passed = await measureLayout();
    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error('验证失败:', error);
    process.exit(1);
  } finally {
    if (server) {
      server.kill();
    }
  }
}

main();
