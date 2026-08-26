// 详情视图（SPE §7.4）：大图、全屏缩放、元数据表、圆形细节、赏析、相关推荐
import * as data from "./data.js";
import { back, navigate } from "./router.js";
import { isFav, toggleFav } from "./favorites.js";
import { esc, icons, toast } from "./ui.js";

export async function mount(el, { id }) {
  let work;
  try {
    work = await data.getWork(id);
  } catch {
    el.innerHTML = `<div class="empty"><div class="wordmark">艺术手册</div>
      <p>暂时加载不出来</p><button class="action-btn" id="retry">重试</button></div>`;
    el.querySelector("#retry").addEventListener("click", () => navigate(`#/work/${id}`));
    return;
  }
  if (!work) {
    el.innerHTML = `<div class="empty"><div class="wordmark">艺术手册</div>
      <p>作品数据缺失</p></div>`;
    return;
  }
  render(el, work);
}

function render(el, w) {
  const ph = w.palette?.[0] ? `background:${w.palette[0]}` : "";
  const ratio = w.image.ratio || 1;
  const artistMeta = [w.artist_nationality_zh, w.artist_years]
    .filter((x) => x && x !== "不详")
    .join("，");
  const artistLine = `${esc(w.artist_en)} / ` +
    `<a class="artist-zh-link" href="#/artist/${encodeURIComponent(w.artist_id)}">${esc(w.artist_zh)}</a>` +
    (artistMeta ? `<span style="color:var(--ink-2)">（${esc(artistMeta)}）</span>` : "");

  el.innerHTML = `
  <div class="detail">
    <div class="detail-hero" style="${ph}">
      <div class="ph" style="${ph};aspect-ratio:calc(1/${ratio})">
        <img data-src="${esc(w.image.full)}" alt="${esc(w.title_zh)}" decoding="async">
      </div>
      <button class="detail-close" aria-label="关闭">${icons.x}</button>
    </div>
    <div class="detail-body">
      <div class="meta">
        <div class="meta-row"><span class="k">作品名</span>
          <span class="v">${esc(w.title_zh)}<span class="artist-en" style="display:block;font-family:var(--serif-en);font-size:14px;color:var(--ink-2)">${esc(w.title_en)}</span></span></div>
        <div class="meta-row"><span class="k">创作者</span><span class="v">${artistLine}</span></div>
        <div class="meta-row"><span class="k">创作年代</span><span class="v">${esc(w.date_display || "不详")}</span></div>
        <div class="meta-row"><span class="k">作品材质</span><span class="v">${esc(w.medium_zh)}</span></div>
        ${w.dimensions ? `<div class="meta-row"><span class="k">实际尺寸</span><span class="v">${esc(w.dimensions)}</span></div>` : ""}
      </div>
      <div class="tags">${[w.movement_zh, ...(w.tags || [])].filter(Boolean)
        .map((t) => `<button class="tag-pill" data-tag="${esc(t)}">${esc(t)}</button>`)
        .join("")}</div>
      <div class="essay"></div>
      <div class="credit">图片与元数据来自 ${esc(w.credit)}。赏析由 AI 生成，仅供个人学习参考。
        <a href="${esc(w.sourceUrl)}" target="_blank" rel="noopener">源站页面 ${icons.external}</a></div>
      <div class="action-row">
        <button class="action-btn" id="fav-act">${icons.star} 收藏画作</button>
      </div>
      <div class="related" id="related">
        <h2>相关推荐</h2>
        <div class="related-scroll" id="related-scroll"></div>
      </div>
    </div>
  </div>`;

  // 大图
  const hero = el.querySelector(".detail-hero");
  const img = hero.querySelector("img");
  const src = img.dataset.src;
  delete img.dataset.src;
  img.src = src;
  img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
  img.addEventListener("error", () => {
    img.remove();
    hero.querySelector(".ph").innerHTML = `<p style="padding:48px 20px;font-size:15px;color:var(--ink-2)">原图暂不可用</p>`;
  });
  img.addEventListener("click", () => openViewer(w.image.full));
  el.querySelector(".detail-close").addEventListener("click", () => back());

  // 标签
  el.querySelectorAll(".tag-pill").forEach((b) =>
    b.addEventListener("click", () => navigate(`#/tag/${encodeURIComponent(b.dataset.tag)}`))
  );

  // 赏析 + 圆形细节图（第 2 段之后插入）
  const essayEl = el.querySelector(".essay");
  (w.essay || []).forEach((p, i) => {
    const pEl = document.createElement("p");
    pEl.textContent = p;
    essayEl.appendChild(pEl);
    if (i === 1 && (w.essay || []).length >= 2) {
      const crop = document.createElement("div");
      crop.className = "detail-crop";
      const bg = data.cropToBackground(w.detailCrop, ratio);
      crop.style.backgroundImage = `url("${w.image.full}")`;
      crop.style.backgroundSize = bg.size;
      crop.style.backgroundPosition = bg.pos;
      essayEl.appendChild(crop);
    }
  });

  // 收藏按钮
  const favBtn = el.querySelector("#fav-act");
  const paintFav = () => {
    if (isFav(w.id)) {
      favBtn.classList.add("on");
      favBtn.innerHTML = `${icons.star} 已收藏`;
    } else {
      favBtn.classList.remove("on");
      favBtn.innerHTML = `${icons.star} 收藏画作`;
    }
  };
  paintFav();
  favBtn.addEventListener("click", () => {
    const { ok } = toggleFav(w.id);
    if (!ok) {
      toast("当前浏览器环境无法保存收藏");
      return;
    }
    paintFav();
  });

  // 相关推荐
  data.related(w.id).then((list) => {
    const scroll = el.querySelector("#related-scroll");
    if (!list.length) {
      el.querySelector("#related").style.display = "none";
      return;
    }
    scroll.innerHTML = list.map((r) => `
      <button class="rel-card" data-go="${esc(r.id)}">
        <span class="th" style="--r:${r.ratio || 1}">
          <span class="ph" style="aspect-ratio:calc(1/${r.ratio || 1})">
            <img data-src="${esc(r.th)}" alt="${esc(r.t)}" loading="lazy" decoding="async">
          </span>
        </span>
        <span class="a">${esc(r.a)}</span>
        <span class="t">${esc(r.t)}</span>
      </button>`).join("");
    scroll.querySelectorAll(".rel-card").forEach((card) =>
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
    }, { root: scroll });
    scroll.querySelectorAll(".rel-card").forEach((c) => io.observe(c));
    prefetchRelatedIssues(list); // 相关作品跨期 → SW 后台预取期文件（第二幅作品首开秒出）
  }).catch(() => {
    const box = el.querySelector("#related-scroll");
    box.innerHTML = `<button class="action-btn" id="rel-retry">暂时加载不出来 · 重试</button>`;
    el.querySelector("#rel-retry").addEventListener("click", () => navigate(`#/work/${w.id}`));
  });
}

