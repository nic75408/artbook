// 已看作品追踪（SPE §7.4）：localStorage["artbook.viewed"] = ["id1","id2",...]
// 用于相关推荐去重：用户已看过的作品不应重复出现在推荐列表中
// 规格（CEO 拍板，2026-09-03）：看过就永久不推荐，不设条数上限、不设过期。
// artbook 总画作量在几百级别，即使全部看完也只有几百个 ID（几 KB），
// localStorage 完全承受得住。

const KEY = "artbook.viewed";

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

// 检查某作品是否已看
export function isViewed(id) {
  return read().includes(id);
}

// 记录某作品为已看（去重追加，已存在则直接返回）
export function markViewed(id) {
  const list = read();
  if (list.includes(id)) {
    return { ok: true, count: list.length };
  }
  list.push(id);
  return { ok: write(list), count: list.length };
}

// 获取已看作品 ID 列表（用于批量过滤）
export function viewedIds() {
  return read();
}

// 清除所有已看记录（用于调试或用户重置）
export function clearViewed() {
  return write([]);
}
