// 详情页左右滑动切换同日期作品（t_13662686）
// 逐条量 SPEC-detail-swipe.md §6「关键数值汇总」与 §7 验收清单。
const { test, expect } = require('@playwright/test');
const { stubExternalImages } = require('./helpers/stub-external-images');

const VIEWPORT = { width: 390, height: 844 };

async function gotoIssueWork(page, offset = 0) {
  // 断掉外部 CDN 图片的真实网络往返（并行跑全套时会把页面自身的 data fetch
  // 挤到超时，详见 helpers/stub-external-images.js 的注释）。
  // 必须在第一次 goto 之前注册。
  await stubExternalImages(page);
  // 取最新一期的第 offset 幅作品，直接深链进详情页
  await page.goto('./');
  const info = await page.evaluate(async () => {
    const idx = await (await fetch('data/index.json', { cache: 'no-cache' })).json();
    const iss = await (await fetch(`data/issues/${idx.latest}.json`, { cache: 'no-cache' })).json();
    return { ids: iss.works.map((w) => w.id), date: idx.latest };
  });
  const id = info.ids[offset < 0 ? info.ids.length + offset : offset];
  await page.goto(`./#/work/${id}`);
  await page.waitForSelector('.detail .detail-hero', { state: 'attached' });
  await page.waitForSelector('.folio', { state: 'attached' });
  return { ...info, id };
}

// 用 pointer 事件模拟一次水平拖动。durationMs 控制释放速度；
// durationMs=0 表示不插等待，用于测「快速轻扫」的速度分支。
async function swipe(page, dx, { durationMs = 400, steps = 12, startY = 500, startX = 195 } = {}) {
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(startX + (dx * i) / steps, startY);
    if (durationMs > 0) await page.waitForTimeout(durationMs / steps);
  }
  await page.mouse.up();
}

test.use({ viewport: VIEWPORT, hasTouch: true, isMobile: true });

test('folio 页码：内容 N／30，移入信息卡内（R1 新规格）', async ({ page }) => {
  const info = await gotoIssueWork(page, 0);
  const folio = page.locator('.artwork-info-card .folio');
  await expect(folio).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('.folio-idx')).toHaveText('1');
  await expect(page.locator('.folio-sep')).toHaveText('／');
  await expect(page.locator('.folio-total')).toHaveText(String(info.ids.length));

  const m = await page.evaluate(() => {
    const g = (s) => getComputedStyle(document.querySelector(s));
    const f = g('.artwork-info-card .folio');
    const r = document.querySelector('.artwork-info-card .folio').getBoundingClientRect();
    return {
      pos: f.position,
      display: f.display,
      height: r.height,
      width: r.width,
      bg: f.backgroundColor,
      blur: f.backdropFilter || f.webkitBackdropFilter,
      borderRadius: f.borderRadius,
      padding: f.padding,
      paddingTop: f.paddingTop,
      paddingRight: f.paddingRight,
      paddingBottom: f.paddingBottom,
      paddingLeft: f.paddingLeft,
      idxSize: g('.folio-idx').fontSize,
      idxWeight: g('.folio-idx').fontWeight,
      sepSize: g('.folio-sep').fontSize,
      totalSize: g('.folio-total').fontSize,
      idxColor: g('.folio-idx').color,
      sepColor: g('.folio-sep').color,
      totalColor: g('.folio-total').color,
      fontSize: f.fontSize,
      fontWeight: f.fontWeight,
      marginBottom: f.marginBottom,
      pointerEvents: f.pointerEvents,
    };
  });
  // R1 新规格：inline-flex，在信息卡内
  expect(m.pos).toBe('static'); // inline 元素，默认 static
  expect(m.display).toBe('inline-flex');
  expect(m.height).toBeCloseTo(28, 1);
  // background: rgba(255, 255, 255, 0.70)
  expect(m.bg).toBe('rgba(255, 255, 255, 0.7)');
  expect(m.blur).toBe('blur(14px)');
  expect(m.borderRadius).toBe('14px');
  // padding: 0 12px
  expect(m.paddingTop).toBe('0px');
  expect(m.paddingBottom).toBe('0px');
  expect(m.paddingLeft).toBe('12px');
  expect(m.paddingRight).toBe('12px');
  // 字号：13px
  expect(m.fontSize).toBe('13px');
  expect(m.fontWeight).toBe('500');
  // 字号细节：idx 15px, sep 13px, total 13px
  expect(m.idxSize).toBe('15px');
  expect(m.idxWeight).toBe('600');
  expect(m.sepSize).toBe('13px');
  expect(m.totalSize).toBe('13px');
  // 色值：--ink / --gold / --ink-2
  expect(m.idxColor).toBe('rgb(29, 27, 22)');
  expect(m.sepColor).toBe('rgb(140, 109, 63)');
  expect(m.totalColor).toBe('rgb(107, 101, 88)');
  // margin-bottom: 12px (var(--space-md))
  expect(m.marginBottom).toBe('12px');
  // 不阻挡手势
  expect(m.pointerEvents).toBe('none');
});

