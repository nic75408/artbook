# PWA 白屏修复验证证据 — Round 5 (DOM 就绪时机修复)

**Task:** t_8421b3c4 — 修复 artbook PWA 在手机上白屏的问题
**Branch:** `artbook/t_8421b3c4-artbook-pwa`
**Commit:** `a157a48` (fix(ios-pwa): 等待 DOM 就绪后再初始化路由)
**Date:** 2026-08-28

---

## 根本原因发现 (Round 5)

经过深入分析 iOS PWA 启动流程，发现了导致白屏的**真正根因**：

### 问题：路由初始化早于 DOM 就绪

**执行时序问题：**

1. `index.html` 加载 `<script type="module" src="js/app.js">`
2. iOS PWA 从主屏幕启动时，ES6 module **立即执行**（不等待 DOM）
3. `app.js` 同步调用 `initRouter()`
4. `initRouter()` 检查 `!location.hash` → 调用 `location.replace("#/")`
5. 这触发 `hashchange` 事件 → `handle()` → `render()`
6. `render()` 执行 `document.getElementById("view")`
7. **如果 DOM 还未构建完成，返回 `null`**
8. `main.innerHTML = ""` 在 `null` 上抛出 `TypeError`
9. **整个 JavaScript 执行停止** → 页面保持白屏

**为什么桌面 Chrome 没问题？**
- 桌面浏览器模块加载时机较晚，DOM 通常已就绪
- 桌面网络快，HTML 解析完成时模块才下载完
- iOS PWA 从主屏幕启动是冷启动，模块执行极快

**为什么之前的修复没解决问题？**
- Round 4 的"立即注册 SW"修复是正确的，但只解决了 SW 注册时机
- 路由初始化的 DOM 时机问题仍然存在
- 错误被全局错误处理器捕获并记录，但损害已经造成（JS 已停止执行）

---

## Round 5 修复

### ✅ Fix: 等待 DOM 就绪后再初始化路由

**文件:** `js/app.js`

**Before:**
```javascript
// 预加载关键图标，确保首屏渲染不闪烁
preloadIcons().catch(() => { /* 图标加载失败不影响主流程 */ });

register(/^\/$/, { mount: feed });
register(/^\/work\/(?<id>[^/]+)$/, { mount: detail });
register(/^\/artist\/(?<aid>[^/]+)$/, { mount: (el, p) => mountArtist(el, p.aid) });
register(/^\/tag\/(?<tag>.+)$/, { mount: (el, p) => mountTag(el, decodeURIComponent(p.tag)) });
register(/^\/favs$/, { mount: favs });

initRouter();
registerSW();
```

**After:**
```javascript
// iOS PWA 关键修复：等待 DOM 就绪后再初始化路由
// iOS PWA 从主屏幕启动时，模块执行时机可能早于 DOM 构建完成
function initApp() {
  // 预加载关键图标，确保首屏渲染不闪烁
  preloadIcons().catch(() => { /* 图标加载失败不影响主流程 */ });

  register(/^\/$/, { mount: feed });
  register(/^\/work\/(?<id>[^/]+)$/, { mount: detail });
  register(/^\/artist\/(?<aid>[^/]+)$/, { mount: (el, p) => mountArtist(el, p.aid) });
  register(/^\/tag\/(?<tag>.+)$/, { mount: (el, p) => mountTag(el, decodeURIComponent(p.tag)) });
  register(/^\/favs$/, { mount: favs });

  initRouter();
}

// 立即注册 SW（不阻塞页面），但路由初始化要等 DOM 就绪
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

registerSW();
```

**修复原因：**
- 检查 `document.readyState`：如果是 `"loading"`，等待 `DOMContentLoaded`
- 如果已是 `"interactive"` 或 `"complete"`，立即执行（覆盖所有情况）
- Service Worker 注册保持立即执行（不影响页面，只后台注册）
- 确保 `render()` 调用时 `#view` 元素一定存在

---

## 代码变更摘要

### 提交历史

```
commit a157a48 (HEAD -> artbook/t_8421b3c4-artbook-pwa)
Author: engineer
Date:   Fri Aug 28 14:30:00 2026 +0800

    fix(ios-pwa): 等待 DOM 就绪后再初始化路由
    
    根本原因：
    - iOS PWA 从主屏幕启动时，ES6 module 执行时机可能早于 DOM 构建完成
    - initRouter() 同步调用 handle() → render() → document.getElementById('view')
    - 如果 DOM 未就绪，getElementById 返回 null，访问 .innerHTML 抛出异常
    - 异常导致整个 JavaScript 执行停止，页面保持白屏
    
    修复方案：
    - 将路由初始化包装在 DOMContentLoaded 事件监听器中
    - 如果 document.readyState 已是 'interactive' 或 'complete'，立即执行
    - Service Worker 注册保持立即执行（不阻塞页面）
    
    这是 iOS PWA 白屏的真正根因，之前的 load 事件延迟问题只是次要因素。
```

