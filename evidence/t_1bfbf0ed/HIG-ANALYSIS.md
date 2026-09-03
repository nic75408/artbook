# artbook × iOS HIG 手势交互体系梳理

任务：t_1bfbf0ed
日期：2026-09-03
作者：designer（小 Z）

---

## 1. 赤拔的原问题

> 详情页面，既然左侧都是返回，基于时间线的返回的话，那么向下滑的话，是不是应该
> 是从详情页面退出。理论上，其他的逻辑也一样，这个请基于 iOS 的人机交互规范，
> 梳理一下，手势和交互。

拆开来是三件事：

1. **左侧手势 = 返回** —— 这一层已经通过 t_a312968d 统一为「左箭头 + 边缘右滑返回」，
   与 iOS UINavigationController 的 pop 语义**大方向一致，但边缘方向实现错误**（见 §6）。
2. **下滑手势 = 退出（而非返回）** —— 这是赤拔提出的新猜想。iOS HIG 里，
   下滑退出（interactive dismiss）是 **modal sheet** 的专属手势，与 stack pop 是
   不同心智。他问的是「详情页在心智上到底是 push 出来的一屏，还是从下面弹出的模态？」
3. **其他页面按同一逻辑梳理** —— 收藏夹、聚合页（画家/标签）、首页要不要有一致的
   下滑手势？

**核心决策不在「加不加下滑退出」，而在「详情页在 iOS 心智里是什么」**——
只要把这个决定下来，所有手势就自动到位。同时借这次梳理，纠正 t_a312968d 的
边缘手势方向错误。

---

## 2. iOS HIG 权威依据（Apple Human Interface Guidelines）

来源：
- <https://developer.apple.com/design/human-interface-guidelines/gestures>
- <https://developer.apple.com/design/human-interface-guidelines/sheets>
- <https://developer.apple.com/design/human-interface-guidelines/modality>
- <https://developer.apple.com/design/human-interface-guidelines/navigation-and-search>

### 2.1 两种「返回」在 iOS 里是不同心智

iOS 系统级只有两种「从当前屏退出」的模型：

| 模型 | 心智 | 视觉进入 | 系统级手势 | 顶栏按钮 |
|------|------|----------|------------|----------|
| **NavigationController push/pop** | 时间线后退（浏览历史） | 从右侧推入（水平） | **从左边缘向右滑**（screen-edge-pan-gesture） | 左上角 ← 「返回」 |
| **Modal sheet dismiss** | 关闭当前作用域，回到父视图 | 从底部升起（垂直） | **顶部向下滑** | 左上角 ✕ 或 「Cancel」/「Done」 |

关键要背下来的两条方向对应：
- **push 的进入方向 = 从右**，所以 **pop 的手势方向 = 向右**（起于左边缘）。
  逻辑：把左边缘露出来的「上一屏」重新拉出来。
- **modal 的进入方向 = 从下**，所以 **dismiss 的手势方向 = 向下**（起于顶部）。
  逻辑：把当前屏推回它进来的地方。

HIG 「Sheets」章节原文：
> **Support swiping to dismiss a sheet.** People expect to swipe vertically to dismiss
> a sheet instead of tapping a dismiss button.

HIG 「Sheets → Anatomy」原文：
> The **Back** button lets people navigate to a previous step in a multi-step flow or
> to a parent view in a hierarchy. **It isn't intended to dismiss a sheet.**
>
> Avoid showing all three buttons — Cancel, Done, and Back — together.

翻译成规矩：**左箭头「返回」与下滑「退出」不能同时装在一个视图上**，否则用户
会困惑「这两个到底有什么不一样」。选一个，且这个选择由「这一屏在心智上是 push
出来的还是 modal 出来的」决定。

### 2.2 iOS 系统的具体判据

- 从时间线上进入（列表→详情→再详情→…）：push 心智，用 stack pop。
  - 例：邮件的邮件列表 → 邮件详情 → 附件预览。
- 从当前作用域临时弹出、完成后回到主线：modal 心智，用下滑 dismiss。
  - 例：Safari 分享菜单、Notes 的格式化面板、Camera 的照片预览、Photos 的图片查看器。

