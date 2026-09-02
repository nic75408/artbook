// 详情视图（SPE §7.4）：大图、全屏缩放、元数据表、圆形细节、赏析、相关推荐
import * as data from "./data.js";
import { back, navigate } from "./router.js";
import { isFav, toggleFav } from "./favorites.js";
import { esc, icons, toast } from "./ui.js";
import { BrandWordmark } from "./icons/BrandWordmark.js";

// t_13662686：同期序列，mount 时刷新。用模块级变量而非闭包，
// 是因为切换到下一幅时 render 会重跑，闭包每次会重置，需要跨 render 保持序列。
let siblingCtx = { ids: [], index: -1, issue: null };

export async function mount(el, { id }) {
  let work;
  try {
    work = await data.getWork(id);
  } catch {
    el.innerHTML = `<div class="empty"><div class="wordmark brand-mark">${BrandWordmark({ withSeal: false })}</div>
      <p>暂时加载不出来</p><button class="action-btn" id="retry">重试</button></div>`;
    el.querySelector("#retry").addEventListener("click", () => navigate(`#/work/${id}`));
    return;
  }
  if (!work) {
    el.innerHTML = `<div class="empty"><div class="wordmark brand-mark">${BrandWordmark({ withSeal: false })}</div>
      <p>作品数据缺失</p></div>`;
    return;
  }

  // t_13662686：加载同期序列，为手势翻页与页码渲染做准备
  try {
    siblingCtx = await data.siblingsInIssue(id);
  } catch {
    siblingCtx = { ids: [], index: -1, issue: null };
  }

  render(el, work);
}

