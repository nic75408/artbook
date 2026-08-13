#!/usr/bin/env python3
"""艺术手册内容 pipeline 入口（SPE §6.3）。

CLI:
  python pipeline/generate.py [--date YYYY-MM-DD] [--dry-run] [--force]
- --date    缺省今天（Asia/Shanghai）
- --dry-run 完整执行但不写文件、不 commit，最终一期 JSON 输出到 stdout
- --force   日期已存在时覆盖重生成
幂等：期文件已存在且无 --force 时直接退出 0。
"""
import argparse
import json
import re
import subprocess
import sys
import unicodedata
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from pipeline import config, llm  # noqa: E402
from pipeline.net import http_head_ok  # noqa: E402
from pipeline.palette import extract_palette  # noqa: E402
from pipeline.sources import met, aic, cma, rijks  # noqa: E402

TZ = ZoneInfo("Asia/Shanghai")

CREDITS = {
    "met": "The Metropolitan Museum of Art, Open Access (CC0)",
    "aic": "Art Institute of Chicago, CC0 Public Domain Designation",
    "cma": "Cleveland Museum of Art, CC0",
    "rijks": "Rijksmuseum, Public Domain",
}

ESSAY_SCHEMA = {
    "title_zh": str,
    "artist_zh": str,
    "artist_nationality_zh": str,
    "artist_years": str,
    "medium_zh": str,
    "movement_zh": str,
    "tags": list,
    "essay": list,
    "detailCrop": dict,
    "bio_zh": {"type": str, "required": False},
}

CURATE_SCHEMA = {"ids": list, "tags": dict}

DEFAULT_CROP = {"cx": 0.5, "cy": 0.4, "r": 0.18}


def log(msg):
    print(f"[{datetime.now(TZ).strftime('%H:%M:%S')}] {msg}", flush=True)


