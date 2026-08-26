#!/bin/bash
# 安装/重装艺术手册每日 pipeline 的 launchd 触发点（t_8d5cb3c8）。
#
# 作用：把 scripts/com.artbook.pipeline.plist 模板（含 __REPO__ / __HOME__
# 占位符）替换为实际路径后写入 ~/Library/LaunchAgents/com.artbook.pipeline.plist，
# 并重载 launchd。幂等：重复执行安全。
#
# 触发规则：每天 05:00 本地时区；机器睡眠错过时点在唤醒后补跑一次。
# 期日由 run_daily.sh 在触发时刻锚定 Asia/Shanghai 自然日（SPE §5/§6.4）。
set -eu

REPO="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$REPO/scripts/com.artbook.pipeline.plist"
PLIST="$HOME/Library/LaunchAgents/com.artbook.pipeline.plist"
LABEL="com.artbook.pipeline"

[ -f "$TEMPLATE" ] || { echo "缺少模板：$TEMPLATE" >&2; exit 1; }
mkdir -p "$HOME/Library/LaunchAgents"

# launchd 不展开占位符/环境变量 → 安装时替换为绝对路径
sed -e "s|__REPO__|$REPO|g" -e "s|__HOME__|$HOME|g" "$TEMPLATE" > "$PLIST"

# 重载（旧实例不存在时 unload 报错可忽略）
launchctl unload "$PLIST" >/dev/null 2>&1 || true
launchctl load "$PLIST"

echo "已安装 $PLIST"
echo "  每日 05:00（本地时区）触发 $REPO/scripts/run_daily.sh"
echo "  日志：$HOME/Library/Logs/artbook-pipeline.log"
launchctl list "$LABEL" | grep -q "$LABEL" && echo "launchd 已加载（launchctl list $LABEL）"
