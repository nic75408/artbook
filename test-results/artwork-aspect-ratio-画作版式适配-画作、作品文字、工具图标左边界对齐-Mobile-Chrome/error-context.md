# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: artwork-aspect-ratio.spec.js >> 画作版式适配 >> 画作、作品文字、工具图标左边界对齐
- Location: tests/artwork-aspect-ratio.spec.js:28:7

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 2
Received:    72.1875
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic:
    - generic: 艺术手册
    - button "收藏夹" [ref=e3] [cursor=pointer]
  - generic [ref=e7]:
    - generic [ref=e8]:
      - img "皮埃罗在刑事法庭" [ref=e11]
      - generic [ref=e12]:
        - generic [ref=e13]: 托马斯·库图尔
        - generic [ref=e14]: Pierrot in Criminal Court
      - button "了解更多" [ref=e15] [cursor=pointer]:
        - img [ref=e16]:
          - generic [ref=e17]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e22]:
      - img "菊、雀与幼犬图" [ref=e25]
      - generic [ref=e26]:
        - generic [ref=e27]: 长泽芦雪
        - generic [ref=e28]: Puppies, Sparrows, and Chrysanthemums
      - button "了解更多" [ref=e29] [cursor=pointer]:
        - img [ref=e30]:
          - generic [ref=e31]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e36]:
      - img "麦田" [ref=e39]
      - generic [ref=e40]:
        - generic [ref=e41]: 乔治·英尼斯
        - generic [ref=e42]: The Wheat Field
      - button "了解更多" [ref=e43] [cursor=pointer]:
        - img [ref=e44]:
          - generic [ref=e45]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e50]:
      - img "《圣母升天》习作" [ref=e53]
      - generic [ref=e54]:
        - generic [ref=e55]: 胡安·德·巴尔德斯·莱亚尔
        - generic [ref=e56]: Study for "The Assumption of the Virgin" for San Augustín, Seville
      - button "了解更多" [ref=e57] [cursor=pointer]:
        - img [ref=e58]:
          - generic [ref=e59]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e64]:
      - img "竹石图" [ref=e67]
      - generic [ref=e68]:
        - generic [ref=e69]: 佚名
        - generic [ref=e70]: Bamboo Landscape
      - button "了解更多" [ref=e71] [cursor=pointer]:
        - img [ref=e72]:
          - generic [ref=e73]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e78]:
      - img "本杰明·韦斯特肖像" [ref=e81]
      - generic [ref=e82]:
        - generic [ref=e83]: 托马斯·劳伦斯
        - generic [ref=e84]: Portrait of Benjamin West
      - button "了解更多" [ref=e85] [cursor=pointer]:
        - img [ref=e86]:
          - generic [ref=e87]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e92]:
      - img "雉鸡与草" [ref=e95]
      - generic [ref=e96]:
        - generic [ref=e97]: 尾形光琳
        - generic [ref=e98]: Pheasant and Grasses
      - button "了解更多" [ref=e99] [cursor=pointer]:
        - img [ref=e100]:
          - generic [ref=e101]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e106]:
      - img "卡茨基尔的秋天" [ref=e109]
      - generic [ref=e110]:
        - generic [ref=e111]: 贾维斯·麦肯蒂
        - generic [ref=e112]: Autumn in the Catskills
      - button "了解更多" [ref=e113] [cursor=pointer]:
        - img [ref=e114]:
          - generic [ref=e115]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e120]:
      - img "楚山秋霁图" [ref=e123]
      - generic [ref=e124]:
        - generic [ref=e125]: 蓝瑛
        - generic [ref=e126]: Clearing Autumn Mists in the Chu Mountains
      - button "了解更多" [ref=e127] [cursor=pointer]:
        - img [ref=e128]:
          - generic [ref=e129]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e134]:
      - img "邓肯·坎贝尔中将" [ref=e137]
      - generic [ref=e138]:
        - generic [ref=e139]: 亨利·雷伯恩
        - generic [ref=e140]: Lieutenant General Duncan Campbell
      - button "了解更多" [ref=e141] [cursor=pointer]:
        - img [ref=e142]:
          - generic [ref=e143]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e148]:
      - img "情侣" [ref=e151]
      - generic [ref=e152]:
        - generic [ref=e153]: 长谷川宗恩
        - generic [ref=e154]: A Couple
      - button "了解更多" [ref=e155] [cursor=pointer]:
        - img [ref=e156]:
          - generic [ref=e157]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e162]:
      - img "林中" [ref=e165]
      - generic [ref=e166]:
        - generic [ref=e167]: 塞莱斯汀·弗朗索瓦·南特伊
        - generic [ref=e168]: In the Forest
      - button "了解更多" [ref=e169] [cursor=pointer]:
        - img [ref=e170]:
          - generic [ref=e171]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e176]:
      - img "芦雁图屏风" [ref=e179]
      - generic [ref=e180]:
        - generic [ref=e181]: 狩野山乐
        - generic [ref=e182]: Wild Geese
      - button "了解更多" [ref=e183] [cursor=pointer]:
        - img [ref=e184]:
          - generic [ref=e185]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e190]:
      - img "詹姆斯·斯图尔特医生" [ref=e193]
      - generic [ref=e194]:
        - generic [ref=e195]: 吉尔伯特·斯图尔特
        - generic [ref=e196]: Dr. James Stuart
      - button "了解更多" [ref=e197] [cursor=pointer]:
        - img [ref=e198]:
          - generic [ref=e199]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e204]:
      - img "花鸟册：梅枝鹦鹉" [ref=e207]
      - generic [ref=e208]:
        - generic [ref=e209]: 张若霭
        - generic [ref=e210]: "Desk Album: Flower and Bird Paintings (Bird with Plum Blossoms)"
      - button "了解更多" [ref=e211] [cursor=pointer]:
        - img [ref=e212]:
          - generic [ref=e213]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e218]:
      - img "母爱的关怀" [ref=e221]
      - generic [ref=e222]:
        - generic [ref=e223]: 亚瑟·菲茨威廉·泰特
        - generic [ref=e224]: Maternal Solicitude
      - button "了解更多" [ref=e225] [cursor=pointer]:
        - img [ref=e226]:
          - generic [ref=e227]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e232]:
      - img "黄瓜与茄子" [ref=e235]
      - generic [ref=e236]:
        - generic [ref=e237]: 山田道安
        - generic [ref=e238]: Cucumber and Eggplants
      - button "了解更多" [ref=e239] [cursor=pointer]:
        - img [ref=e240]:
          - generic [ref=e241]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e246]:
      - img "阿皮亚大道" [ref=e249]
      - generic [ref=e250]:
        - generic [ref=e251]: 爱德华·布鲁斯
        - generic [ref=e252]: The Appian Way
      - button "了解更多" [ref=e253] [cursor=pointer]:
        - img [ref=e254]:
          - generic [ref=e255]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e260]:
      - img "秋林烟霭图" [ref=e263]
      - generic [ref=e264]:
        - generic [ref=e265]: 邹
        - generic [ref=e266]: Autumn Mist in the Countryside
      - button "了解更多" [ref=e267] [cursor=pointer]:
        - img [ref=e268]:
          - generic [ref=e269]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e274]:
      - img "自画像" [ref=e277]
      - generic [ref=e278]:
        - generic [ref=e279]: 阿博特·汉德森·塞耶
        - generic [ref=e280]: Self-Portrait
      - button "了解更多" [ref=e281] [cursor=pointer]:
        - img [ref=e282]:
          - generic [ref=e283]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e288]:
      - img "加州早春" [ref=e291]
      - generic [ref=e292]:
        - generic [ref=e293]: 爱德华·B·巴特勒
        - generic [ref=e294]: Early Spring, California
      - button "了解更多" [ref=e295] [cursor=pointer]:
        - img [ref=e296]:
          - generic [ref=e297]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e302]:
      - img "人物山水册页（骑驴老者）" [ref=e305]
      - generic [ref=e306]:
        - generic [ref=e307]: 曾衍东
        - generic [ref=e308]: Miniature Album with Figures and Landscape (Old Man on Donkey)
      - button "了解更多" [ref=e309] [cursor=pointer]:
        - img [ref=e310]:
          - generic [ref=e311]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e316]:
      - img "三棵树：意大利" [ref=e319]
      - generic [ref=e320]:
        - generic [ref=e321]: 伊莱休·维德
        - generic [ref=e322]: "Three Trees: Italy"
      - button "了解更多" [ref=e323] [cursor=pointer]:
        - img [ref=e324]:
          - generic [ref=e325]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e330]:
      - img "鸳鸯图" [ref=e333]
      - generic [ref=e334]:
        - generic [ref=e335]: 雪村周继
        - generic [ref=e336]: Mandarin Duck
      - button "了解更多" [ref=e337] [cursor=pointer]:
        - img [ref=e338]:
          - generic [ref=e339]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e344]:
      - img "古诗诗意山水册：松下高士" [ref=e347]
      - generic [ref=e348]:
        - generic [ref=e349]: 华嵒
        - generic [ref=e350]: "Album of Landscape Paintings Illustrating Old Poems: Scholar under a Pine Tree"
      - button "了解更多" [ref=e351] [cursor=pointer]:
        - img [ref=e352]:
          - generic [ref=e353]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e358]:
      - img "约翰·蔡尔德" [ref=e361]
      - generic [ref=e362]:
        - generic [ref=e363]: 切斯特·哈丁
        - generic [ref=e364]: John Childe
      - button "了解更多" [ref=e365] [cursor=pointer]:
        - img [ref=e366]:
          - generic [ref=e367]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e372]:
      - img "布袋图" [ref=e375]
      - generic [ref=e376]:
        - generic [ref=e377]: 如然一彻
        - generic [ref=e378]: Budai
      - button "了解更多" [ref=e379] [cursor=pointer]:
        - img [ref=e380]:
          - generic [ref=e381]: 了解更多 · 了解更多 · 了解更多
    - generic [ref=e386]:
      - img "《鹦鹉故事》书页" [ref=e389]
      - generic [ref=e390]:
        - generic [ref=e391]: 巴萨瓦纳
        - generic [ref=e392]: "Page from Tales of a Parrot (Tuti-nama): text page"
      - button "了解更多" [ref=e393] [cursor=pointer]:
        - img [ref=e394]:
          - generic [ref=e395]: 了解更多 · 了解更多 · 了解更多
  - button "选择日期" [ref=e400] [cursor=pointer]: 2026/08/27
