// 详情页左右滑动切换同日期作品（t_13662686）
// t_8d4351d6：scrubber → 印刷页码字符「NN · total」，断言从 aria-valuenow 换成文本内容
const { test, expect } = require('@playwright/test');
const { stubExternalImages } = require('./helpers/stub-external-images');

const VIEWPORT = { width: 390, height: 844 };

// t_8d4351d6：读取当前印刷页码字符的位置数字（去掉前导 0 与分隔符）
// 格式：`NN · total`，返回 NN 的数值
async function currentFolio(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('.detail-folio-mark');
    if (!el) return null;
    // 文本 "14 · 28" → 取第一个数字
    const m = el.textContent.match(/(\d+)/);
    return m ? Number(m[1]) : null;
  });
}

async function gotoIssueWork(page, offset = 0) {
  await stubExternalImages(page);
  await page.goto('./');
  const info = await page.evaluate(async () => {
    const idx = await (await fetch('data/index.json', { cache: 'no-cache' })).json();
    const iss = await (await fetch(`data/issues/${idx.latest}.json`, { cache: 'no-cache' })).json();
    return { ids: iss.works.map((w) => w.id), date: idx.latest };
  });
  const id = info.ids[offset < 0 ? info.ids.length + offset : offset];
  await page.goto(`./#/work/${id}`);
  await page.waitForSelector('.detail .detail-hero', { state: 'attached' });
  if (info.ids.length > 1) {
    await page.waitForSelector('.detail-folio-mark', { state: 'attached' });
  }
  return { ...info, id };
}

async function gotoOldestIssueLastWork(page) {
  await page.goto('./');
  const info = await page.evaluate(async () => {
    const idx = await (await fetch('data/index.json', { cache: 'no-cache' })).json();
    const oldestDate = idx.issues[idx.issues.length - 1];
    const iss = await (await fetch(`data/issues/${oldestDate}.json`, { cache: 'no-cache' })).json();
    return { ids: iss.works.map((w) => w.id), date: oldestDate };
  });
  const id = info.ids[info.ids.length - 1];
  await page.goto(`./#/work/${id}`);
  await page.waitForSelector('.detail .detail-hero', { state: 'attached' });
  if (info.ids.length > 1) {
    await page.waitForSelector('.detail-folio-mark', { state: 'attached' });
  }
  return { ...info, id };
}

async function swipe(page, dx, { durationMs = 400, steps = 12, startY = 500, startX = 195 } = {}) {
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(startX + (dx * i) / steps, startY);
    if (durationMs > 0) await page.waitForTimeout(durationMs / steps);
  }
  await page.mouse.up();
  await page.waitForTimeout(50);
}

test.use({ viewport: VIEWPORT, hasTouch: true, isMobile: true });

// t_8d4351d6：印刷页码字符（folio mark）替换迷你滑轨。
// 数值规格：楷体 Kaiti SC 12px / letter-spacing 0.24em / color rgba(29,27,22,0.42) /
// text-align center / font-variant-numeric tabular-nums / pointer-events none
// 单幅不渲染。文本内容 = `${zeroPad2(index+1)} · ${total}`。
test('印刷页码字符：文本格式 + 几何 + 视觉规格 + pointer-events none', async ({ page }) => {
  const info = await gotoIssueWork(page, 0);
  const mark = page.locator('.detail-folio-mark');
  await expect(mark).toHaveAttribute('role', 'doc-pagenumber');
  // 文本："01 · 28"（total 位数按实际，不 zero-pad）
  const text = (await mark.textContent()).replace(/\s+/g, ' ').trim();
  expect(text).toBe(`01 · ${info.ids.length}`);

  const m = await page.evaluate(() => {
    const el = document.querySelector('.detail-folio-mark');
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      pointerEvents: s.pointerEvents,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      letterSpacing: s.letterSpacing,
      color: s.color,
      textAlign: s.textAlign,
      fontVariantNumeric: s.fontVariantNumeric,
      display: s.display,
      viewportWidth: window.innerWidth,
      markLeft: r.left,
      markRight: r.right,
      markCenter: r.left + r.width / 2,
    };
  });
  expect(m.pointerEvents).toBe('none');
  expect(m.fontSize).toBe('12px');
  // letter-spacing 0.24em @ 12px = 2.88px
  expect(m.letterSpacing).toBe('2.88px');
  // 深棕 α 0.42
  expect(m.color).toBe('rgba(29, 27, 22, 0.42)');
  expect(m.textAlign).toBe('center');
  expect(m.fontVariantNumeric).toContain('tabular-nums');
  expect(m.display).toBe('block');
  // 楷体系字体：Kaiti SC/STKaiti/KaiTi 优先，回退 serif
  expect(m.fontFamily.toLowerCase()).toMatch(/kaiti|stkaiti/);
  // text-align center：块占满父宽（padding 除外），文字视觉居中
  // 视觉中心 ≈ 视口中心（padding-inline-start 0.24em 补偿字距在真机对齐；此处允许 6px 误差）
  expect(Math.abs(m.markCenter - m.viewportWidth / 2)).toBeLessThan(8);
});