test('左滑 60px+ 切换到下一幅，页码 +1、URL 更新、滚回顶部', async ({ page }) => {
  const info = await gotoIssueWork(page, 0);
  // 先向下滚一段，验证切换后回到顶部
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

  await swipe(page, -120);
  await page.waitForTimeout(700);

  await expect(page.locator('.folio-idx')).toHaveText('2');
  expect(await page.evaluate(() => location.hash)).toBe(`#/work/${info.ids[1]}`);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
});

test('右滑切换到上一幅', async ({ page }) => {
  const info = await gotoIssueWork(page, 2);
  await expect(page.locator('.folio-idx')).toHaveText('3');
  await swipe(page, 120);
  await page.waitForTimeout(700);
  await expect(page.locator('.folio-idx')).toHaveText('2');
  expect(await page.evaluate(() => location.hash)).toBe(`#/work/${info.ids[1]}`);
});

test('第 1 幅右滑：软胶囊「今日推荐已到首幅」，画面不切换，1.8s 内消失', async ({ page }) => {
  await gotoIssueWork(page, 0);
  await swipe(page, 120);
  const notice = page.locator('.detail-end-notice');
  await expect(notice).toHaveText('今日推荐已到首幅');
  const style = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector('.detail-end-notice'));
    return {
      bg: s.backgroundColor, color: s.color, fontSize: s.fontSize,
      pos: s.position, transition: s.transitionDuration, zIndex: s.zIndex,
    };
  });
  expect(style.bg).toBe('rgba(29, 27, 22, 0.82)');
  expect(style.color).toBe('rgba(253, 251, 247, 0.95)');
  expect(style.fontSize).toBe('13px');
  expect(style.pos).toBe('fixed');
  expect(style.transition).toBe('0.3s');
  expect(style.zIndex).toBe('45');
  // 页码未变
  await expect(page.locator('.folio-idx')).toHaveText('1');
  // 1500ms 全显 + 300ms 淡出 → 1.9s 后 DOM 已移除
  await page.waitForTimeout(1900);
  await expect(notice).toHaveCount(0);
});

test('最后一幅左滑：软胶囊「今日推荐已到末幅」，画面不切换', async ({ page }) => {
  const info = await gotoIssueWork(page, -1);
  await expect(page.locator('.folio-idx')).toHaveText(String(info.ids.length));
  await swipe(page, -120);
  await expect(page.locator('.detail-end-notice')).toHaveText('今日推荐已到末幅');
  await expect(page.locator('.folio-idx')).toHaveText(String(info.ids.length));
});

