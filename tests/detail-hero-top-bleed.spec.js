// 详情页头图顶部去空白验证（卡 t_ea885f07）
//
// 需求：详情页头图从屏幕最顶部开始渲染，延伸到 iOS 状态栏后面。
//
// 机制说明（重要，别改错方向）：
// CSS 侧 .detail / .detail-hero 的 padding-top / margin-top 本来就是 0，
// 头图 getBoundingClientRect().top 一直等于 0。赤拔截图里的米色空白条
// 不在 webview 里 —— 那是 iOS standalone 模式下由
// apple-mobile-web-app-status-bar-style="default" 画出的系统状态栏，
// 底色取自 <meta name="theme-color">（#F5F1EA，正是那条米色）。
// 唯一让 webview 内容延伸到状态栏后面的开关是把该 meta 改成
// black-translucent（此时状态栏透明且浮在内容之上）。
//
// 所以本测试断言两侧：
// 1. HTML 侧：status-bar-style === black-translucent（真正决定出血的开关）
// 2. CSS 侧：头图 top ≤ 0，且在模拟 safe-area-inset-top 时也不被推下去
// 3. 关闭按钮仍在状态栏安全区下方且可点击、未被头图遮挡
// 4. 横幅/竖幅/方形画均无纵向或横向溢出

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const IPHONE_14_PRO = { width: 390, height: 844 };
const BASE_URL = process.env.BASE_URL || 'http://localhost:8888';
// iPhone 14 Pro 动态岛机型的 safe-area-inset-top 实测值
const SAFE_TOP = 59;

const WORKS = [
  { id: 'met-435809', label: '横幅画（ratio 0.737）' },
  { id: 'met-438821', label: '竖幅画（ratio 1.271）' },
  { id: 'met-435759', label: '方形画（ratio 1.015）' },
];

async function openDetail(page, id, { safeTop = 0 } = {}) {
  await page.setViewportSize(IPHONE_14_PRO);
  if (safeTop) {
    // 桌面 Chromium 没有真实 safe-area-inset，注入覆盖 --safe-t 以模拟刘海机型，
    // 验证「头图不因安全区被推下去，而关闭按钮仍随安全区下移」
    await page.addStyleTag({ content: `:root{--safe-t:${safeTop}px !important;}` }).catch(() => {});
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await page.goto(`${BASE_URL}/index.html#/work/${id}`);
      await page.waitForSelector('#view .detail-hero', { timeout: 15000 });
      if (safeTop) {
        await page.addStyleTag({ content: `:root{--safe-t:${safeTop}px !important;}` });
      }
      await page.waitForSelector('#view .detail-hero img', { state: 'attached', timeout: 15000 });
      return;
    } catch (err) {
      if (attempt === 1) throw err;
    }
  }
}

test.describe('详情页头图顶部出血：图片延伸到状态栏后面', () => {
  test('标准 1（机制开关）：index.html 声明 black-translucent 状态栏', () => {
    const html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    const m = html.match(
      /<meta\s+name="apple-mobile-web-app-status-bar-style"\s+content="([^"]+)"/
    );
    expect(m, 'index.html 必须声明 apple-mobile-web-app-status-bar-style').not.toBeNull();
    // default / black 都会在头图上方画出一条不透明系统状态栏（赤拔截图里的米色条），
    // 只有 black-translucent 让 webview 内容真正延伸到状态栏后面
    expect(m[1]).toBe('black-translucent');
    // 出血依赖 viewport-fit=cover，否则 webview 不会铺到刘海区域
    expect(html).toMatch(/viewport-fit=cover/);
    // apple-mobile-web-app-capable 是 standalone 全屏的前提
    expect(html).toMatch(/name="apple-mobile-web-app-capable"\s+content="yes"/);
  });

  for (const w of WORKS) {
    test(`${w.label} — 头图顶到视口顶部，关闭按钮不被遮挡，无溢出`, async ({ page }) => {
      await openDetail(page, w.id, { safeTop: SAFE_TOP });

      const m = await page.evaluate(() => {
        const q = (s) => document.querySelector(s);
        const box = (s) => {
          const el = q(s);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return {
            top: r.top,
            bottom: r.bottom,
            left: r.left,
            width: r.width,
            height: r.height,
            paddingTop: parseFloat(cs.paddingTop),
            marginTop: parseFloat(cs.marginTop),
          };
        };
        return {
          scrollY: window.scrollY,
          safeT: getComputedStyle(document.documentElement)
            .getPropertyValue('--safe-t')
            .trim(),
          detail: box('#view .detail'),
          hero: box('#view .detail-hero'),
          ph: box('#view .detail-hero .ph'),
          img: box('#view .detail-hero img'),
          close: box('#view .detail-close'),
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      });

      // 标准 1（CSS 侧）：头图顶部在视口顶部或更上方，且没有任何顶部间距
      expect(m.hero.top).toBeLessThanOrEqual(0);
      expect(m.hero.paddingTop).toBe(0);
      expect(m.hero.marginTop).toBe(0);
      expect(m.detail.top).toBeLessThanOrEqual(0);
      expect(m.detail.paddingTop).toBe(0);
      expect(m.detail.marginTop).toBe(0);
      // 图片本体（不只是容器）也必须顶到 0
      expect(m.ph.top).toBeLessThanOrEqual(0);
      expect(m.img.top).toBeLessThanOrEqual(0);
      // 安全区注入生效才说明「不被 safe-area 推下去」这条真的被测到了
      expect(m.safeT).toBe(`${SAFE_TOP}px`);

      // 标准 2：关闭按钮随安全区下移，完整落在状态栏下方
      expect(m.close.top).toBeGreaterThanOrEqual(SAFE_TOP);
      expect(m.close.width).toBeGreaterThan(0);
      expect(m.close.height).toBeGreaterThan(0);

      // 标准 3：无横向溢出
      expect(m.scrollWidth).toBe(m.innerWidth);
      // 头图左右仍完全贴边（不回退上一张卡的成果）
      expect(m.hero.left).toBe(0);
      expect(m.hero.width).toBe(IPHONE_14_PRO.width);

      // 标准 2 续：关闭按钮真的可点击（未被头图/图片盖住）
      const cx = Math.round(m.close.left + m.close.width / 2);
      const cy = Math.round(m.close.top + m.close.height / 2);
      const hitsClose = await page.evaluate(
        ([x, y]) => !!document.elementFromPoint(x, y)?.closest('.detail-close'),
        [cx, cy]
      );
      expect(hitsClose, '关闭按钮中心点必须命中按钮本身').toBe(true);
    });
  }
});
