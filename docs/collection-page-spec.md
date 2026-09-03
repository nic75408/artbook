# 标签 / 作者聚合页视觉规格

**任务**：t_b944f6c5 需求 2/3/4
**赤拔原话**：
> 详情页中标签和作者名，点击进去类似收藏夹一样的画作列表，这部分功能不全，作者名下作品，带标签的作品

---

## 1. 根因确认（先修白屏，再谈视觉）

**问题**：`js/app.js` 注册了路由 `#/artist/*` 和 `#/tag/*`（line 26-27），但**没有 import `mountArtist` / `mountTag`**——ES module 里未定义的引用会让整个 initApp 里的 `register(...)` 抛 `ReferenceError`，导致所有路由失效、首页也进不去（跟艺术手册踩过的坑 §1 是同一类：模块图整段停摆）。

**验证**：任意作品详情页点击"作者名"或"标签 pill"，都会 navigate 到 `#/artist/<aid>` 或 `#/tag/<name>`，但页面白屏，console 报错。

**修复**（工程侧一行）：

```js
// js/app.js line 8-11
import { mount as feed } from "./feed.js";
import { mountArtist, mountTag } from "./collection.js";  // ← 新增
import { preloadIcons } from "./icons/Icon.js";
```

**为什么不需要改路由注册**：`app.js` 已经把两条路由挂上了，只是 `mountArtist`/`mountTag` 未定义。补上 import 即可，无需路由改动。

---

## 2. 页面结构（继承 collection.js 现有骨架）

`collection.js` 已经实现了两个页面（`mountArtist` / `mountTag`），共享结构：

```
<div class="page">
  <header class="page-header">
    <button id="back">← 返回</button>
    <div class="title">画家 | ｛标签名｝</div>
  </header>
  <div class="page-intro">
    ├── name-zh / name-en / years / bio    ← 作者页专有
    └── years （"NN 幅作品"）              ← 标签页专有
  </div>
  <div class="grid">
    ├── card × N（两列瀑布流）
    │   ├── th（缩略图，aspect-ratio 由 --r 定）
    │   ├── a（作者名，作者页可省）
    │   └── t（作品名）
</div>
```

**本次设计只调三个点**：header 的标签页 title、page-intro 的信息层级、grid 卡片元素的字号层级。

---

## 3. Header 规格（sticky 顶栏）

### 3.1 作者聚合页

- **title**：`画家`（固定文案）
- 返回按钮：既有 `icons.chevronLeft`，40×40 hit area
- 高度：`calc(var(--space-md) + var(--safe-t))` + `var(--space-md)` bottom padding（现状）
- 背景：`var(--bg)`（暖纸底），`z-index: 15`

### 3.2 标签聚合页

- **title**：**直接用标签名**（例如"文艺复兴"、"风景"）—— *与现状不同*
- **不再显示"标签"两个字**——原代码 title 就是标签名，本规格确认这个决策：标签名本身就是内容焦点，不需要一个 label 前缀。
- 字号/字体：**继承 `.page-header .title`**（Songti SC 20px 700，即 --text-work）
- 若标签名超过 8 个字：截断 `text-overflow: ellipsis` + `max-width: calc(100vw - 96px)`

**为什么作者页保留"画家"标题、标签页直接用标签名**：
- 作者页 page-intro 已经把作者中文/英文/生卒/简介全部展开，header 只需一个类型 label（"画家"）作为面包屑，避免与 intro 里的名字重复。
- 标签页 page-intro 只有"N 幅作品"这一句次要信息，标签名如果不放 header，用户往下滚就看不见"当前在看什么标签"——把标签名放 header 提高持续存在感。

---

## 4. Page-intro 规格

### 4.1 作者页 intro（既有结构基本 OK，微调间距）

```
padding: 8px 22px 24px（既有 --space-sm / --page-gutter / --space-lg）
max-width: 340px
margin: 0 auto

├── name-zh   Songti SC 22px 700 --ink       ← 与详情页 work-title-zh 一致
├── name-en   EB Garamond italic 15px --gold  margin-top: 4px
├── years     Noto Sans 13px --ink-2  margin-top: 4px
│             "美国，1834–1903"
└── bio       Noto Sans 14px --ink-2 line-height 1.8  margin-top: 16px
              最多 3 行，超出 -webkit-line-clamp: 3 + ellipsis
```

**微调项**（与现状差异）：
1. `bio` 加 3 行截断：现在没截断，长简介会挤走 grid 的首屏。3 行 ≈ 75 字符，够展示"生平摘要"级别，需要展开时可点击（本卡不做展开交互，后续任务）。
2. 若 `bio` 缺失：整块 intro 高度收缩 24px（省一层）；若整个 artist meta 都缺（fallback 分支），intro 仅显示 aid 一行，padding-bottom 减到 16px。

### 4.2 标签页 intro（**精简**）

```
padding: 8px 22px 20px
max-width: 340px
margin: 0 auto

└── years    Noto Sans 13px --ink-2
             "47 幅作品"
```

**与现状差异**：
- 现状：intro 只有一行 `<div class="years">47 幅作品</div>`，padding-bottom 用 --space-lg（24px）。
- 本规格：padding-bottom 减到 20px（--helper-layer 定义值），让 grid 上边距更贴近该数字，视觉关联更紧。