test('拖动 60px 时 opacity 衰减到 0.35（1 − min(Δx/60, 0.65)）', async ({ page }) => {
  await gotoIssueWork(page, 0);
  // 点击在头图区域中央（y=300），避免点在 .related-scroll 内导致 disqualified
  await page.mouse.move(195, 300);
  await page.mouse.down();
  // 30px：1 − 30/60 = 0.5 — 分步移动确保 pointermove 被触发
  await page.mouse.move(180, 300);
  await page.mouse.move(165, 300);
  await page.waitForTimeout(10);
  const at30 = await page.evaluate(() => document.querySelector('.detail').style.opacity);
  expect(Number(at30)).toBeCloseTo(0.5, 2);
  // 60px：1 − 0.65（封顶）= 0.35
  await page.mouse.move(150, 300);
  await page.mouse.move(135, 300);
  await page.waitForTimeout(10);
  const at60 = await page.evaluate(() => document.querySelector('.detail').style.opacity);
  expect(Number(at60)).toBeCloseTo(0.35, 2);
  // 120px：仍封顶 0.35
  await page.mouse.move(105, 300);
  await page.mouse.move(75, 300);
  await page.waitForTimeout(10);
  const at120 = await page.evaluate(() => document.querySelector('.detail').style.opacity);
  expect(Number(at120)).toBeCloseTo(0.35, 2);
  // 羽箭：左滑显示右缘箭头
  const hint = await page.evaluate(() => {
    const h = document.querySelector('.detail-swipe-hint');
    const s = getComputedStyle(h);
    const r = h.getBoundingClientRect();
    return {
      text: h.textContent, cls: h.className, opacity: s.opacity,
      color: s.color, fontSize: s.fontSize, w: r.width, h: r.height,
      rightGap: window.innerWidth - r.right, pointerEvents: s.pointerEvents,
    };
  });
  expect(hint.text).toBe('→');
  expect(hint.cls).toContain('right');
  expect(hint.opacity).toBe('1');
  expect(hint.color).toBe('rgb(140, 109, 63)'); // --gold
  expect(hint.fontSize).toBe('22px');
  expect(hint.w).toBeCloseTo(44, 1);
  expect(hint.h).toBeCloseTo(60, 1);
  expect(hint.rightGap).toBeCloseTo(0, 1);
  expect(hint.pointerEvents).toBe('none');
  await page.mouse.up();
});

test('未命中阈值（慢速 40px）：不切换，240ms 回弹到 opacity 1', async ({ page }) => {
  await gotoIssueWork(page, 1);
  // 40px < 60px，且用 900ms 走完 → 速度 ≈0.044 px/ms < 0.35
  await swipe(page, -40, { durationMs: 900, steps: 10 });
  const t = await page.evaluate(() => {
    const s = document.querySelector('.detail').style;
    return { opacity: s.opacity, transition: s.transition };
  });
  expect(Number(t.opacity)).toBe(1);
  expect(t.transition).toContain('240ms');
  await page.waitForTimeout(400);
  await expect(page.locator('.folio-idx')).toHaveText('2'); // 未切换
  expect(await page.evaluate(() => document.querySelector('.detail').style.opacity)).toBe('');
});

test('快速轻扫（40px 短时释放，速度 ≥0.35 px/ms）也能命中', async ({ page }) => {
  await gotoIssueWork(page, 0);
  await swipe(page, -40, { durationMs: 0, steps: 2 });
  await page.waitForTimeout(700);
  await expect(page.locator('.folio-idx')).toHaveText('2');
});

test('相关推荐区内横滑只横向滚动，不触发翻页', async ({ page }) => {
  await gotoIssueWork(page, 1);
  await page.waitForSelector('.related-scroll .rel-card');
  const box = await page.locator('.related-scroll').boundingBox();
  await page.evaluate(() => document.querySelector('.related-scroll').scrollIntoView());
  await page.waitForTimeout(200);
  const b2 = await page.locator('.related-scroll').boundingBox();
  await swipe(page, -150, { startX: b2.x + b2.width - 30, startY: b2.y + b2.height / 2 });
  await page.waitForTimeout(700);
  // 页码不变 = 未翻页
  await expect(page.locator('.folio-idx')).toHaveText('2');
  expect(box).not.toBeNull();
});

