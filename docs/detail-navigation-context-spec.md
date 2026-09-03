# 详情页 folio 上下文与退出手势 · 交互规格

**任务**：t_b944f6c5
**关联卡**：docs/detail-navigation-spec.md（既有的详情页翻页规格，本文是它的扩展）
**赤拔原话**：
> 全局详情页，左滑，看下一个，右滑，到上一个，左边贴边优化，退出
> 在收藏夹中，左滑，逻辑是收藏夹中列表的下一个画作
> 在相关推荐中，左滑，逻辑是相关列表的下一个

---

## 1. 术语

**folio**：详情页当前左右滑动所依据的作品序列。旧规格里 folio 恒等于「当期作品」（`siblingsInIssue(id)`）；本规格把它扩展为「由进入路径决定的序列」。

**folio 上下文（folio context）**：一次进入详情页所依据的一组 `{source, ids[], entryIndex, meta}`。它决定：
1. 左右滑手势翻页的顺序
2. 到左/右边界时的行为
3. 页码文案（"NN · total"）里的 total

**源分类（source）**：
- `feed` — 从首页 feed 进入（默认）
- `favorites` — 从收藏夹进入
- `related` — 从「相关推荐」rail 进入
- `collection` — 从标签聚合页或作者聚合页进入（本次任务需求 2/3 打通后新增）

---

## 2. 三种进入路径的 folio 语义（**定稿：方案 B · 出版物派**）

| 入口 | folio.ids | 语义 |
|------|-----------|------|
| 首页 feed | `siblingsInIssue(id).ids`（当期作品） | **保留现状**：同期作品序列 + 到边界跨期翻册（`crossCtx` 逻辑不变） |
| 收藏夹 | `favList().map(f => f.id)`（用户收藏，最新在前） | 单条线性序列，**无跨期语义** |
| 相关推荐 | `data.related(id).map(r => r.id)`（推荐列表） | 单条线性序列，**无跨期语义** |
| 标签 / 作者聚合页 | 该聚合页 grid 里的作品 id 顺序（按年份升序） | 单条线性序列，**无跨期语义** |

**为什么方案 B**：
- 首页 feed 进入的作品有"日期出版物"的心理模型——跨期翻册是它独有的价值，砍掉是倒退（否定 t_e578fc0d 的成果）。
- 收藏夹/推荐/聚合页三种入口的心理模型都是"我在浏览一份列表"——它们的**列表本身就是 folio 全部**，越界＝越出这份列表。跨期无意义。
- 拒绝方案 A（一刀切统一手势）：会让首页失去跨期翻册的独特体验。
- 拒绝方案 C（干脆去掉手势）：手势翻页是详情页的核心体验，不能因为处理不好三种入口就阉割。

---

## 3. folio 上下文的传递契约（**技术接口**）

### 3.1 存储介质：sessionStorage

- **Key**：`artbook.folioCtx`
- **形状**：
  ```json
  {
    "source": "favorites" | "related" | "collection" | "feed",
    "ids": ["work_id_1", "work_id_2", ...],
    "entryId": "work_id_N",
    "meta": { "title": "我的收藏夹", "grouping": "artist:aid_x" }
  }
  ```
- **写入时机**：navigate 到 `#/work/<id>` 之前的最后一个 tick（在 click handler 里，navigate 前的一行）。
- **读取时机**：`detail.js mount()` 的最开头。
- **失效清理**：mount 读取后立即 `sessionStorage.removeItem`，避免刷新残留误导下次进入。

**为什么不放 URL query**：
- 长收藏夹可能有几十上百个 id，URL 长度不可控且丑陋。
- 分享链接会带上 folio，收链一方打开时上下文对不上，误导用户。
- 保持 `#/work/<id>` 深链的语义纯净（可分享、可收藏）。

**为什么 sessionStorage 而不是内存变量**：
- iOS PWA 从主屏图标启动，后台被杀概率高；点击进入详情页后系统可能重启 webview。
- sessionStorage 在同一 tab 生命周期内保留（含 iOS PWA 的"回到 app"场景），内存变量则丢失。
- 与既有的 `POS_KEY`（feed 位置记忆桥）共用同一模式。

### 3.2 mount() 的接口扩展

**旧签名**：
```js
export async function mount(el, { id })
```

**新签名（不破坏兼容）**：
```js
export async function mount(el, { id })
// 内部：
//   1. 读 sessionStorage.artbook.folioCtx（然后清）
//   2. 若命中且 ctx.entryId === id 且 ctx.ids.includes(id) → 用 ctx 建 siblingCtx
//   3. 否则 → 回退到 siblingsInIssue(id)（默认 feed 语义）
```

**siblingCtx 内部结构扩展**：
```js
let siblingCtx = {
  ids: [],
  index: -1,
  issue: null,        // 保留：feed 语义下的日期
  source: "feed",     // 新增：feed | favorites | related | collection
  meta: null          // 新增：用于展示的元数据（可选）
}
```

### 3.3 跨期逻辑门槛

**crossCtx 只在 `source === "feed"` 时激活**。
- `source !== "feed"` 时，`nextIssueDate()` / `prevIssueDate()` 恒返回 `null`。
- 结果：非 feed 入口到 folio 边界时不再触发跨期翻册，转而进入下文 §5 定义的"退出提示态"。

### 3.4 落地清单（工程侧参考，非本卡交付）

- `js/data.js`：新增 `siblingsFromContext(ctx)`（可选辅助），或直接在 detail.js 里组装。
- `js/detail.js mount()`：按 §3.2 读 ctx。
- `js/favorites.js` line 93、`js/collection.js` line 32、`js/detail.js` line 358（related）：各自 click handler 里在 navigate 前写 ctx。
- `js/feed.js`：**不需要改**——不写 ctx 就默认走 feed 语义。