---

## 5. Grid 规格（**沿用收藏夹**，两列瀑布流）

### 5.1 布局参数（**保持不变**）

- `columns: 2`
- `column-gap: 14px`（`--grid-gap`）
- `margin-bottom: 22px`（`--card-stack`，卡片之间纵向间距）
- `padding: 0 22px calc(24px + safe-b)`（左右 gutter + 底部安全区）
- `max-width: 340px`，`margin: 0 auto`

### 5.2 卡片元素规格（**统一四页**：favorites / artist / tag / collection）

```
.card
  break-inside: avoid
  margin-bottom: 22px

.card .th （缩略图容器）
  aspect-ratio: calc(1 / --r)       ← 数据侧带来
  border: 1px solid --line
  background: --bg-card

.card .th img
  object-fit: contain               ← 保留原画比例，不裁切
  opacity 0 → 1 transition 300ms

.card .a （作者名 / 副文案）
  Noto Sans 12px --ink-2
  margin-top: 8px
  单行截断

.card .t （作品名）
  Songti SC 13px --ink line-height 1.4
  margin-top: 4px
  最多 2 行，超出截断
```

**作者聚合页特化**：卡片 `.a` **不渲染作者名**（因为整页都是同一个作者），改为渲染年份 `w.y`（例如 "1875"），字号/颜色不变。若无年份则整个 `.a` 不出现，`.t` 直接顶在 th 下 8px。

**为什么作者页要藏作者名换年份**：
- 47 张卡片全是"欧仁·德拉克洛瓦"是极大的视觉冗余。
- 年份在作者聚合页里是最相关的次级信息（回答"哪年画的"），且已经按年份升序排列。
- 无年份的作品保留原来的 8px 上间距，避免版式对不齐。

### 5.3 空态

沿用既有 `.empty`：
```
<div class="empty">
  <div class="wordmark brand-mark">${BrandWordmark(...)}</div>
  <p>暂无作品</p>
</div>
```
不改。

---

## 6. 交互：卡片点击 → 详情页 · folio 上下文

**契约**（见 detail-navigation-context-spec.md §3）：

聚合页 click handler 必须在 navigate 前写 sessionStorage：

```js
grid.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("click", () => {
    sessionStorage.setItem("artbook.folioCtx", JSON.stringify({
      source: "collection",
      ids: works.map(w => w.id),     // 该聚合页的全部作品 id 顺序
      entryId: card.dataset.go,
      meta: {
        title: /* "画家：欧仁·德拉克洛瓦" 或 "标签：文艺复兴" */,
        grouping: /* "artist:aid_x" 或 "tag:文艺复兴" */
      }
    }));
    navigate(`#/work/${card.dataset.go}`);
  });
});
```

同样地，`favorites.js` line 93 → `source: "favorites"`，`detail.js` line 358（related） → `source: "related"`。

---

## 7. 验收清单（视觉侧）

| # | 项目 | 期望 |
|---|------|------|
| 1 | 详情页点击作者链接 | 进入作者聚合页，不白屏 |
| 2 | 详情页点击 tag-pill | 进入标签聚合页，不白屏 |
| 3 | 作者页 header title | 显示"画家" |
| 4 | 标签页 header title | 显示标签名本身 |
| 5 | 作者页 grid 卡片下方 | `.a` 显示年份（非作者名），`.t` 显示作品名 |
| 6 | 标签页 grid 卡片下方 | `.a` 显示作者名，`.t` 显示作品名 |
| 7 | 作者简介超 3 行 | `-webkit-line-clamp: 3` 生效，末尾省略号 |
| 8 | 任一聚合页点击卡片进入详情 | 详情页折角显示对应前缀（"画家 · " / "标签 · "） |
| 9 | 任一聚合页详情页左右滑 | 按聚合页 grid 顺序翻页，越界触发退出 |
| 10 | 空聚合页（0 幅作品） | `.empty` 空态渲染，wordmark + "暂无作品" |
| 11 | 长标签名（>8 字） | header title ellipsis 截断 |
| 12 | 390×844 视口两页首屏 | 卡片首行完整可见，作者信息不挤走 grid |

---

## 8. DESIGN.md token 变动

**新增**（写入 DESIGN.md `Components` 段）：

```yaml
collection-page:
  header-title:
    artist-mode: "画家"     # 固定文案
    tag-mode: "{{tag_name}}" # 直接使用标签名
    typography: work-title  # 沿用 --text-work (20px Songti 700)
    overflow: ellipsis
    max-width: calc(100vw - 96px)
  intro-artist:
    padding: "8px 22px 24px"
    max-width: 340px
    bio-clamp: 3
    layers: [name-zh, name-en, years, bio]
  intro-tag:
    padding: "8px 22px 20px"
    max-width: 340px
    layers: [count-line]
  grid-card:
    columns: 2
    column-gap: 14px
    card-stack: 22px
    thumb-border: "1px solid --line"
    thumb-bg: --bg-card
    meta-artist-mode: work-year  # 作者聚合页显示年份
    meta-tag-mode: artist-name   # 标签聚合页显示作者
    title-clamp: 2
```

**Decision Log 新增条目**：见 DESIGN.md diff。

