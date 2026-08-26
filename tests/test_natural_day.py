"""自然日锚定单元测试（t_8d5cb3c8：数据更新机制自然日优化）。

parse_issue_date 由 generate.py 在每次运行入口调用：把 --date 或今日
（Asia/Shanghai）归一化为合法的 YYYY-MM-DD 期日，拒绝格式非法与伪日历日期。
坏期日若写入 data/issues/ 会污染 index.json 排序与前端日期渲染，必须在入口拦住。

运行：repo 根目录下 `.venv/bin/python -m unittest discover -s tests -v`
"""
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from pipeline import generate  # noqa: E402


class TestParseIssueDate(unittest.TestCase):
    def test_valid_date_passes_through(self):
        self.assertEqual(generate.parse_issue_date("2026-08-26"), "2026-08-26")

    def test_surrounding_whitespace_stripped(self):
        self.assertEqual(generate.parse_issue_date("  2026-08-26\n"), "2026-08-26")

    def test_invalid_formats_rejected(self):
        bad = [
            "2026-8-26",       # 月/日未补零
            "20260826",        # 无连字符
            "2026-08-26T00:00:00",
            "2026-08-26-extra",
            "2026/08/26",
            "",
            "   ",
            "今天",
            "2026-08",
        ]
        for s in bad:
            with self.subTest(value=repr(s)):
                with self.assertRaises(ValueError):
                    generate.parse_issue_date(s)

    def test_fake_calendar_dates_rejected(self):
        # 正则能过、但不是真实日历日期 → 必须拒绝，防止坏期号进 data/issues/
        bad = ["2026-02-30", "2026-13-01", "2026-00-10", "2026-04-31", "0000-01-01"]
        for s in bad:
            with self.subTest(value=s):
                with self.assertRaises(ValueError):
                    generate.parse_issue_date(s)

    def test_non_string_rejected(self):
        for v in (None, 20260826, 2026.0, ["2026-08-26"]):
            with self.subTest(value=repr(v)):
                with self.assertRaises(ValueError):
                    generate.parse_issue_date(v)

    def test_today_str_is_parseable(self):
        # 缺省路径（today_str 产出）必须能被 parse_issue_date 接受
        self.assertEqual(generate.parse_issue_date(generate.today_str()),
                         generate.today_str())


class TestMainRejectsBadDate(unittest.TestCase):
    def test_main_exits_nonzero_on_invalid_date(self):
        # 非法 --date 必须在入口（校验 API key / 联网之前）直接失败，
        # 且不写任何文件
        real_argv = sys.argv
        try:
            sys.argv = ["generate.py", "--date", "2026-02-30"]
            self.assertEqual(generate.main(), 1)
        finally:
            sys.argv = real_argv


if __name__ == "__main__":
    unittest.main()
