"""net.http_get_json 不再静默吞错测试（t_8279070b）。

背景：Met v1 搜索接口 2026-10-01 停用后持续返回 410，但旧实现的 curl 调用
没加 -f，410 的错误 JSON body 被当成正常响应 json.loads，取 objectIDs 字段
拿到空值——日志只显示 "0/50"，看不出到底是接口失效还是候选池恰好为空。
现在 http_get_json 对 4xx/5xx 用 curl -f 识别为失败、重试耗尽后显式打印
状态码/URL 再返回 None，不再有"看起来正常但其实是错误页"的中间状态。

用 httpbin.org/status/410 作真实网络请求（需要外网；CI 无网时跳过而非误判失败）。
运行：.venv/bin/python -m unittest tests.test_net -v
"""
import sys
import unittest
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from pipeline.net import http_get_json  # noqa: E402


def _net_available():
    try:
        urllib.request.urlopen("https://httpbin.org/status/200", timeout=5)
        return True
    except Exception:
        return False


@unittest.skipUnless(_net_available(), "需要外网访问 httpbin.org")
class TestHttpGetJsonErrorHandling(unittest.TestCase):
    def test_410_returns_none_not_fake_empty_success(self):
        """410（如 Met 退役接口）必须被识别为失败，不能被 json.loads 出一个
        看似合法的空结果——调用方靠 `(data or {}).get(...)` 区分"真的没数据"
        和"接口报错"，一旦错误页被解析成功，这两种情况就混在一起了。"""
        result = http_get_json("https://httpbin.org/status/410")
        self.assertIsNone(result)

    def test_404_returns_none(self):
        result = http_get_json("https://httpbin.org/status/404")
        self.assertIsNone(result)

    def test_200_still_parses_json_normally(self):
        result = http_get_json("https://httpbin.org/json")
        self.assertIsInstance(result, dict)


if __name__ == "__main__":
    unittest.main()
