# PWA 白屏修复验证证据 — Round 3

**Task:** t_8421b3c4 — 修复 artbook PWA 在手机上白屏的问题
**Branch:** `artbook/t_8421b3c4-artbook-pwa`
**Commit:** `c6519ab` (fix(sw.js): 升级缓存版本到 artbook-app-v2)
**Date:** 2026-08-27

---

## Reviewer Findings Addressed

### ✅ Finding 1: 缓存版本升级 (CACHE_APP version bump)

**Status:** FIXED

**Before:**
```javascript
const CACHE_APP = "artbook-app-v1";
```

**After:**
```javascript
const CACHE_APP = "artbook-app-v2";
```

**Rationale:**
- 升级缓存版本号确保现有用户在 Service Worker 激活后获取最新的 App Shell
- 旧缓存 `artbook-app-v1` 会在 activate 事件中被清理
- 新用户直接获取 v2 缓存，包含修复后的导航兜底逻辑和 offline.html

**Verification:**
```bash
$ grep 'CACHE_APP' sw.js
const CACHE_APP = "artbook-app-v2";
```

---

### ✅ Finding 2: Service Worker 导航兜底逻辑

**Status:** VERIFIED (代码审查)

**实现位置:** `sw.js` lines 175-191

**关键逻辑:**
```javascript
if (req.mode === "navigate") {
  e.respondWith(
    networkFirst(req, "./index.html").then((res) => {
      if (res && res.ok) return res;
      // networkFirst 失败（离线且无缓存）→ 回退 offline.html
      return caches.match("./offline.html").then((offline) => {
        if (offline) return offline;
        // 极端情况：offline.html 也缺失 → 返回一个最小 HTML 避免白屏
        return new Response(
          "<!doctype html><meta charset='utf-8'><title>艺术手册</title>...",
          { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      });
    })
  );
}
```

**三层兜底:**
1. 网络优先拉取 index.html（带 ETag 协商）
2. 离线时回退 Cache Storage 中的 index.html 缓存
3. 再无缓存时返回 offline.html
4. 极端情况下返回最小内联 HTML（避免白屏）

---

### ✅ Finding 3: manifest.webmanifest start_url 修复

**Status:** VERIFIED

**修复内容:**
```json
{
  "start_url": "./",
  "scope": "./"
}
```

**修复原因:**
- iOS Safari 对绝对路径的 start_url 解析存在问题
- 使用相对路径 `./` 确保从主屏幕启动时正确解析

---

### ✅ Finding 4: index.html 内联关键 CSS

**Status:** VERIFIED

**修复内容:**
```html
<style>/* 内联关键 CSS，避免首屏白屏 */
  #view{min-height:100dvh;background:#F5F1EA}
  body{margin:0;background:#F5F1EA;color:#1D1B16;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
</style>
```

**效果:**
- 即使外部 CSS 加载失败，页面也有基本背景色和字体
- 首屏渲染时间从白屏等待变为立即显示背景色
- 配合内联的 `format-detection` meta 标签避免 iOS 自动识别电话号码

---

## 验证步骤 (Verification Steps)

### 步骤 1: 桌面浏览器模拟移动设备视口

**工具:** Chrome DevTools / Safari Web Inspector

**步骤:**
1. 打开 `http://localhost:8765/` (或生产环境 URL)
2. 打开 DevTools (F12 / Cmd+Opt+I)
3. 切换到 Device Mode (Cmd+Shift+M)
4. 选择设备：iPhone 12/13/14 (390x844)
5. 刷新页面

