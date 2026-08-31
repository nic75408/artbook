# data/index.json 冲突分析报告

## 问题概述

每天出刊（`pipeline/generate.py`）与功能发布（工程分支合并到 main）在 `data/index.json` 上发生冲突，导致最新一期被旧索引覆盖。

## 事故案例：921b78a 与 ebb4713

### Commit 时间线

```
921b78a (2026-08-31 05:29) — issue: 2026-08-31
  data/index.json: latest = "2026-08-31", issues[0] = "2026-08-31"
  
ebb4713 (2026-08-30 05:26) — issue: 2026-08-30
  data/index.json: latest = "2026-08-30", issues[0] = "2026-08-30"

931b05e (2026-08-31 13:37) — Merge artbook/t_0af02835
  data/index.json: latest = "2026-08-30", issues[0] = "2026-08-30"  ← 旧值覆盖了新值
```

### 分支结构

```
main (origin/main)
├─ ebb4713 (issue: 2026-08-30)
│  └─ 931b05e (merge artbook/t_0af02835)
│     └─ 合并时 index.json 保留了 ebb4713 的旧值
│
artbook/t_0af02835
├─ 921b78a (issue: 2026-08-31) ← 该分支包含最新一期
│  └─ 7bc68f3 (布局修复)
│     └─ 931b05e (merge commit)
```

### 覆盖路径

1. **出刊管线** (`pipeline/generate.py` L372–381)：
   - 生成 `data/issues/YYYY-MM-DD.json`
   - 调用 `merge_index(date)` 更新 `data/index.json`
   - 提交并推送（包含 `data/index.json` 的改动）

2. **发布流程**（功能分支 → main）：
   - 功能分支从 main 分叉时携带了当时的 `data/index.json`（旧版本）
   - 开发期间出刊管线在另一分支更新了 `data/index.json`
   - 合并时 Git 自动解决冲突（因为两边改的是不同行？实际是同一区域）
   - **合并结果保留了功能分支的旧值**

### 根因

**发布分支禁止携带 `data/index.json` 的改动。**

当前流程中，功能分支（如 `artbook/t_0af02835`）从 main 分叉时，会携带分叉点的 `data/index.json`。如果在此期间出刊管线更新了该文件，合并时就会发生：

- 出刊分支：`latest: "2026-08-31"`（新）
- 发布分支：`latest: "2026-08-30"`（旧，分叉时的状态）
- 合并后：`latest: "2026-08-30"`（旧值覆盖新值）

Git 的合并算法在这种情况下可能选择保留"ours"（main 侧）的值，因为冲突区域相似度高，但这恰恰是错误的业务语义。

## 解决方案

### 约定（立即执行）

1. **出刊管线独享 `data/index.json` 的写权限**
   - 只有 `pipeline/generate.py` 能修改 `data/index.json`
   - 功能分支禁止包含 `data/index.json` 的改动

2. **发布分支在合并前必须同步最新 `data/index.json`**
   - 合并前执行：`git checkout origin/main -- data/index.json`
   - 确保合并时使用的是最新索引

3. **发布闸门检查**
   - 在合并到 main 前，验证 `data/index.json.latest` 是否等于最新期日
   - 如不匹配，中止合并并告警

### 监控脚本（发布前执行）

```bash
#!/usr/bin/env bash
# 发布前验证：data/index.json.latest 必须是最新期日
set -e

LATEST_ON_MAIN=$(git show origin/main:data/index.json | jq -r '.latest')
LATEST_ISSUE=$(ls -1 data/issues/*.json | sort | tail -1 | xargs basename .json)

if [[ "$LATEST_ON_MAIN" != "$LATEST_ISSUE" ]]; then
  echo "[WARN] data/index.json.latest ($LATEST_ON_MAIN) 不是最新期日 ($LATEST_ISSUE)"
  echo "请在合并前执行：git checkout origin/main -- data/index.json"
  exit 1
fi

echo "[OK] index.json.latest = $LATEST_ISSUE"
```

## 后续风险

如果不修复，下次发布时仍会发生：
- 出刊生成 2026-09-01 期 → `index.json.latest = "2026-09-01"`
- 功能分支合并时携带旧 `index.json`（`latest = "2026-08-31"`）
- 合并后线上首页显示 8 月 31 日，而非 9 月 1 日

**赤拔看到的症状**：打开 App，首页最新一期不是今天的作品，而是昨天的。
