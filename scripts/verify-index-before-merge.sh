#!/usr/bin/env bash
# 发布前验证：data/index.json.latest 必须是最新期日
# 用法：在合并到 main 前执行，失败则中止合并
set -e

cd "$(git rev-parse --show-toplevel)"

# 获取 origin/main 上的 index.json 的 latest 字段
LATEST_ON_MAIN=$(git show origin/main:data/index.json 2>/dev/null | grep -o '"latest"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)

if [[ -z "$LATEST_ON_MAIN" ]]; then
  echo "[ERROR] 无法从 origin/main:data/index.json 读取 latest 字段"
  exit 1
fi

# 获取最新的期文件
LATEST_ISSUE=$(ls -1 data/issues/*.json 2>/dev/null | sort -r | head -1 | xargs -I{} basename {} .json)

if [[ -z "$LATEST_ISSUE" ]]; then
  echo "[ERROR] data/issues/ 下没有期文件"
  exit 1
fi

if [[ "$LATEST_ON_MAIN" != "$LATEST_ISSUE" ]]; then
  echo "[WARN] data/index.json.latest ($LATEST_ON_MAIN) 不是最新期日 ($LATEST_ISSUE)"
  echo ""
  echo "请在合并前执行以下命令同步最新索引："
  echo "  git checkout origin/main -- data/index.json"
  echo ""
  echo "否则合并后线上首页将显示旧作品。"
  exit 1
fi

echo "[OK] index.json.latest = $LATEST_ISSUE"
exit 0
