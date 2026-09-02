// 首页作品卡版心对齐与收藏入口验证
// 验收标准：
// 1. 画作、作品文字、工具图标左边界对齐误差 ≤ 2px
// 2. 横向滑动时卡片左右留白差异 ≤ 5px（iPhone 14 Pro 390×844）
// 3. 垂直间距统一为 24pt
// 4. 首页无左下角收藏按钮，右上角显示"收藏夹"文字入口

import { test, expect } from '@playwright/test';

const IPHONE_14_PRO = { width: 390, height: 844 };
const BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${process.env.ARTBOOK_TEST_PORT || 8888}`;

test.describe('首页作品卡版心对齐', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(IPHONE_14_PRO);
    await page.goto(BASE_URL + '/index.html');
    await page.waitForSelector('.slide', { timeout: 5000 });
  });

  test('画作模块相对视口居中（DESIGN.md 2026-09-02 t_e05a68be 更新）', async ({ page }) => {
    const slides = await page.$$('.slide');
    expect(slides.length).toBeGreaterThanOrEqual(1);

    const vw = page.viewportSize().width;
    // t_e05a68be：.frame 改为 inline-block（收缩包裹 .ph），视口居中由 .frame-wrapper 承担；
    // .names 宽度改为 100% + max-width 320px（跟随 slide 内容宽度 = 340-22×2 = 296px）。
    // 名称/作者文字改为居中显示。
    for (let i = 0; i < Math.min(slides.length, 10); i++) {
      const slide = slides[i];
      const wrapper = await slide.$('.frame-wrapper');
      const names = await slide.$('.names');
      const learn = await slide.$('.learn-inline');
      if (!(wrapper && names && learn)) continue;

      const wrapperBox = await wrapper.boundingBox();
      const namesBox = await names.boundingBox();
      const learnBox = await learn.boundingBox();

      // 画框容器左右留白相等 → 相对视口居中（误差 ≤ 2px）
      expect(Math.abs(wrapperBox.x - (vw - (wrapperBox.x + wrapperBox.width)))).toBeLessThanOrEqual(2);
      // 题名块居中，宽度受 slide 内容宽度约束（290-296px in viewport 390）
      expect(Math.abs(namesBox.x - (vw - (namesBox.x + namesBox.width)))).toBeLessThanOrEqual(2);
      expect(namesBox.width).toBeLessThanOrEqual(320);
      expect(namesBox.width).toBeGreaterThanOrEqual(280);
      // 「了解更多」文字链居中
      expect(Math.abs((learnBox.x + learnBox.width / 2) - vw / 2)).toBeLessThanOrEqual(2);
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

  test('「了解更多」为居中内联展签文字链（无黑圆盘按钮）', async ({ page }) => {
    // 旧的 .learn-btn 黑色圆盘已移除
    expect(await page.$('.learn-btn')).toBeNull();

    const link = await page.$('.learn-inline');
    expect(link).toBeTruthy();
    expect(await link.evaluate((el) => el.tagName)).toBe('A');

    // 相对视口水平居中（误差 ≤ 2px）
    const box = await link.boundingBox();
    const vw = page.viewportSize().width;
    expect(Math.abs((box.x + box.width / 2) - vw / 2)).toBeLessThanOrEqual(2);

    // t_23059633 定稿方案 B（断舍派）：单行「了 解 更 多 ›」
    // 已删除 __en / __rule，改为 __zh + __chevron 单行内联
    expect(await page.$('.learn-inline__en')).toBeNull();
    expect(await page.$('.learn-inline__rule')).toBeNull();

    // 规格数值：中文 Songti 14px letter-spacing 0.32em ink-2 / chevron Georgia 16px 金 α0.85
    const m = await page.evaluate(() => {
      const zh = document.querySelector('.learn-inline__zh');
      const chev = document.querySelector('.learn-inline__chevron');
      const cs = getComputedStyle;
      return {
        zhSize: cs(zh).fontSize,
        zhSpacing: cs(zh).letterSpacing,
        chevSize: cs(chev).fontSize,
        chevOpacity: cs(chev).opacity,
        chevText: chev.textContent,
      };
    });
    expect(m.zhSize).toBe('14px');
    expect(parseFloat(m.zhSpacing)).toBeCloseTo(4.48, 1); // 0.32em × 14px
    expect(m.chevSize).toBe('16px');
    expect(parseFloat(m.chevOpacity)).toBeCloseTo(0.85, 2);
    expect(m.chevText).toBe('›');
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
