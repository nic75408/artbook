# 首页布局居中 + 「更多」按钮视觉优化 · 交付规格

**卡片**: t_4c2a874b
**设计师**: 小 Z（designer）
**定稿方向**: **B · 展签文字链**（三案自决 · 2026-09-01）
**受众**: engineer（老费）
**验收人**: reviewer（严叔）

---

## 1. 三案定稿结论

| 方案 | 定位 | 结论 |
|---|---|---|
| A · 双胶囊底栏 | 米色胶囊，与收藏夹/日期胶囊同族 | 落选 · 保留为**主动作胶囊的规范范式** |
| **B · 展签文字链** | 衬线金字 + 细线 + 疏字距中文，无按钮容器 | **✅ 定稿** |
| C · 极细描边圆 | 44px 米底 + 金环 + 双细线 | 落选 · 保留为**生成器/次要圆入口备选** |

自评打分与理由见 `sketches/README.md`（本目录）。

---

## 2. 需要修改的文件与位置

### 2.1 `app.css` · 首页布局居中

**修改位置**: 第 210-228 行 `.slide` 与第 231-240 行 `.frame` 与第 262-270 行 `.slide .names`

**根因**（诊断）:
`.slide` 已有 `max-width: 340px; margin: 0 auto` 相对视口居中，但内部
`align-items: flex-start` 加上 `.frame { margin-left: var(--page-gutter) }`
与 `.slide .names { margin-left: var(--page-gutter) }` 使内容整体贴向 slide
的左边界。视口 390px、slide 340px 居中后左侧偏移 25px，再加 slide 内
padding 22px + margin-left 22px，图片起点距屏幕左边 69px，右边 41px，
差 **28px 视觉偏左**。

**修改**:

```css
.slide {
  --pad-t: calc(56px + var(--safe-t));
  --pad-b: calc(120px + var(--safe-b));
  --align-origin: var(--page-gutter);
  height: 100dvh;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;           /* ← 改：flex-start → center */
  justify-content: center;
  padding: var(--pad-t) var(--page-gutter) var(--pad-b);
  max-width: var(--content-max);
  margin: 0 auto;
}

.frame {
  background: var(--bg-card);
  border: 1px solid var(--line);
  padding: var(--space-sm);
  max-width: 100%;
  position: relative;
  /* margin-left: var(--page-gutter);  ← 删除此行 */
  border-radius: 0;
}

.slide .names {
  margin-top: var(--section-v);
  /* margin-left: var(--page-gutter);  ← 删除此行 */
  text-align: left;              /* 文字仍左对齐，与画作左边界齐平 */
  padding: 0 var(--space-sm);    /* 保留：与画框内衬对齐 */
  width: min(280px, 86vw);       /* 改：从 width:100% + max-width:280px 合并为 min() 表达 */
}
```

**几何验证**（应满足）:
- 视口宽 390px → slide flex 容器 340px 居中，左右各 25px 空隙
- 画框宽 min(280px, 86vw) = 280px → 相对 slide 居中，左右各 (340-280)/2 - 22 = 8px（slide padding 内）
- 画框左边界距屏幕左边 = 25 + 22 + 8 = **55px**
- 画框右边界距屏幕右边 = 25 + 22 + 8 = **55px** ✅
- 「.names」宽 280px 与画框同宽同居中，`padding-left: 8px` 使文字左边界与图片（画框内边）左边界对齐 = 55 + 1 + 8 = **64px**（左右差 0px）

### 2.2 `js/ui.js` · 移除 `learnBtnSVG`

**修改位置**: 第 35-47 行 `learnBtnSVG` 函数

**修改**: 整个函数**删除**。同时删除文件顶部若干注释里对 SPE §7.2 环绕字的描述可保留（历史信息）。

### 2.3 `js/feed.js` · 替换 `.learn-btn` 渲染

**修改位置**: 第 88 行

**改前**:
```js
<button class="learn-btn" data-go="${esc(w.id)}" aria-label="了解更多">${learnBtnSVG(w.id)}</button>
```

**改后**（B 方案 · 展签文字链）:
```js
<a class="learn-inline" data-go="${esc(w.id)}" href="#/work/${esc(w.id)}" aria-label="了解更多，查看详情">
  <span class="learn-inline__en">Continue reading</span>
  <span class="learn-inline__rule" aria-hidden="true"></span>
  <span class="learn-inline__zh">了 解 更 多</span>
</a>
```