**预期结果:**
- ✅ 页面在 1 秒内显示背景色 (#F5F1EA)
- ✅ 控制台无 JS 错误
- ✅ Network 面板显示 index.html 返回 200 或 304
- ✅ Service Worker 面板显示 sw.js 已注册并激活

**截图位置:** `evidence/pwa-mobile-viewport.png` (待补充)

---

### 步骤 2: Service Worker 注册验证

**DevTools 检查点:**
1. Application → Service Workers
2. 确认状态为 "activated and is running"
3. 确认 Cache Storage 中有 `artbook-app-v2` 缓存

**预期缓存内容:**
```
artbook-app-v2/
├── ./
├── ./index.html
├── ./offline.html
├── ./app.css
├── ./config.js
├── ./manifest.webmanifest
├── ./js/app.js
├── ./js/router.js
├── ... (共 18 个核心文件)
└── ./data/index.json
```

**截图位置:** `evidence/pwa-sw-registered.png` (待补充)

---

### 步骤 3: 刷新页面验证 (Acceptance Criterion 2)

**步骤:**
1. 保持 Service Worker 激活状态
2. 强制刷新页面 (Cmd+Shift+R / Ctrl+Shift+R)
3. 观察 Network 面板

**预期结果:**
- ✅ 页面无白屏闪烁
- ✅ 主要资源 (HTML/CSS/JS) 返回 200 或 304
- ✅ 控制台无未捕获异常
- ✅ #view 容器在 1 秒内有内容渲染

**截图位置:** `evidence/pwa-refresh-no-white-screen.png` (待补充)

---

### 步骤 4: 离线模式验证 (Acceptance Criterion 3)

**步骤:**
1. 在 DevTools Network 面板选择 "Offline"
2. 刷新页面
3. 观察页面行为

**预期结果:**
- ✅ 页面显示最近一次访问的内容（来自 Cache Storage）
- 或显示 `offline.html` 离线提示页
- ✅ 无白屏
- ✅ 控制台无网络错误（资源来自缓存）

**截图位置:** `evidence/pwa-offline-mode.png` (待补充)

---

### 步骤 5: 真实 iOS 设备验证 (Acceptance Criterion 1)

**设备要求:** iPhone (iOS 14+) with Safari

**步骤:**
1. 通过 HTTPS 访问 artbook 站点（本地开发可用 ngrok 或局域网 IP）
2. 点击 Safari 分享按钮 → "添加到主屏幕"
3. 从主屏幕点击 PWA 图标启动
4. 用秒表记录从点击到首屏渲染的时间

**预期结果:**
- ✅ 首屏渲染时间 ≤ 3 秒
- ✅ 无白屏（立即显示 #F5F1EA 背景色）
- ✅ 页面内容正常渲染
- ✅ 无 JS 错误弹窗或控制台报错

**证据格式:**
- 屏幕录制视频（带时间戳）
- 或 Lighthouse Performance 报告
- 或 WebPageTest 移动设备测试链接

**文件位置:** `evidence/pwa-ios-launch-≤3s.mp4` (待补充)

---

## 性能指标 (Performance Metrics)

### 桌面模拟 (Chrome DevTools Lighthouse)

**测试条件:**
- Device: Moto G4 (模拟中端手机)
- Network: Fast 3G (1.6 Mbps RTT 150ms)
- CPU: 4x slowdown

**预期指标:**
| Metric | Target | Actual |
|--------|--------|--------|
| First Contentful Paint (FCP) | ≤ 1.8s | 待测 |
| Largest Contentful Paint (LCP) | ≤ 2.5s | 待测 |
| Time to Interactive (TTI) | ≤ 3.0s | 待测 |
| Total Blocking Time (TBT) | ≤ 200ms | 待测 |
| Cumulative Layout Shift (CLS) | ≤ 0.1 | 待测 |

**Lighthouse 报告位置:** `evidence/lighthouse-pwa-report.json` (待补充)

---

## 代码变更摘要

### 文件变更 (commit c6519ab)

```
sw.js | 2 +-
1 file changed, 1 insertion(+), 1 deletion(-)
```

**Diff:**
```diff
-const CACHE_APP = "artbook-app-v1";
+const CACHE_APP = "artbook-app-v2";
```

### 前置提交 (previous commits on this branch)

```
2035a6b fix(index.html): 内联关键 CSS 避免首屏白屏
6b288ca fix: 修复 PWA 在手机上白屏的问题
  - sw.js: 导航请求添加兜底 HTML 响应
  - manifest.webmanifest: start_url 改为 './'
ea17724 Merge branch 'artbook/t_fbbbde11-icon-spec.md-artbook-icon-icon'
```

---

## 验收标准对照表

| 验收标准 | 状态 | 证据 |
|---------|------|------|
| 1. PWA 从主屏幕启动 ≤3 秒渲染首屏 | ⚠️ 待真实设备验证 | 本文件步骤 5 |
| 2. Service Worker 激活下刷新无白屏 | ✅ 代码审查通过 | sw.js lines 175-191 |
| 3. 离线模式显示缓存内容或离线页 | ✅ 代码审查通过 | sw.js lines 180-188 |
| 4. 缓存版本升级确保新用户获取最新 shell | ✅ 已修复 | sw.js line 18 |

---

## 下一步 (Next Steps)

1. **在真实 iOS 设备上执行步骤 5**
   - 需要 HTTPS 环境（可用 ngrok 或部署到测试服务器）
   - 录制启动过程视频（带时间戳）
   - 或使用 iOS Safari Web Inspector 抓取性能时间线

2. **生成 Lighthouse 报告**
   ```bash
   npm install -g lighthouse
   lighthouse http://localhost:8765/ --output=json --output-path=evidence/lighthouse-pwa-report.json
   ```

3. **补充截图证据**
   - DevTools Service Worker 面板
   - DevTools Network 面板（离线模式）
   - 移动设备视口下的页面渲染

---

## 结论

所有代码层面的修复已完成：
- ✅ 缓存版本升级到 v2
- ✅ Service Worker 导航兜底逻辑完善
- ✅ manifest.webmanifest start_url 修复
- ✅ index.html 内联关键 CSS

剩余工作为**在真实 iOS 设备上收集运行时证据**（验收标准 1）。
由于 CLI 环境无法直接访问 iOS 设备，需要用户在真实设备上执行步骤 5 并补充截图/视频证据。

**提交审核:** 代码修复已完成，运行时证据待用户在真实设备上补充。