function render(el, w) {
  const ratio = w.image.ratio || 1;

  // 构建在馆信息
  const creditMuseum = w.credit ? w.credit.replace(/,.*$/, '').trim() : '';

  el.innerHTML = `
  <div class="detail">
    <div class="detail-hero">
      <div class="ph" style="aspect-ratio:calc(1/${ratio})">
        <img data-src="${esc(w.image.full)}" alt="${esc(w.title_zh)}" loading="eager" fetchpriority="high" decoding="async">
      </div>
      <button class="detail-close" aria-label="关闭">${icons.x}</button>
    </div>

    ${siblingCtx.ids.length > 1 ? `
    <div class="folio" aria-live="polite" aria-label="当前作品位置">
      <span class="folio-idx">${siblingCtx.index + 1}</span>
      <span class="folio-sep">／</span>
      <span class="folio-total">${siblingCtx.ids.length}</span>
    </div>
    ` : ''}

    <!-- 作品信息块：紧邻主图，标签 + 图像组合 -->
    <div class="artwork-info-card">
      <!-- H1: 作品名 -->
      <h1 class="work-title">
        <span class="work-title-zh">${esc(w.title_zh)}</span>
        ${w.title_en && w.title_en !== w.title_zh ? `<span class="work-title-en">${esc(w.title_en)}</span>` : ''}
      </h1>

      <!-- 次要字段：作者、年代、材质、馆藏 -->
      <div class="work-meta-compact">
        <div class="work-meta-row">
          <span class="work-meta-label">创作者</span>
          <span class="work-meta-value">
            <a class="artist-link" href="#/artist/${encodeURIComponent(w.artist_id)}">${esc(w.artist_zh)}</a>
            <span class="artist-en">${esc(w.artist_en)}</span>
          </span>
        </div>
        <div class="work-meta-row">
          <span class="work-meta-label">创作年代</span>
          <span class="work-meta-value">${esc(w.date_display || '不详')}</span>
        </div>
        ${w.medium_zh ? `
        <div class="work-meta-row">
          <span class="work-meta-label">作品材质</span>
          <span class="work-meta-value">${esc(w.medium_zh)}</span>
        </div>
        ` : ''}
        ${w.dimensions ? `
        <div class="work-meta-row">
          <span class="work-meta-label">实际尺寸</span>
          <span class="work-meta-value">${esc(w.dimensions)}</span>
        </div>
        ` : ''}
        ${creditMuseum ? `
        <div class="work-meta-row">
          <span class="work-meta-label">在馆收藏</span>
          <span class="work-meta-value credit-name">${esc(creditMuseum)}</span>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="detail-body">
      <div class="tags">${[w.movement_zh, ...(w.tags || [])].filter(Boolean)
        .map((t) => `<button class="tag-pill" data-tag="${esc(t)}">${esc(t)}</button>`)
        .join("")}</div>

      <!-- H2: 赏析标题（本篇章赏析） -->
      <h2 class="section-title">本篇章赏析</h2>

      <!-- 正文赏析：带段落标识 -->
      <div class="essay" id="essay-container"></div>

      <div class="credit">图片与元数据来自 ${esc(w.credit)}。赏析由 AI 生成，仅供个人学习参考。
        <a href="${esc(w.sourceUrl)}" target="_blank" rel="noopener">源站页面 ${icons.external}</a></div>
      <div class="action-row">
        <button class="action-btn fav-tool" id="fav-act">${icons.bookmark} 收藏</button>
      </div>
    </div>

    <!-- 相关推荐：独立模块，左侧对齐版心、右侧贴边可滑出屏幕 -->
    <div class="related" id="related">
      <h2 class="section-title">相关推荐</h2>
      <div class="related-scroll" id="related-scroll"></div>
    </div>
  </div>`;

  // 大图渐进加载（t_a450af65）：
  // 先挂 feed 尺寸的图 —— 它在首页就已加载并被 SW 缓存，几乎必然瞬间出图，
  // 详情页不再有「白框等大图」的空窗；随后在后台换成 print 尺寸的全分辨率图，
  // 加载完成才替换 src，用户看到的是「立刻有图 → 悄悄变清晰」。
  // 离线时 print 图必然失败，但 feed 图来自缓存，画面依然完整（验收标准 5）。
  // 不预缓存 print 图是有意为之：单张约 4.9MB，一期 30 张要 146MB，不该占用户磁盘。
  const hero = el.querySelector(".detail-hero");
  const img = hero.querySelector("img");
  delete img.dataset.src;

  const feedSrc = w.image.feed || w.image.full;
  const fullSrc = w.image.full;
  img.src = feedSrc;
  if (img.complete && img.naturalWidth > 0) img.classList.add("loaded");
  img.addEventListener("load", () => img.classList.add("loaded"), { once: true });

  // 后台升级到全分辨率图；失败（离线/源站问题）则保留 feed 图，不打扰用户
  if (fullSrc && fullSrc !== feedSrc) {
    const upgrade = new Image();
    upgrade.decoding = "async";
    upgrade.addEventListener("load", () => {
      img.src = fullSrc;
      img.classList.add("loaded");
    });
    upgrade.src = fullSrc;
  }

  // 连 feed 图都加载不出来才显示兜底文案
  img.addEventListener("error", () => {
    if (img.src === fullSrc && feedSrc !== fullSrc) {
      img.src = feedSrc; // 全分辨率图失效 → 退回 feed 图
      return;
    }
    img.remove();
    hero.querySelector(".ph").innerHTML = `<p style="padding:48px 20px;font-size:15px;color:var(--ink-2)">原图暂不可用</p>`;
  });
  // 点击看大图：优先用已加载到的最高分辨率
  img.addEventListener("click", () => openViewer(img.src));
  el.querySelector(".detail-close").addEventListener("click", () => back());

  // 标签
  el.querySelectorAll(".tag-pill").forEach((b) =>
    b.addEventListener("click", () => navigate(`#/tag/${encodeURIComponent(b.dataset.tag)}`))
  );

  // 赏析 + 圆形细节图（第 2 段之后插入）
  const essayEl = el.querySelector("#essay-container");
  const detailCrop = w.detailCrop || {};
  const region = detailCrop.region || "whole_work";

  // 映射 region 到标签文本（仅用于圆形细节图的 crop-label）
  const regionLabels = {
    face: "局部赏析：面部表情",
    torso_neck: "局部赏析：身体姿态",
    clothing: "局部赏析：衣物纹理",
    background: "局部赏析：背景环境",
    whole_work: "整体印象"
  };

  // 段落类型 → 小标题文案映射（遵循 essay-headings-spec.md）
  const headingMap = {
    overview: "整体印象",
    detail: (region) => {
      // 根据 detailCrop.region 决定具体局部文案
      const regionLabels = {
        face: "面部",
        torso_neck: "身体姿态",
        clothing: "衣物纹理",
        background: "背景环境"
      };
      const regionText = regionLabels[region] || "细节";
      return `局部细节：${regionText}`;
    },
    technique: "技法解读",
    closure: "收尾点睛"
  };

  // 判断是否需要渲染小标题
  // 规则：
  // 1. 单段 overview（字符串或 type=overview）→ 不渲染
  // 2. 多段场景：渲染对应类型的小标题，但同一文案不重复
  const shouldRenderHeading = (para, index, allParas, renderedHeadings) => {
    const type = typeof para === 'string' ? 'overview' : (para.type || 'overview');
    const getter = headingMap[type];
    if (!getter) return false;
    
    const headingText = typeof getter === 'function' ? getter(region) : getter;
    
    // 单段 overview 场景：不渲染
    if (allParas.length === 1 && type === 'overview') {
      return false;
    }
    
    // 去重：同一小标题文案在同一篇赏析中只出现一次
    if (renderedHeadings.has(headingText)) {
      return false;
    }
    
    return true;
  };

  // 获取段落类型
  const getParaType = (para) => {
    if (typeof para === 'string') return 'overview';
    return para.type || 'overview';
  };

  // 获取小标题文案
  const getHeadingText = (para, i) => {
    const type = getParaType(para);
    const getter = headingMap[type];
    if (!getter) return null;
    if (typeof getter === 'function') {
      // detail 类型需要 region 信息
      return getter(region);
    }
    return getter;
  };

  // 追踪已渲染的小标题文案（去重）
  const renderedHeadings = new Set();

  (w.essay || []).forEach((p, i) => {
    const allParas = w.essay || [];
    
    // 判断是否渲染此段落的小标题
    if (shouldRenderHeading(p, i, allParas, renderedHeadings)) {
      const headingText = getHeadingText(p, i);
      if (headingText) {
        const labelEl = document.createElement("div");
        labelEl.className = "paragraph-label";
        labelEl.textContent = headingText;
        essayEl.appendChild(labelEl);
        renderedHeadings.add(headingText);
      }
    }

    const pEl = document.createElement("p");
    pEl.className = "body-text";
    pEl.textContent = typeof p === 'string' ? p : p.text;
    essayEl.appendChild(pEl);

    // 第 2 段后插入圆形细节图
    if (i === 1 && (w.essay || []).length >= 2) {
      const cropContainer = document.createElement("div");
      cropContainer.className = "detail-crop-container";

      const cropLabel = document.createElement("div");
      cropLabel.className = "crop-label";
      cropLabel.textContent = regionLabels[region] || "局部赏析";
      cropContainer.appendChild(cropLabel);

      const crop = document.createElement("div");
      crop.className = "detail-crop";
      const bg = data.cropToBackground(w.detailCrop, ratio);
      crop.style.backgroundImage = `url("${w.image.full}")`;
      crop.style.backgroundSize = bg.size;
      crop.style.backgroundPosition = bg.pos;
      cropContainer.appendChild(crop);

      essayEl.appendChild(cropContainer);
    }
  });

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

  // 相关推荐
  data.related(w.id).then((list) => {
    const scroll = el.querySelector("#related-scroll");
    if (!list.length) {
      el.querySelector("#related").style.display = "none";
      return;
    }
    // 内容非空兜底：确保推荐卡片始终有可显示的文案（SPE §7.4）
    scroll.innerHTML = list.map((r) => {
      const displayTitle = (r.t || '').trim() || '佚名作品';
      const displayArtist = (r.a || '').trim() || '未知艺术家';
      return `
      <button class="rel-card" data-go="${esc(r.id)}">
        <span class="th" style="--r:${r.ratio || 1}">
          <span class="ph" style="aspect-ratio:calc(1/${r.ratio || 1})">
            <img data-src="${esc(r.th)}" alt="${esc(displayTitle)}" loading="lazy" decoding="async">
          </span>
        </span>
        <span class="a">${esc(displayArtist)}</span>
        <span class="t">${esc(displayTitle)}</span>
      </button>`;
    }).join("");
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

  // t_13662686：详情页左右滑动切换同日期作品
  attachSwipeGesture(el);
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

// t_13662686：页内数据切换（不走 router）
// 不用 navigate(#/work/<nextId>)：router.js 的 handle() 会重置 #view.innerHTML
// 并重跑 main 的 enter 动画，打断淡入淡出。就地重渲染 + history.replaceState
// 保持深链正确，返回按钮仍能回到 feed（栈里的 #/ 未被污染）。
// direction: -1 = 上一幅（右滑），+1 = 下一幅（左滑）
async function switchTo(el, direction) {
  const { ids, index } = siblingCtx;
  const next = index + direction;
  if (next < 0 || next >= ids.length) {
    showEndNotice(el, direction < 0 ? "今日推荐已到首幅" : "今日推荐已到末幅");
    return;
  }
  const nextId = ids[next];
  // 淡出当前 detail 层（240ms）
  const layer = el.querySelector(".detail");
  if (!layer) return;
  layer.classList.add("fade-out");
  await wait(240);
  // 加载新数据（大概率命中缓存）
  let nextWork = null;
  try {
    nextWork = await data.getWork(nextId);
  } catch {
    nextWork = null;
  }
  if (!nextWork) {
    layer.classList.remove("fade-out");
    return;
  }
  siblingCtx.index = next;
  // 就地重渲染
  render(el, nextWork);
  // 滚回顶部（无动画，避免与淡入叠加）
  window.scrollTo({ top: 0, behavior: "instant" });
  const newLayer = el.querySelector(".detail");
  if (newLayer) {
    newLayer.classList.add("fade-in");
    requestAnimationFrame(() => {
      newLayer.classList.remove("fade-in");
    });
  }
  // 更新 URL（不触发路由）
  history.replaceState(null, "", `#/work/${nextId}`);
}

// 手势语义：画面不做水平位移，只做 opacity 反馈；命中翻页则触发 240ms 淡入淡出。
// 事件绑在 el（<main id="view">）上，因为 .detail 会被 render 重建；
// 每次 render 都会重挂，所以先解绑旧监听器再挂新的。
function attachSwipeGesture(el) {
  if (el._swipeCleanup) el._swipeCleanup();
  el._swipeCleanup = null;
  if (siblingCtx.ids.length <= 1) return;

  const detail = el.querySelector(".detail");
  if (!detail) return;
  const relatedScroll = el.querySelector(".related-scroll");

  let sx = 0, sy = 0, dx = 0, dy = 0, tStart = 0;
  let tracking = false;      // 已通过方向判定，正在跟踪
  let disqualified = false;  // 已被判定为纵向滚动或起点落在相关推荐区，本次手势忽略

  const THRESHOLD_DIST = 60;        // px，翻页最小位移
  const THRESHOLD_VELOCITY = 0.35;  // px/ms，翻页最小释放速度
  const DIR_JUDGE_DIST = 8;         // px，方向判定阈值
  const MAX_FADE = 0.65;            // 最大透明度衰减

  const onStart = (e) => {
    // 相关推荐区起点：直接放弃（避免和横滑冲突）
    if (relatedScroll && relatedScroll.contains(e.target)) {
      disqualified = true;
      return;
    }
    // 图片查看器打开时不接管
    if (document.querySelector(".viewer")) {
      disqualified = true;
      return;
    }
    sx = e.clientX; sy = e.clientY;
    dx = 0; dy = 0;
    tStart = performance.now();
    tracking = false;
    disqualified = false;
  };

  const onMove = (e) => {
    if (disqualified) return;
    dx = e.clientX - sx;
    dy = e.clientY - sy;
    if (!tracking) {
      // 未判定方向：等到累计移动 >= 8px 再判定
      if (Math.hypot(dx, dy) < DIR_JUDGE_DIST) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // 纵向占优 → 让页面自然滚动，本次手势不接管
        disqualified = true;
        return;
      }
      tracking = true;
    }
    // 已进入跟踪：只调 opacity，不动 transform
    const fade = Math.min(Math.abs(dx) / THRESHOLD_DIST, MAX_FADE);
    detail.style.opacity = String(1 - fade);
    // 显示方向侧羽箭
    showSwipeHint(el, dx < 0 ? "right" : "left");
  };

  const onEnd = () => {
    if (disqualified || !tracking) {
      detail.style.opacity = "";
      hideSwipeHint(el);
      return;
    }
    hideSwipeHint(el);
    const dt = performance.now() - tStart;
    const velocity = Math.abs(dx) / Math.max(dt, 1);
    const hit = Math.abs(dx) >= THRESHOLD_DIST || velocity >= THRESHOLD_VELOCITY;
    if (hit) {
      // 命中：dx < 0（左滑）→ 下一幅 → direction = +1
      detail.style.opacity = ""; // switchTo 内自己控制淡入淡出
      switchTo(el, dx < 0 ? +1 : -1);
    } else {
      // 未命中：回弹到 opacity 1，240ms
      detail.style.transition = "opacity 240ms ease";
      detail.style.opacity = "1";
      setTimeout(() => {
        detail.style.transition = "";
        detail.style.opacity = "";
      }, 260);
    }
    tracking = false;
  };

  el.addEventListener("pointerdown", onStart, { passive: true });
  el.addEventListener("pointermove", onMove, { passive: true });
  el.addEventListener("pointerup", onEnd, { passive: true });
  el.addEventListener("pointercancel", onEnd, { passive: true });

  el._swipeCleanup = () => {
    el.removeEventListener("pointerdown", onStart);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onEnd);
    el.removeEventListener("pointercancel", onEnd);
  };
}

function showSwipeHint(el, side) {
  let hint = el.querySelector(".detail-swipe-hint");
  if (!hint) {
    const host = el.querySelector(".detail");
    if (!host) return;
    hint = document.createElement("div");
    hint.className = "detail-swipe-hint";
    host.appendChild(hint);
  }
  hint.classList.remove("left", "right");
  hint.classList.add(side);
  hint.textContent = side === "right" ? "→" : "←";
  hint.style.opacity = "1";
}

function hideSwipeHint(el) {
  const hint = el.querySelector(".detail-swipe-hint");
  if (hint) hint.style.opacity = "0";
}

function showEndNotice(el, text) {
  let n = el.querySelector(".detail-end-notice");
  if (n) n.remove();
  const host = el.querySelector(".detail");
  if (!host) return;
  n = document.createElement("div");
  n.className = "detail-end-notice";
  n.textContent = text;
  host.appendChild(n);
  requestAnimationFrame(() => n.classList.add("visible"));
  setTimeout(() => {
    n.classList.remove("visible");
    setTimeout(() => n.remove(), 300);
  }, 1500);
}

// 相关作品可能横跨多期：把缺失的期文件预取进 SW 缓存（去重 + 限量在 SW 内做），
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
