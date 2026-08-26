// 收藏（SPE §7.6）：localStorage["artbook.favs"] = [{id, at}]
// 本文件同时提供收藏逻辑与 #/favs 收藏页视图。
import * as data from "./data.js";
import { back, navigate } from "./router.js";
import { esc, icons } from "./ui.js";

const KEY = "artbook.favs";

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

export function isFav(id) {
  return read().some((f) => f.id === id);
}

export function favList() {
  return read().sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function toggleFav(id) {
  const list = read();
  const idx = list.findIndex((f) => f.id === id);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push({ id, at: new Date().toISOString() });
  }
  return { ok: write(list), on: idx < 0 };
}

// ---------------------------------------------------------------- 收藏页视图

export async function mount(el) {
  let cat = null;
  try {
    cat = await data.loadCatalog();
  } catch {
    /* catalog 不可用时用空 cat，走缺失态 */
  }
  const byId = new Map((cat?.works || []).map((w) => [w.id, w]));
  const favs = favList();
  el.innerHTML = `
  <div class="page">
    <header class="page-header">
      <button id="back" aria-label="返回">${icons.chevronLeft}</button>
      <div class="title">我的收藏夹</div>
    </header>
    <div id="fav-body"></div>
    <div class="favs-footer">收藏保存在本机浏览器中，清除网站数据会丢失。</div>
  </div>`;
  el.querySelector("#back").addEventListener("click", () => back());

  const body = el.querySelector("#fav-body");
  if (!favs.length) {
    body.innerHTML = `<div class="empty">
      <div class="wordmark brand-title">艺术手册</div>
      <p>还没有收藏。在画作下点亮星标，它会出现在这里。</p>
    </div>`;
    return;
  }
  body.innerHTML = `<div class="grid">${favs.map((f) => {
    const w = byId.get(f.id);
    if (!w) return `<div class="card" style="opacity:.55">
      <span class="th"><span class="ph" style="aspect-ratio:1;background:var(--bg-card)"></span></span>
      <span class="a">—</span><span class="t">作品数据缺失</span></div>`;
    return `<button class="card" data-go="${esc(w.id)}">
      <span class="th" style="--r:${w.ratio || 1}">
        <span class="ph" style="aspect-ratio:calc(1/${w.ratio || 1})">
          <img data-src="${esc(w.th)}" alt="${esc(w.t)}" loading="lazy" decoding="async">
        </span>
      </span>
      <span class="a">${esc(w.a)}</span>
      <span class="t">${esc(w.t)}</span>
    </button>`;
  }).join("")}</div>`;
  body.querySelectorAll(".card[data-go]").forEach((card) =>
    card.addEventListener("click", () => navigate(`#/work/${card.dataset.go}`))
  );
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const im = en.target.querySelector("img");
      if (im && im.dataset.src) {
        const s = im.dataset.src;
        delete im.dataset.src;
        im.src = s;
        im.addEventListener("load", () => im.classList.add("loaded"), { once: true });
      }
      io.unobserve(en.target);
    });
  }, { rootMargin: "300px" });
  body.querySelectorAll(".card[data-go]").forEach((c) => io.observe(c));
}
