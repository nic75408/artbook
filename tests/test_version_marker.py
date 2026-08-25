"""版本探针标记单元测试（t_3342ced5：老用户自动加载最新版本）。

write_version 由 pipeline 在每次成功生成/推送时调用；前端加载后以
no-cache 拉取 version.json 比对，值变化即触发后台数据缓存刷新。

运行：repo 根目录下 `.venv/bin/python -m unittest discover -s tests -v`
"""
import datetime
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from pipeline import generate  # noqa: E402


class TestVersionMarker(unittest.TestCase):
    def setUp(self):
        self.path = ROOT / "version.json"
        self.original = self.path.read_text(encoding="utf-8") if self.path.exists() else None

    def tearDown(self):
        if self.original is not None:
            self.path.write_text(self.original, encoding="utf-8")
        elif self.path.exists():
            self.path.unlink()

    def test_write_version_creates_probe_parseable_json(self):
        generate.write_version("2026-08-25")
        self.assertTrue(self.path.exists())
        data = json.loads(self.path.read_text(encoding="utf-8"))
        self.assertIn("version", data)
        self.assertRegex(data["version"], r"^\d{14}$")   # YYYYMMDDHHMMSS
        self.assertEqual(data["latest"], "2026-08-25")

    def test_write_version_changes_value_over_time(self):
        # 两次调用（不同时刻）必须产出不同 version → 前端探针才能识别数据更新
        real_datetime = generate.datetime
        try:
            class FakeDateTime(datetime.datetime):
                stamp = "20260825120000"

                @classmethod
                def now(cls, tz=None):
                    return cls.strptime(cls.stamp, "%Y%m%d%H%M%S")

            generate.datetime = FakeDateTime
            generate.write_version("2026-08-25")
            first = json.loads(self.path.read_text(encoding="utf-8"))["version"]

            FakeDateTime.stamp = "20260826130000"
            generate.write_version("2026-08-26")
            second = json.loads(self.path.read_text(encoding="utf-8"))["version"]
            self.assertNotEqual(first, second)
        finally:
            generate.datetime = real_datetime


if __name__ == "__main__":
    unittest.main()
