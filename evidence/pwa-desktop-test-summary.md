# PWA 桌面端自动化验证报告

**生成时间:** 2026-08-27T07:50:12.661Z
**测试环境:** Playwright Chromium (headless)
**视口:** 390x844 (iPhone 12/13/14)
**URL:** http://localhost:8765/

## 测试结果

### ✅ Initial Load (Mobile Viewport 390x844)
- **domContentLoaded:** 57ms
- **loadComplete:** 552ms
- **backgroundColor:** rgb(245, 241, 234)
- **hasViewElement:** true
![Screenshot](evidence/pwa-mobile-load-390x844.png)

### ✅ Hard Refresh
- **refreshTime:** 48ms
![Screenshot](evidence/pwa-refresh-390x844.png)


## 页面结构

- **title:** 艺术手册
- **hasViewport:** true
- **hasManifest:** true
- **hasInlineCSS:** true
- **themeColor:** #F5F1EA
- **appleWebAppTitle:** 艺术手册

## Manifest

✅ Valid
- **name:** 艺术手册
- **start_url:** ./
- **display:** standalone
- **theme_color:** #F5F1EA

## Service Worker

✅ sw.js exists

## Offline Page

✅ offline.html exists

## 注意事项

⚠️ **Service Worker 注册限制:** 由于通过 HTTP (localhost:8765) 访问，Service Worker 不会注册（SW 需要 HTTPS 环境）。真实 PWA 测试需要在 HTTPS 环境或从主屏幕启动。

⚠️ **离线模式限制:** Playwright 的离线模式会完全断开网络，无法测试 Service Worker 缓存回退（因为 SW 未注册）。真实离线测试需要在真实设备上进行。

## 下一步

请在真实 iOS 设备上：
1. 通过 HTTPS 访问站点
2. 添加到主屏幕
3. 从主屏幕启动 PWA
4. 记录启动时间（目标 ≤3 秒）
5. 测试离线模式行为