test('相关推荐缩略图点击仍能跳转（与手势翻页并存）', async ({ page }) => {
  await gotoIssueWork(page, 1);
  await page.waitForSelector('.related-scroll .rel-card');
  const target = await page.locator('.rel-card').first().getAttribute('data-go');
  await page.locator('.rel-card').first().click();
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => location.hash)).toBe(`#/work/${target}`);
});

test('关闭按钮仍可返回上级', async ({ page }) => {
  await gotoIssueWork(page, 0);
  await page.locator('.detail-close').click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => location.hash)).not.toContain('/work/');
});

// SW 必须屏蔽：sw.js 用 skipWaiting() + clients.claim() 在本次加载中就夺取当前页控制权，
// 而它的 DATA_RE = /\/data\// 会接管所有期文件请求 —— Playwright 的 page.route
// 拦不住 Service Worker 发出的请求。夺权时机是竞态，于是本例的 mock 时灵时不灵：
// 夺权早了浏览器拿到真实 30 幅期文件（.folio 变成 1），或造成取数状态不一致
// （详情页渲染成「作品数据缺失」）。30 次压测复现 3 次，两种表现都源于此。
test.describe('单幅日期（屏蔽 SW，保证期文件 mock 不被 SW 旁路）', () => {
  test.use({ serviceWorkers: 'block' });

  test('单幅日期：不渲染页码、不挂翻页手势', async ({ page, request, baseURL }) => {
    // 注意：route 必须在任何 page.goto 之前注册 —— data.js 的 issueCache 是模块级内存缓存，
    // 先访问首页会把真实期文件读进内存，之后再拦截网络已经来不及。
    // 所以期号/作品 id 用 Playwright 的 request（页面外）取。
    await stubExternalImages(page);
    const idx = await (await request.get(new URL('data/index.json', baseURL).href)).json();
    const iss = await (await request.get(new URL(`data/issues/${idx.latest}.json`, baseURL).href)).json();
    const workId = iss.works[0].id;

    // 直接用页面外已取到的 iss 构造响应，不用 route.fetch() 再走一次网络往返。
    await page.route(`**/data/issues/${idx.latest}.json`, async (route) => {
      await route.fulfill({ json: { ...iss, works: iss.works.slice(0, 1) } });
    });

    await page.goto(`./#/work/${workId}`);
    // 与本文件 gotoIssueWork 的等待语义一致用 attached：详情页头图容器一挂载即可断言，
    // 不必等外部 CDN 大图解码完成（visible 会把图片加载时间也算进用例预算）。
    await page.waitForSelector('.detail .detail-hero', { state: 'attached' });
    await expect(page.locator('.folio')).toHaveCount(0);
    await swipe(page, -150);
    await page.waitForTimeout(600);
    // 未翻页、未出现边界提示（手势根本没挂）
    expect(await page.evaluate(() => location.hash)).toBe(`#/work/${workId}`);
    await expect(page.locator('.detail-end-notice')).toHaveCount(0);
  });
});

test('prefers-reduced-motion: reduce 时过渡降为 30ms、羽箭隐藏', async ({ browser }) => {
  const ctx = await browser.newContext({ ...VIEWPORT && { viewport: VIEWPORT }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await gotoIssueWork(page, 0);
  const durations = await page.evaluate(() => {
    const d = document.querySelector('.detail');
    d.classList.add('fade-out');
    const out = getComputedStyle(d).transitionDuration;
    d.classList.remove('fade-out');
    d.classList.add('fade-in');
    const cs = getComputedStyle(d);
    const inDur = cs.animationDuration;
    const inDelay = cs.animationDelay;
    d.classList.remove('fade-in');
    const hint = document.createElement('div');
    hint.className = 'detail-swipe-hint right';
    document.querySelector('.detail').appendChild(hint);
    const hintDisplay = getComputedStyle(hint).display;
    hint.remove();
    return { out, inDur, inDelay, hintDisplay };
  });
  expect(durations.out).toBe('0.03s');
  expect(durations.inDur).toBe('0.03s');
  expect(durations.inDelay).toBe('0s');
  expect(durations.hintDisplay).toBe('none');
  await ctx.close();
});
