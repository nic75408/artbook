# 详情页对齐与布局验证指南

本文档提供作品详情页布局验证的测试样本和步骤，用于确认信息卡结构、对齐精度和正文分段满足验收标准。

## 测试样本

以下 5 个作品覆盖不同字段完整性情况：

| 作品 ID | 作品名 | 作者 | 年代 | 材质 | 尺寸 | 馆藏 | 备注 |
|---------|--------|------|------|------|------|------|------|
| `met-435809` | 收割者 | 老彼得·勃鲁盖尔 | 1565 | 橡木板油画 | ✓ | The Met | 完整字段 |
| `met-39901` | 照夜白 | 韩干 | ca. 750 | 纸本水墨手卷 | ✓（复杂尺寸） | The Met | 年代含约数 |
| `met-436105` | 苏格拉底之死 | 雅克 - 路易·大卫 | 1787 | 布面油画 | ✓ | The Met | 标准字段 |
| `met-435876` | 穿红裙的塞尚夫人 | 保罗·塞尚 | 1888–90 | 布面油画 | ✓ | The Met | 年代为区间 |
| `met-438821` | 万福玛利亚 | 保罗·高更 | 1891 | 布面油画 | ✓ | The Met | 完整字段 |

## 验证步骤

### 1. 信息卡字段与层级（验收标准 1）

**操作步骤：**
1. 打开首页 `index.html`
2. 依次点击上述 5 个作品卡片进入详情页
3. 检查信息卡显示：
   - 字段顺序：作品名 → 作者 → 年代 → 材质 → 尺寸 → 馆藏
   - 字号层级：作品名（26px, 700）> 作者（14px, 正常）> 元数据（14px, 带标签）
   - 标签样式：ARTIST/DATE/MEDIUM/SIZE/MUSEUM，12px 大写字母，opacity 0.7

**预期结果：**
- 所有作品字段顺序一致
- 标签清晰可见但不抢眼
- 缺失字段时对应行不显示（无空行）

### 2. 对齐与版心（验收标准 2）

**工具准备：**
- Chrome DevTools（F12）
- 开启 Box model 视图

**测量步骤：**
1. 打开任一作品详情页（如 `#/work/met-435809`）
2. 在 Elements 面板选中 `.detail-hero img`（主图）
3. 记录左侧 computed `padding-left` 值（应为 `var(--page-gutter)` = 22px）
4. 选中 `.artwork-info-card`，记录左侧 computed `padding-left` 值（应同为 22px）
5. 选中 `.detail-body`，记录左侧 computed `padding-left` 值（应同为 22px）
6. 选中 `.action-row`，确认 `justify-content: flex-start`
7. 测量垂直间距：
   - 主图底部到信息卡顶部：应为 0（紧邻）
   - 信息卡底部到正文标题：应 > 正文段间距（18px）

**预期结果：**
- 主图、信息卡、正文左对齐线误差 ≤ 2px
- 信息卡与正文间距 > 正文内部段间距

### 3. 正文结构分段（验收标准 3）

**操作步骤：**
1. 打开任一作品详情页
2. 滚动到「本篇章赏析」部分
3. 检查是否存在两个小节：
   - 「整体印象」：描述构图、氛围、人物关系
   - 「局部细节」：描述纹理、面部、光影等

**预期结果：**
- 两个小节各有 h3 小标题（16px, 600, ink-2 色）
- 段落分布合理，无混合

### 4. 底部工具区与相关推荐（验收标准 4）

**测量步骤：**
1. 在详情页滚动到底部工具区
2. 选中 `.action-row`，确认：
   - `justify-content: flex-start`
   - 两个按钮间距 12px（gap 值）
3. 选中「收藏画作」按钮左边缘，记录其到视口左侧距离
4. 选中 `.artwork-info-card` 左边缘，确认距离一致
5. 滚动到「相关推荐」部分
6. 选中 `.related .section-title`，确认左边缘与信息卡一致

**预期结果：**
- 工具区按钮与信息卡左对齐
- 相关推荐标题与信息卡左对齐
- 推荐卡片尺寸统一

## 自动化测试（待添加）

未来可添加 Playwright/Cypress 测试自动验证 bounding box：

```javascript
// 示例：Playwright 对齐测试
test('artwork info card aligns with hero image', async ({ page }) => {
  await page.goto('#/work/met-435809');
  const heroBox = await page.locator('.detail-hero img').boundingBox();
  const infoBox = await page.locator('.artwork-info-card').boundingBox();
  expect(Math.abs(heroBox.x - infoBox.x)).toBeLessThanOrEqual(2);
});
```

## 修订历史

- 2026-08-26: 初始版本，配合 commit 69c965c 及后续修复
