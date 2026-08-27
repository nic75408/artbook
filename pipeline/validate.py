"""发布闸门校验核心（t_866be207：杜绝空数据/待处理数据推送上线）。

设计：纯 stdlib、零外部依赖，可被 pipeline/generate.py（发布闸门）与
scripts/strict_check.py（体检）复用，也便于单元测试独立加载。
规则基准 = 前端渲染字段（feed/detail/collection）+ 赏析写作硬约束
（prompts/essay.md，与生成阶段 essay_violations 同一套规则）。

- REQUIRED_STR_FIELDS：前端无兜底直接渲染的字符串字段，空值即"空数据上线"
- OPTIONAL_STR_FIELDS：前端有优雅兜底的字符串字段（创作年代显示"不详"、
  实际尺寸行隐藏），仅类型校验，允许为空
- essay：按写作规范硬约束（60-150 字/段、总长 250-450、禁用词句式），
  生成阶段 3 轮重写仍违规的"待修"数据在此拦截，杜绝待处理数据上线
"""
import re

# --- 必填字符串字段：前端无兜底直接渲染（feed/详情/画册），空值即"空数据上线" ---
REQUIRED_STR_FIELDS = (
    "id", "source", "sourceId", "sourceUrl", "credit",
    "title_en", "title_zh", "artist_en", "artist_zh", "artist_id",
    "artist_nationality_zh", "artist_years", "medium_zh", "movement_zh",
)

# --- 选填字符串字段：前端有优雅兜底（创作年代"不详"、实际尺寸行隐藏） ---
OPTIONAL_STR_FIELDS = ("date_display", "dimensions")

# --- 有效的 region 类型（detailCrop.region） ---
VALID_REGIONS = {"face", "torso_neck", "clothing", "background", "whole_work"}

HEX_COLOR_RE = re.compile(r"#[0-9a-fA-F]{6}")

# --- 赏析硬约束（prompts/essay.md 第 1、3 条） ---
VIOLATION_PAIRS = (("不仅", "更"),)
VIOLATION_WORDS = ("叹为观止", "无与伦比", "淋漓尽致", "值得一提的是",
                   "见证了", "让我们", "细细品味")


def essay_violations(essay):
    """赏析硬约束检查（SPE §6.3-4 / prompts/essay.md）：
    每段 60-150 字、总长 250-450、破折号 ≤1、禁用句式与禁词。"""
    v = []
    total = 0
    for i, p in enumerate(essay, 1):
        n = len(p)
        total += n
        if not (60 <= n <= 150):
            v.append(f"第{i}段字数{n}（要求60-150）")
        if p.count("——") > 1:
            v.append(f"第{i}段破折号{p.count('——')}处")
        for a, b in VIOLATION_PAIRS:
            if a in p and b in p:
                v.append(f"第{i}段含禁用句式「{a}…{b}…」")
        for w_ in VIOLATION_WORDS:
            if w_ in p:
                v.append(f"第{i}段含禁用词「{w_}」")
    if not (250 <= total <= 450):
        v.append(f"总长{total}（要求250-450）")
    return v


def validate_work(w):
    """单幅作品校验。返回错误列表；空列表 = 通过（SPE §6.3-6 闸门）。

    杜绝空数据/待处理数据上线（t_866be207）：
    - 必填字符串字段 strip 后非空（空字段作品在闸门拦截，不进本期）
    - essay 按写作规范硬约束——生成阶段 3 轮重写仍违规的"待修"数据在此拦截
    - image / palette / detailCrop 子字段完整合法
    - 选填字段（date_display / dimensions / year）允许为空（前端有兜底），仅校验类型
    """
    errs = []
    if not isinstance(w, dict):
        return ["work 非对象"]
    for k in REQUIRED_STR_FIELDS:
        v = w.get(k)
        if not isinstance(v, str) or not v.strip():
            errs.append(f"缺字段 {k}")
    for k in OPTIONAL_STR_FIELDS:
        v = w.get(k)
        if v is not None and not isinstance(v, str):
            errs.append(f"{k} 非字符串")
    if w.get("year") is not None and not isinstance(w.get("year"), int):
        errs.append("year 非 int")
    tags = w.get("tags")
    if not (isinstance(tags, list) and 2 <= len(tags) <= 6):
        errs.append("tags 数量越界")
    elif any(not isinstance(t, str) or not t.strip() for t in tags):
        errs.append("tags 含空项")
    img = w.get("image")
    if not isinstance(img, dict):
        errs.append("image 非对象")
    else:
        for k in ("feed", "full", "thumb"):
            v = img.get(k)
            if not isinstance(v, str) or not v.strip():
                errs.append(f"image.{k} 缺失")
        if not (isinstance(img.get("ratio"), (int, float)) and 0.1 < img["ratio"] < 10):
            errs.append("ratio 非法")
    palette = w.get("palette")
    if not (isinstance(palette, list) and palette
            and all(isinstance(c, str) and HEX_COLOR_RE.fullmatch(c) for c in palette)):
        errs.append("palette 缺失或非法")
    essay = w.get("essay")
    if not (isinstance(essay, list) and len(essay) >= 2):
        errs.append("essay < 2 段")
        return errs
    para_bad = False
    for i, p in enumerate(essay):
        if not isinstance(p, str) or not p.strip():
            errs.append(f"essay[{i}] 空段")
            para_bad = True
    if not para_bad:
        errs.extend(essay_violations(essay))
    crop = w.get("detailCrop")
    if not isinstance(crop, dict):
        errs.append("detailCrop 非对象")
    else:
        try:
            cx, cy, r = float(crop["cx"]), float(crop["cy"]), float(crop["r"])
            if not (0 <= cx <= 1 and 0 <= cy <= 1 and 0.08 <= r <= 0.3):
                errs.append("detailCrop 非法")
            # 校验 region 字段
            region = crop.get("region")
            if region is not None and region not in VALID_REGIONS:
                errs.append(f"detailCrop.region 非法值: {region}")
        except Exception:
            errs.append("detailCrop 非法")
    return errs


def validate_issue(issue, date):
    """整期推送前校验：期结构 + 逐幅 validate_work（t_866be207 提交闸门）。

    返回错误列表；空列表 = 通过。任何一幅含空必填字段/待修数据即整期拒绝提交。
    """
    errs = []
    if not isinstance(issue, dict):
        return ["issue 非对象"]
    if issue.get("v") != 1:
        errs.append("issue.v 非 1")
    if issue.get("date") != date:
        errs.append(f"issue.date {issue.get('date')!r} != {date!r}")
    works = issue.get("works")
    if not isinstance(works, list) or not works:
        errs.append("issue.works 为空")
        return errs
    for i, w in enumerate(works):
        wid = w.get("id", "?") if isinstance(w, dict) else "?"
        for e in validate_work(w):
            errs.append(f"works[{i}] {wid}: {e}")
    return errs
