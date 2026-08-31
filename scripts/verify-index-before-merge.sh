#!/bin/bash
# verify-index-before-merge.sh
# 发布前验证脚本：确保当前分支的 data/index.json 与 origin/main 一致
# 用法：在合并到 main 前运行此脚本
#
# 验证逻辑：
# 1. 检查当前分支的 data/index.json 是否与 origin/main 一致
# 2. 如果不一致，说明分支携带了旧的 index.json 改动，需要丢弃
# 3. 如果一致，检查 origin/main 的 latest 字段是否与 issues 目录中的最新文件一致
#
# exit 0: 验证通过，可以安全合并
# exit 1: 验证失败，需要先同步 index.json

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

# 检查是否有 origin/main
if ! git rev-parse --verify origin/main >/dev/null 2>&1; then
    echo "WARNING: origin/main not available, skipping remote comparison"
    # 本地验证：检查 latest 字段是否与最新 issue 文件一致
    LATEST_FROM_INDEX=$(grep -o '"latest": *"[^"]*"' "$INDEX_JSON" | cut -d'"' -f4)
    LATEST_ISSUE_FILE=$(ls -1 "$ISSUES_DIR"/*.json 2>/dev/null | sort -r | head -n1)
    if [ -z "$LATEST_ISSUE_FILE" ]; then
        echo "OK: No issue files to compare"
        exit 0
    fi
    LATEST_ISSUE_DATE=$(basename "$LATEST_ISSUE_FILE" .json)
    if [ "$LATEST_FROM_INDEX" != "$LATEST_ISSUE_DATE" ]; then
        echo "WARNING: index.json.latest ($LATEST_FROM_INDEX) does not match latest issue ($LATEST_ISSUE_DATE)"
        echo "This may be expected if the daily pipeline hasn't merged yet."
    fi
    exit 0
fi

# 检查当前分支的 index.json 是否与 origin/main 一致
if ! git diff --quiet origin/main -- "$INDEX_JSON"; then
    echo "ERROR: Current branch's data/index.json differs from origin/main"
    echo ""
    echo "This means your branch carries an outdated or modified index.json."
    echo "Before merging, run:"
    echo "  git checkout origin/main -- data/index.json"
    echo ""
    diff_output=$(git diff origin/main -- "$INDEX_JSON" | head -20)
    echo "Differences:"
    echo "$diff_output"
    exit 1
fi

echo "OK: data/index.json matches origin/main"

# 额外检查：origin/main 的 latest 字段是否与最新 issue 文件一致（ informational only）
LATEST_FROM_INDEX=$(grep -o '"latest": *"[^"]*"' "$INDEX_JSON" | cut -d'"' -f4)
LATEST_ISSUE_FILE=$(ls -1 "$ISSUES_DIR"/*.json 2>/dev/null | sort -r | head -n1)
if [ -n "$LATEST_ISSUE_FILE" ]; then
    LATEST_ISSUE_DATE=$(basename "$LATEST_ISSUE_FILE" .json)
    if [ "$LATEST_FROM_INDEX" != "$LATEST_ISSUE_DATE" ]; then
        echo "INFO: index.json.latest ($LATEST_FROM_INDEX) is older than latest issue file ($LATEST_ISSUE_DATE)"
        echo "      This is expected if today's pipeline hasn't merged yet."
    else
        echo "OK: index.json.latest matches latest issue file"
    fi
fi

exit 0