**同时修改**：
- 第 5 行 import 语句删除 `learnBtnSVG`：
  `import { esc, icons } from "./ui.js";`（`learnBtnSVG` 不再引用）
- 第 113-117 行、第 198-202 行的 `.learn-btn` 事件绑定选择器改为 `.learn-inline`；因元素是 `<a>`，还需在 handler 里 `ev.preventDefault()` 避免 hash 双跳。

**建议 handler 改写**:
```js
s.querySelector(".learn-inline").addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  savePos();
  navigate(`#/work/${sw.work.id}`);
});
```

### 2.4 `app.css` · 移除旧 `.learn-btn` 并新增 `.learn-inline`

**修改位置**: 第 290-306 行整个 `.learn-btn` 块 + 相关 `@keyframes spin`

**删除**（如 spin 无他处使用）:
```css
.learn-btn { … }
.learn-btn svg { … }
.learn-btn .ring-path circle { … }
.learn-btn .ring-text { … }
.learn-btn .ring-rotor { … }
.learn-btn .arrow { … }
@keyframes spin { to { transform: rotate(360deg); } }
```
（先 grep 一遍 `spin` 关键字，如无其他动画引用则一并删）

**新增**（放在原 `.learn-btn` 位置，紧邻 `.slide .title-en` 之后）:
```css
/* 「了解更多」内联展签文字链 —— 见 DESIGN.md §Components / learn-inline */
.learn-inline {
  margin-top: 28px;
  align-self: center;          /* 相对 .slide 的 align-items:center 主轴居中 */
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;           /* 扩大点击热区，不产生视觉容器 */
  cursor: pointer;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
}
.learn-inline__en {
  font-family: var(--serif-en);
  font-size: 15px;
  font-style: italic;
  letter-spacing: 0.08em;
  color: var(--gold);
  line-height: 1;
}
.learn-inline__rule {
  display: block;
  width: 48px;
  height: 1px;
  background: var(--gold);
  opacity: 0.6;
  transition: width 200ms ease, opacity 200ms ease;
}
.learn-inline__zh {
  font-family: var(--serif-zh);
  font-size: 13px;
  letter-spacing: 0.3em;
  color: var(--ink-2);
  margin-left: 0.3em;          /* 补偿疏字距导致的视觉左偏 */
  line-height: 1;
  font-weight: 400;
}
.learn-inline:active .learn-inline__rule {
  width: 64px;
  opacity: 1;
}
.learn-inline:active .learn-inline__zh {
  color: var(--ink);
}
@media (prefers-reduced-motion: reduce) {
  .learn-inline__rule { transition: none; }
}
```

**为什么用 `:active` 而不用 `:hover`**：赤拔在 iPhone 上使用；hover 在触
摸端不存在（品味档案条目）。`:active` 是触摸端"按下的瞬间"，对应
文字链的点击反馈。桌面浏览器也仍能触发。

---

## 3. 完整视觉规格（token 化）

### 3.1 「了解更多」内联文字链

| 属性 | 值 | 来源 token |
|---|---|---|
| 上边距（距作者名） | 28px | 自定义（略大于 `--section-v` 24px 以强调分隔） |
| 点击热区 padding | 8px 20px | 自定义（≥ 44×44 iOS 触摸目标建议） |
| 布局 | flex column, gap 6px, align:center | — |
| 英文行字体 | Georgia italic 15px, letter-spacing 0.08em | `--serif-en`（Georgia, Times New Roman, serif）|
| 英文行颜色 | `#8C6D3F` | `--gold` |
| 中间横线 | 48px × 1px | 自定义 |
| 横线颜色 | `#8C6D3F`, opacity 0.6 | `--gold` |
| 中文行字体 | Songti SC 13px, letter-spacing 0.3em | `--serif-zh` |
| 中文行颜色 | `#6B6558` | `--ink-2` |
| 中文行 margin-left | 0.3em | 补偿字距 |
| :active 横线宽 | 48 → 64px, 200ms ease | — |
| :active 横线 opacity | 0.6 → 1 | — |
| :active 中文颜色 | `#6B6558` → `#1D1B16` | `--ink-2` → `--ink` |

