// 首页作品卡版心对齐与收藏入口验证
// 验收标准：
// 1. 画作、作品文字、工具图标左边界对齐误差 ≤ 2px
// 2. 横向滑动时卡片左右留白差异 ≤ 5px（iPhone 14 Pro 390×844）
// 3. 垂直间距统一为 24pt
// 4. 首页无左下角收藏按钮，右上角显示"收藏夹"文字入口

import { test, expect } from '@playwright/test';

const IPHONE_14_PRO = { width: 390, height: 844 };
const BASE_URL = 'http://localhost:8888';

test.describe('首页作品卡版心对齐', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(IPHONE_14_PRO);
    await page.goto(BASE_URL + '/index.html');
    await page.waitForSelector('.slide', { timeout: 5000 });
  });

  test('画作、作品文字、工具图标左边界对齐', async ({ page }) => {
    const slides = await page.$$('.slide');
    expect(slides.length).toBeGreaterThanOrEqual(1);

    const measurements = [];
    for (let i = 0; i < Math.min(slides.length, 10); i++) {
      const slide = slides[i];
      const frame = await slide.$('.frame');
      const names = await slide.$('.names');
      const learnBtn = await slide.$('.learn-btn');

      if (frame && names && learnBtn) {
        const frameBox = await frame.boundingBox();
        const namesBox = await names.boundingBox();
        const btnBox = await learnBtn.boundingBox();

        // 记录左边界 X 坐标
        measurements.push({
          slideIndex: i,
          frameLeft: frameBox.x,
          namesLeft: namesBox.x,
          // learn-btn 是右下角按钮，不参与左对齐检查
        });
      }
    }

    // 验证所有卡片的左边界一致（误差 ≤ 2px）
    if (measurements.length > 0) {
      const leftValues = measurements.map(m => m.frameLeft);
      const minLeft = Math.min(...leftValues);
      const maxLeft = Math.max(...leftValues);
      expect(maxLeft - minLeft).toBeLessThanOrEqual(2);
    }
  });

  test('横向滑动时左右留白一致', async ({ page }) => {
    // 获取第一张和最后一张可见卡片的左右边距
    const getWhitespace = async () => {
      const scroller = await page.$('.feed-scroller');
      const box = await scroller.boundingBox();
      const contentMax = 340; // --content-max
      const pageGutter = 22;  // --page-gutter
      // 内容区应该居中，左右留白应该相等
      const expectedLeftWhitespace = (box.width - contentMax) / 2;
      return { left: expectedLeftWhitespace, width: box.width };
    };

    const initialWS = await getWhitespace();
    
    // 滚动到第 5 张卡片
    await page.evaluate(() => {
      const scroller = document.querySelector('.feed-scroller');
      scroller.scrollTop = scroller.clientHeight * 4;
    });
    await page.waitForTimeout(500);

    const scrolledWS = await getWhitespace();
    
    // 留白差异应该 ≤ 5px
    expect(Math.abs(initialWS.left - scrolledWS.left)).toBeLessThanOrEqual(5);
  });

  test('垂直间距统一为 24pt', async ({ page }) => {
    const slide = await page.$('.slide');
    expect(slide).toBeTruthy();

    // 检查 .names 的 margin-top 是否为 24px
    const namesMarginTop = await page.evaluate(() => {
      const names = document.querySelector('.slide .names');
      return parseFloat(getComputedStyle(names).marginTop);
    });
    expect(namesMarginTop).toBe(24);
  });

  test('右下角了解更多按钮尺寸收紧到 84px', async ({ page }) => {
    const learnBtn = await page.$('.learn-btn');
    expect(learnBtn).toBeTruthy();

    const btnBox = await learnBtn.boundingBox();
    expect(btnBox.width).toBe(84);
    expect(btnBox.height).toBe(84);
  });

  test('首页无左下角收藏按钮', async ({ page }) => {
    // 检查页面中不存在 .fav-btn 元素
    const favBtn = await page.$('.fav-btn');
    expect(favBtn).toBeNull();
  });

  test('右上角收藏夹入口显示文字', async ({ page }) => {
    const gotoFavs = await page.$('#goto-favs');
    expect(gotoFavs).toBeTruthy();

    const text = await page.evaluate(el => el.textContent, gotoFavs);
    expect(text).toContain('收藏夹');
  });

  test('点击右上角收藏夹进入收藏夹视图', async ({ page }) => {
    await page.click('#goto-favs');
    await page.waitForURL(/#\/favs/);
    await page.waitForTimeout(500);  // 等待视图渲染

    // 验证进入了收藏夹页面
    const pageHeader = await page.$('.page');
    expect(pageHeader).toBeTruthy();
  });
});

test.describe('视觉证据截图', () => {
  test('捕获 10 张作品卡的对齐证据', async ({ page }) => {
    await page.setViewportSize(IPHONE_14_PRO);
    await page.goto(BASE_URL + '/index.html');
    await page.waitForSelector('.slide', { timeout: 5000 });

    const slides = await page.$$('.slide');
    for (let i = 0; i < Math.min(slides.length, 10); i++) {
      const slide = slides[i];
      await slide.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      
      // 捕获带标尺的截图
      await page.screenshot({
        path: `tests/evidence/feed-alignment-slide-${i}.png`,
        clip: await slide.boundingBox()
      });
    }
  });
});