---

## 4. UI 层：折角标记里显示 folio 归属

**位置**：既有的 `.detail-folio-mark`（信息卡首元素，印刷页码字符 "NN · total"）
**规则**：

| source | 折角文案（单幅时不渲染，`ids.length <= 1`） |
|--------|-----------------------------------------|
| feed | `01 · 30`（现状不变） |
| favorites | `03 · 12` + 前缀小字 `收藏 ·`，一行内 |
| related | `02 · 08` + 前缀小字 `相关 ·` |
| collection | `05 · 47` + 前缀小字 `｛聚合名｝·` 例如 `画家 ·`、`标签 ·` |

**typography**：

- 前缀小字：`font-family: var(--sans-zh); font-size: 11px; color: var(--ink-2); letter-spacing: 0.06em;`
- 前缀与页码之间：`margin-right: 6px`
- 页码字号/字重：**保持不变**（延用 t_8d4351d6 定的 Kaiti SC 12px letter-spacing 0.24em）
- 前缀不参与 `role="doc-pagenumber"` 的 aria-label（aria 只读页码 "第 N 幅，共 M 幅"）

**为什么加前缀而非独立行**：一行内含 12–14 字符，不占用高度，符合信息卡首元素"折角"的克制定位；如果做两行会与作品名 H1 抢视觉重量。

---

## 5. 边界行为：左边界的三段式手势

赤拔原话"左边贴边优化，退出"——解读为：**已经在 folio 首幅时，继续向右滑（右滑＝到"上一个"，滑到 0 之前）应该触发退出**。

（右滑方向：手指从左侧向右扫 → 语义"回到上一个"→ 到 0 时"再回到更上一个"→ 已无 → 退出）

### 5.1 三段式反馈

首幅（`siblingCtx.index === 0`）时的右滑手势，按位移 dx 分三段：

| 位移 dx（向右为正） | 状态 | 视觉反馈 |
|--------------------|------|--------|
| 0–60px | "回弹" | 内容整体 opacity 随位移线性衰减到 0.5；松手回弹 |
| 60–120px | "退出提示" | 出现左侧居中的 X 图标（40×40 米色雾玻璃，同 detail-close），透明度 0.4→0.9；文本 "松手退出" 12px `--ink-2`，位于 X 下方 20px |
| ≥ 120px | "确认退出" | X 图标透明度 1.0，边框 1px `--ink`；松手触发 exitDetail |

- 释放阈值：位移 ≥120px **或** 速度 ≥0.55 px/ms（略高于同期翻页阈值，避免误触）
- 释放后：命中则调用 `exitDetail(el)`（既有函数，320ms 淡出 + 下沉 24px），未命中回弹 240ms

### 5.2 右边界（末幅继续左滑）

首页 feed 入口：**保持既有跨期翻册**（不变）。
非 feed 入口：末幅左滑触发同样的三段式退出反馈，只是 X 出现在**右侧**（对称）。

### 5.3 与既有下拉退出的关系

- **顶部下拉退出（既有 §5.4）不变**：任何入口任何位置都能用。
- **右滑退出（新增）**：只在 `siblingCtx.index === 0` 生效，不与同期翻页冲突（同期翻页触发条件是 dx < 0 或首幅之后的 dx > 0）。
- 两种退出手势视觉上区分：下拉退出是"下沉"（transform: translateY），右滑退出是"淡出"（opacity → 0）。

---

## 6. 验收清单（工程实现完成后按此项逐一核对）

| # | 项目 | 期望 |
|---|------|------|
| 1 | 首页 feed → 详情页 → 左右滑 | 按同期作品序列翻，到边界跨期翻册（现状不变） |
| 2 | 收藏夹 → 详情页 → 左右滑 | 按 favList 顺序翻，到边界不跨期 |
| 3 | 相关推荐 rail → 详情页 → 左右滑 | 按 related 列表顺序翻 |
| 4 | 标签聚合页 → 详情页 → 左右滑 | 按聚合页 grid 顺序翻 |
| 5 | 作者聚合页 → 详情页 → 左右滑 | 按聚合页 grid 顺序翻 |
| 6 | 收藏夹入口的详情页折角 | 显示"收藏 · 03 · 12" |
| 7 | 相关推荐入口的详情页折角 | 显示"相关 · 02 · 08" |
| 8 | 标签入口的详情页折角 | 显示"标签 · 05 · 47" |
| 9 | 作者入口的详情页折角 | 显示"画家 · 05 · 47" |
| 10 | 收藏夹第 1 幅右滑 120px | 出现左侧 X + "松手退出"，松手退出到收藏夹 |
| 11 | 收藏夹末幅左滑 120px | 出现右侧 X + "松手退出"，松手退出 |
| 12 | 首页第 1 幅右滑到边界 | 触发跨期翻册（不变） |
| 13 | 分享 `#/work/<id>` 深链到新浏览器打开 | 走 feed 默认语义（无 ctx） |
| 14 | 单幅 issue（ids.length === 1）从 feed 进入 | 折角不渲染，无翻页手势（现状不变） |

---

## 7. 相关既有规格

- `docs/detail-navigation-spec.md` — 详情页左右滑动 + 下拉退出的底层交互规格（本文继承）
- DESIGN.md `Detail folio mark` 组件（line 380 附近） — 折角字符的样式 token（本次仅在文案层加前缀，不改字号/间距）
- `js/data.js siblingsInIssue()` line 181 — 旧 folio 建立函数（继续用作 feed 默认路径）