// 相关作品可能横跨多期：把缺失的期文件预取进 SW 缓存（去重+限量在 SW 内做），
// 用户点开第二幅作品时数据已在缓存，秒开且离线可用。失败静默（无 SW/离线）。
function prefetchRelatedIssues(list) {
  const dates = [...new Set((list || []).map((r) => r.issue).filter(Boolean))];
  if (!dates.length) return;
  navigator.serviceWorker?.ready
    .then((reg) => {
      const target = reg.active || navigator.serviceWorker.controller;
      target?.postMessage({ type: "PREFETCH_ISSUES", dates });
    })
    .catch(() => {
      /* 无 SW 环境：跳过 */
    });
}

// 全屏看图：黑底、双指缩放（1x-4x）+ 拖拽、单击退出（SPE §7.4-2）
function openViewer(url) {
  const v = document.createElement("div");
  v.className = "viewer";
  const img = document.createElement("img");
  img.src = url;
  v.appendChild(img);
  v.appendChild(Object.assign(document.createElement("div"), {
    className: "hint", textContent: "双指缩放 · 单击退出",
  }));
  document.body.appendChild(v);

  let baseScale = 1, scale = 1, tx = 0, ty = 0;
  const pointers = new Map();
  let pinchDist = 0, pinchScale = 1;
  let downX = 0, downY = 0, downT = 0, moved = false;
  let startTx = 0, startTy = 0;

  const apply = () => {
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  };

  img.addEventListener("load", () => {
    const vw = window.innerWidth, vh = window.innerHeight;
    baseScale = Math.min(vw / img.naturalWidth, vh / img.naturalHeight);
    scale = baseScale;
    tx = (vw - img.naturalWidth * baseScale) / 2;
    ty = (vh - img.naturalHeight * baseScale) / 2;
    apply();
  });

  v.addEventListener("pointerdown", (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      downX = e.clientX; downY = e.clientY; downT = Date.now(); moved = false;
      startTx = tx; startTy = ty;
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      pinchScale = scale;
    }
  });
  v.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      const dx = e.clientX - downX, dy = e.clientY - downY;
      if (Math.hypot(dx, dy) > 8) moved = true;
      if (scale > baseScale) {
        tx = startTx + dx;
        ty = startTy + dy;
        apply();
      }
    } else if (pointers.size === 2) {
      moved = true;
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      scale = Math.min(Math.max(pinchScale * (d / pinchDist), baseScale), baseScale * 4);
      apply();
    }
  });
  const up = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0 && !moved && Date.now() - downT < 350) {
      close();
    }
  };
  v.addEventListener("pointerup", up);
  v.addEventListener("pointercancel", up);

  function close() {
    v.removeEventListener("pointerup", up);
    v.remove();
  }
}
