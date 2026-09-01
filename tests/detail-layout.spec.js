// 详情页布局验证：页面级贴边 + 模块自管内边距（卡 t_a9d35e89）
// 验收标准：
// 1. 头图 .detail-hero 左右完全贴边（left === 0，width === 视口宽）
// 2. 作品信息卡、赏析正文有 --page-gutter（22px）左右内边距
// 3. 相关推荐：左侧 22px 内距（标题与首卡对齐），右侧贴边（padding-right === 0）
// 4. 横幅/竖幅/方形画详情页均无横向溢出（documentElement.scrollWidth === 视口宽）

import { test, expect } from '@playwright/test';

const IPHONE_14_PRO = { width: 390, height: 844 };
const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';
const PAGE_GUTTER = 22;

// catalog.json 中真实存在的作品，覆盖三种画幅比例
const WORKS = [
  { id: 'met-435809', label: '横幅画（ratio 0.737）' },
  { id: 'met-438821', label: '竖幅画（ratio 1.271）' },
  { id: 'met-435759', label: '方形画（ratio 1.015）' },
  { id: 'cma-104168', label: '原出血布局作品（已统一为全宽）' },
];

async function openDetail(page, id) {
  await page.setViewportSize(IPHONE_14_PRO);
  // 首次冷加载时 Service Worker 取得控制权会触发一次整页 reload，
  // 可能把 hash 路由的挂载打断（见 HERMES.md「踩过的坑」）。失败则重导一次。
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto(`${BASE_URL}/index.html#/work/${id}`);
      await page.waitForSelector('#view .detail-hero', { timeout: 15000 });
      // 相关推荐是异步渲染的，等首张卡出现再测量
      await page.waitForSelector('#view .related-scroll .rel-card', { timeout: 15000 });
      return;
    } catch (err) {
      if (attempt === 1) throw err;
    }
  }
}

test.describe('详情页布局：页面级贴边 + 模块自管内边距', () => {
  for (const w of WORKS) {
    test(`${w.label} — 头图贴边、模块内边距、推荐区右贴边`, async ({ page }) => {
      await openDetail(page, w.id);

      const m = await page.evaluate(() => {
        const q = (s) => document.querySelector('#view ' + s);
        const measure = (s) => {
          const el = q(s);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            left: r.left,
            width: r.width,
            paddingLeft: parseFloat(cs.paddingLeft),
            paddingRight: parseFloat(cs.paddingRight),
          };
        };
        const h2 = q('.related h2');
        const range = document.createRange();
        range.selectNodeContents(h2);
        const firstCard = q('.related-scroll .rel-card');
        return {
          viewportWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          hero: measure('.detail-hero'),
          info: measure('.artwork-info-card'),
          body: measure('.detail-body'),
          relatedScroll: measure('.related-scroll'),
          relatedTitleTextLeft: range.getBoundingClientRect().left,
          firstCardLeft: firstCard.getBoundingClientRect().left,
        };
      });

      // 1. 头图完全贴边、铺满视口宽
      expect(m.hero.left).toBe(0);
      expect(m.hero.width).toBe(m.viewportWidth);

      // 2. 作品信息卡 / 正文区左右内边距 = page-gutter
      expect(m.info.paddingLeft).toBe(PAGE_GUTTER);
      expect(m.info.paddingRight).toBe(PAGE_GUTTER);
      expect(m.body.paddingLeft).toBe(PAGE_GUTTER);
      expect(m.body.paddingRight).toBe(PAGE_GUTTER);

      // 3. 相关推荐：左 22px 内距、右侧贴边
      expect(m.relatedScroll.paddingLeft).toBe(PAGE_GUTTER);
      expect(m.relatedScroll.paddingRight).toBe(0);
      expect(m.relatedScroll.left).toBe(0);
      expect(m.relatedScroll.width).toBe(m.viewportWidth);
      // 标题文字与首张卡左边界都落在版心 22px 上（误差 ≤ 1px）
      expect(Math.abs(m.relatedTitleTextLeft - PAGE_GUTTER)).toBeLessThanOrEqual(1);
      expect(Math.abs(m.firstCardLeft - PAGE_GUTTER)).toBeLessThanOrEqual(1);

      // 4. 无横向溢出
      expect(m.scrollWidth).toBe(m.viewportWidth);
    });
  }

  test('推荐区可向右滑动，最后一张卡能滑到屏幕右缘内', async ({ page }) => {
    await openDetail(page, WORKS[0].id);

    const canScroll = await page.evaluate(() => {
      const s = document.querySelector('#view .related-scroll');
      return { scrollWidth: s.scrollWidth, clientWidth: s.clientWidth };
    });
    // 内容宽度超出可视宽度，说明右侧确实有内容被屏幕边缘裁切
    expect(canScroll.scrollWidth).toBeGreaterThan(canScroll.clientWidth);

    const lastCardRight = await page.evaluate(async () => {
      const s = document.querySelector('#view .related-scroll');
      s.scrollLeft = s.scrollWidth;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const cards = s.querySelectorAll('.rel-card');
      return cards[cards.length - 1].getBoundingClientRect().right;
    });
    // 滑到底后最后一张卡右边界贴到视口右缘（右侧无 gutter 留白）
    expect(Math.abs(lastCardRight - IPHONE_14_PRO.width)).toBeLessThanOrEqual(1);
  });
});
