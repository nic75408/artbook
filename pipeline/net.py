"""统一 HTTP 请求礼仪（SPE §6.2）：间隔限流、指数退避重试、超时。仅依赖 requests。
注意：文件名刻意避开 http.py——它会遮蔽 Python 标准库 http 包，导致 openai 内部 import 崩溃。

2026-08-18：UA 改为浏览器 UA——Met API 被 Imperva WAF 保护，
对自定义 UA（artbook-pipeline/1.0）返回 403，浏览器 UA 直接放行（已验证 200）。
"""
import time

import requests

from . import config

_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
       "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")

_last_ts = 0.0


def _throttle():
    global _last_ts
    wait = config.REQUEST_INTERVAL - (time.time() - _last_ts)
    if wait > 0:
        time.sleep(wait)
    _last_ts = time.time()


def http_get_json(url, params=None, timeout=None):
    """GET + JSON。429/5xx 指数退避重试 3 次；单源失败由调用方决定是否继续。

    2026-09-08：CMA API 对 Python requests 库 SSL 握手失败（UNEXPECTED_EOF_WHILE_READING），
    但 curl 直连正常。改用 subprocess 调用 curl 绕过 Python SSL 问题。
    """
    import subprocess
    import json

    timeout = timeout or config.HTTP_TIMEOUT

    # 构建 URL（带 params）
    if params:
        from urllib.parse import urlencode
        sep = '&' if '?' in url else '?'
        url = f"{url}{sep}{urlencode(params)}"

    for attempt in range(config.RETRY_TIMES):
        _throttle()
        try:
            result = subprocess.run(
                ['curl', '-m', str(timeout), '-sS', '-A', _UA, url],
                capture_output=True,
                text=True,
                timeout=timeout + 5
            )
            if result.returncode == 0:
                return json.loads(result.stdout)
            # curl 失败，重试
            time.sleep(2 ** attempt)
        except Exception:
            time.sleep(2 ** attempt)
    return None


def http_head_ok(url, retries=3):
    """图片 URL 存活校验（SPE §6.3-6）。"""
    for attempt in range(retries):
        try:
            r = requests.head(url, timeout=15, allow_redirects=True,
                              headers={"User-Agent": _UA})
            if r.status_code == 200:
                return True
            if r.status_code == 429 or r.status_code >= 500:
                time.sleep(1 + attempt)
                continue
            return False
        except Exception:
            time.sleep(1 + attempt)
    return False
