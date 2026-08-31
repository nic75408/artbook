#!/bin/bash
# verify-index-before-merge.sh
# 发布前验证脚本：确保 data/index.json.latest/issues 是最新日期
# 用法：在合并到 main 前运行此脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$REPO_ROOT/data"
ISSUES_DIR="$DATA_DIR/issues"
INDEX_JSON="$DATA_DIR/index.json"

# 检查 data/index.json 是否存在
if [ ! -f "$INDEX_JSON" ]; then
    echo "ERROR: $INDEX_JSON not found"
    exit 1
fi

# 获取 index.json 中的 latest 字段
LATEST_FROM_INDEX=$(grep -o '"latest": *"[^"]*"' "$INDEX_JSON" | cut -d'"' -f4)

if [ -z "$LATEST_FROM_INDEX" ]; then
    echo "ERROR: Could not parse 'latest' field from $INDEX_JSON"
    exit 1
fi

# 获取 issues 目录中最新的日期文件
LATEST_ISSUE_FILE=$(ls -1 "$ISSUES_DIR"/*.json 2>/dev/null | sort -r | head -n1)

if [ -z "$LATEST_ISSUE_FILE" ]; then
    echo "WARNING: No issue files found in $ISSUES_DIR"
    exit 0
fi

LATEST_ISSUE_DATE=$(basename "$LATEST_ISSUE_FILE" .json)

# 验证 latest 字段与最新 issue 文件一致
if [ "$LATEST_FROM_INDEX" != "$LATEST_ISSUE_DATE" ]; then
    echo "ERROR: index.json.latest ($LATEST_FROM_INDEX) does not match latest issue file ($LATEST_ISSUE_DATE)"
    echo ""
    echo "This means the branch you are merging carries an outdated index.json."
    echo "Before merging, run:"
    echo "  git checkout origin/main -- data/index.json"
    echo ""
    echo "Or ensure the daily pipeline has already updated main with today's issue."
    exit 1
fi

echo "OK: index.json.latest ($LATEST_FROM_INDEX) matches latest issue ($LATEST_ISSUE_DATE)"
exit 0
