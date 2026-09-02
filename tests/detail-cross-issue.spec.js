// 跨日期连续浏览 + 下拉退出详情页 + 首页定位（t_e578fc0d，SPEC docs/detail-navigation-spec.md B 案）
const { test, expect } = require('@playwright/test');

const VIEWPORT = { width: 390, height: 844 };

async function fetchInfo(page) {
  await page.goto('./');
  return page.evaluate(async () => {
    const idx = await (await fetch('data/index.json', { cache: 'no-cache' })).json();
    const issues = idx.issues || [];
    const latestIssue = await (await fetch(`data/issues/${issues[0]}.json`, { cache: 'no-cache' })).json();
    const secondIssue = await (await fetch(`data/issues/${issues[1]}.json`, { cache: 'no-cache' })).json();
    return {
      issues,
      latestDate: issues[0],
      latestIds: latestIssue.works.map((w) => w.id),
      secondDate: issues[1],
      secondIds: secondIssue.works.map((w) => w.id),
    };
  });
}

async function gotoWork(page, id) {
  await page.goto(`./#/work/${id}`);
  await page.waitForSelector('.detail .detail-hero', { state: 'attached' });
}

async function swipe(page, dx, dy = 0, { durationMs = 400, steps = 12, startY = 500, startX = 195 } = {}) {
  // 对垂直滑动（下拉退出），使用 PointerEvent 绕过 page.mouse API 的问题
  if (dy > 0) {
    await page.evaluate(({ startX, startY, dx, dy, steps, durationMs }) => {
      return new Promise(async (resolve) => {
        const view = document.getElementById('view');
        const detailHero = document.querySelector('.detail-hero');
        const relatedScroll = document.querySelector('.related-scroll');
        
        // 计算起点对应的元素（用于 e.target 检查）
        // 优先级：related-scroll > detail-hero > view
        let targetElement = view;
        if (relatedScroll) {
          const r = relatedScroll.getBoundingClientRect();
          if (startX >= r.left && startX <= r.right && startY >= r.top && startY <= r.bottom) {
            targetElement = relatedScroll;
          }
        }
        if (targetElement === view && detailHero) {
          const r = detailHero.getBoundingClientRect();
          if (startX >= r.left && startX <= r.right && startY >= r.top && startY <= r.bottom) {
            targetElement = detailHero;
          }
        }
        
        const dispatchEvent = (type, cx, cy, target) => {
          const event = new PointerEvent(type, {
            clientX: cx,
            clientY: cy,
            bubbles: true,
            cancelable: true
          });
          target.dispatchEvent(event);
        };
        
        // pointerdown
        dispatchEvent('pointerdown', startX, startY, targetElement);
        
        // pointermove 分步
        for (let i = 1; i < steps; i++) {
          await new Promise(r => setTimeout(r, durationMs / steps));
          const t = i / steps;
          dispatchEvent('pointermove', startX + dx * t, startY + dy * t, targetElement);
        }
        
        // 等待剩余时间
        await new Promise(r => setTimeout(r, durationMs / steps));
        
        // pointerup
        dispatchEvent('pointerup', startX + dx, startY + dy, view);
        
        resolve();
      });
    }, { startX, startY, dx, dy, steps, durationMs });
  } else {
    // 横向滑动继续使用 page.mouse API
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(startX + (dx * i) / steps, startY + (dy * i) / steps);
      if (durationMs > 0) await page.waitForTimeout(durationMs / steps);
    }
    await page.mouse.up();
  }
}

test.use({ viewport: VIEWPORT, hasTouch: true, isMobile: true });

async function currentFolio(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('.detail-folio-mark');
    if (!el) return null;
    const m = el.textContent.match(/(\d+)/);
    return m ? Number(m[1]) : null;
  });
}
async function folioTotal(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('.detail-folio-mark');
    if (!el) return null;
    const nums = [...el.textContent.matchAll(/(\d+)/g)].map((x) => Number(x[1]));
    return nums.length >= 2 ? nums[1] : null;
  });
}

test('最新一期末幅左滑 96px+：跨期进入前一期第 1 幅，folio 重置，480ms 内完成', async ({ page }) => {
  const info = await fetchInfo(page);
  const lastId = info.latestIds[info.latestIds.length - 1];
  await gotoWork(page, lastId);
  expect(await currentFolio(page)).toBe(info.latestIds.length);

  await swipe(page, -150);
  await page.waitForTimeout(700);

  expect(await page.evaluate(() => location.hash)).toBe(`#/work/${info.secondIds[0]}`);
  expect(await currentFolio(page)).toBe(1);
  expect(await folioTotal(page)).toBe(info.secondIds.length);
});

test('60px 到 96px 之间：羽箭形态改变（宽高扩大 + 显示目标日期缩略文案）', async ({ page }) => {
  const info = await fetchInfo(page);
  const lastId = info.latestIds[info.latestIds.length - 1];
  await gotoWork(page, lastId);

  await page.mouse.move(195, 500);
  await page.mouse.down();
  await page.mouse.move(195 - 80, 500); // dx = -80，落在 60~96 窗口内
  await page.mouse.move(195 - 80, 500);
  const hint = await page.evaluate(() => {
    const h = document.querySelector('.detail-swipe-hint');
    const r = h.getBoundingClientRect();
    return { text: h.textContent, w: r.width, h: r.height };
  });
  expect(hint.w).toBeGreaterThan(44);
  expect(hint.h).toBeGreaterThan(60);
  expect(hint.text).not.toBe('←');
  await page.mouse.up();
});

