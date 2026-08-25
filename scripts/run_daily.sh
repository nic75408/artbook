#!/bin/bash
# 艺术手册每日 pipeline —— launchd 定时任务脚本（com.artbook.pipeline）
#
# 背景（SPE §11 预案，2026-08-13 M1c 实测结论）：
#   lboneapi 网关仅内网可达（GitHub Actions 托管 runner 被 403 来源层拒绝）。
#   pipeline 改在本地跑：每天本地生成一期 → commit → push 回 GitHub，
#   前端照旧由 GitHub Pages 托管，其余架构不变。
#
# 环境：
#   - generate.py（config.py）自己读 仓库上一级/.env 拿 LLM_API_KEY，无需注入
#   - 博物馆 API 需走本地 Clash 代理；lboneapi 直连/走代理均可（M1a 已验证）
#   - gh credential helper（活动账号 nic75408）负责 git push 凭证
set -u

REPO="$HOME/人文/艺术手册/artbook"
LOCKDIR=/tmp/artbook-pipeline.lock
LOGFILE="$HOME/Library/Logs/artbook-pipeline.log"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
unset PYTHONPATH VIRTUAL_ENV   # 防其他 venv 环境污染（曾导致 pydantic_core 加载失败）

# ---- 单实例锁（防手动 kickstart 与定时触发重叠；崩溃残留时删 /tmp/artbook-pipeline.lock 即可）----
if ! mkdir "$LOCKDIR" 2>/dev/null; then
    echo "$(date '+%F %T') [lock] 已有实例在跑，跳过" >> "$LOGFILE"
    exit 0
fi
trap 'rmdir "$LOCKDIR" 2>/dev/null' EXIT

export HTTPS_PROXY=http://127.0.0.1:7897
export HTTP_PROXY=http://127.0.0.1:7897
export PIPELINE_THREADS=3

cd "$REPO" || exit 1

# ---- 单元测试（t_866be207 推送上线前验证）：验证逻辑回归防线，失败即中止，
# 不进入生成（避免浪费下方 Met 探针最长 90 分钟的等待）。----
if .venv/bin/python -m unittest discover -s tests -q >> "$LOGFILE" 2>&1; then
    echo "$(date '+%F %T') [test] 单元测试通过" >> "$LOGFILE"
else
    rc=$?
    echo "$(date '+%F %T') [test] 单元测试失败（exit $rc），中止 pipeline" >> "$LOGFILE"
    osascript -e "display notification \"单元测试失败（exit $rc），pipeline 中止\" with title \"艺术手册\" sound name \"Basso\"" 2>/dev/null
    exit 1
fi

# ---- Met 可达性探针（2026-08-25）：Met API 被 Imperva WAF 间歇封锁，
# 凌晨时段常全 403 → 生成期全 CMA。探针不通则等 30 分钟重试（最多 3 次），
# 全不通照跑（CMA 兜底，SPE §11 韧性）。----
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
for attempt in 1 2 3; do
  code=$(curl -m 15 -sS -A "$UA" -o /dev/null -w "%{http_code}" \
    "https://collectionapi.metmuseum.org/public/collection/v1/search?q=Madonna&departmentId=11&hasImages=true" 2>/dev/null)
  if [ "$code" = "200" ]; then
    [ "$attempt" -gt 1 ] && echo "$(date '+%F %T') [probe] Met 恢复（第 ${attempt} 次探针 200）" >> "$LOGFILE"
    break
  fi
  echo "$(date '+%F %T') [probe] Met 探针 $code，30 分钟后重试（$attempt/3）" >> "$LOGFILE"
  sleep 1800
done

{
    echo "===== $(date '+%F %T') artbook pipeline 开始 ====="
    .venv/bin/python pipeline/generate.py
    rc=$?
    echo "exit=$rc"
    if [ $rc -ne 0 ]; then
        osascript -e "display notification \"pipeline 失败（exit $rc），见 $LOGFILE\" with title \"艺术手册\" sound name \"Basso\"" 2>/dev/null
    fi
    echo "===== $(date '+%F %T') 结束 ====="
} >> "$LOGFILE" 2>&1
exit 0
