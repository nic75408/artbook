"""统一 HTTP 请求礼仪（SPE §6.2）：间隔限流、指数退避重试、超时。仅依赖 requests。
注意：文件名刻意避开 http.py——它会遮蔽 Python 标准库 http 包，导致 openai 内部 import 崩溃。

2026-08-18：UA 改为浏览器 UA——Met API 被 Imperva WAF 保护，
对自定义 UA（artbook-pipeline/1.0）返回 403，浏览器 UA 直接放行（已验证 200）。
"""
import os
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

    2026-11-27（t_8279070b）：原实现没给 curl 加 -f，4xx/5xx 响应体（如 Met
    410 的错误 JSON）会被 curl 当成"成功"的 stdout 原样 json.loads 解析，
    取 objectIDs 等字段时静默取到空值——日志只显示"0/50"，看不出到底是
    接口失效还是候选池恰好为空。现在用 -f 让 curl 对 4xx/5xx 直接返回码
    失败（不再把错误页当正常 JSON 解析），用 -o/-w 把响应体和状态码分开
    写（避免响应体本身含换行时和 stdout 其他内容混在一起解析错位），
    重试耗尽后显式打印状态码和 URL，不再悄悄返回 None 了事。
    """
    import subprocess
    import json
    import tempfile
    from pathlib import Path

    timeout = timeout or config.HTTP_TIMEOUT

    # 构建 URL（带 params）
    if params:
        from urllib.parse import urlencode
        sep = '&' if '?' in url else '?'
        url = f"{url}{sep}{urlencode(params)}"

    last_err = None
    for attempt in range(config.RETRY_TIMES):
        _throttle()
        tf = tempfile.NamedTemporaryFile(delete=False)
        tf.close()
        try:
            result = subprocess.run(
                ['curl', '-m', str(timeout), '-sS', '-f',
                 '-o', tf.name, '-w', '%{http_code}',
                 '-A', _UA, url],
                capture_output=True,
                text=True,
                timeout=timeout + 5
            )
            if result.returncode == 0:
                return json.loads(Path(tf.name).read_text(encoding="utf-8"))
            # curl -f：4xx/5xx 返回码 22；其余网络层错误另有返回码。
            # 两种都不是"正常的空结果"，记录状态码/stderr，重试。
            http_code = (result.stdout or "").strip()
            last_err = (f"curl exit={result.returncode} http_code={http_code!r} "
                        f"stderr={(result.stderr or '').strip()!r} url={url}")
            time.sleep(2 ** attempt)
        except Exception as e:
            last_err = f"{type(e).__name__}: {e} url={url}"
            time.sleep(2 ** attempt)
        finally:
            try:
                os.unlink(tf.name)
            except OSError:
                pass
    print(f"[net] http_get_json 失败（重试 {config.RETRY_TIMES} 次后放弃）：{last_err}", flush=True)
    return None


def http_head_ok(url, retries=3):
    """图片 URL 存活校验（SPE §6.3-6）。

    2026-09-08：CMA CDN 对 Python requests 库 SSL 握手失败，改用 subprocess 调用 curl 绕过。
    """
    import subprocess

    for attempt in range(retries):
        try:
            # 用 curl 发送 HEAD 请求（绕过 Python SSL 问题）
            result = subprocess.run(
                ['curl', '-m', '15', '-sS', '-I', '-A', _UA, url],
                capture_output=True,
                text=True,
                timeout=20
            )
            if result.returncode == 0:
                # 检查响应头中是否有 200 OK
                first_line = result.stdout.split('\n')[0] if result.stdout else ''
                if '200' in first_line or 'OK' in first_line:
                    return True
            # 失败重试
            time.sleep(1 + attempt)
        except Exception:
            time.sleep(1 + attempt)
    return False
