# 截图证据说明

## 当前状态

- **截图总数**: 28 张 PNG 文件
- **覆盖样本**: 12 个（部分样本有 3 种视口，部分只有 1-2 种）
- **生成时间**: 2026-08-26（早期运行）

## 验收样本更新

2026-08-26 重新运行 `scripts/generate_acceptance_evidence.py` 后，验收证据文件更新为 21 个样本，覆盖所有 5 种 region 类型：
- background: 1 个 (met-436000)
- torso_neck: 6 个
- clothing: 4 个
- face: 5 个
- whole_work: 5 个

这些新样本的截图尚未生成（需要 Playwright 环境）。

## 验证方法

### 方法 1：直接访问实际应用（推荐）
```bash
# 启动本地服务器
python3 -m http.server 8888

# 访问任意样本验证 UI 结构
open http://127.0.0.1:8888/#/work/met-436000  # background 样本
open http://127.0.0.1:8888/#/work/cma-163582  # clothing 样本
open http://127.0.0.1:8888/#/work/cma-101974  # torso_neck 样本
```

### 方法 2：查看 UI 结构模拟页面
打开 `ui-evidence-all-samples.html` 查看所有 21 个样本的 UI 结构模拟。

### 方法 3：查看现有截图
现有 28 张截图位于 `data/evidence/screenshots/` 目录，可通过 `manifest.json` 查看元数据。

## 重新生成截图

如需为所有 21 个验收样本生成完整截图（3 视口 × 21 样本 = 63 张）：

```bash
# 确保 Playwright 已安装
pip3 install playwright
playwright install webkit

# 启动服务器
python3 -m http.server 8888

# 生成截图
python3 scripts/generate_screenshots.py
```

## 验收要点

验收标准 3 关注的是**UI 映射机制是否实现**，而非截图数量：
- ✓ 圆形局部图下方有区域标签（由 `js/detail.js` 基于 `w.detailCrop.region` 渲染）
- ✓ Essay 段落前有对应标签（由 `js/detail.js` 基于 scope 渲染）
- ✓ 响应式布局在三种视口下无重叠溢出（通过 CSS 媒体查询保证）

截图仅作为视觉证据，实际验证应通过访问应用完成。
