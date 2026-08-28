# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/feed-alignment.spec.js >> 视觉证据截图 >> 捕获 10 张作品卡的对齐证据
- Location: tests/feed-alignment.spec.js:129:7

# Error details

```
TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
Call log:
  - waiting for locator('.slide') to be visible

```

# Page snapshot

```yaml
- main [ref=e2]
```

# Test source

```ts
  32  |         const frameBox = await frame.boundingBox();
  33  |         const namesBox = await names.boundingBox();
  34  |         const btnBox = await learnBtn.boundingBox();
  35  | 
  36  |         // 记录左边界 X 坐标
  37  |         measurements.push({
  38  |           slideIndex: i,
  39  |           frameLeft: frameBox.x,
  40  |           namesLeft: namesBox.x,
  41  |           // learn-btn 是右下角按钮，不参与左对齐检查
  42  |         });
  43  |       }
  44  |     }
  45  | 
  46  |     // 验证所有卡片的左边界一致（误差 ≤ 2px）
  47  |     if (measurements.length > 0) {
  48  |       const leftValues = measurements.map(m => m.frameLeft);
  49  |       const minLeft = Math.min(...leftValues);
  50  |       const maxLeft = Math.max(...leftValues);
  51  |       expect(maxLeft - minLeft).toBeLessThanOrEqual(2);
  52  |     }
  53  |   });
  54  | 
  55  |   test('横向滑动时左右留白一致', async ({ page }) => {
  56  |     // 获取第一张和最后一张可见卡片的左右边距
  57  |     const getWhitespace = async () => {
  58  |       const scroller = await page.$('.feed-scroller');
  59  |       const box = await scroller.boundingBox();
  60  |       const contentMax = 340; // --content-max
  61  |       const pageGutter = 22;  // --page-gutter
  62  |       // 内容区应该居中，左右留白应该相等
  63  |       const expectedLeftWhitespace = (box.width - contentMax) / 2;
  64  |       return { left: expectedLeftWhitespace, width: box.width };
  65  |     };
  66  | 
  67  |     const initialWS = await getWhitespace();
  68  |     
  69  |     // 滚动到第 5 张卡片
  70  |     await page.evaluate(() => {
  71  |       const scroller = document.querySelector('.feed-scroller');
  72  |       scroller.scrollTop = scroller.clientHeight * 4;
  73  |     });
  74  |     await page.waitForTimeout(500);
  75  | 
  76  |     const scrolledWS = await getWhitespace();
  77  |     
  78  |     // 留白差异应该 ≤ 5px
  79  |     expect(Math.abs(initialWS.left - scrolledWS.left)).toBeLessThanOrEqual(5);
  80  |   });
  81  | 
  82  |   test('垂直间距统一为 24pt', async ({ page }) => {
  83  |     const slide = await page.$('.slide');
  84  |     expect(slide).toBeTruthy();
  85  | 
  86  |     // 检查 .names 的 margin-top 是否为 24px
  87  |     const namesMarginTop = await page.evaluate(() => {
  88  |       const names = document.querySelector('.slide .names');
  89  |       return parseFloat(getComputedStyle(names).marginTop);
  90  |     });
  91  |     expect(namesMarginTop).toBe(24);
  92  |   });
  93  | 
  94  |   test('右下角了解更多按钮尺寸收紧到 84px', async ({ page }) => {
  95  |     const learnBtn = await page.$('.learn-btn');
  96  |     expect(learnBtn).toBeTruthy();
  97  | 
  98  |     const btnBox = await learnBtn.boundingBox();
  99  |     expect(btnBox.width).toBe(84);
  100 |     expect(btnBox.height).toBe(84);
  101 |   });
  102 | 
  103 |   test('首页无左下角收藏按钮', async ({ page }) => {
  104 |     // 检查页面中不存在 .fav-btn 元素
  105 |     const favBtn = await page.$('.fav-btn');
  106 |     expect(favBtn).toBeNull();
  107 |   });
  108 | 
  109 |   test('右上角收藏夹入口显示文字', async ({ page }) => {
  110 |     const gotoFavs = await page.$('#goto-favs');
  111 |     expect(gotoFavs).toBeTruthy();
  112 | 
  113 |     const text = await page.evaluate(el => el.textContent, gotoFavs);
  114 |     expect(text).toContain('收藏夹');
  115 |   });
  116 | 
  117 |   test('点击右上角收藏夹进入收藏夹视图', async ({ page }) => {
  118 |     await page.click('#goto-favs');
  119 |     await page.waitForURL(/#\/favs/);
  120 |     await page.waitForTimeout(500);  // 等待视图渲染
  121 | 
  122 |     // 验证进入了收藏夹页面
  123 |     const pageHeader = await page.$('.page');
  124 |     expect(pageHeader).toBeTruthy();
  125 |   });
  126 | });
  127 | 
  128 | test.describe('视觉证据截图', () => {
  129 |   test('捕获 10 张作品卡的对齐证据', async ({ page }) => {
  130 |     await page.setViewportSize(IPHONE_14_PRO);
  131 |     await page.goto(BASE_URL + '/index.html');
> 132 |     await page.waitForSelector('.slide', { timeout: 5000 });
      |                ^ TimeoutError: page.waitForSelector: Timeout 5000ms exceeded.
  133 | 
  134 |     const slides = await page.$$('.slide');
  135 |     for (let i = 0; i < Math.min(slides.length, 10); i++) {
  136 |       const slide = slides[i];
  137 |       await slide.scrollIntoViewIfNeeded();
  138 |       await page.waitForTimeout(300);
  139 |       
  140 |       // 捕获带标尺的截图
  141 |       await page.screenshot({
  142 |         path: `tests/evidence/feed-alignment-slide-${i}.png`,
  143 |         clip: await slide.boundingBox()
  144 |       });
  145 |     }
  146 |   });
  147 | });
  148 | 
```