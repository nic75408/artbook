// 画家 / 标签聚合页（SPE §7.5）：两列瀑布流网格，数据来自 catalog
import * as data from "./data.js";
import { back, navigate } from "./router.js";
import { esc, icons } from "./ui.js";
import { BrandWordmark } from "./icons/BrandWordmark.js";

async function loadCatalogSafe() {
  try {
    return await data.loadCatalog();
  } catch {
    return null;
  }
}

function gridHTML(list) {
  return `<div class="grid">${list.map((w) => `
    <button class="card" data-go="${esc(w.id)}">
      <span class="th" style="--r:${w.ratio || 1}">
        <span class="ph" style="aspect-ratio:calc(1/${w.ratio || 1})">
          <img data-src="${esc(w.th)}" alt="${esc(w.t)}" loading="lazy" decoding="async">
        </span>
      </span>
      <span class="a meta-text">${esc(w.a)}</span>
      <span class="t work-title">${esc(w.t)}</span>
    </button>`).join("")}</div>`;
}

function bindGrid(el) {
  const grid = el.querySelector(".grid");
  if (!grid) return;
  grid.querySelectorAll(".card").forEach((card) =>
    card.addEventListener("click", () => navigate(`#/work/${card.dataset.go}`))
  );
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const im = en.target.querySelector("img");
      if (im && im.dataset.src) {
        const s = im.dataset.src;
        delete im.dataset.src;
        im.addEventListener("load", () => im.classList.add("loaded"), { once: true });
        im.src = s;
        // 命中强缓存时 load 可能同步触发，监听器还没挂上就已经完成（t_76418473）
        if (im.complete && im.naturalWidth > 0) im.classList.add("loaded");
      }
      io.unobserve(en.target);
    });
  }, { rootMargin: "300px" });
  grid.querySelectorAll(".card").forEach((c) => io.observe(c));
}

function failState(el, cb) {
  el.innerHTML = `<div class="empty"><div class="wordmark brand-mark">${BrandWordmark({ withSeal: false })}</div>
    <p>暂时加载不出来</p><button class="action-btn" id="retry">重试</button></div>`;
  el.querySelector("#retry").addEventListener("click", cb);
}

function byYearAsc(list) {
  return [...list].sort((a, b) => (a.y ?? 9999) - (b.y ?? 9999));
}

export async function mountArtist(el, aid) {
  const cat = await loadCatalogSafe();
  if (!cat) return failState(el, () => mountArtist(el, aid));
  const works = byYearAsc((cat.works || []).filter((w) => w.aid === aid));
  let artist = null;
  try {
    const all = await data.loadArtists();
    artist = (all.artists || {})[aid] || null;
  } catch {
    artist = null;
  }
  el.innerHTML = `
  <div class="page">
    <header class="page-header">
      <button id="back" aria-label="返回">${icons.chevronLeft}</button>
      <div class="title">画家</div>
    </header>
    ${artist ? `
    <div class="page-intro">
      <div class="name-zh">${esc(artist.name_zh)}</div>
      <div class="name-en">${esc(artist.name_en)}</div>
      <div class="years">${esc(artist.nationality_zh || "")}${artist.years ? "，" + esc(artist.years) : ""}</div>
      ${artist.bio_zh ? `<div class="bio">${esc(artist.bio_zh)}</div>` : ""}
    </div>` : `
    <div class="page-intro"><div class="name-zh">${esc(aid)}</div></div>`}
    ${works.length ? gridHTML(works) : `<div class="empty"><p>暂无作品</p></div>`}
  </div>`;
  el.querySelector("#back").addEventListener("click", () => back());
  bindGrid(el);
}

export async function mountTag(el, tag) {
  const cat = await loadCatalogSafe();
  if (!cat) return failState(el, () => mountTag(el, tag));
  const works = byYearAsc((cat.works || []).filter(
    (w) => (w.tags || []).includes(tag) || w.mv === tag
  ));
  el.innerHTML = `
  <div class="page">
    <header class="page-header">
      <button id="back" aria-label="返回">${icons.chevronLeft}</button>
      <div class="title">${esc(tag)}</div>
    </header>
    <div class="page-intro"><div class="years">${works.length} 幅作品</div></div>
    ${works.length ? gridHTML(works) : `<div class="empty"><p>暂无作品</p></div>`}
  </div>`;
  el.querySelector("#back").addEventListener("click", () => back());
  bindGrid(el);
}
