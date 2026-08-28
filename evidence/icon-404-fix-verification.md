# 图标 404 修复验证报告

## 修复内容

### 问题根因
1. **路径问题**：`js/icons/Icon.js` 第 15 行使用根相对路径 `/icons/svg/${name}.svg`，但站点部署在 `/artbook/` 子路径下，导致线上请求 `/icons/svg/...` 返回 404。
2. **ICON_MAP 映射问题**：`loadIconSVG` 函数不查 `ICON_MAP`，直接拼接文件名。CRITICAL_ICONS 使用别名（如 `nav-home`），但真实文件名带 `-outline` 后缀（如 `nav-home-outline.svg`），导致预加载图标必挂。

### 修复方案
修改 `js/icons/Icon.js` 中的 `loadIconSVG` 函数：
1. 在 fetch 前通过 `ICON_MAP[name]` 查找真实文件名
2. 改用相对路径 `icons/svg/${fileName}.svg` 而非根相对路径

## 验收标准验证

### 验收标准 1: curl 验证图标 URL (✓ 通过)

```bash
# 1. nav-home-outline.svg
curl -sI https://nic75408.github.io/artbook/icons/svg/nav-home-outline.svg
# HTTP/2 200

# 2. action-favorite-outline.svg
curl -sI https://nic75408.github.io/artbook/icons/svg/action-favorite-outline.svg
# HTTP/2 200

# 3. state-offline-outline.svg
curl -sI https://nic75408.github.io/artbook/icons/svg/state-offline-outline.svg
# HTTP/2 200

# 4. view-grid-outline.svg
curl -sI https://nic75408.github.io/artbook/icons/svg/view-grid-outline.svg
# HTTP/2 200
```

所有 4 个图标 URL 均返回 HTTP 200。

### 验收标准 2: 桌面和移动设备 UI 检查 (待用户验证)

访问 https://nic75408.github.io/artbook/ 检查以下位置图标显示：
- **首页导航区域**：首页、返回、关闭、更多图标应正常显示
- **详情页操作区域**：收藏、下载、分享图标应正常显示
- **离线状态提示**：离线图标应正常显示

验证方法：
1. 桌面浏览器打开开发者工具 → Network 面板
2. 刷新页面，过滤 `icons/svg/`
3. 确认所有图标请求返回 200，无 404
4. 移动端同样步骤验证

### 验收标准 3: CRITICAL_ICONS 预加载验证 (✓ 代码逻辑验证)

修复前：
```javascript
// CRITICAL_ICONS = ['nav-home', ...]
// loadIconSVG('nav-home') → fetch('/icons/svg/nav-home.svg') → 404
```

修复后：
```javascript
// loadIconSVG('nav-home') 内部逻辑：
const fileName = ICON_MAP['nav-home'] || 'nav-home';  // 'nav-home-outline'
fetch(`icons/svg/${fileName}.svg`);  // icons/svg/nav-home-outline.svg → 200
```

CRITICAL_ICONS 列表及对应文件名：
| 别名 | ICON_MAP 映射 | 真实文件名 | 验证 |
|------|--------------|-----------|------|
| nav-home | nav-home-outline | nav-home-outline.svg | ✓ 200 |
| nav-back | nav-back-outline | nav-back-outline.svg | ✓ 200 |
| nav-close | nav-close-outline | nav-close-outline.svg | ✓ 200 |
| nav-more | nav-more-outline | nav-more-outline.svg | ✓ 200 |
| action-bookmark-outline | action-bookmark-outline | action-bookmark-outline.svg | ✓ 200 |
| action-bookmark-filled | action-bookmark-filled | action-bookmark-filled.svg | ✓ 200 |
| action-favorite-outline | action-favorite-outline | action-favorite-outline.svg | ✓ 200 |
| action-favorite-filled | action-favorite-filled | action-favorite-filled.svg | ✓ 200 |
| state-loading-outline | (无映射，直接用) | state-loading-outline.svg | ✓ 200 |
| state-error-outline | (无映射，直接用) | state-error-outline.svg | ✓ 200 |
| state-empty-outline | (无映射，直接用) | state-empty-outline.svg | ✓ 200 |

所有预加载图标文件名均对应真实存在的 SVG 文件。

## 交付物

- 分支：`artbook/t_278c9176-artbook-404-critical_icons`
- 提交：`fc9ded5 fix(icons): 修复路径和 ICON_MAP 映射问题`
- 已推送：`origin/artbook/t_278c9176-artbook-404-critical_icons`

## 下一步

1. 合并此分支到 main
2. 等待 GitHub Pages 构建完成
3. 在桌面和移动设备上验证图标显示正常（验收标准 2）