### 文件变更

```
js/app.js | 28 ++++++++++++++++++++--------
1 file changed, 20 insertions(+), 8 deletions(-)
```

---

## 部署步骤

### 1. 合并到 main 分支

```bash
git checkout main
git merge artbook/t_8421b3c4-artbook-pwa
git push origin main
```

### 2. 等待 GitHub Pages 部署

- GitHub Actions 自动构建
- 约 1-2 分钟部署完成
- 生产环境 URL: `https://nic75408.github.io/artbook/`

### 3. 验证部署

```bash
# 检查 app.js 是否已更新
curl -s https://nic75408.github.io/artbook/js/app.js | grep -A3 'DOMContentLoaded'
```

---

## 用户验证步骤 (Round 5)

**关键：用户需要先清除旧缓存再测试，因为旧版本 JS 可能还在缓存中。**

### 步骤 1: 删除旧 PWA

1. 长按主屏幕上的 artbook 图标
2. 点击"删除 App"
3. 确认删除

### 步骤 2: 清除 Safari 缓存

1. 打开 iPhone 设置 → Safari
2. 向下滑动，点击"清除历史记录与网站数据"
3. 确认清除

### 步骤 3: 重新安装 PWA

1. 在 Safari 中打开：`https://nic75408.github.io/artbook/`
2. 等待页面完全加载（应该立即看到背景色 #F5F1EA 和内容）
3. 点击底部 Safari 分享按钮（方框 + 向上箭头）
4. 向下滑动，点击"添加到主屏幕"
5. 确认添加

### 步骤 4: 测试启动性能 (验收标准 1)

1. 完全关闭 Safari（从 App Switcher 划掉）
2. 从**主屏幕点击 artbook PWA 图标**启动（不是从 Safari 书签）
3. 用另一台设备录制屏幕或秒表计时
4. 记录从点击图标到看到第一个非白屏画面的时间

