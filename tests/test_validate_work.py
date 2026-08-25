"""validate_work / validate_issue 单元测试（t_866be207：杜绝空数据推送上线）。

运行：repo 根目录下 `.venv/bin/python -m unittest discover -s tests -v`
（validate.py 纯 stdlib，系统 python3 亦可直接运行本文件。）
"""
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from pipeline.validate import (  # noqa: E402
    OPTIONAL_STR_FIELDS,
    REQUIRED_STR_FIELDS,
    validate_issue,
    validate_work,
)

# 81 字基准句：无禁用词/句式、无破折号，切片可生成合规段落
CORE = ("塞耶以理想化的女性形象著称，是十九世纪末美国唯美主义的代表画家。"
        "这幅《赫柏》展示了他对古典神话主题的把握，人物姿态优雅，光影层次细腻，"
        "是理解其艺术风格的重要窗口。")


def _essay():
    # 每段 60-150 字、总长 250-450 字的合规赏析（280 字）
    return [CORE[:70], CORE[:72], CORE[:68], CORE[:70]]


def make_work(**overrides):
    w = {
        "id": "cma-98439",
        "source": "cma",
        "sourceId": "98439",
        "sourceUrl": "https://clevelandart.org/art/1918.172",
        "credit": "Cleveland Museum of Art, CC0",
        "title_en": "Hebe",
        "title_zh": "赫柏",
        "artist_en": "Abbott Handerson Thayer (American, 1849–1921)",
        "artist_zh": "阿博特·汉德森·塞耶",
        "artist_id": "abbott-handerson-thayer-american-1849-1921",
        "artist_nationality_zh": "美国",
        "artist_years": "1849–1921",
        "date_display": "c. 1890",
        "year": 1890,
        "medium_zh": "布面油画",
        "dimensions": "Unframed: 117 x 75 cm",
        "movement_zh": "唯美主义",
        "tags": ["肖像", "神话", "19世纪", "美国", "唯美主义"],
        "image": {
            "feed": "https://example.com/feed.jpg",
            "full": "https://example.com/full.jpg",
            "thumb": "https://example.com/thumb.jpg",
            "ratio": 1.537,
        },
        "palette": ["#342c24", "#857461"],
        "essay": _essay(),
        "detailCrop": {"cx": 0.46, "cy": 0.22, "r": 0.16},
    }
    w.update(overrides)
    return w


