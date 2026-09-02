// 艺术手册 - 首页布局验证测试
// 验收标准第 3 条视觉验证证据
// 验证 390px 视口下（iPhone 14 Pro）：
// 1. 画作外框内边距统一（6px，t_e05a68be 收紧自 8px）
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

  test('画作外框内边距统一为 6px（t_e05a68be：8→6px 精致化）', async ({ page }) => {
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

      // 验证画框内边距统一为 6px（t_e05a68be，DESIGN.md components.artwork-slide.framePadding）
      expect(style.paddingLeft).toBe('6px');
      expect(style.paddingRight).toBe('6px');
      expect(style.paddingTop).toBe('6px');
      expect(style.paddingBottom).toBe('6px');
    }
  });

  test('画框与题名均相对视口居中（不再左推 --page-gutter）', async ({ page }) => {
    const firstSlide = await page.$('.slide');
    expect(firstSlide).toBeTruthy();

    // t_e05a68be：.frame 改为 inline-block（收缩包裹 .ph 以修横幅内白条），
    // 视口居中由 .frame-wrapper（block）承担；名称容器 .names 直接居中。
    const wrapper = await firstSlide.$('.frame-wrapper');
    const names = await firstSlide.$('.names');
    expect(wrapper).toBeTruthy();
    expect(names).toBeTruthy();

    // wrapper 与 names 都用 margin: 0 auto 相对 slide 居中（t_e05a68be）
    const [wrapperMargin, namesMargin] = await Promise.all([
      wrapper.evaluate(el => window.getComputedStyle(el).marginLeft),
      names.evaluate(el => window.getComputedStyle(el).marginLeft),
    ]);
    // margin-left: auto 计算成的像素值随宽度变化，这里断言其等价形式：左右外边距一致
    const [wrapperCentered, namesCentered] = await Promise.all([
      wrapper.evaluate(el => {
        const cs = getComputedStyle(el);
        return Math.abs(parseFloat(cs.marginLeft) - parseFloat(cs.marginRight)) < 1;
      }),
      names.evaluate(el => {
        const cs = getComputedStyle(el);
        return Math.abs(parseFloat(cs.marginLeft) - parseFloat(cs.marginRight)) < 1;
      }),
    ]);
    expect(wrapperCentered).toBe(true);
    expect(namesCentered).toBe(true);

    // .slide 主轴改为 center
    const alignItems = await firstSlide.evaluate(el => window.getComputedStyle(el).alignItems);
    expect(alignItems).toBe('center');

    // 视口居中：wrapper 与 names 两侧到视口边界的距离对称
    const vw = page.viewportSize().width;
    for (const el of [wrapper, names]) {
      const b = await el.boundingBox();
      expect(Math.abs(b.x - (vw - (b.x + b.width)))).toBeLessThanOrEqual(2);
    }

    // t_e05a68be 新增：names.textAlign 应为 center（赤拔要求画作名与作者居中）
    const namesTextAlign = await names.evaluate(el => window.getComputedStyle(el).textAlign);
    expect(namesTextAlign).toBe('center');
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