**关键判据**：这一屏是不是「历史轨迹上的一站」？
- 是 → push（返回按钮 + 左边缘右滑）
- 不是（只是当前作用域的一次性弹层） → modal（下滑退出）

### 2.3 一个模糊地带：全屏图片查看器

Photos.app 的图片查看器是**同一屏**内的模态叠层——它下滑退出。这里 artbook
的详情页确实**看起来像**这一类：从缩略图（feed slide）点开一张画，画铺满屏，
下滑合起。

但 artbook 的详情页**不只是图片查看器**——它有：
- 完整的作品信息卡（标题、作者、材质、年代、馆藏地、标签）
- 一整篇导读（essay）
- 「相关作品」横向 rail

这些内容让它更像**详情页（push）**而不是图片预览（modal）。而且从聚合页
（画家页、标签页、收藏夹）进入时，它明确是**列表→详情**的时间线一站，不是
「当前作用域的临时弹层」。

---

## 3. artbook 四个页面的心智模型

按 iOS HIG 判据把四个页面对号入座：

| 页面 | 心智模型 | 依据 |
|------|----------|------|
| **首页（feed）** | 根视图 | 无返回按钮，无返回手势——iOS Tab-based app 的 root tab 就是这样 |
| **详情页（detail）** | **Push** | 有多个入口（feed / 收藏夹 / 画家页 / 标签页），每个入口都是时间线上的前一站；页面内容是详情信息（不只是图片查看器），左上角有「←」返回按钮已经建立了 push 心智 |
| **收藏夹（favorites）** | **Push** | 从首页右上角进入，是「时间线的一站」；已有左上角 ←、边缘手势 |
| **聚合页（collection: 画家 / 标签）** | **Push** | 从详情页进入（点作者名/标签），是时间线下一站；已有左上角 ←、边缘手势 |

**结论：artbook 全站是 push 栈，没有 modal sheet 页面。**

那两个从属于详情页的**真正的 modal**——图片查看器（.viewer）和日期胶囊 sheet
（.sheet）——已经按 modal 心智处理：图片查看器单击退出（Photos.app 的模式），
日期 sheet 是标准 bottom sheet 用 Cancel/背景点击退出。

---

## 4. 回到赤拔的问题：详情页下滑是不是应该退出？

**结论：不是「退出」，但是「返回」的一个视觉隐喻——保持现状即可，规范化命名。**

三条理由：

### 4.1 HIG 明文禁止的组合

HIG 「Sheets」章节明确写：**Back 按钮和下滑退出不能同时出现在一个视图上**，否则
就是「三按钮同框」的错误示范之一（Cancel+Done+Back）。

如果详情页保留左上角 ← 返回（这是 stack pop 语义）**又**引入下滑退出（sheet
dismiss 语义），就是在同一视图上装了两套心智不同的关闭机制。用户会问：
- 左箭头返回时间线上一屏，那下滑退出又回到哪一屏？
- 如果下滑也是回到入口，那它跟左箭头有什么区别？

### 4.2 详情页不是 sheet

一个真正的 modal sheet 的特征（HIG）：
- 从底部升起（视觉进入方向就是下滑退出方向的反向）
- 顶部有 grabber
- 通常有 detent（半屏/全屏两档）
- 顶栏是 Cancel/Done，不是 ←

artbook 详情页没有任何一条符合：它是全屏、没有 grabber、顶栏是 ←，进入是淡入
不是从底部升起。**视觉上和心智上都是 push 页**。

### 4.3 但现有的下滑手势不该删——它是「返回」的手势入口，不是「退出」的入口

现状：详情页顶部下滑（scrollY=0 时）→ back()。这个手势对应的是**返回**，不是
退出，因此和 iOS Photos.app 的下滑退出**语义不同**但**视觉效果类似**。

