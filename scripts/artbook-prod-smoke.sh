#!/bin/bash
# artbook 生产环境冒烟检查 — 包装脚本
# 用法：bash scripts/artbook-prod-smoke.sh
exec node "$(dirname "$0")/artbook-prod-smoke.mjs" "$@"