**文本内容**（i18n 侧不需要，此产品只做中文语境）:
- 英文行: `Continue reading`
- 中文行: `了 解 更 多`（4 字之间以中文空格 `\u3000` 或 CSS 字距均可；
  本规格用 `letter-spacing: 0.3em` 加视觉疏排，源文本仍是紧排 `了解更多`）

### 3.2 首页画作模块居中

| 属性 | 值 |
|---|---|
| `.slide align-items` | `center`（原 `flex-start`）|
| `.frame margin-left` | **删除**（原 `var(--page-gutter)`）|
| `.slide .names margin-left` | **删除**（原 `var(--page-gutter)`）|
| `.slide .names width` | `min(280px, 86vw)` |
| 画框相对视口左边界 | **55px**（视口 390 时）|
| 画框相对视口右边界 | **55px** |
| 文字左边界 vs 图片左边界 | 完全对齐（差 0px）|

---

## 4. 验收断言（对应卡上 4 条验收标准）

**卡验收 1**: 交付物包含「更多」按钮的完整视觉规格
→ 见本文件 §3.1，token 化字段完整。

**卡验收 2**: 画作模块居中的 CSS 方案
→ 见本文件 §2.1，`app.css` 三处修改（align-items / 删两处 margin-left）
   + §3.2 量化像素结果。

**卡验收 3**: 按钮新设计与首页整体色调协调
→ 只用 `--gold`（#8C6D3F）和 `--ink-2`（#6B6558），零黑填色、零阴影，
  与页面已用的衬线大标题（艺术手册 / 雷神图屏风）同一字体族。
  DESIGN.md `learn-button` token 更新见 §5。

**卡验收 4**: 首页画作卡片和标题居中，下方有一个与页面风格一致的「了解更多」入口
→ 三案视觉板见 `sketches/{A,B,C}-*/index.html`，
  实测截图见 `evidence/t_4c2a874b/sketch-*.png`，
  定稿 B 满足全部四点：居中 + 无黑圆盘 + 风格一致 + 二级入口清晰。

---

## 5. DESIGN.md 更新（同 commit）

### 5.1 `components.learn-button` token 更新

原:
```yaml
learn-button:
  backgroundColor: "transparent"
  textColor: "{colors.gold}"
```

改为:
```yaml
learn-inline:
  backgroundColor: "transparent"
  textColor: "{colors.gold}"
  secondaryTextColor: "{colors.ink-2}"
  ruleColor: "{colors.gold}"
  ruleOpacity: 0.6
```

（旧 `learn-button` key 删除；`.learn-btn` CSS 类同步删除。）

### 5.2 Decision Log 新增条目

```markdown
- **2026-09-01 — 首页「了解更多」= 展签文字链（B 方案）:** 三案自决，赤拔
  在 img_327fc6969041.jpg 中标注黑色实心圆 + 环绕字按钮"与美术馆调性不
  融合"。定稿 B 方案：Georgia italic 金色 "Continue reading" + 48px 金色
  细横线 + 疏字距 Songti SC "了 解 更 多"，无按钮容器，视觉重量从"控件"
  降为"内容"。落选 A（双胶囊）保留为主动作胶囊范式，落选 C（极细描边圆）
  保留为生成器等次要圆入口备选。同 commit 修复首页画作模块居中 bug
  (.slide align-items 与 .frame/.names 的 margin-left)。
- **2026-09-01 — 交互层级两层制:** 主动作 = 胶囊控件（收藏夹、日期选择、
  详情页动作按钮），内容路径的二级导览 = 文字链（当前仅「了解更多」）。
  两层制解释了为何 learn-inline 与其他控件视觉族不同 —— 层级不同，语言
  不同。
```

---

## 6. 实现完成后必做的验证（工程侧）

1. 本地 `npx playwright test tests/feed-alignment.spec.js`（如断言涉及
   `.learn-btn` 需同步更新为 `.learn-inline`）
2. `node ~/.hermes/scripts/artbook-prod-smoke.mjs` 在 preview 分支或部署后
3. **必须**：iPhone 真机安装（删掉旧 PWA 重装以清 SW 缓存）+ 首屏截图
   给赤拔核验
4. 视觉回看：把线上首屏截图与 `sketches/B-inline-serif/index.html`
   截图并置比对