def slugify(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return s or "unknown"


def load_json(path, default):
    p = Path(path)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return default
    return default


def today_str():
    return datetime.now(TZ).strftime("%Y-%m-%d")


def extract_year(date_display):
    if not date_display:
        return None
    nums = [int(x) for x in re.findall(r"\d{3,4}", date_display) if 800 <= int(x) <= 2100]
    if not nums:
        return None
    if len(nums) == 1:
        return nums[0]
    return (min(nums) + max(nums)) // 2


def is_painting(classification):
    cls = (classification or "").lower()
    return any(k in cls for k in config.PAINTING_CLASSES)


# ---------------------------------------------------------------- 候选

def fetch_candidates():
    """各源按配额拉候选；不足/失败由其余源补足到 CANDIDATE_TARGET。"""
    sources = (("met", met), ("aic", aic), ("cma", cma), ("rijks", rijks))
    out = []
    for name, mod in sources:
        n = config.SOURCE_QUOTA.get(name, 0)
        if n <= 0:
            continue
        try:
            got = mod.fetch_candidates(n)
        except Exception as e:
            log(f"[source] {name} 异常: {e}")
            got = []
        out.extend(got)
        log(f"[source] {name}: {len(got)}/{n}")
    # 补足轮
    if len(out) < config.CANDIDATE_TARGET:
        for name, mod in sources:
            if name == "rijks" and not config.RIJKS_API_KEY:
                continue
            if len(out) >= config.CANDIDATE_TARGET:
                break
            try:
                extra = mod.fetch_candidates(30)
            except Exception:
                extra = []
            out.extend(extra)
            log(f"[source] {name} 补足: +{len(extra)}")
            if len(out) >= config.CANDIDATE_TARGET:
                break
    return out


def dedupe(candidates, seen):
    """剔除 seen.json 已有 id；同一 artist 候选池内最多保留 MAX_PER_ARTIST_POOL 幅。"""
    by_artist = {}
    out = []
    for c in candidates:
        cid = f"{c.source}-{c.sourceId}"
        if cid in seen:
            continue
        key = slugify(c.artist_en)
        if by_artist.get(key, 0) >= config.MAX_PER_ARTIST_POOL:
            continue
        by_artist[key] = by_artist.get(key, 0) + 1
        out.append(c)
    return out


# ---------------------------------------------------------------- 选品

def curate(candidates):
    system = (config.PIPELINE_DIR / "prompts" / "curate.md").read_text(encoding="utf-8")
    brief = [{
        "id": f"{c.source}-{c.sourceId}",
        "title": c.title_en,
        "artist": c.artist_en,
        "date": c.date_display,
        "classification": c.classification,
        "highlight": c.is_highlight,
    } for c in candidates]
    user = "候选清单：\n" + json.dumps(brief, ensure_ascii=False)
    obj, _ = llm.chat(
        [{"role": "system", "content": system}, {"role": "user", "content": user}],
        json_mode=True, schema=CURATE_SCHEMA, temperature=0.4)
    return obj


def finalize_selection(curated, by_id):
    """归一化 LLM 选品结果：合法化 id、去重、期内同画家 ≤2、绘画占比 ≥70%、补齐到 30。"""
    ids = []
    for i in (curated or {}).get("ids", []):
        if isinstance(i, str) and i in by_id and i not in ids:
            ids.append(i)
    artist_count = {}
    sel = []

    def admit(i):
        a = slugify(by_id[i].artist_en)
        if artist_count.get(a, 0) >= config.MAX_PER_ARTIST_ISSUE:
            return False
        artist_count[a] = artist_count.get(a, 0) + 1
        sel.append(i)
        return True

    for i in ids:
        admit(i)

    # 绘画占比兜底：不足则从选品未中的候选里补绘画类
    need_paint = int(config.WORKS_PER_ISSUE * config.PAINTING_RATIO)
    if sum(1 for i in sel if is_painting(by_id[i].classification)) < need_paint:
        for i in ids + [i for i in by_id if i not in ids]:
            if i in sel or not is_painting(by_id[i].classification):
                continue
            if sum(1 for j in sel if is_painting(by_id[j].classification)) >= need_paint:
                break
            admit(i)

    # 补齐到 30
    pool = [i for i in ids if i not in sel] + [i for i in by_id if i not in sel and i not in ids]
    for i in pool:
        if len(sel) >= config.WORKS_PER_ISSUE:
            break
        admit(i)

    tags_hint = (curated or {}).get("tags", {}) or {}
    return sel, tags_hint


# ---------------------------------------------------------------- 逐幅生成

def generate_work(c, tags_hint, need_bio):
    system = (config.PIPELINE_DIR / "prompts" / "essay.md").read_text(encoding="utf-8")
    meta = {
        "title_en": c.title_en,
        "artist_en": c.artist_en,
        "date_display": c.date_display,
        "medium": c.medium,
        "dimensions": c.dimensions,
        "classification": c.classification,
        "source": c.source,
        "curated_tags": tags_hint or [],
    }
    user = "作品元数据：" + json.dumps(meta, ensure_ascii=False) + "\n" + (
        "artists.json 中尚无该画家档案，请生成 bio_zh。"
        if need_bio else
        "该画家已有档案，bio_zh 请输出空字符串。")
    msg = llm.vision_msg(user, c.image_feed)
    obj, _ = llm.chat([{"role": "system", "content": system}, msg],
                      json_mode=True, schema=ESSAY_SCHEMA, temperature=0.7)
    return obj


def clean_tags(tags, year=None):
    out = []
    for t in (tags or []):
        if isinstance(t, str) and t.strip() and t.strip() not in out:
            out.append(t.strip())
    if len(out) < 2 and year:
        out.append(f"{year // 100}世纪")
    return out[:6] or ["名作"]


def clean_crop(crop):
    try:
        cx, cy, r = float(crop["cx"]), float(crop["cy"]), float(crop["r"])
        if 0 <= cx <= 1 and 0 <= cy <= 1 and 0.08 <= r <= 0.3:
            return {"cx": round(cx, 2), "cy": round(cy, 2), "r": round(r, 2)}
    except Exception:
        pass
    return dict(DEFAULT_CROP)


def build_work(c, g, ratio, palette):
    year = extract_year(c.date_display)
    artist_id = slugify(c.artist_en)
    w = {
        "id": f"{c.source}-{c.sourceId}",
        "source": c.source,
        "sourceId": c.sourceId,
        "sourceUrl": c.source_url,
        "credit": CREDITS.get(c.source, ""),
        "title_en": c.title_en,
        "title_zh": (g or {}).get("title_zh") or c.title_en,
        "artist_en": c.artist_en,
        "artist_zh": (g or {}).get("artist_zh") or c.artist_en,
        "artist_id": artist_id,
        "artist_nationality_zh": (g or {}).get("artist_nationality_zh") or "不详",
        "artist_years": (g or {}).get("artist_years") or "不详",
        "date_display": c.date_display or "",
        "year": year,
        "medium_zh": (g or {}).get("medium_zh") or c.medium or "",
        "dimensions": c.dimensions or "",
        "movement_zh": (g or {}).get("movement_zh") or "不详",
        "tags": clean_tags((g or {}).get("tags"), year),
        "image": {
            "feed": c.image_feed,
            "full": c.image_full,
            "thumb": c.image_thumb,
            "ratio": round(ratio, 3) if ratio else 1.0,
        },
        "palette": palette,
        "essay": (g or {}).get("essay") or [],
        "detailCrop": clean_crop((g or {}).get("detailCrop")),
    }
    bio = (g or {}).get("bio_zh") or ""
    return w, bio


def validate_work(w):
    """返回错误列表；空列表 = 通过（SPE §6.3-6 闸门）。"""
    errs = []
    need_str = ["id", "source", "sourceId", "sourceUrl", "credit", "title_en", "title_zh",
                "artist_en", "artist_zh", "artist_id", "date_display", "medium_zh",
                "movement_zh"]
    for k in need_str:
        if not w.get(k):
            errs.append(f"缺字段 {k}")
    if w.get("year") is not None and not isinstance(w.get("year"), int):
        errs.append("year 非 int")
    if not (isinstance(w.get("tags"), list) and 2 <= len(w["tags"]) <= 6):
        errs.append("tags 数量越界")
    img = w.get("image") or {}
    for k in ("feed", "full", "thumb"):
        if not img.get(k):
            errs.append(f"image.{k} 缺失")
    if not (isinstance(img.get("ratio"), (int, float)) and 0.1 < img["ratio"] < 10):
        errs.append("ratio 非法")
    essay = w.get("essay")
    if not (isinstance(essay, list) and len(essay) >= 2):
        errs.append("essay < 2 段")
        return errs
    for i, p in enumerate(essay):
        if not isinstance(p, str) or len(p.strip()) < 30:
            errs.append(f"essay[{i}] 过短")
    total = sum(len(p) for p in essay)
    if total > 700:
        errs.append("essay 总长超标")
    crop = w.get("detailCrop") or {}
    if not (0 <= crop.get("cx", -1) <= 1 and 0 <= crop.get("cy", -1) <= 1
            and 0.08 <= crop.get("r", -1) <= 0.3):
        errs.append("detailCrop 非法")
    return errs


# ---------------------------------------------------------------- 落盘

def merge_catalog(works, date):
    path = config.DATA / "catalog.json"
    cat = load_json(path, {"v": 1, "works": []})
    known = {w["id"] for w in cat.get("works", [])}
    for w in works:
        if w["id"] in known:
            continue
        known.add(w["id"])
        cat.setdefault("works", []).append({
            "id": w["id"], "issue": date, "t": w["title_zh"], "a": w["artist_zh"],
            "aid": w["artist_id"], "y": w["year"], "mv": w["movement_zh"],
            "tags": w["tags"], "th": w["image"]["thumb"], "ratio": w["image"]["ratio"],
        })
    path.write_text(json.dumps(cat, ensure_ascii=False, indent=2), encoding="utf-8")


def merge_index(date):
    path = config.DATA / "index.json"
    idx = load_json(path, {"v": 1, "latest": date, "issues": []})
    issues = [i for i in idx.get("issues", []) if i != date]
    issues.append(date)
    issues.sort(reverse=True)
    idx["v"] = 1
    idx["issues"] = issues
    idx["latest"] = issues[0]
    path.write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")


def merge_artists(artists_new):
    path = config.DATA / "artists.json"
    artists = load_json(path, {"v": 1, "artists": {}})
    existing = artists.setdefault("artists", {})
    for aid, info in artists_new.items():
        if aid not in existing:
            existing[aid] = info
    path.write_text(json.dumps(artists, ensure_ascii=False, indent=2), encoding="utf-8")


def merge_seen(works, date):
    path = config.PIPELINE_DIR / "seen.json"
    seen = load_json(path, {"v": 1, "seen": {}})
    for w in works:
        seen.setdefault("seen", {})[w["id"]] = date
    seen["v"] = 1
    path.write_text(json.dumps(seen, ensure_ascii=False, indent=2), encoding="utf-8")


# ---------------------------------------------------------------- 主流程

def main():
    ap = argparse.ArgumentParser(description="艺术手册内容 pipeline")
    ap.add_argument("--date", default=None, help="YYYY-MM-DD，缺省今天（Asia/Shanghai）")
    ap.add_argument("--dry-run", action="store_true", help="完整执行但不写文件、不 commit")
    ap.add_argument("--force", action="store_true", help="日期已存在时覆盖重生成")
    args = ap.parse_args()

    date = args.date or today_str()
    issue_path = config.ISSUES / f"{date}.json"
    if issue_path.exists() and not args.force:
        log(f"[skip] {date} 已存在（--force 覆盖），幂等退出")
        return 0
    if not config.LLM_API_KEY:
        log("[fatal] LLM_API_KEY 未配置")
        return 1

    seen = load_json(config.PIPELINE_DIR / "seen.json", {"v": 1, "seen": {}}).get("seen", {})
    artists = load_json(config.DATA / "artists.json", {"v": 1, "artists": {}}).get("artists", {})

    log("1/8 拉取候选")
    cands = fetch_candidates()
    log(f"候选总数 {len(cands)}")
    cands = dedupe(cands, seen)
    log(f"去重后 {len(cands)}")
    if len(cands) < config.WORKS_PER_ISSUE:
        log(f"[fatal] 候选不足 30（{len(cands)}）")
        return 1

    log("2/8 LLM 选品")
    curated = curate(cands)
    by_id = {f"{c.source}-{c.sourceId}": c for c in cands}
    sel, tags_hint = finalize_selection(curated, by_id)
    log(f"选中 {len(sel)} 幅（绘画类 {sum(1 for i in sel if is_painting(by_id[i].classification))}）")

    log("3/8 逐幅生成（带图调用，耗时较长）")
    artists_new = dict(artists)
    backup_pool = [i for i in by_id if i not in sel]
    works = []
    for idx, i in enumerate(sel, 1):
        c = by_id[i]
        g = generate_work(c, tags_hint.get(i), slugify(c.artist_en) not in artists_new)
        if not g or not g.get("essay"):
            # 递补：从选品未中的候选按序替补
            replaced = False
            for j in list(backup_pool):
                if j in sel:
                    continue
                c2 = by_id[j]
                g2 = generate_work(c2, tags_hint.get(j), slugify(c2.artist_en) not in artists_new)
                if g2 and g2.get("essay"):
                    backup_pool.remove(j)
                    c, g, i = c2, g2, j
                    replaced = True
                    log(f"[replace] {idx} 幅递补 {j}")
                    break
            if not replaced:
                log(f"[fail] {i} 生成失败且无可用递补，跳过")
                continue
        try:
            ratio, palette = extract_palette(c.image_feed)
        except Exception as e:
            ratio, palette = 1.0, None
            log(f"[palette] {i} 异常: {e}")
        w, bio = build_work(c, g, ratio, palette)
        if bio:
            artists_new[slugify(c.artist_en)] = {
                "name_zh": w["artist_zh"], "name_en": c.artist_en,
                "years": w["artist_years"], "nationality_zh": w["artist_nationality_zh"],
                "bio_zh": bio,
            }
        works.append(w)
        log(f"  {len(works)}/{len(sel)} {w['id']} {w['title_zh']}")

    log("4/8 发布闸门校验")
    valid = []
    for w in works:
        errs = validate_work(w)
        if errs:
            log(f"[gate] {w['id']} 不过: {errs}")
            continue
        if w["id"] in seen:
            log(f"[gate] {w['id']} 已在 seen 账本")
            continue
        if not http_head_ok(w["image"]["feed"]):
            log(f"[gate] {w['id']} 图片 URL HEAD 失败")
            continue
        valid.append(w)

    n = len(valid)
    if n < config.MIN_WORKS:
        log(f"[fatal] 仅 {n} 幅（<{config.MIN_WORKS}），整期失败")
        return 1
    if n < config.WORKS_PER_ISSUE:
        log(f"[gate] WARN: {n} 幅（{config.MIN_WORKS}-29），照常发布")
    paint_n = sum(1 for w in valid if is_painting(next(
        (c.classification for c in cands if f"{c.source}-{c.sourceId}" == w["id"]), "")))
    log(f"[gate] 通过 {n} 幅，绘画类 {paint_n}（{paint_n / max(n, 1):.0%}）")
    if paint_n / max(n, 1) < config.PAINTING_RATIO:
        log(f"[gate] WARN: 绘画占比低于 {config.PAINTING_RATIO:.0%}")

    issue = {"v": 1, "date": date, "works": valid}

    if args.dry_run:
        log("[dry-run] 不写任何文件")
        print(json.dumps(issue, ensure_ascii=False, indent=2))
        return 0

    log("5/8 落盘（issue + catalog/artists/index/seen 增量合并）")
    config.ISSUES.mkdir(parents=True, exist_ok=True)
    config.DATA.mkdir(parents=True, exist_ok=True)
    issue_path.write_text(json.dumps(issue, ensure_ascii=False, indent=2), encoding="utf-8")
    merge_catalog(valid, date)
    merge_index(date)
    merge_artists(artists_new)
    merge_seen(valid, date)

    log("6/8 commit + push")
    try:
        subprocess.run(["git", "add", "data", "pipeline/seen.json"], cwd=ROOT, check=True)
        subprocess.run(["git", "commit", "-m", f"issue: {date}"], cwd=ROOT, check=True)
        subprocess.run(["git", "push"], cwd=ROOT, check=True)
    except Exception as e:
        log(f"[git] 提交/推送失败: {e}")
        return 1

    log(f"done: {date} 共 {n} 幅")
    return 0


if __name__ == "__main__":
    sys.exit(main())
