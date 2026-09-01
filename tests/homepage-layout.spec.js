// 艺术手册 - 首页布局验证测试
// 验收标准第 3 条视觉验证证据
// 验证 390px 视口下（iPhone 14 Pro）：
// 1. 画作外框内边距统一（8px）
// 2. 标题基线对齐（margin-left 与画框一致）
// 3. 画框为直角边框（border-radius: 0）
// 4. 截图证据

import { test, expect } from '@playwright/test';

const IPHONE_14_PRO = { width: 390, height: 844 };

test.describe('首页布局验证 - 视觉一致性证据', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(IPHONE_14_PRO);
    // baseURL 由 playwright.config.js 提供（http://localhost:8888/）
    await page.goto('index.html');
    // 等待首屏内容加载（JS 渲染后）
    await page.waitForSelector('.slide', { timeout: 10000 });
  });

  test('画作外框内边距统一为 8px', async ({ page }) => {
    // 获取所有 .frame 元素
    const frames = await page.$$('.frame');
    expect(frames.length).toBeGreaterThan(0);

    // 验证每个画框的 padding 统一
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const style = await frame.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          paddingLeft: computed.paddingLeft,
          paddingRight: computed.paddingRight,
          paddingTop: computed.paddingTop,
          paddingBottom: computed.paddingBottom,
        };
      });

      // 验证画框内边距统一为 8px
      expect(style.paddingLeft).toBe('8px');
      expect(style.paddingRight).toBe('8px');
      expect(style.paddingTop).toBe('8px');
      expect(style.paddingBottom).toBe('8px');
    }
  });

  test('画框与题名均相对视口居中（不再左推 --page-gutter）', async ({ page }) => {
    const firstSlide = await page.$('.slide');
    expect(firstSlide).toBeTruthy();

    const frame = await firstSlide.$('.frame');
    const names = await firstSlide.$('.names');
    expect(frame).toBeTruthy();
    expect(names).toBeTruthy();

    // 两处 margin-left 已按 DESIGN.md 2026-09-01 拍板删除
    const [frameMargin, namesMargin] = await Promise.all([
      frame.evaluate(el => window.getComputedStyle(el).marginLeft),
      names.evaluate(el => window.getComputedStyle(el).marginLeft),
    ]);
    expect(frameMargin).toBe('0px');
    expect(namesMargin).toBe('0px');

    // .slide 主轴改为 center
    const alignItems = await firstSlide.evaluate(el => window.getComputedStyle(el).alignItems);
    expect(alignItems).toBe('center');

    // 左右留白相等
    const vw = page.viewportSize().width;
    for (const el of [frame, names]) {
      const b = await el.boundingBox();
      expect(Math.abs(b.x - (vw - (b.x + b.width)))).toBeLessThanOrEqual(2);
    }
  });

  test('画框为直角边框（border-radius: 0）', async ({ page }) => {
    // 获取所有 .frame 元素
    const frames = await page.$$('.frame');
    expect(frames.length).toBeGreaterThan(0);

    // 验证每个画框的 border-radius 为 0
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const borderRadius = await frame.evaluate(el => {
        return window.getComputedStyle(el).borderRadius;
      });

      // 验证画框为直角
      expect(borderRadius).toBe('0px');
    }
  });

  test('画作图片为直角（border-radius: 0）', async ({ page }) => {
    // 获取所有 .frame img 元素
    const images = await page.$$('.frame img');
    expect(images.length).toBeGreaterThan(0);

    // 验证每个图片的 border-radius 为 0
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const borderRadius = await img.evaluate(el => {
        return window.getComputedStyle(el).borderRadius;
      });

      // 验证图片为直角
      expect(borderRadius).toBe('0px');
    }
  });

  test('画作图片四向 padding 像素一致', async ({ page }) => {
    // 获取所有 .frame 元素
    const frames = await page.$$('.frame');
    expect(frames.length).toBeGreaterThan(0);

    // 验证每个画框内图片的四向 padding 一致
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const img = await frame.$('img');
      if (!img) continue;

      const padding = await img.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          paddingLeft: computed.paddingLeft,
          paddingRight: computed.paddingRight,
          paddingTop: computed.paddingTop,
          paddingBottom: computed.paddingBottom,
        };
      });

      // 验证图片四向 padding 一致（都是 0px，因为图片 fill 整个容器）
      expect(padding.paddingLeft).toBe(padding.paddingRight);
      expect(padding.paddingTop).toBe(padding.paddingBottom);
      expect(padding.paddingLeft).toBe(padding.paddingTop);
    }
  });

  test('首页视觉一致性截图', async ({ page }) => {
    // 截取首页完整截图作为视觉证据
    const screenshot = await page.screenshot({ fullPage: true });
    // 保存截图到 evidence 目录
    const fs = require('fs');
    const path = require('path');
    const evidenceDir = path.join(process.cwd(), 'evidence', 'layout-verification');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
    const screenshotPath = path.join(evidenceDir, 'homepage-layout-375px.png');
    fs.writeFileSync(screenshotPath, screenshot);
    console.log('截图已保存至:', screenshotPath);
  });
});