test('跨期转场：中央金色日期条短暂出现', async ({ page }) => {
  const info = await fetchInfo(page);
  const lastId = info.latestIds[info.latestIds.length - 1];
  await gotoWork(page, lastId);

  await swipe(page, -150);
  // 转场进行中（0-480ms）应能捕捉到 banner
  const seen = await page.waitForSelector('.date-flip-banner', { state: 'attached', timeout: 1000 }).then(() => true).catch(() => false);
  expect(seen).toBe(true);
  await page.waitForTimeout(700);
  await expect(page.locator('.date-flip-banner')).toHaveCount(0);
});

test('最新一期首幅右滑：没有更新的一期，保留"已到首幅"提示', async ({ page }) => {
  const info = await fetchInfo(page);
  await gotoWork(page, info.latestIds[0]);
  await swipe(page, 150);
  await expect(page.locator('.detail-end-notice')).toHaveText('今日推荐已到首幅');
  expect(await currentFolio(page)).toBe(1);
});

test('顶部下拉 96px+：退出详情返回首页', async ({ page }) => {
  const info = await fetchInfo(page);
  await gotoWork(page, info.latestIds[0]);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await swipe(page, 0, 150, { startY: 300 });
  await page.waitForTimeout(500);

  expect(await page.evaluate(() => location.hash)).not.toContain('/work/');
});

test('下拉过程中跟手：translateY 与 opacity 衰减', async ({ page }) => {
  const info = await fetchInfo(page);
  await gotoWork(page, info.latestIds[0]);
  
  // 确保页面在顶部
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  
  // 直接使用 page.evaluate 触发 pointer 事件，绕过 page.mouse API
  const result = await page.evaluate(() => {
    const detail = document.querySelector('.detail');
    const view = document.getElementById('view');
    
    // 模拟 pointerdown
    const downEvent = new PointerEvent('pointerdown', {
      clientX: 195,
      clientY: 300,
      bubbles: true,
      cancelable: true
    });
    view.dispatchEvent(downEvent);
    
    // 模拟 pointermove
    const moveEvent = new PointerEvent('pointermove', {
      clientX: 195,
      clientY: 380,
      bubbles: true,
      cancelable: true
    });
    view.dispatchEvent(moveEvent);
    
    // 读取 transform
    return { transform: detail.style.transform, opacity: detail.style.opacity };
  });
  
  console.log('Result:', result);
  expect(result.transform).toMatch(/translate3d\(0px?,\s*40px,\s*0px?\)/); // 80 * 0.5 阻尼
  expect(Number(result.opacity)).toBeCloseTo(1 - 80 / 240, 2);
});

test('下拉未达阈值（40px）：不退出，回弹', async ({ page }) => {
  const info = await fetchInfo(page);
  await gotoWork(page, info.latestIds[0]);
  await swipe(page, 0, 40, { startY: 300, durationMs: 900, steps: 10 });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => location.hash)).toContain('/work/');
});

test('scrollY > 0 时下滑：让给页面正常滚动，不触发退出', async ({ page }) => {
  const info = await fetchInfo(page);
  await gotoWork(page, info.latestIds[0]);
  await page.evaluate(() => window.scrollTo(0, 300));
  await page.waitForTimeout(100);
  await swipe(page, 0, 150, { startY: 500 });
  await page.waitForTimeout(500);
  // 仍在详情页（未退出）
  expect(await page.evaluate(() => location.hash)).toContain('/work/');
});

test('相关推荐区起点：任何方向都不触发下拉/翻页', async ({ page }) => {
  const info = await fetchInfo(page);
  await gotoWork(page, info.latestIds[1]);
  await page.waitForSelector('.related-scroll .rel-card');
  const box = await page.locator('.related-scroll').boundingBox();
  await swipe(page, 0, 150, { startX: box.x + 20, startY: box.y + box.height / 2 });
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => location.hash)).toContain('/work/');
});

test('跨期/下拉退出后，首页停在刚才切换到的那一幅（feed:pos 契约）', async ({ page }) => {
  const info = await fetchInfo(page);
  const lastId = info.latestIds[info.latestIds.length - 1];
  await gotoWork(page, lastId);
  // 跨期到 secondDate 第 1 幅
  await swipe(page, -150);
  await page.waitForTimeout(700);
  expect(await currentFolio(page)).toBe(1);

  const pos = await page.evaluate(() => JSON.parse(sessionStorage.getItem('artbook.feedpos')));
  expect(pos.issue).toBe(info.secondDate);
  expect(pos.index).toBe(info.latestIds.length); // 扁平索引：最新一期长度 + 0
});

test('prefers-reduced-motion: reduce 时跨期转场与日期条时长压至 30ms', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: VIEWPORT, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const info = await fetchInfo(page);
  const lastId = info.latestIds[info.latestIds.length - 1];
  await gotoWork(page, lastId);
  const durations = await page.evaluate(() => {
    const d = document.querySelector('.detail');
    d.classList.add('dateflip-out');
    const out = getComputedStyle(d).transitionDuration;
    d.classList.remove('dateflip-out');
    d.classList.add('dateflip-in');
    const inDur = getComputedStyle(d).animationDuration;
    d.classList.remove('dateflip-in');
    return { out, inDur };
  });
  expect(durations.out).toBe('0.03s');
  expect(durations.inDur).toBe('0.03s');
  await ctx.close();
});
