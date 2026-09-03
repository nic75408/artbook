// 收藏（SPE §7.6）：localStorage["artbook.favs"] = [{id, at}]
// 本文件同时提供收藏逻辑与 #/favs 收藏页视图。
import * as data from "./data.js";
import { back, navigate, writeFolioCtx } from "./router.js";
import { esc, Icon } from "./ui.js";
import { attachEdgeSwipeBack } from "./router.js";
import { BrandLockup } from "./icons/BrandEmblem.js";
import { WORDMARK } from "../config.js";
import { fillMasonry } from "./collection.js";

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
  el.innerHTML = `\n  <div class="page">\n    <header class="page-header">\n      <button class="page-header__back" id="back" aria-label="返回">${Icon('nav-back', { size: 20, hidden: true })}</button>\n      <div class="title">我的收藏夹</div>\n    </header>\n    <div id="fav-body"></div>\n    <div class="favs-footer">收藏保存在本机浏览器中，清除网站数据会丢失。</div>\n  </div>`;
  el.querySelector("#back").addEventListener("click", () => back());
  attachEdgeSwipeBack(el);

  const body = el.querySelector("#fav-body");
  if (!favs.length) {
    body.innerHTML = `<div class="empty">
      <div class="wordmark brand-lockup">${BrandLockup({ label: WORDMARK })}</div>
      <p>还没有收藏。在画作下点亮书签，它会出现在这里。</p>
    </div>`;
    return;
  }
  body.innerHTML = `<div class="grid"><div class="col"></div><div class="col"></div></div>`;
  const grid = body.querySelector(".grid");
  fillMasonry(grid, favs, (f) => {
    const w = byId.get(f.id);
    if (!w) return `<div class="card" style="opacity:.55">
      <span class="th"><span class="ph" style="aspect-ratio:1;background:var(--bg-card)"></span></span>
      <span class="a meta-text">—</span><span class="t work-title">作品数据缺失</span></div>`;
    return `<div class="card" data-go="${esc(w.id)}">
      <span class="th" style="--r:${w.ratio || 1}">
        <span class="ph" style="aspect-ratio:calc(1/${w.ratio || 1})">
          <img data-src="${esc(w.th)}" alt="${esc(w.t)}" loading="lazy" decoding="async">
        </span>
      </span>
      <span class="a meta-text">${esc(w.a)}</span>
      <span class="t work-title">${esc(w.t)}</span>
    </div>`;
  });
  body.querySelectorAll(".card[data-go]").forEach((card) =>
    card.addEventListener("click", () => {
      writeFolioCtx({
        source: "favorites",
        ids: favs.map((f) => f.id),
        entryId: card.dataset.go,
        meta: { title: "我的收藏夹" },
      });
      navigate(`#/work/${card.dataset.go}`);
    })
  );
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const im = en.target.querySelector("img");
      if (im && im.dataset.src) {
        const s = im.dataset.src;
        delete im.dataset.src;
        im.addEventListener("load", () => im.classList.add("loaded"), { once: true });
        retryOnError(im, s);
        im.src = s;
        // 命中强缓存时 load 可能同步触发，监听器还没挂上就已经完成（t_76418473）
        if (im.complete && im.naturalWidth > 0) im.classList.add("loaded");
      }
      io.unobserve(en.target);
    });
  }, { rootMargin: "300px" });
  body.querySelectorAll(".card[data-go]").forEach((c) => io.observe(c));
}

// 单次自动重试：请求失败（瞬时网络抖动/CDN 波动）时，短暂延迟后用带
// cache-buster 的 URL 重新发起一次请求；仍失败则放弃（error 监听已 once，
// 不会无限重试）。同 feed.js 的同名函数（t_76418473）。
function retryOnError(img, originalSrc) {
  const onError = () => {
    setTimeout(() => {
      if (!img.isConnected) return;
      const sep = originalSrc.includes("?") ? "&" : "?";
      img.src = `${originalSrc}${sep}_retry=${Date.now()}`;
    }, 800);
  };
  img.addEventListener("error", onError, { once: true });
}
