// 艺术手册 - 首页布局验证测试
// 验收标准第 3 条视觉验证证据
// 验证 390px 视口下（iPhone 14 Pro）：
// 1. 画作外框内边距统一（8px）
// 2. 标题基线对齐（margin-left 与画框一致）
// 3. 截图证据

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8888';
const IPHONE_14_PRO = { width: 390, height: 844 };

test.describe('首页布局验证 - 视觉一致性证据', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(IPHONE_14_PRO);
    await page.goto(BASE_URL + '/index.html');
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

  test('标题与画框左边界对齐', async ({ page }) => {
    // 获取第一个作品卡的画框和标题容器
    const firstSlide = await page.$('.slide');
    expect(firstSlide).toBeTruthy();

    const frame = await firstSlide.$('.frame');
    const names = await firstSlide.$('.names');
    expect(frame).toBeTruthy();
    expect(names).toBeTruthy();

    // 获取画框和标题的 margin-left
    const [frameMargin, namesMargin] = await Promise.all([
      frame.evaluate(el => window.getComputedStyle(el).marginLeft),
      names.evaluate(el => window.getComputedStyle(el).marginLeft),
    ]);

    // 验证标题左边界与画框对齐（都是 22px，即 --page-gutter）
    expect(frameMargin).toBe('22px');
    expect(namesMargin).toBe('22px');
    expect(frameMargin).toBe(namesMargin);
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
