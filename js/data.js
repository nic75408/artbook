// 数据层（SPE §7.4）：catalog/artists/index 缓存 + 期文件按需加载 + 相关推荐算法
import { DATA_ROOT } from "../config.js";

let indexCache = null;          // {latest, issues[]}
let catalogCache = null;        // {works[]}
let artistsCache = null;        // {artists{}}
const issueCache = new Map();   // date -> issue JSON（上限 12 期）
const catalogById = new Map();

async function fetchJSON(path) {
  const res = await fetch(`${DATA_ROOT}/${path}`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`fetch ${path}: ${res.status}`);
  return res.json();
}

export async function loadIndex() {
  if (!indexCache) indexCache = await fetchJSON("index.json");
  return indexCache;
}

export async function loadCatalog() {
  if (!catalogCache) {
    catalogCache = await fetchJSON("catalog.json");
    catalogById.clear();
    for (const w of catalogCache.works || []) {
      catalogById.set(w.id, w);
    }
  }
  return catalogCache;
}

export async function loadArtists() {
  if (!artistsCache) artistsCache = await fetchJSON("artists.json");
  return artistsCache;
}

export async function loadIssue(date) {
  if (!issueCache.has(date)) {
    const issue = await fetchJSON(`issues/${date}.json`);
    issueCache.set(date, issue);
    if (issueCache.size > 12) {
      const first = issueCache.keys().next().value;
      issueCache.delete(first);
    }
  }
  return issueCache.get(date);
}

export function catalogEntry(id) {
  return catalogById.get(id);
}

// 版本探针（t_3342ced5）：版本变化时清空内存缓存，
// 下次 load 调用即重新拉取最新数据（当前已渲染视图不受影响）
export function invalidateAll() {
  indexCache = null;
  catalogCache = null;
  artistsCache = null;
  issueCache.clear();
  catalogById.clear();
}

export async function getWork(id) {
  // id -> catalog 查期号 -> 期 JSON 完整记录
  await loadCatalog();
  const entry = catalogById.get(id);
  if (!entry) return null;
  const issue = await loadIssue(entry.issue);
  return (issue.works || []).find((w) => w.id === id) || null;
}

// 相关推荐（SPE §7.4）：同画家 → 同流派 → tags 交集 ≥2 → 年代差 ≤30
export async function related(id, limit = 8) {
  await loadCatalog();
  const me = catalogById.get(id);
  if (!me) return [];
  const works = (catalogCache.works || []).filter((w) => w.id !== id);
  const out = [];
  const used = new Set();
  const artistCount = {};
  const push = (w) => {
    if (used.has(w.id)) return;
    if ((artistCount[w.aid] || 0) >= 4) return;
    used.add(w.id);
    artistCount[w.aid] = (artistCount[w.aid] || 0) + 1;
    out.push(w);
  };
  // 1. 同画家，按年份接近排序
  works
    .filter((w) => w.aid === me.aid)
    .sort((a, b) => dist(a.y, me.y) - dist(b.y, me.y))
    .slice(0, 4)
    .forEach(push);
  // 2. 同流派
  works.filter((w) => w.mv && w.mv === me.mv).forEach(push);
  // 3. tags 交集 >= 2
  works
    .filter((w) => (w.tags || []).filter((t) => (me.tags || []).includes(t)).length >= 2)
    .forEach(push);
  // 4. 年代差 <= 30
  works
    .filter((w) => w.y != null && me.y != null && Math.abs(w.y - me.y) <= 30)
    .forEach(push);
  return out.slice(0, limit);
}

function dist(a, b) {
  if (a == null || b == null) return Infinity;
  return Math.abs(a - b);
}

// 圆形细节图背景定位（SPE §7.4-5）：
// 目标 = 图中以 (cx,cy) 为中心、直径 2r·短边 的圆，放大铺满圆形 div。
// 推导：W=1 归一，S=渲染宽%=50/(r·short)，p=100·(容器中心偏移-图像内点位)/(容器-渲染尺寸)。
export function cropToBackground(crop, ratio) {
  const { cx, cy, r } = crop || { cx: 0.5, cy: 0.4, r: 0.18 };
  const short = Math.min(1, ratio || 1);
  const S = 50 / (r * short);
  const px = (50 - cx * S) / (1 - S / 100);
  const py = (50 - cy * ratio * S) / (1 - (ratio * S) / 100);
  return {
    size: `${S}% auto`,
    pos: `${px}% ${py}%`,
  };
}

export function issueLabel(date) {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][
    new Date(y, m - 1, d).getDay()
  ];
  return `${m}月${d}日 · ${weekday}`;
}

export function dateCapsule(date) {
  const [y, m, d] = date.split("-");
  return `${y}/${m}/${d}`;
}
