// 数据层（SPE §7.4）：catalog/artists/index 缓存 + 期文件按需加载 + 相关推荐算法
import { DATA_ROOT } from "../config.js";

let indexCache = null;          // {latest, issues[]}
let catalogCache = null;        // {works[]}
let artistsCache = null;        // {artists{}}
const issueCache = new Map();   // date -> issue JSON（上限 12 期）
const catalogById = new Map();
// id -> {work, issueDate}：已加载期文件里的完整作品记录（t_a450af65）
// 详情页命中它就无需 catalog.json，省掉 322KB 与一轮往返
const workByIdCache = new Map();

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
    indexIssueWorks(date, issue);
    if (issueCache.size > 12) {
      const first = issueCache.keys().next().value;
      issueCache.delete(first);
      // 期文件被淘汰 → 它贡献的 id→作品 映射也要一并清掉，避免返回悬空引用
      for (const [id, entry] of workByIdCache) {
        if (entry.issueDate === first) workByIdCache.delete(id);
      }
    }
  }
  return issueCache.get(date);
}

// 已加载的期文件里，把 id → 完整作品记录 建成索引（t_a450af65）。
// 首页 feed 加载当期时顺带建好，用户点进详情页即命中，
// 不必为了「id 属于哪一期」去拉 322KB 的 catalog.json。
// 期号用调用方传入的 date（而非 issue.date 字段），索引与缓存键天然一致，
// 期文件缺字段也不会让淘汰逻辑失效。
function indexIssueWorks(date, issue) {
  if (!issue || !Array.isArray(issue.works)) return;
  for (const w of issue.works) {
    if (!w || !w.id) continue;
    workByIdCache.set(w.id, { work: w, issueDate: date });
  }
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
  workByIdCache.clear(); // 否则版本更新后详情页仍从内存返回旧作品记录
}

export async function getWork(id) {
  // 快路径（t_a450af65）：作品已随某一期加载进内存 → 直接返回，零网络请求。
  // 从首页点进详情页走的就是这条路：当期 30 幅都已在 workByIdCache 里。
  const hit = workByIdCache.get(id);
  if (hit) return hit.work;

  // 慢路径：直接进入详情页 URL（分享链接、刷新、书签）→
  // 此时不知道 id 属于哪一期，只能靠 catalog 查期号再拉期文件。
  await loadCatalog();
  const entry = catalogById.get(id);
  if (!entry) return null;
  const issue = await loadIssue(entry.issue);
  return (issue.works || []).find((w) => w.id === id) || null;
}

// 相关推荐（SPE §7.4）：同画家 → 同流派 → tags 交集 ≥2 → 年代差 ≤30
// 内容非空校验：只返回具有非空标题/作者/缩略图的作品，避免推荐卡片空白
export async function related(id, limit = 8) {
  await loadCatalog();
  const me = catalogById.get(id);
  if (!me) return [];
  
  // 内容非空过滤：确保推荐作品有完整的展示字段
  const isValidWork = (w) => {
    if (!w.t || !String(w.t).trim()) return false;      // 标题非空
    if (!w.a || !String(w.a).trim()) return false;      // 作者非空
    if (!w.th || !String(w.th).trim()) return false;    // 缩略图非空
    return true;
  };
  
  const works = (catalogCache.works || []).filter((w) => w.id !== id && isValidWork(w));
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

// 同期作品序列（t_13662686）：返回给定作品所在期的所有作品 id，
// 与期文件 works[] 的顺序一致，用于详情页左右滑动切换。
// 已加载的期从内存缓存返回；未加载时先 loadIssue 再返回。
export async function siblingsInIssue(id) {
  await loadCatalog();
  const entry = catalogById.get(id);
  if (!entry) return { ids: [], index: -1, issue: null };
  const issue = await loadIssue(entry.issue);
  const ids = (issue.works || []).map((w) => w.id);
  const index = ids.indexOf(id);
  return { ids, index, issue: entry.issue };
}
