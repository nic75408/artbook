// t_436a7dc5：详情页顶部收藏 icon 按钮
// 验收标准：40×40 雾玻璃、左上角与关闭按钮对称、点击切换空心/实心、与底部收藏按钮状态同步、翻页后状态跟随新画作
const { test, expect } = require('@playwright/test');
const { stubExternalImages } = require('./helpers/stub-external-images');

const VIEWPORT = { width: 390, height: 844 };

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
  return { ...info, id };
}

test.use({ viewport: VIEWPORT, hasTouch: true, isMobile: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('artbook.favs'));
});

test('详情页右上角出现收藏 icon 按钮，40×40 雾玻璃背景，与返回按钮同一行左右对称', async ({ page }) => {
  await gotoIssueWork(page, 0);
  const box = await page.locator('#fav-top-act').boundingBox();
  const backBox = await page.locator('.detail-back').boundingBox();
  expect(box.width).toBeCloseTo(40, 0);
  expect(box.height).toBeCloseTo(40, 0);
  // 同一行：top 相近
  expect(Math.abs(box.y - backBox.y)).toBeLessThan(2);
  // 右上角：x 应远大于返回按钮（左上角）
  expect(box.x).toBeGreaterThan(backBox.x);

  const style = await page.locator('#fav-top-act').evaluate((el) => {
    const s = getComputedStyle(el);
    return { backdropFilter: s.backdropFilter || s.webkitBackdropFilter, borderRadius: s.borderRadius };
  });
  expect(style.backdropFilter).toContain('blur');
  expect(style.borderRadius).toBe('50%');
});

test('点击顶部收藏按钮可切换收藏状态，图标在空心/实心间切换，且与底部按钮同步', async ({ page }) => {
  const { id } = await gotoIssueWork(page, 0);
  const topBtn = page.locator('#fav-top-act');
  const bottomBtn = page.locator('#fav-act');

  await expect(topBtn).not.toHaveClass(/(^|\s)on(\s|$)/);
  await expect(bottomBtn).not.toHaveClass(/(^|\s)on(\s|$)/);

  await topBtn.click();
  await expect(topBtn).toHaveClass(/(^|\s)on(\s|$)/);
  await expect(bottomBtn).toHaveClass(/(^|\s)on(\s|$)/);
  await expect(bottomBtn).toContainText('已收藏');

  const favs = await page.evaluate(() => JSON.parse(localStorage.getItem('artbook.favs') || '[]'));
  expect(favs.some((f) => f.id === id)).toBe(true);

  // 反向：点击底部按钮取消收藏，顶部按钮同步回空心
  await bottomBtn.click();
  await expect(topBtn).not.toHaveClass(/(^|\s)on(\s|$)/);
  await expect(bottomBtn).not.toHaveClass(/(^|\s)on(\s|$)/);
});

test('点击底部收藏按钮后，顶部按钮立即同步为已收藏', async ({ page }) => {
  await gotoIssueWork(page, 0);
  const topBtn = page.locator('#fav-top-act');
  const bottomBtn = page.locator('#fav-act');

  await bottomBtn.click();
  await expect(topBtn).toHaveClass(/(^|\s)on(\s|$)/);
  await expect(topBtn.locator('svg')).toHaveClass(/icon-filled/);
});