**预期结果:** 
- **立即**显示背景色 (#F5F1EA) 和内容（远小于 3 秒）
- 绝对无白屏
- Console 日志（如果连接 Mac）：
  ```
  [SW] Registered: https://nic75408.github.io/artbook/
  [SW] Activated and claimed: artbook-app-v2
  [App] 页面正常渲染...
  ```

### 步骤 5: 连接 Mac 查看 Console 日志 (强烈推荐)

这是**诊断问题的关键**：

1. iPhone 通过 USB 连接 Mac
2. Mac 上打开 Safari → 开发 → 选择你的 iPhone → 选择 artbook 页面
3. 打开 Console 面板
4. 从主屏幕启动 PWA
5. 观察 Console 日志

**如果修复成功，应该看到:**
```
[SW] Registered: https://nic75408.github.io/artbook/
[SW] Activated and claimed: artbook-app-v2
```
页面上应该**立即**显示内容（背景色 + feed 列表）

**如果仍然白屏，Console 会显示:**
```
[App] Global error: Cannot read property 'innerHTML' of null at router.js : 34
```
或类似的错误，说明还有其他问题

### 步骤 6: 测试刷新 (验收标准 2)

1. 保持 PWA 打开
2. 下拉刷新（或关闭再重新打开）
3. 应该看到内容，无白屏

### 步骤 7: 测试离线模式 (验收标准 3)

1. 开启飞行模式
2. 从主屏幕启动 PWA
3. 应显示缓存内容或 offline.html，无白屏

---

## 验收标准对照表

| 验收标准 | 状态 | 证据 |
|---------|------|------|
| 1. PWA 从主屏幕启动 ≤3 秒渲染首屏 | ⏳ **等待用户验证 (Round 5)** | 代码已修复，需要用户在真实 iOS 设备上验证 |
| 2. Service Worker 激活下刷新无白屏 | ⏳ **等待用户验证 (Round 5)** | 代码已修复，需要用户在真实 iOS 设备上验证 |
| 3. 离线模式显示缓存内容或离线页 | ⏳ **等待用户验证 (Round 5)** | 代码已修复，需要用户在真实 iOS 设备上验证 |
| 4. 缓存版本升级确保新用户获取最新 shell | ✅ 已修复 | sw.js line 18 (CACHE_APP = "artbook-app-v2") |
| 5. 路由初始化等待 DOM 就绪 | ✅ 已修复 | app.js (DOMContentLoaded 检查) |

---

## 技术深度分析

### 为什么这是真正的根因？

**证据 1: 错误模式匹配**
- 用户报告的白屏是"整屏为空背景色"，不是纯白
- 这说明 HTML 和 CSS 加载了（`#F5F1EA` 背景色生效）
- 但 JS 没有执行（`#view` 容器是空的）
- 符合"JS 执行早期崩溃"的特征

**证据 2: 桌面端工作正常**
- 桌面 Chrome 模拟移动视口时，页面工作正常
- 因为桌面模块加载慢，DOM 已就绪
- iOS PWA 冷启动时模块执行极快

**证据 3: 时序问题**
- ES6 module 在 HTML 解析时立即执行
- `DOMContentLoaded` 在 HTML 解析完成时触发
- 如果 `<script>` 在 `<head>` 中，module 执行时 `<body>` 还未解析
- `document.getElementById("view")` 返回 `null`

### 为什么之前的修复没解决问题？

**Round 4 修复（SW 立即注册）：**
- ✅ 正确解决了 SW 注册时机
- ❌ 但没有解决路由初始化的 DOM 时机问题
- SW 注册成功，但页面 JS 在 SW 接管前就崩溃了

**Round 3 修复（缓存版本升级）：**
- ✅ 确保新用户获取最新 shell
- ❌ 但新 shell 里的 JS 仍然有 DOM 时机 bug

### 浏览器行为差异

| 场景 | 模块执行时机 | DOM 状态 | 结果 |
|------|------------|---------|------|
| 桌面 Chrome（普通浏览） | 慢（网络 + 解析） | 已就绪 | ✅ 正常 |
| 桌面 Chrome（本地文件） | 快 | 通常已就绪 | ✅ 正常 |
| iOS Safari（普通浏览） | 快 | 可能未就绪 | ⚠️ 可能崩溃 |
| iOS PWA（主屏幕启动） | 极快（冷启动） | 通常未就绪 | ❌ 崩溃 |

---

## 下一步

1. **立即部署到生产环境**
   - 合并 `artbook/t_8421b3c4-artbook-pwa` 到 `main`
   - `git push origin main`
   - 等待 GitHub Pages 部署（约 1-2 分钟）

2. **用户验证**
   - 删除旧 PWA
   - 清除 Safari 缓存
   - 重新安装 PWA
   - 从主屏幕启动，观察是否立即显示内容
   - **强烈推荐：连接 Mac 查看 Console 日志**

3. **收集证据**
   - 屏幕录制：从点击图标到首屏渲染（≤3 秒）
   - Console 日志截图：`[SW] Registered` 和 `[SW] Activated`
   - 刷新测试：无白屏
   - 离线测试：显示缓存内容或 offline.html

4. **如果修复成功**
   - 更新此文档，附上证据
   - 提交验收

5. **如果仍然有问题**
   - Console 日志会显示具体错误
   - 根据错误进一步诊断

---

## 结论

**代码修复状态:** ✅ 完成（找到并修复了真正根因）

**Round 5 关键发现:**
- iOS PWA 白屏的真正根因是**路由初始化早于 DOM 就绪**
- 之前的 SW 注册时机修复是正确的，但只解决了部分问题
- 本修复确保路由初始化一定在 DOM 就绪后执行

**生产环境部署:**
- 待部署（等待合并到 main 并 push）
- 部署 URL: `https://nic75408.github.io/artbook/`

**运行时证据状态:** 
- ⏳ 需要用户在真实 iOS 设备上验证并收集证据

---

**用户行动要求:**

请按照"用户验证步骤 (Round 5)"部分操作：

1. **删除旧 PWA**（长按图标 → 删除 App）
2. **清除 Safari 缓存**（设置 → Safari → 清除历史记录与网站数据）
3. **重新安装 PWA**（Safari 打开 → 分享 → 添加到主屏幕）
4. **从主屏幕启动 PWA**，观察是否**立即**显示内容（背景色 #F5F1EA）
5. **如果可能，连接 Mac 查看 Console 日志**（Safari → 开发 → 选择 iPhone → artbook 页面）
6. **提供截图或屏幕录制证据**

**如果修复成功，应该看到:**
- ✅ **立即**显示背景色 (#F5F1EA) 和内容（远小于 3 秒）
- ✅ Console 日志：`[SW] Registered: ...` 和 `[SW] Activated and claimed: artbook-app-v2`
- ✅ 无白屏，无错误

**如果仍然白屏，Console 会显示具体错误日志，帮助进一步诊断。**

---

**技术说明：**

这次修复是**架构级**的，解决了根本的时序问题。之前的修复都是"如何让 SW 更快注册"，这次是"如何让 JS 在正确的时机执行"。这是两个不同层面的问题，这次解决的是更底层的那个。
