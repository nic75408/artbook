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
    el.innerHTML = `<div class="empty"><div class="wordmark brand-title">艺术手册</div>
      <p>暂时加载不出来</p><button class="action-btn" id="retry">重试</button></div>`;
    el.querySelector("#retry").addEventListener("click", () => navigate(`#/work/${id}`));
    return;
  }
  if (!work) {
    el.innerHTML = `<div class="empty"><div class="wordmark brand-title">艺术手册</div>
      <p>作品数据缺失</p></div>`;
    return;
  }
  render(el, work);
}

function render(el, w) {
  const ph = w.palette?.[0] ? `background:${w.palette[0]}` : "";
  const ratio = w.image.ratio || 1;

  // 构建在馆信息
  const creditMuseum = w.credit ? w.credit.replace(/,.*$/, '').trim() : '';
  
  // 构建作者行：ARTIST 标签 + 中文名（链接）+ 英文名 —— 仅当至少有一个作者字段存在时显示
  const artistLine = (w.artist_zh || w.artist_en) ? `\n    <div class="work-meta-row artist-line">\n      <span class="work-meta-label">ARTIST</span>\n      <span class="work-meta-value">\n        ${w.artist_zh ? `<a class="artist-link" href="#/artist/${encodeURIComponent(w.artist_id || '')}">${esc(w.artist_zh)}</a>` : ''}${w.artist_en ? `<span class="artist-en meta-text">${esc(w.artist_en)}</span>` : ''}\n      </span>\n    </div>` : '';

  // 构建年代/材质/尺寸行：统一使用 DATE / MEDIUM / SIZE 标签
  const dateLine = w.date_display ? `
    <div class="work-meta-row">
      <span class="work-meta-label">DATE</span>
      <span class="work-meta-value meta-text">${esc(w.date_display)}</span>
    </div>` : '';
  
  const mediumLine = w.medium_zh ? `
    <div class="work-meta-row">
      <span class="work-meta-label">MEDIUM</span>
      <span class="work-meta-value meta-text">${esc(w.medium_zh)}</span>
    </div>` : '';
  
  const sizeLine = w.dimensions ? `
    <div class="work-meta-row">
      <span class="work-meta-label">SIZE</span>
      <span class="work-meta-value meta-text">${esc(w.dimensions)}</span>
    </div>` : '';
  
  const museumLine = creditMuseum ? `
    <div class="work-meta-row">
      <span class="work-meta-label">MUSEUM</span>
      <span class="work-meta-value credit-name meta-text">${esc(creditMuseum)}</span>
    </div>` : '';

  el.innerHTML = `
  <div class="detail">
    <div class="detail-hero" style="${ph}">
      <div class="ph" style="${ph};aspect-ratio:calc(1/${ratio})">
        <img data-src="${esc(w.image.full)}" alt="${esc(w.title_zh)}" decoding="async">
      </div>
      <button class="detail-close" aria-label="关闭">${icons.x}</button>
    </div>

    <!-- 作品信息块：紧邻主图，标签 + 图像组合 -->
    <div class="artwork-info-card">
      <!-- H1: 作品名 -->
      <h1 class="work-title">
        <span class="work-title-zh">${esc(w.title_zh)}</span>
        ${w.title_en && w.title_en !== w.title_zh ? `<span class="work-title-en">${esc(w.title_en)}</span>` : ''}
      </h1>

      <!-- 次要字段：作者、年代、材质、尺寸、馆藏 -->
      <div class="work-meta-compact">
        ${artistLine}
        ${dateLine}
        ${mediumLine}
        ${sizeLine}
        ${museumLine}
      </div>
    </div>

    <div class="detail-body">
      <div class="tags">${[w.movement_zh, ...(w.tags || [])].filter(Boolean)
        .map((t) => `<button class="tag-pill meta-text" data-tag="${esc(t)}">${esc(t)}</button>`)
        .join("")}</div>

      <!-- H2: 赏析标题 -->
      <h2 class="section-title work-title">本篇章赏析</h2>

      <!-- 正文赏析：分为整体印象与局部细节两个小节 -->
      <div class="essay"></div>

      <div class="credit meta-text">图片与元数据来自 ${esc(w.credit)}。赏析由 AI 生成，仅供个人学习参考。
        <a href="${esc(w.sourceUrl)}" target="_blank" rel="noopener">源站页面 ${icons.external}</a></div>
      
      <!-- 底部工具区：收藏画作 + 下载原图 -->
      <div class="action-row" id="tool-row">
        <button class="action-btn fav-tool" id="fav-act">${icons.bookmark} 收藏</button>
        <button class="action-btn download-btn" id="download-act">${icons.download} 下载原图</button>
      </div>
      
      <div class="related" id="related">
        <h2 class="section-title">相关推荐</h2>
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

  // 赏析 + 圆形细节图：将文案分为「整体印象」与「局部细节」两个小节
  const essayEl = el.querySelector(".essay");
  const essay = w.essay || [];
  
  if (essay.length >= 1) {
    // 第一小节：整体印象
    const section1 = document.createElement("div");
    section1.className = "essay-section";
    section1.innerHTML = `<h3 class="essay-section-title">整体印象</h3>`;
    const p1 = document.createElement("p");
    p1.className = "body-text";
    p1.textContent = essay[0];
    section1.appendChild(p1);
    essayEl.appendChild(section1);
  }
  
  if (essay.length >= 2) {
    // 在第 2 段之后插入圆形细节图
    const crop = document.createElement("div");
    crop.className = "detail-crop";
    const bg = data.cropToBackground(w.detailCrop, ratio);
    crop.style.backgroundImage = `url("${w.image.full}")`;
    crop.style.backgroundSize = bg.size;
    crop.style.backgroundPosition = bg.pos;
    essayEl.appendChild(crop);
    
    // 第二小节：局部细节
    const section2 = document.createElement("div");
    section2.className = "essay-section";
    section2.innerHTML = `<h3 class="essay-section-title">局部细节</h3>`;
    const p2 = document.createElement("p");
    p2.className = "body-text";
    p2.textContent = essay[1];
    section2.appendChild(p2);
    essayEl.appendChild(section2);
  }
  
  // 剩余段落（如果有）归入局部细节小节
  for (let i = 2; i < essay.length; i++) {
    const pEl = document.createElement("p");
    pEl.className = "body-text";
    pEl.textContent = essay[i];
    essayEl.appendChild(pEl);
  }

  // 收藏按钮
  const favBtn = el.querySelector("#fav-act");
  const paintFav = () => {
    if (isFav(w.id)) {
      favBtn.classList.add("on");
      favBtn.innerHTML = `${icons.bookmarkFilled} 已收藏`;
    } else {
      favBtn.classList.remove("on");
      favBtn.innerHTML = `${icons.bookmark} 收藏`;
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
  
  // 下载原图按钮
  const downloadBtn = el.querySelector("#download-act");
  downloadBtn.addEventListener("click", async () => {
    try {
      toast("正在准备下载…");
      const res = await fetch(w.image.full);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${w.title_zh}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("下载已开始");
    } catch {
      // 降级：直接打开原图
      window.open(w.image.full, "_blank");
      toast("已在新窗口打开原图");
    }
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