test('印刷页码字符：切到第 14 幅时文本更新为 "14 · total"', async ({ page }) => {
  const info = await gotoIssueWork(page, 13);
  const text = (await page.locator('.detail-folio-mark').textContent()).replace(/\s+/g, ' ').trim();
  expect(text).toBe(`14 · ${info.ids.length}`);
  // tabular-nums：宽度稳定，切换不跳动（对比 01 vs 14）
  const w14 = await page.evaluate(() => document.querySelector('.detail-folio-mark').getBoundingClientRect().width);
  await gotoIssueWork(page, 0);
  const w01 = await page.evaluate(() => document.querySelector('.detail-folio-mark').getBoundingClientRect().width);
  expect(Math.abs(w14 - w01)).toBeLessThan(1);
});


test('左滑 60px+ 切换到下一幅，页码 +1、URL 更新、滚回顶部', async ({ page }) => {
  const info = await gotoIssueWork(page, 0);
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

  await swipe(page, -120);
  await page.waitForTimeout(700);

  expect(await currentFolio(page)).toBe(2);
  expect(await page.evaluate(() => location.hash)).toBe(`#/work/${info.ids[1]}`);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1);
});

test('右滑切换到上一幅', async ({ page }) => {
  const info = await gotoIssueWork(page, 2);
  expect(await currentFolio(page)).toBe(3);
  await swipe(page, 120);
  await page.waitForTimeout(700);
  expect(await currentFolio(page)).toBe(2);
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
  expect(await currentFolio(page)).toBe(1);
  await page.waitForTimeout(1900);
  await expect(notice).toHaveCount(0);
});

test('最后一幅左滑：软胶囊「今日推荐已到末幅」，画面不切换', async ({ page }) => {
  const info = await gotoOldestIssueLastWork(page);
  expect(await currentFolio(page)).toBe(info.ids.length);
  await swipe(page, -120);
  await expect(page.locator('.detail-end-notice')).toHaveText('今日推荐已到末幅');
  expect(await currentFolio(page)).toBe(info.ids.length);
});

test('拖动 60px 时 opacity 衰减到 0.35（1 − min(Δx/60, 0.65)）', async ({ page }) => {
  await gotoIssueWork(page, 0);
  await page.mouse.move(195, 500);
  await page.mouse.down();
  await page.mouse.move(165, 500);
  await page.mouse.move(165, 500);
  const at30 = await page.evaluate(() => document.querySelector('.detail').style.opacity);
  expect(Number(at30)).toBeCloseTo(0.5, 2);
  await page.mouse.move(135, 500);
  const at60 = await page.evaluate(() => document.querySelector('.detail').style.opacity);
  expect(Number(at60)).toBeCloseTo(0.35, 2);
  await page.mouse.move(75, 500);
  const at120 = await page.evaluate(() => document.querySelector('.detail').style.opacity);
  expect(Number(at120)).toBeCloseTo(0.35, 2);
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
  expect(hint.color).toBe('rgb(140, 109, 63)');
  expect(hint.fontSize).toBe('22px');
  expect(hint.w).toBeCloseTo(44, 1);
  expect(hint.h).toBeCloseTo(60, 1);
  expect(hint.rightGap).toBeCloseTo(0, 1);
  expect(hint.pointerEvents).toBe('none');
  await page.mouse.up();
});

test('未命中阈值（慢速 40px）：不切换，240ms 回弹到 opacity 1', async ({ page }) => {
  await gotoIssueWork(page, 1);
  await swipe(page, -40, { durationMs: 900, steps: 10 });
  const t = await page.evaluate(() => {
    const s = document.querySelector('.detail').style;
    return { opacity: s.opacity, transition: s.transition };
  });
  expect(Number(t.opacity)).toBe(1);
  expect(t.transition).toContain('240ms');
  await page.waitForTimeout(400);
  expect(await currentFolio(page)).toBe(2); // 未切换
  expect(await page.evaluate(() => document.querySelector('.detail').style.opacity)).toBe('');
});

test('快速轻扫（40px 短时释放，速度 ≥0.35 px/ms）也能命中', async ({ page }) => {
  await gotoIssueWork(page, 0);
  await swipe(page, -40, { durationMs: 0, steps: 2 });
  await page.waitForTimeout(700);
  expect(await currentFolio(page)).toBe(2);
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
  expect(await currentFolio(page)).toBe(2);
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

test('返回按钮仍可返回上级', async ({ page }) => {
  await gotoIssueWork(page, 0);
  await page.locator('.detail-back').click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => location.hash)).not.toContain('/work/');
});

test.describe('单幅日期（屏蔽 SW，保证期文件 mock 不被 SW 旁路）', () => {
  test.use({ serviceWorkers: 'block' });

  test('单幅日期：不渲染折页码字符、不挂翻页手势', async ({ page, request, baseURL }) => {
    await stubExternalImages(page);
    const idx = await (await request.get(new URL('data/index.json', baseURL).href)).json();
    const iss = await (await request.get(new URL(`data/issues/${idx.latest}.json`, baseURL).href)).json();
    const workId = iss.works[0].id;

    await page.route(`**/data/issues/${idx.latest}.json`, async (route) => {
      await route.fulfill({ json: { ...iss, works: iss.works.slice(0, 1) } });
    });

    await page.goto(`./#/work/${workId}`);
    await page.waitForSelector('.detail .detail-hero', { state: 'attached' });
    await expect(page.locator('.detail-folio-mark')).toHaveCount(0);
    await swipe(page, -150);
    await page.waitForTimeout(600);
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
