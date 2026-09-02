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
import os
import re
import subprocess
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from pipeline import config, llm  # noqa: E402
from pipeline.net import http_head_ok  # noqa: E402
from pipeline.palette import extract_palette  # noqa: E402
from pipeline.sources import met, aic, cma, rijks  # noqa: E402
from pipeline.validate import (essay_violations, validate_issue,  # noqa: E402
                               validate_work)

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

# 有效的 region 类型
VALID_REGIONS = {"face", "torso_neck", "clothing", "background", "whole_work"}

CURATE_SCHEMA = {"ids": list, "tags": dict}

DEFAULT_CROP = {"cx": 0.5, "cy": 0.4, "r": 0.18, "region": "whole_work"}


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


def parse_issue_date(s):
    """校验并归一化期日（自然日锚定，SPE §5：一律 YYYY-MM-DD，时区 Asia/Shanghai）。

    返回规范化字符串；非法输入抛 ValueError。拒绝格式非法（如 2026-8-26、
    20260826、空串）与伪日历日期（如 2026-02-30、2026-13-01）——坏期日若
    写入 data/issues/ 会污染 index.json 排序与前端日期渲染，必须在入口拦住。
    """
    if not isinstance(s, str):
        raise ValueError(f"期日必须为字符串，收到 {type(s).__name__}")
    s = s.strip()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s):
        raise ValueError(f"期日格式非法（须 YYYY-MM-DD）：{s!r}")
    try:
        dt = datetime.strptime(s, "%Y-%m-%d")
    except ValueError:
        raise ValueError(f"期日不是真实日历日期：{s!r}")
    return dt.strftime("%Y-%m-%d")


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

# NOTE (t_d1c4f621): Originally `fetch_candidates` required a positional
# `seen` argument. Some external scripts/tests (e.g.
# `scripts/test_source_resilience.py`) still import and call it *without*
# providing this parameter, leading to a TypeError during test collection.
#
# To maintain backward-compatibility, make `seen` optional with a default of
# `None`. Internal pipeline calls continue to pass an explicit set, while
# ad-hoc scripts can omit it safely.

def fetch_candidates(seen=None):
    """各源按配额拉候选（源内部跳过 seen 已见 id）；不足/失败由其余源补足到 CANDIDATE_TARGET。"""
    sources = (("met", met), ("aic", aic), ("cma", cma), ("rijks", rijks))
    out = []
    for name, mod in sources:
        n = config.SOURCE_QUOTA.get(name, 0)
        if n <= 0:
            continue
        try:
            got = mod.fetch_candidates(n, seen)
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
                extra = mod.fetch_candidates(30, seen)
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

# 赏析硬约束自动检查（SPE §6.3-4）：违规 → 带错误重问一轮。
# essay_violations 已抽到 pipeline/validate.py（发布闸门同规则，纯 stdlib 便于测试/体检复用）。

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
    base_msgs = [{"role": "system", "content": system}, msg]
    obj, raw = llm.chat(base_msgs, json_mode=True, schema=ESSAY_SCHEMA, temperature=0.7)
    if obj and obj.get("essay"):
        for attempt in range(3):
            v = essay_violations(obj["essay"])
            if not v:
                break
            log(f"[rewrite] 赏析违规（{'；'.join(v)}），重写第 {attempt + 1} 轮")
            obj2, raw2 = llm.chat(
                base_msgs + [
                    {"role": "assistant", "content": raw},
                    {"role": "user", "content":
                     f"你的赏析仍违反硬约束：{'；'.join(v)}。请逐条对照写作规范第 1、3 条重写 essay（其余字段保持），这次必须完全合规。"},
                ],
                json_mode=True, schema=ESSAY_SCHEMA, temperature=0.7)
            if obj2 and obj2.get("essay"):
                obj, raw = obj2, raw2
        # 循环结束后显式复检：第 3 轮重写成功会走 for-else 造成假 warn，这里修正
        left = essay_violations(obj["essay"])
        if left:
            log(f"[warn] 3 轮重写后赏析仍违规（{'；'.join(left)}），发布闸门将拦截此幅")
    return obj


def clean_tags(tags, year=None):
    out = []
    for t in (tags or []):
        if isinstance(t, str):
            t = re.sub(r"\s+", "", t).strip()   # 归一化（如 "19 世纪" → "19世纪"）
            if t and t not in out:
                out.append(t)
    if len(out) < 2 and year:
        out.append(f"{year // 100}世纪")
    return out[:6] or ["名作"]


def clean_crop(crop):
    """清洗并验证 crop 数据，包括区域类型（region）。"""
    try:
        cx, cy, r = float(crop["cx"]), float(crop["cy"]), float(crop["r"])
        if 0 <= cx <= 1 and 0 <= cy <= 1 and 0.08 <= r <= 0.3:
            result = {"cx": round(cx, 2), "cy": round(cy, 2), "r": round(r, 2)}
            # 处理 region 字段
            region = crop.get("region", "whole_work")
            if region not in VALID_REGIONS:
                region = "whole_work"
            result["region"] = region
            return result
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


