// 测试辅助：切断对外部图片 CDN 的真实网络依赖。
//
// 背景（真实事故：t_ac61cb9a Round-2 被打回）：
// 详情页 <img> 指向 openaccess-cdn.clevelandart.org / images.metmuseum.org，
// 且 sw.js install 时会 best-effort 预取这些图片（prefetchImages）。
// 单跑用例时这点外网请求无所谓，但 `npm test` 会并行起 3 个 Playwright worker、
// 每个用例都开全新 context（全新 SW 注册 → 又一轮预取），
// 于是几十路 CDN 请求同时挤在 WebKit 有限的网络队列里。
// 页面自己的 fetch('data/issues/*.json') 排在后面拿不到连接，
// 详情页就永远渲染不出来 → `.detail-hero` / `.folio` 等 30s 超时。
//
// 关键特征：每次失败的是随机某个用例，且在 origin/main 上同样复现
// （main 连跑 4 次挂了 3 次），说明它跟具体样式改动无关，是环境竞态。
//
// 修法：把外部图片请求就地 fulfill 成一张 1×1 PNG。
// 不用 abort —— abort 会触发 img 的 error 分支、污染「图片加载」相关断言；
// fulfill 让 onload 正常走，同时零外网往返，测试变确定性。
//
// 注意：路由必须在任何 page.goto 之前注册。

const EXTERNAL_IMAGE_HOSTS = ['openaccess-cdn.clevelandart.org', 'images.metmuseum.org'];

// 1×1 透明 PNG
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * 拦截外部图片 CDN，返回本地 1×1 PNG。
 * @param {import('@playwright/test').Page} page
 */
async function stubExternalImages(page) {
  for (const host of EXTERNAL_IMAGE_HOSTS) {
    await page.route(`**://${host}/**`, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL })
    );
  }
}

module.exports = { stubExternalImages, EXTERNAL_IMAGE_HOSTS };