这在 iOS 生态里是有先例的：**Twitter/X 的详情推文页**也是 push 视图（左上角 ←），
但顶部下滑同样触发 back。它不叫「dismiss」，它是「一个额外的返回手势入口」。
HIG 「Custom gestures」章节允许这类快捷手势：
> **Use shortcut gestures to supplement standard gestures, not replace them.**
> …many apps also offer a shortcut gesture — such as swiping from the side of a
> window or touchscreen — while continuing to provide the Back button.

**规范化的表述应该是**：详情页有两个「返回」的手势入口——**左边缘向右滑**（iOS
系统级边缘手势的对应实现，见 §6）和**顶部下滑**（辅助快捷）。都调用 history.back()，
语义都是「回到时间线上一屏」。**不叫「退出」，叫「返回」**。

赤拔的直觉其实是对的：下滑应该触发返回。他猜「退出」是因为下滑在 iOS 里最有名的
用法是 sheet dismiss。但仔细看语义：dismiss 也是「回到父视图」——只不过父视图是
「打开这个 sheet 的那一屏」；对 artbook 详情页而言，父视图就是「打开这个详情的
那一屏」——就是 history 上一屏。**动作是一样的，只是命名和心智从「dismiss」
换成了「back」。**

---

## 5. 其他页面要不要下滑返回？

按上面的逻辑，收藏夹、聚合页也是 push 页，理论上也可以有「顶部下滑 = 返回」的
辅助手势。但——

**决策：不加。** 理由：

1. **它们的内容是可滚动的列表**，不像详情页有明显的「顶部区」（大图 hero）。
   在列表页顶部再套一个「下滑触发某个动作」的手势，会和 iOS 系统级的 pull-to-refresh
   撞——即便当前不刷新，用户从其他 App 习惯里带来的期望是「顶部下拉 = 刷新」，
   不是「顶部下拉 = 退出」。
2. **它们的入口都是单一的**（收藏夹来自首页，聚合页来自详情页），左边缘右滑
   已经足够。详情页需要下滑辅助是因为它是全屏 hero 页，顶部大图占位显著、下滑
   动作在这类页上是一种「合上书」的隐喻；列表页没有这个视觉隐喻。
3. **一致性 vs 场景适配**——iOS 系统本身也不是「所有 push 页都有下滑返回」。
   邮件列表→邮件详情，详情页顶部下滑不返回；Photos 的照片详情下滑退出，是因为
   它属于 modal 一类（沉浸式全屏查看）。artbook 详情页坐在两者之间，倾向于
   Photos 一侧（它有 hero 图）；列表页明确坐在邮件列表一侧（信息密集，可滚动）。

---

## 6. 关键发现：t_a312968d 的边缘手势方向错误

**t_a312968d 的规格文档 `docs/return-interaction-spec.md` 中写：**

> **右滑边缘返回**: 从屏幕**右边缘**向**左**滑动 ≥ 80px 触发返回
> `EDGE_ZONE = 30 // 从右边缘起 30px 内开始检测`
> `if (window.innerWidth - x <= EDGE_ZONE) { ... }`
> `if (Math.abs(deltaX) > Math.abs(deltaY) && deltaX < -EDGE_THRESHOLD) { back(); }`

规格自己的品味档案记录里同时又写着「符合 iOS 用户预期」——但**这两句话互相矛盾**。
iOS 系统级的返回手势（`interactivePopGestureRecognizer`）**恒为**从**左边缘**向
**右**滑动。

对照 iOS 权威实现（Safari, Mail, Notes, Messages, App Store 全部一致）：

| 系统 | 起手边缘 | 滑动方向 | 语义 |
|------|----------|----------|------|
| iOS UINavigationController | **左** | **向右** | 返回上一屏 |
| Android（Material）predictive back | **左或右** | 向内 | 返回上一屏 |
| t_a312968d 当前 artbook 实现 | **右** | **向左** | 返回上一屏 |

现有实现是**方向翻转**的——用户从其他 App 带过来的肌肉记忆，会在左边缘做右滑
动作，artbook 完全接不住；而用户在右边缘做的向左滑动，在其他 App 里**没有对应
的系统级预期**（那个位置一般是 tab bar 或空白）。