def write_version(latest=None):
    """版本探针标记（t_3342ced5）：每次成功生成/推送时写入。

    前端加载后以 no-cache 拉取 version.json 比对；值变化即数据已更新，
    在后台刷新数据缓存。latest 附带最新期号便于人工核对。
    """
    stamp = datetime.now(TZ).strftime("%Y%m%d%H%M%S")
    payload = {"version": stamp, "latest": latest or today_str()}
    (ROOT / "version.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


# ---------------------------------------------------------------- 逐幅生成

def generate_works(sel, by_id, tags_hint, artists):
    """并行逐幅生成（PIPELINE_THREADS 可调，默认 3）+ 失败递补。

    返回 (works, artists, fail_n)；works 顺序 = sel 顺序（递补占原位置）。
    """
    artists_new = dict(artists)
    backup_pool = [i for i in by_id if i not in sel]
    works = []
    fails = 0

    def gen_one(idx_i):
        idx, i = idx_i
        c = by_id[i]
        try:
            g = generate_work(c, tags_hint.get(i), slugify(c.artist_en) not in artists_new)
        except Exception as e:
            log(f"[fail] {i} 生成异常: {e}")
            g = None
        return idx, i, g

    results = {}
    workers = max(1, int(os.environ.get("PIPELINE_THREADS", "3")))
    with ThreadPoolExecutor(max_workers=workers) as ex:
        futures = {ex.submit(gen_one, (idx, i)): idx for idx, i in enumerate(sel)}
        for fut in as_completed(futures):
            idx, i, g = fut.result()
            results[idx] = (i, g)
            done = sum(1 for v in results.values() if v[1] and v[1].get("essay"))
            log(f"  进度 {done}/{len(sel)}")

    for idx, i in enumerate(sel):
        i, g = results.get(idx, (i, None))
        c = by_id[i]
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
                    log(f"[replace] 第{idx + 1}幅递补 {j}")
                    break
            if not replaced:
                fails += 1
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
    return works, artists_new, fails


# ---------------------------------------------------------------- 主流程

def main():
    ap = argparse.ArgumentParser(description="艺术手册内容 pipeline")
    ap.add_argument("--date", default=None, help="YYYY-MM-DD，缺省今天（Asia/Shanghai）")
    ap.add_argument("--dry-run", action="store_true", help="完整执行但不写文件、不 commit")
    ap.add_argument("--force", action="store_true", help="日期已存在时覆盖重生成")
    args = ap.parse_args()

    # 自然日锚定（t_8d5cb3c8）：期日在入口一次定死——定时/手动触发跨午夜、
    # 探针等待跨日都不会让本期漂移到错误的自然日。--date 由 run_daily.sh /
    # daily.yml 在触发时刻计算并传入；缺省 = 此刻 Asia/Shanghai 自然日。
    raw_date = args.date or today_str()
    try:
        date = parse_issue_date(raw_date)
    except ValueError as e:
        log(f"[fatal] {e}")
        return 1
    log(f"目标期日 {date}")
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
    cands = fetch_candidates(seen)
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

    log("3/8 逐幅生成（带图调用，并行，耗时较长）")
    works, artists_new, fail_n = generate_works(sel, by_id, tags_hint, artists)
    if fail_n:
        log(f"[fail] {fail_n} 幅无可用递补被跳过")

    log("4/8 发布闸门校验")
    valid = []
    blocked = 0
    for w in works:
        errs = validate_work(w)
        if errs:
            blocked += 1
            log(f"[gate] 拦截 {w['id']}：{'；'.join(errs)}")
            continue
        if w["id"] in seen:
            log(f"[gate] {w['id']} 已在 seen 账本")
            continue
        if not http_head_ok(w["image"]["feed"]):
            log(f"[gate] {w['id']} 图片 URL HEAD 失败")
            continue
        valid.append(w)
    if blocked:
        log(f"[gate] 拦截 {blocked} 幅含空字段/待修数据作品（不进入本期）")

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

    # 推送前整期复检（t_866be207）：任何一幅空必填字段/待修数据 → 禁止提交
    issue_errs = validate_issue(issue, date)
    if issue_errs:
        for e in issue_errs:
            log(f"[gate] {e}")
        log(f"[fatal] 整期复检未通过（{len(issue_errs)} 项），禁止提交推送")
        return 1

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
    write_version(date)  # t_3342ced5：数据已更新 → 版本探针标记随推送刷新

    log("6/8 commit + push")
    try:
        subprocess.run(["git", "add", "data", "pipeline/seen.json", "version.json"], cwd=ROOT, check=True)
        subprocess.run(["git", "commit", "-m", f"issue: {date}"], cwd=ROOT, check=True)
        # t_5dbb1b56：push 前先 rebase 到最新 origin/main，防止本地 main 落后于
        # 已合并的 worktree 分支导致 push 被 non-fast-forward 拒绝（9/2 t_88c9c62d 事故）。
        # --autostash 保护 add 之后但尚未 commit 的意外脏文件（正常流程此时应已全部 commit）。
        subprocess.run(
            ["git", "pull", "--rebase", "--autostash", "origin", "main"],
            cwd=ROOT, check=True,
        )
        subprocess.run(["git", "push"], cwd=ROOT, check=True)
    except Exception as e:
        log(f"[git] 提交/推送失败: {e}")
        return 1

    log(f"done: {date} 共 {n} 幅")
    return 0


if __name__ == "__main__":
    sys.exit(main())
