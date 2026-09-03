// 已看作品追踪（SPE §7.4）：localStorage["artbook.viewed"] = [{id, at}]
// 用于相关推荐去重：用户已看过的作品不应重复出现在推荐列表中
// 实现方案 B（t_f2d585b6，2026-09-03）：180 条上限 + 90 天过期滑动窗口

const KEY = "artbook.viewed";
const MAX_VIEWED = 180;        // 最多 180 条（约 6 个月，每日一件）
const EXPIRY_DAYS = 90;        // 90 天后视为过期，可再次推荐

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

// 检查某作品是否已看（在有效期内）
export function isViewed(id) {
  const list = read();
  const now = Date.now();
  const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return list.some((v) => v.id === id && (now - new Date(v.at).getTime()) < expiryMs);
}

// 记录某作品为已看
export function markViewed(id) {
  const list = read();
  const now = new Date().toISOString();
  
  // 如果已存在，更新它的时间戳（移到末尾）
  const idx = list.findIndex((v) => v.id === id);
  if (idx >= 0) {
    list.splice(idx, 1);
  }
  
  // 添加到末尾
  list.push({ id, at: now });
  
  // 清理过期记录（>90 天）+ 超出容量限制（FIFO）
  const nowMs = Date.now();
  const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const filtered = list.filter((v) => (nowMs - new Date(v.at).getTime()) < expiryMs);
  
  // 如果过滤后仍超出容量，从头部删除最旧的
  if (filtered.length > MAX_VIEWED) {
    filtered.splice(0, filtered.length - MAX_VIEWED);
  }
  
  return { ok: write(filtered), count: filtered.length };
}

// 获取已看作品 ID 列表（用于批量过滤）
export function viewedIds() {
  const list = read();
  const now = Date.now();
  const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return list
    .filter((v) => (now - new Date(v.at).getTime()) < expiryMs)
    .map((v) => v.id);
}

// 清除所有已看记录（用于调试或用户重置）
export function clearViewed() {
  return write([]);
}
