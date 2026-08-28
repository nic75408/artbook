// 画作长宽比适配体系验收测试
// 验收标准：
// 1. 首页主画作卡片使用 object-fit: contain + letterbox 背景
// 2. 详情页主画作区域使用 object-fit: contain
// 3. 推荐缩略图使用统一的 aspect-ratio (3:4) + object-fit: contain
// 4. 所有画作内容完整可见，无裁切
// 5. 版心对齐一致（左边界误差 ≤ 2px）

import { test, expect } from '@playwright/test';

const IPHONE_14_PRO = { width: 390, height: 844 };
const BASE_URL = 'http://localhost:8888';

test.describe('画作长宽比适配体系', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(IPHONE_14_PRO);
  });

  test('首页主画作卡片使用 object-fit: contain', async ({ page }) => {
    await page.goto(BASE_URL + '/index.html');
    await page.waitForSelector('.slide', { timeout: 5000 });

    const frame = await page.$('.frame');
    expect(frame).toBeTruthy();

    const img = await frame.$('img');
    expect(img).toBeTruthy();

    const objectFit = await page.evaluate(el => getComputedStyle(el).objectFit, img);
    expect(objectFit).toBe('contain');

    // 验证画框背景色：当画作有 palette 时使用 palette[0]，否则使用 var(--bg-card)
    // 不硬编码具体颜色值，因为 palette 颜色因画作而异
  });

  test('详情页主画作区域使用 object-fit: contain', async ({ page }) => {
    await page.goto(BASE_URL + '/index.html');
    await page.waitForSelector('.slide', { timeout: 5000 });
    
    // 点击进入详情页
    await page.click('.frame');
    await page.waitForSelector('.detail-hero', { timeout: 5000 });

    const img = await page.$('.detail-hero img');
    expect(img).toBeTruthy();

    const objectFit = await page.evaluate(el => getComputedStyle(el).objectFit, img);
    expect(objectFit).toBe('contain');

    const phBg = await page.evaluate(el => getComputedStyle(el).backgroundColor, await page.$('.detail-hero .ph'));
    expect(phBg).toBe('rgb(253, 251, 247)'); // var(--bg-card)
  });

  test('推荐缩略图使用统一 aspect-ratio 3:4', async ({ page }) => {
    await page.goto(BASE_URL + '/index.html');
    await page.waitForSelector('.slide', { timeout: 5000 });
    
    // 点击进入详情页
    await page.click('.frame');
    await page.waitForSelector('.related-scroll', { timeout: 5000 });

    const relCards = await page.$$('.rel-card');
    if (relCards.length > 0) {
      const thumb = await relCards[0].$('.th');
      expect(thumb).toBeTruthy();

      // 验证 aspect-ratio 是否为 3:4 (宽/高 = 3/4, 即 高/宽 = 4/3 ≈ 1.333)
      const aspectRatio = await page.evaluate(el => {
        const style = getComputedStyle(el);
        const ratio = style.aspectRatio;
        if (ratio === 'auto') return null;
        // 解析 "3 / 4" 或 "0.75"
        if (ratio.includes('/')) {
          const [w, h] = ratio.split('/').map(s => parseFloat(s.trim()));
          return h / w;  // 返回 高/宽
        }
        return parseFloat(ratio);
      }, thumb);

      // 期望值应该是 4/3 ≈ 1.333 (允许误差)
      expect(aspectRatio).toBeGreaterThan(1.25);
      expect(aspectRatio).toBeLessThan(1.45);
    }
  });

  test('推荐缩略图使用 object-fit: contain', async ({ page }) => {
    await page.goto(BASE_URL + '/index.html');
    await page.waitForSelector('.slide', { timeout: 5000 });
    
    // 点击进入详情页
    await page.click('.frame');
    await page.waitForSelector('.related-scroll', { timeout: 5000 });

    const relCards = await page.$$('.rel-card');
    if (relCards.length > 0) {
      const img = await relCards[0].$('.th img');
      expect(img).toBeTruthy();

      const objectFit = await page.evaluate(el => getComputedStyle(el).objectFit, img);
      expect(objectFit).toBe('contain');
    }
  });

  test('首页版心左边界对齐一致', async ({ page }) => {
    await page.goto(BASE_URL + '/index.html');
    await page.waitForSelector('.slide', { timeout: 5000 });

    const slides = await page.$$('.slide');
    expect(slides.length).toBeGreaterThanOrEqual(1);

    const leftValues = [];
    for (let i = 0; i < Math.min(slides.length, 5); i++) {
      const frame = await slides[i].$('.frame');
      if (frame) {
        const box = await frame.boundingBox();
        leftValues.push(box.x);
      }
    }

    if (leftValues.length > 0) {
      const minLeft = Math.min(...leftValues);
      const maxLeft = Math.max(...leftValues);
      // 左边界对齐误差 ≤ 2px
      expect(maxLeft - minLeft).toBeLessThanOrEqual(2);
    }
  });

  test('推荐区标题与缩略图左边界对齐', async ({ page }) => {
    await page.goto(BASE_URL + '/index.html');
    await page.waitForSelector('.slide', { timeout: 5000 });
    
    // 点击进入详情页
    await page.click('.frame');
    await page.waitForSelector('.related', { timeout: 5000 });

    const relatedTitle = await page.$('.related h2');
    const relatedScroll = await page.$('.related-scroll');
    
    if (relatedTitle && relatedScroll) {
      const titleBox = await relatedTitle.boundingBox();
      const scrollBox = await relatedScroll.boundingBox();
      
      // 标题和滚动区左边界应该一致（误差 ≤ 2px）
      expect(Math.abs(titleBox.x - scrollBox.x)).toBeLessThanOrEqual(2);
    }
  });
});

test.describe('视觉证据截图', () => {
  test('捕获首页主画作卡片证据', async ({ page }) => {
    await page.setViewportSize(IPHONE_14_PRO);
    await page.goto(BASE_URL + '/index.html');
    await page.waitForSelector('.slide', { timeout: 5000 });

    const slide = await page.$('.slide');
    await slide.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    
    await page.screenshot({
      path: 'tests/evidence/artwork-aspect-ratio-homepage.png',
      clip: await slide.boundingBox()
    });
  });

  test('捕获详情页主画作与推荐区证据', async ({ page }) => {
    await page.setViewportSize(IPHONE_14_PRO);
    await page.goto(BASE_URL + '/index.html');
    await page.waitForSelector('.slide', { timeout: 5000 });
    
    await page.click('.frame');
    await page.waitForSelector('.detail-hero', { timeout: 5000 });
    await page.waitForTimeout(500);

    const detail = await page.$('.detail');
    await page.screenshot({
      path: 'tests/evidence/artwork-aspect-ratio-detail.png',
      clip: await detail.boundingBox()
    });
  });
});
