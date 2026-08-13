# 艺术手册 Artbook

每日更新 30 幅艺术史杰作的私人画册 PWA——竖滑浏览、点入赏析、顺藤摸瓜看同画家/同流派作品。

- **内容为王，前端要薄**：零框架、零构建、零依赖的原生 HTML/CSS/JS；GitHub 仓库即数据库
- **图片不入仓库**：全部直链博物馆图床（Met / AIC / Cleveland / Rijks），仓库只有文本
- **零运维**：GitHub Actions 每日 cron 跑内容 pipeline，commit + push，GitHub Pages 自动发布

## 架构

```
.github/workflows/daily.yml ──每日 cron──▶ pipeline/generate.py
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

数据 schema 与完整产品规格见仓库所在项目的《艺术手册-SPE.md》。

## 运维说明

### 每日发布

- workflow：`.github/workflows/daily.yml`，cron `0 21 * * *`（UTC，= 北京时间次日 05:00），另有 `workflow_dispatch` 手动触发（`date` / `force` 输入）
- 每次运行内部完成 commit/push，用 `GITHUB_TOKEN`，无需单独配置
- **Schedule 停用机制**：GitHub 会在仓库 60 天无 commit 后自动停用 schedule。本项目每天一次 commit 天然规避；若长时间停更后需恢复，手动跑一次 workflow_dispatch 即可重新激活
- 失败 = workflow 失败，GitHub 默认邮件通知仓库 owner，无需额外报警

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
python pipeline/generate.py --date 2026-08-13 --dry-run   # 完整执行但不落盘
```

## 分工事项

| 事项 | 归属 |
|------|------|
| LLM key 与仓库 Secrets | 项目 owner |
| iPhone 添加主屏 + 真机验收 | 项目 owner |

## 已知限制（v1 接受）

- 博物馆图床链接长期失效 → 展示占位 + 源站链接，不做回扫
- 收藏仅存本机 localStorage，清除网站数据会丢失
- 无深色模式、无搜索、无账号同步（v2 候选）