**这是一次决策失误**：t_a312968d 时期 designer（我上次）没做真机对照，把「右滑」
这个中文词组同时翻译成了「起于右边缘」和「滑动方向向左」，两次翻译错误叠加，
直接把方向做反了。严叔审的是「有没有交付 spec、数值全不全、验收标准对不对得
上」——这类语义正确性不在他的合同范围内。

**必须借这次梳理机会修正。**

### 三案自决：这个错误怎么改？

方案 A：**方向对齐 iOS**（**左**边缘 30px 内起手 + 向**右**滑动 ≥ 80px = 返回）
- 依据：iOS 系统级手势的一模一样复刻，MTMR 一致。
- 代价：需要改 `attachEdgeSwipeBack()` 和详情页 `attachGestures()` 的 edge-back
  分支，翻转 x 判定；DESIGN.md「page-header-back」节和 `docs/return-interaction-spec.md`
  的手势描述要重写；已存在的 npm test 里如果有对应用例也要跟着改。
- 与 t_a312968d 的关系：**修正**，不是推翻——t_a312968d 的方案 A（统一左箭头）
  仍然正确，错的只是边缘手势方向这一条实现细节。
- **不该问用户**：iOS 权威判据在这里是决定性的，不存在设计取舍。

方案 B：**保持现状**（右边缘 30px 内起手 + 向左滑动 ≥ 80px = 返回）
- 依据：无 —— t_a312968d 落地后没有品味档案记录赤拔评估过这个方向；也没有
  「刻意反系统习惯」的产品理由。
- 代价：与 iOS 系统级手势相反，肌肉记忆不复用；用户第一次尝试返回时必然扑空。
- 唯一可能的理由：如果左边缘手势与页面内容有冲突（比如页面首屏左侧有需要横滑
  操作的控件）。**检查过 —— artbook 全站没有这类控件**。

方案 C：**双向都触发**（左边缘向右滑 OR 右边缘向左滑 都 = 返回）
- 依据：Lifehacker 报道过 iOS 26 传闻中的 "swipe anywhere to go back"（尚未确认
  为 GA）；Android Material 的 predictive back 允许从两侧起手。
- 代价：容错性更强，但破坏系统级方向暗示的确定性——用户会问「哪个方向才是对的」；
  且实现代码复杂度翻倍，两组事件监听 + 两组阈值。
- 拒绝：违反 HIG「Best practices」— "respond to gestures in ways that are
  consistent with people's expectations"。iOS 用户明确期望**一个**方向。

**自评分（依据符合度 / 用户预期 / 实现代价 / 一致性）**：
- A：**9 / 9 / 6 / 9 = 33**  ✅ **选中**
- B：3 / 3 / 10 / 4 = 20
- C：5 / 4 / 4 / 5 = 18

**定稿：方案 A（左边缘向右滑）。**

---

## 7. 转场动画方向规范

HIG 「Motion」和 UIKit push/pop / present/dismiss 默认转场：

| 转场类型 | 进入方向 | 退出方向 |
|----------|----------|----------|
| **Push（stack forward）** | 新视图从右侧推入 | 旧视图向左退出 |
| **Pop（stack back）** | 上一视图从左侧回来 | 当前视图向右退出 |
| **Modal present** | 从底部升起 | — |
| **Modal dismiss** | — | 向底部落下 |

artbook 当前的转场：
- 首页 → 详情页：使用 `#view.enter` 200ms 淡入（DESIGN.md「Elevation & Motion」）。
  这**不严格符合** iOS push 的水平方向语义，但是可接受的简化版——淡入淡出是
  Web 上的中性方案，不带方向暗示，也不会误导用户。
- 详情页 → 首页（back）：淡出（`exitDetail()` 加 24px 下沉是个装饰性微动，
  不是方向性动画）。
- 详情页跨期翻页：`dateflip-in/out` 是同层内的水平切换，不是页面级转场。

**规范**：保持淡入淡出，不引入水平方向的 push/pop 视觉。理由：
- 淡入淡出在 SPA / PWA 环境里是稳定的（不依赖布局宽度、无橡皮筋、无 iOS
  standalone 与 Safari 差异）；
