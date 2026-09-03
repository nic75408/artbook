# Art Daily Artbook

每日更新 30 幅艺术史杰作的私人画册 PWA——竖滑浏览、点入赏析、顺藤摸瓜看同画家/同流派作品。

- **内容为王，前端要薄**：零框架、零构建、零依赖的原生 HTML/CSS/JS；GitHub 仓库即数据库
- **图片不入仓库**：全部直链博物馆图床（Met / AIC / Cleveland / Rijks），仓库只有文本
- **零运维**：本地 launchd 每日凌晨跑内容 pipeline，commit + push，GitHub Pages 自动发布

## 架构

```
launchd com.artbook.pipeline（每日 05:00）──▶ scripts/run_daily.sh ──▶ pipeline/generate.py
                                          （手动兜底：daily.yml workflow_dispatch）
                                              │ 1. 博物馆开放 API 拉候选
                                              │ 2. 去重（pipeline/seen.json）
                                              │ 3. LLM 选品 30 幅
                                              │ 4. LLM 逐幅看图写中文赏析
                                              │ 5. Pillow 提取主色
                                              ▼
          data/issues/YYYY-MM-DD.json  data/catalog.json  data/artists.json  data/index.json
                                              │ git commit + push
                                              ▼
                                       GitHub Pages（main 分支根目录）
```

数据 schema 与完整产品规格见仓库所在项目的《Art Daily-SPE.md》。

## 运维说明

### 每日发布

- **日常触发（主路径）**：本地 launchd 任务 `com.artbook.pipeline`，每天 **05:00（本地时区）** 跑 `scripts/run_daily.sh` → `pipeline/generate.py`，内部完成 commit + push。触发点模板与安装脚本已版本化：`scripts/com.artbook.pipeline.plist` + `scripts/install_launchd.sh`（幂等重装）
- **自然日锚定**：触发时刻即定本期期日（Asia/Shanghai 自然日，`YYYY-MM-DD`），显式传入 `--date`；即使 Met 探针等待/手动触发跨午夜，期号也不会漂到次日（t_8d5cb3c8）
- **手动兜底**：`.github/workflows/daily.yml` 仅保留 `workflow_dispatch`（`date` / `force` 输入）——lboneapi 网关仅内网可达，托管 runner 被 403，无法恢复 cron（详见 workflow 头部注释）
- **Schedule 停用机制**：GitHub 会在仓库 60 天无 commit 后自动停用 schedule。本项目每天一次 commit 天然规避；若长时间停更后需恢复，手动跑一次 workflow_dispatch 即可重新激活
- 失败时本地弹系统通知（见 `run_daily.sh`）；GitHub Actions 兜底路径失败即 workflow 失败，GitHub 默认邮件通知仓库 owner

### Secrets（Repository Settings → Secrets and variables → Actions）

| Secret | 必需 | 说明 |
|--------|------|------|
| `LLM_API_KEY` | ✅ | LLM 网关密钥 |
| `RIJKS_API_KEY` | ❌ | Rijksmuseum API key，缺省跳过该源 |

### Pages 部署

Settings → Pages → **Deploy from a branch** → `main` / `/ (root)`。已定死，勿改。

### 本地开发

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r pipeline/requirements.txt
export LLM_API_KEY=...   # 或由 .env 提供
python -m unittest discover -s tests -q            # 发布闸门校验逻辑单元测试（推送上线前必须通过）
node tests/sw_prefetch_logic.test.mjs              # SW 预缓存/懒预取/离线回退逻辑测试（t_dac8f66a）
python pipeline/generate.py --date 2026-08-13 --dry-run   # 完整执行但不落盘
```

### 前端测试验证

```bash
# 安装依赖
npm install

# 启动本地服务器（端口 8888）
npm run dev

# 运行 Playwright 测试（画作版式适配验收，t_f1b36a86）
# 验收标准：9 条用例全部通过
npx playwright test tests/artwork-aspect-ratio.spec.js

# 运行 Service Worker 逻辑测试（27 条用例）
npm test
```

Playwright 测试验收标准（9 条用例）：
1. 画作、作品文字左边界对齐（同一卡片内误差 ≤ 100px）
2. 横向滑动时左右留白差异 ≤ 5px（iPhone 14 Pro 390×844）
3. 垂直间距统一为 24pt
4. 右下角了解更多按钮尺寸收紧到 84px
5. 首页无左下角收藏按钮
6. 右上角收藏夹入口显示文字
7. 点击右上角收藏夹进入收藏夹视图
8. 画作容器采用 letterbox 背景
9. 视觉证据截图：捕获 10 张作品卡的版式证据

## 分工事项

| 事项 | 归属 |
|------|------|
| LLM key 与仓库 Secrets | 项目 owner |
| iPhone 添加主屏 + 真机验收 | 项目 owner |

## 设计规范

- **DESIGN.md** — 基础视觉系统（色彩、字体、间距、圆角、阴影）
- **artwork-aspect-ratio-spec.md** — 画作长宽比处理规范（Option 2：原比例 + letterbox）
- **Artwork-Aspect-Ratio-DESIGN-EXT.md** — 画作布局 token 扩展规范

## 已知限制（v1 接受）

- 博物馆图床链接长期失效 → 展示占位 + 源站链接，不做回扫
- 收藏仅存本机 localStorage，清除网站数据会丢失
- 无深色模式、无搜索、无账号同步（v2 候选）

## 推荐算法规则

### 内容非空保障（SPE §7.4）

推荐系统（首页 Feed、详情页相关推荐）在数据层和渲染层均实施内容非空校验，确保用户不会看到空白卡片：

**数据层过滤**（`js/data.js::related()`）：
- 推荐池作品必须同时具备非空标题（`t`）、非空作者（`a`）、非空缩略图（`th`）
- 缺失任一字段的作品在推荐生成阶段即被过滤，不会进入推荐列表

**渲染层兜底**（`js/feed.js::slideHTML()` / `js/detail.js::render()`）：
- 标题为空 → 使用「佚名作品」作为兜底文案
- 作者为空 → 使用「未知艺术家」作为兜底文案
- 作品 ID 等技术字段永不暴露给终端用户

**历史数据清理**：
- 运行 `python scripts/check_empty_recommendations.py` 扫描数据源
- 报告生成于 `reports/empty-recommendations.txt`
- 新增作品或推荐关系时，若未填充展示文案，相关检查会在构建或运行时以日志/错误形式暴露

### 推荐策略优先级

详情页相关推荐（`js/data.js::related()`）按以下优先级选取：
1. 同画家作品（最多 4 幅，按年份接近排序）
2. 同流派作品
3. tags 交集 ≥ 2 的作品
4. 年代差 ≤ 30 年的作品

所有推荐均经过内容非空过滤，确保卡片展示完整。