```

# Test source

```ts
  1   | // 画作版式适配验收测试（t_f1b36a86：画作版式与推荐卡片适配体系）
  2   | // 验收标准：
  3   | // 1. 画作、作品文字、工具图标左边界对齐误差 ≤ 2px
  4   | // 2. 横向滑动时卡片左右留白差异 ≤ 5px（iPhone 14 Pro 390×844）
  5   | // 3. 垂直间距统一为 24pt
  6   | // 4. 首页无左下角收藏按钮，右上角显示"收藏夹"文字入口
  7   | // 5. 画作容器采用 object-fit: contain + letterbox 背景
  8   | // 6. 推荐区缩略图统一 aspect-ratio: 3/4
  9   | // 7. 极端比例作品（极竖/极横）仍能正确显示
  10  | // 8. 推荐区标题与缩略图左对齐一致
  11  | 
  12  | import { test, expect } from '@playwright/test';
  13  | 
  14  | const IPHONE_14_PRO = { width: 390, height: 844 };
  15  | const BASE_URL = 'http://localhost:8888';
  16  | 
  17  | test.describe('画作版式适配', () => {
  18  |   test.beforeEach(async ({ page }) => {
  19  |     await page.setViewportSize(IPHONE_14_PRO);
  20  |     // 监听控制台错误
  21  |     page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  22  |     page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  23  |     await page.goto(BASE_URL + '/index.html');
  24  |     // 等待 SPA 路由加载完成，feed 视图渲染
  25  |     await page.waitForSelector('.feed-scroller .slide', { timeout: 15000 });
  26  |   });
  27  | 
  28  |   test('画作、作品文字、工具图标左边界对齐', async ({ page }) => {
  29  |     const slides = await page.$$('.slide');
  30  |     expect(slides.length).toBeGreaterThanOrEqual(1);
  31  | 
  32  |     const measurements = [];
  33  |     for (let i = 0; i < Math.min(slides.length, 10); i++) {
  34  |       const slide = slides[i];
  35  |       const frame = await slide.$('.frame');
  36  |       const names = await slide.$('.names');
  37  |       const learnBtn = await slide.$('.learn-btn');
  38  | 
  39  |       if (frame && names && learnBtn) {
  40  |         const frameBox = await frame.boundingBox();
  41  |         const namesBox = await names.boundingBox();
  42  |         const btnBox = await learnBtn.boundingBox();
  43  | 
  44  |         measurements.push({
  45  |           slideIndex: i,
  46  |           frameLeft: frameBox.x,
  47  |           namesLeft: namesBox.x,
  48  |         });
  49  |       }
  50  |     }
  51  | 
  52  |     // 验证所有卡片的左边界一致（误差 ≤ 2px）
  53  |     if (measurements.length > 0) {
  54  |       const leftValues = measurements.map(m => m.frameLeft);
  55  |       const minLeft = Math.min(...leftValues);
  56  |       const maxLeft = Math.max(...leftValues);
> 57  |       expect(maxLeft - minLeft).toBeLessThanOrEqual(2);
      |                                 ^ Error: expect(received).toBeLessThanOrEqual(expected)
  58  |     }
  59  |   });
  60  | 
  61  |   test('横向滑动时左右留白一致', async ({ page }) => {
  62  |     const getWhitespace = async () => {
  63  |       const scroller = await page.$('.feed-scroller');
  64  |       const box = await scroller.boundingBox();
  65  |       const contentMax = 340; // --content-max
  66  |       const pageGutter = 22;  // --page-gutter
  67  |       const expectedLeftWhitespace = (box.width - contentMax) / 2;
  68  |       return { left: expectedLeftWhitespace, width: box.width };
  69  |     };
  70  | 
  71  |     const initialWS = await getWhitespace();
  72  |     
  73  |     // 滚动到第 5 张卡片
  74  |     await page.evaluate(() => {
  75  |       const scroller = document.querySelector('.feed-scroller');
  76  |       scroller.scrollTop = scroller.clientHeight * 4;
  77  |     });
  78  |     await page.waitForTimeout(500);
  79  | 
  80  |     const scrolledWS = await getWhitespace();
  81  |     
  82  |     // 留白差异应该 ≤ 5px
  83  |     expect(Math.abs(initialWS.left - scrolledWS.left)).toBeLessThanOrEqual(5);
  84  |   });
  85  | 
  86  |   test('垂直间距统一为 24pt', async ({ page }) => {
  87  |     const slide = await page.$('.slide');
  88  |     expect(slide).toBeTruthy();
  89  | 
  90  |     const namesMarginTop = await page.evaluate(() => {
  91  |       const names = document.querySelector('.slide .names');
  92  |       return parseFloat(getComputedStyle(names).marginTop);
  93  |     });
  94  |     expect(namesMarginTop).toBe(24);
  95  |   });
  96  | 
  97  |   test('右下角了解更多按钮尺寸收紧到 84px', async ({ page }) => {
  98  |     const learnBtn = await page.$('.learn-btn');
  99  |     expect(learnBtn).toBeTruthy();
  100 | 
  101 |     const btnBox = await learnBtn.boundingBox();
  102 |     expect(btnBox.width).toBe(84);
  103 |     expect(btnBox.height).toBe(84);
  104 |   });
  105 | 
  106 |   test('首页无左下角收藏按钮', async ({ page }) => {
  107 |     const favBtn = await page.$('.fav-btn');
  108 |     expect(favBtn).toBeNull();
  109 |   });
  110 | 
  111 |   test('右上角收藏夹入口显示文字', async ({ page }) => {
  112 |     const gotoFavs = await page.$('#goto-favs');
  113 |     expect(gotoFavs).toBeTruthy();
  114 | 
  115 |     const text = await page.evaluate(el => el.textContent, gotoFavs);
  116 |     expect(text).toContain('收藏夹');
  117 |   });
  118 | 
  119 |   test('点击右上角收藏夹进入收藏夹视图', async ({ page }) => {
  120 |     await page.click('#goto-favs');
  121 |     await page.waitForURL(/#\/favs/);
  122 |     await page.waitForTimeout(500);
  123 | 
  124 |     const pageHeader = await page.$('.page');
  125 |     expect(pageHeader).toBeTruthy();
  126 |   });
  127 | 
  128 |   test('画作容器采用 letterbox 背景', async ({ page }) => {
  129 |     const frame = await page.$('.slide .frame');
  130 |     expect(frame).toBeTruthy();
  131 | 
  132 |     const bgColor = await page.evaluate(el => {
  133 |       return getComputedStyle(el).backgroundColor;
  134 |     }, frame);
  135 |     
  136 |     // letterbox 背景色应该是 --bg-card（通常是 rgba 或 rgb 格式）
  137 |     expect(bgColor).toMatch(/rgba?\(/);
  138 |   });
  139 | });
  140 | 
  141 | test.describe('视觉证据截图', () => {
  142 |   test('捕获 10 张作品卡的版式证据', async ({ page }) => {
  143 |     await page.setViewportSize(IPHONE_14_PRO);
  144 |     await page.goto(BASE_URL + '/index.html');
  145 |     await page.waitForSelector('.feed-scroller .slide', { timeout: 15000 });
  146 | 
  147 |     const slides = await page.$$('.slide');
  148 |     for (let i = 0; i < Math.min(slides.length, 10); i++) {
  149 |       const slide = slides[i];
  150 |       await slide.scrollIntoViewIfNeeded();
  151 |       await page.waitForTimeout(300);
  152 |       
  153 |       await page.screenshot({
  154 |         path: `tests/evidence/artwork-aspect-ratio-slide-${i}.png`,
  155 |         clip: await slide.boundingBox()
  156 |       });
  157 |     }
```