- 水平 push 需要精确控制两屏的 z-index、transform 时序、safe-area——在 hash 路由
  + 单 `#view` 挂载点的架构上代价高、收益低；
- 200ms 淡入已经足够表达「一屏切换」的节奏，不需要额外的方向暗示——用户的方向
  暗示由**手势本身**给出（左滑/右滑/下滑）。

**唯一的例外**：`exitDetail()` 的下沉 24px 是「顶部下滑返回手势」触发时的完成
动画，保留——它是手势方向的延续。

---

## 8. 需要移交工程的 2 条实现修正

**编号 E1**（关键）：`attachEdgeSwipeBack()`（`js/router.js:9-65`）方向错误 ——
当前实现是「右边缘 30px 内起手，向左滑动 ≥80px 返回」。iOS 系统级边缘手势是「**左**边缘
30px 内起手，向**右**滑动 ≥80px 返回」。修改点：

- `js/router.js:18`：`if (window.innerWidth - x <= edgeZone)` → `if (x <= edgeZone)`
- `js/router.js:32,46`：`deltaX < -threshold` → `deltaX > threshold`
- 详情页 `attachGestures()` 里的 edge-back 分支（`js/detail.js:654-659`、`666-675`、
  `746-756`）做同样的方向翻转（起点判定 + 触发条件都要翻）。
- 所有涉及「右边缘」「向左滑」的注释、变量命名（`EDGE_ZONE` 保留，`edge-back`
  这个 axis 名字保留）文字改成「左边缘」「向右滑」。
- npm test 里如果有对应用例（如 `tests/*.spec.js` 有 edge swipe 场景），
  同步改成从 x=0..30 起手、向右滑到 x≥80。

**编号 E2**（文档）：详情页顶部下滑「返回」的当前触发条件是 `scrollY === 0 && dy > 0`
（起点在页顶且向下滑）。规范化后**保留**位移阈值 96px + 速度阈值 0.45px/ms 的
组合判定（当前 `PULL_DIST` 和 `PULL_VELOCITY`），但在**规范文本里明确命名为
「返回」而非「退出」**，避免后续开发者误解为 modal dismiss 手势。DESIGN.md 里
的对应节由「场景三 · 下拉退出详情页」重命名为「场景三 · 下拉返回上一屏」。
这一条只改文档命名和函数注释——`exitDetail()` 函数名保留（scope 是「detail
页的转出动画」，不产生误导）。

**编号 E3（决策记录，不改代码）**：收藏夹和聚合页**不新增**下滑手势。当前它们
只有左边缘手势（修正 E1 后为左边缘向右滑）+ 左上角 ← 按钮，这是符合规范的最终
状态，不需要额外工作。

---

## 附：iOS 系统 App 对标表

| App | 视图 | 顶栏 | 边缘手势 | 顶部下滑 | 心智 |
|-----|------|------|----------|----------|------|
| Mail | 邮件列表 → 邮件详情 | ← Back | 左边缘 → 右滑，返回 | 无 | Push |
| Photos | 相册网格 → 单张照片 | ✕ Close | 左边缘 → 右滑，返回 | **退出** | Modal-in-place |
| Safari | 标签页 → 单标签 | ← Back | 左边缘 → 右滑，返回 | 无（顶部下拉是刷新） | Push |
| Notes | 便签列表 → 单便签 | ← Notes | 左边缘 → 右滑，返回 | 无 | Push |
| Twitter/X | 时间线 → 单推详情 | ← Back | 左边缘 → 右滑，返回 | **返回**（辅助手势） | Push（with shortcut） |
| Camera | 拍照 → 照片预览 sheet | ✕ | — | **退出** | Modal sheet |

artbook 详情页对标 **Twitter/X** 单推详情页——push 心智 + 顶部下滑作为辅助
返回手势 + 左边缘右滑作为系统级手势的复刻。这就是本任务的定案依据。

---

## 附：完整手势-行为矩阵

见同目录 `GESTURE-MATRIX.md`。