class TestValidateWork(unittest.TestCase):
    def test_valid_work_passes(self):
        self.assertEqual(validate_work(make_work()), [])

    def test_all_required_str_fields_non_empty(self):
        # 验收标准 1：必填字段不能为空（含纯空白）校验
        for k in REQUIRED_STR_FIELDS:
            for bad in ("", "   "):
                with self.subTest(field=k, value=repr(bad)):
                    errs = validate_work(make_work(**{k: bad}))
                    self.assertTrue(any(f"缺字段 {k}" in e for e in errs), errs)

    def test_missing_required_field(self):
        w = make_work()
        del w["title_zh"]
        errs = validate_work(w)
        self.assertTrue(any("缺字段 title_zh" in e for e in errs), errs)

    def test_work_not_object(self):
        self.assertIn("work 非对象", validate_work(None))

    def test_optional_str_fields_empty_ok(self):
        # 选填字段允许为空（前端有兜底：创作年代"不详"、实际尺寸行隐藏）
        for k in OPTIONAL_STR_FIELDS:
            with self.subTest(field=k):
                self.assertEqual(validate_work(make_work(**{k: ""})), [])

    def test_optional_str_fields_type_checked(self):
        for k in OPTIONAL_STR_FIELDS:
            with self.subTest(field=k):
                errs = validate_work(make_work(**{k: 123}))
                self.assertTrue(any(f"{k} 非字符串" in e for e in errs), errs)

    def test_year_null_ok_and_type_checked(self):
        self.assertEqual(validate_work(make_work(year=None)), [])
        errs = validate_work(make_work(year="1890"))
        self.assertTrue(any("year 非 int" in e for e in errs), errs)

    def test_tags_bounds_and_content(self):
        self.assertTrue(any("tags 数量越界" in e for e in validate_work(make_work(tags=["肖像"]))))
        self.assertTrue(any("tags 数量越界" in e
                            for e in validate_work(make_work(tags=[f"t{i}" for i in range(7)]))))
        self.assertTrue(any("tags 含空项" in e for e in validate_work(make_work(tags=["肖像", " "]))))
        self.assertTrue(any("tags 含空项" in e for e in validate_work(make_work(tags=["肖像", 3]))))

    def test_image_required(self):
        for k in ("feed", "full", "thumb"):
            with self.subTest(field=k):
                img = {**make_work()["image"], k: ""}
                errs = validate_work(make_work(image=img))
                self.assertTrue(any(f"image.{k} 缺失" in e for e in errs), errs)
        self.assertTrue(any("image 非对象" in e for e in validate_work(make_work(image=None))))
        self.assertTrue(any("ratio 非法" in e
                            for e in validate_work(make_work(image={**make_work()["image"], "ratio": 0.01}))))
        self.assertTrue(any("ratio 非法" in e
                            for e in validate_work(make_work(image={**make_work()["image"], "ratio": 99}))))

    def test_palette_required(self):
        for bad in (None, [], ["red"], ["#342c24", "zzz"]):
            with self.subTest(palette=bad):
                errs = validate_work(make_work(palette=bad))
                self.assertTrue(any("palette 缺失或非法" in e for e in errs), errs)

    def test_essay_structural(self):
        self.assertTrue(any("essay < 2 段" in e for e in validate_work(make_work(essay=[_essay()[0]]))))
        self.assertTrue(any("essay < 2 段" in e for e in validate_work(make_work(essay=None))))
        errs = validate_work(make_work(essay=[_essay()[0], "  "]))
        self.assertTrue(any("essay[1] 空段" in e for e in errs), errs)

    def test_essay_spec_paragraph_length(self):
        # 59 字段落 → 违规；60 字段落 → 合规
        errs = validate_work(make_work(essay=[CORE[:59], CORE[:70], CORE[:72], CORE[:70]]))
        self.assertTrue(any("第1段字数59" in e for e in errs), errs)
        self.assertEqual(validate_work(make_work(essay=[CORE[:60], CORE[:60], CORE[:65], CORE[:65]])), [])
        # 151 字段落 → 违规
        errs = validate_work(make_work(essay=[CORE[:76] + CORE[:75], CORE[:70], CORE[:70]]))
        self.assertTrue(any("第1段字数151" in e for e in errs), errs)

    def test_essay_spec_total_length(self):
        # 总长 250 合规；249 违规
        self.assertEqual(validate_work(make_work(essay=[CORE[:60], CORE[:60], CORE[:65], CORE[:65]])), [])
        errs = validate_work(make_work(essay=[CORE[:60], CORE[:60], CORE[:65], CORE[:64]]))
        self.assertTrue(any("总长249" in e for e in errs), errs)

    def test_essay_spec_banned_pattern_and_words(self):
        # 禁用句式「不仅…更…」
        errs = validate_work(make_work(essay=[CORE[:70], CORE[:72],
                                              "这幅画不仅展现了画家的技艺，更体现了时代的审美。"]))
        self.assertTrue(any("含禁用句式「不仅…更…」" in e for e in errs), errs)
        # 禁用词
        errs = validate_work(make_work(essay=[CORE[:70], CORE[:72],
                                              "这幅画令人叹为观止，笔法精妙绝伦。"]))
        self.assertTrue(any("含禁用词「叹为观止」" in e for e in errs), errs)

    def test_essay_spec_dash(self):
        errs = validate_work(make_work(essay=[CORE[:70], CORE[:72],
                                              "这一段有两个破折号——第一个——第二个，违规。"]))
        self.assertTrue(any("破折号2处" in e for e in errs), errs)

    def test_detail_crop(self):
        self.assertTrue(any("detailCrop 非对象" in e for e in validate_work(make_work(detailCrop=None))))
        self.assertTrue(any("detailCrop 非法" in e
                            for e in validate_work(make_work(detailCrop={"cx": 2, "cy": 0.5, "r": 0.2}))))
        self.assertTrue(any("detailCrop 非法" in e
                            for e in validate_work(make_work(detailCrop={"cx": 0.5, "cy": 0.5, "r": 0.5}))))
        self.assertTrue(any("detailCrop 非法" in e
                            for e in validate_work(make_work(detailCrop={"cx": "x", "cy": 0.5, "r": 0.2}))))

    def test_multiple_errors_reported(self):
        errs = validate_work(make_work(title_zh="", tags=["肖像"], palette=None))
        self.assertTrue(any("缺字段 title_zh" in e for e in errs), errs)
        self.assertTrue(any("tags 数量越界" in e for e in errs), errs)
        self.assertTrue(any("palette 缺失或非法" in e for e in errs), errs)


class TestValidateIssue(unittest.TestCase):
    def test_valid_issue_passes(self):
        issue = {"v": 1, "date": "2026-08-26", "works": [make_work()]}
        self.assertEqual(validate_issue(issue, "2026-08-26"), [])

    def test_invalid_work_fails_issue(self):
        # 验收标准 2：必填字段为空 → 整期拒绝提交
        issue = {"v": 1, "date": "2026-08-26", "works": [make_work(title_zh="")]}
        errs = validate_issue(issue, "2026-08-26")
        self.assertTrue(any("works[0]" in e and "缺字段 title_zh" in e for e in errs), errs)

    def test_empty_works_rejected(self):
        errs = validate_issue({"v": 1, "date": "2026-08-26", "works": []}, "2026-08-26")
        self.assertTrue(any("issue.works 为空" in e for e in errs), errs)

    def test_date_mismatch_rejected(self):
        issue = {"v": 1, "date": "2026-08-26", "works": [make_work()]}
        errs = validate_issue(issue, "2026-08-25")
        self.assertTrue(any("issue.date" in e for e in errs), errs)

    def test_v_mismatch_rejected(self):
        issue = {"v": 2, "date": "2026-08-26", "works": [make_work()]}
        errs = validate_issue(issue, "2026-08-26")
        self.assertTrue(any("issue.v 非 1" in e for e in errs), errs)


class TestPublishedData(unittest.TestCase):
    """真实已发布数据回归：必填字段从未为空（空数据未上线的既有事实）。"""

    def test_published_works_have_no_empty_required_fields(self):
        issues_dir = ROOT / "data" / "issues"
        checked = 0
        for p in sorted(issues_dir.glob("*.json")):
            for w in json.loads(p.read_text(encoding="utf-8"))["works"]:
                for k in REQUIRED_STR_FIELDS:
                    self.assertTrue(
                        isinstance(w.get(k), str) and w[k].strip(),
                        f"{p.name} {w.get('id')} 必填字段 {k} 为空",
                    )
                checked += 1
        self.assertGreater(checked, 100)  # 防数据目录被误清导致测试空转


if __name__ == "__main__":
    unittest.main()
