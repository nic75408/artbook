// Feed 视图（SPE §7.3）：竖滑 snap、跨期连播、懒加载、日期胶囊、位置记忆
import { WORDMARK } from "../config.js";
import * as data from "./data.js";
import { navigate } from "./router.js";
import { esc, icons } from "./ui.js";
import { Icon } from "./icons/Icon.js";

// 导出给 detail.js（t_e578fc0d §6.3）：详情页每次切换作品都要写这个 key，
// 与首页滚动时写入的 key 保持同一个常量，不新造 key。
export const POS_KEY = "artbook.feedpos";
let scroller = null;
let allDates = [];            // index.json issues（倒序）
let loaded = [];              // [{date, works}]
let totalSlides = 0;
let currentIndex = 0;
let endShown = false;
let rafPending = false;

export async function mount(el) {
  el.classList.add("feed");
  el.innerHTML = `
    <header class="feed-header">
      <div class="wordmark brand-title">${esc(WORDMARK)}</div>
      <button id="goto-favs" aria-label="收藏夹" title="收藏夹">${Icon('action-bookmark-outline', { size: 16, hidden: true })}<span>收藏夹</span></button>
    </header>
    <div class="feed-scroller"></div>
    <button class="date-capsule" id="date-capsule" aria-label="选择日期"></button>
  `;
  scroller = el.querySelector(".feed-scroller");
  el.querySelector("#goto-favs").addEventListener("click", () => {
    savePos();
    navigate("#/favs");
  });
  el.querySelector("#date-capsule").addEventListener("click", openDateSheet);

  try {
    const idx = await data.loadIndex();
    allDates = idx.issues || [];
    if (!allDates.length) throw new Error("index 为空");
    const saved = readPos();
    let startDate = allDates[0];
    if (saved && allDates.includes(saved.issue)) startDate = saved.issue;
    const issue = await data.loadIssue(startDate);
    loaded = [{ date: startDate, works: issue.works || [] }];
    // 首屏主图预加载（t_a450af65）：LCP 元素是第一幅作品的图，
    // 它的 URL 直到期数据解析完才知道。这里一拿到数据就立刻插 <link rel=preload>，
    // 让图片请求与后续的建 DOM / 布局并行，而不是等 DOM 建完才开始下载。
    preloadHeroImage(loaded[0].works[0]);
    buildSlides();
    updateCapsule(startDate);
    scroller.addEventListener("scroll", onScroll, { passive: true });
    if (saved && saved.issue === startDate && saved.index > 0) {
      requestAnimationFrame(() => {
        scroller.scrollTop = saved.index * scroller.clientHeight;
      });
    } else {
      scroller.scrollTop = 0;
    }
    ensureImages(currentIndex);
    // 后台缓存当期图片供离线使用。必须等首屏主图下载完再开始，
    // 否则 30 张图的预取会和首屏主图抢带宽（同 ensureImages 的理由）。
    afterImageSettled(scroller.querySelector(".slide img"), () =>
      prefetchIssueImages(loaded[0].works)
    );
  } catch (e) {
    el.querySelector(".feed-scroller").innerHTML = `
      <div class="empty"><div class="wordmark brand-title">${esc(WORDMARK)}</div>
      <p>暂时加载不出来</p>
      <button class="action-btn" id="retry">重试</button></div>`;
    el.querySelector("#retry").addEventListener("click", () => navigate("#/"));
  }
}

// 首屏主图预加载：把 LCP 图片的下载提前到「数据刚到手」这一刻，
// 不必等 DOM 构建完成。重复插入由 id 去重，切换期次时替换为新的一张。
function preloadHeroImage(work) {
  const url = work?.image?.feed;
  if (!url) return;
  const ID = "hero-preload";
  const existing = document.getElementById(ID);
  if (existing && existing.href === url) return;
  existing?.remove();
  const link = document.createElement("link");
  link.id = ID;
  link.rel = "preload";
  link.as = "image";
  link.href = url;
  link.fetchPriority = "high";
  document.head.appendChild(link);
}

function slideHTML(w, date, priority = false) {
  // 内容非空校验：缺失关键字段时使用兜底文案（SPE §7.4）
  const title = w.title_zh || '';
  const artist = w.artist_zh || '';
  const imageUrl = w.image?.feed || '';
  
  // 如果标题和作者都为空，使用兜底文案（作品 ID 不应暴露给用户）
  const displayTitle = title.trim() || '佚名作品';
  const displayArtist = artist.trim() || '未知艺术家';
  
  const ph = w.palette?.[0] ? `background:${w.palette[0]}` : "";
  // 加载优先级（t_a450af65）：一屏只显示一幅作品，所以只有第 1 幅是 LCP 元素，
  // 它独占 high 优先级；其余作品即便预加载也是「还没滑到」的，用 low 让出带宽。
  // 原先前 3 幅都是 eager+high，两幅看不见的图和 LCP 抢带宽，实测把 LCP 拖到 6.4s。
  const loadingAttr = priority ? 'loading="eager"' : 'loading="lazy"';
  const fetchPriority = priority ? 'fetchpriority="high"' : 'fetchpriority="low"';
  return `
  <section class="slide" data-id="${esc(w.id)}" data-issue="${date}">
    <div class="frame" style="--r:${w.image.ratio}">
      <div class="ph" style="${ph}">
        <img data-src="${esc(imageUrl)}" alt="${esc(displayTitle)}" ${loadingAttr} ${fetchPriority} decoding="async">
      </div>
    </div>
    <div class="names">
      <div class="artist-zh work-title">${esc(displayTitle)}</div>
      <div class="title-en meta-text">${esc(displayArtist)}</div>
    </div>
    <a class="learn-inline" data-go="${esc(w.id)}" href="#/work/${esc(w.id)}" aria-label="了解更多，查看详情">
      <span class="learn-inline__en">Continue reading</span>
      <span class="learn-inline__rule" aria-hidden="true"></span>
      <span class="learn-inline__zh">了解更多</span>
    </a>
  </section>`;
}

function buildSlides() {
  scroller.innerHTML = "";
  totalSlides = 0;
  endShown = false;
  let globalIndex = 0;
  for (const { date, works } of loaded) {
    for (const w of works) {
      // 只有首幅是首屏可见的 LCP 元素，独占 eager + high 优先级
      const priority = globalIndex === 0;
      scroller.insertAdjacentHTML("beforeend", slideHTML(w, date, priority));
      totalSlides++;
      globalIndex++;
    }
  }
  scroller.querySelectorAll(".slide").forEach((s, i) => {
    const sw = slideWorkAt(i);
    s.dataset.issue = sw.issue;
    s.querySelector(".frame").addEventListener("click", () => {
      savePos();
      navigate(`#/work/${sw.work.id}`);
    });
    s.querySelector(".learn-inline").addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      savePos();
      navigate(`#/work/${sw.work.id}`);
    });
  });
}

// 扁平索引 → {work, issue}
function slideWorkAt(i) {
  let acc = 0;
  for (const { date, works } of loaded) {
    if (i < acc + works.length) return { work: works[i - acc], issue: date };
    acc += works.length;
  }
  return null;
}

function onScroll() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    const h = scroller.clientHeight || window.innerHeight;
    currentIndex = Math.min(totalSlides - 1, Math.max(0, Math.round(scroller.scrollTop / h)));
    ensureImages(currentIndex);
    maybeLoadNextIssue();
  });
}

function ensureImages(center) {
  const slides = scroller.querySelectorAll(".slide");
  if (!slides.length) return;

  // 先把当前这幅挂上 src（必须先于相邻幅处理，否则下面的 afterCurrentImage
  // 会因为「当前幅还没 src」而误判为已完成，直接放行相邻幅去抢带宽）
  const centerImg = slides[center]?.querySelector("img");
  if (centerImg && centerImg.dataset.src !== undefined) {
    const src = centerImg.dataset.src;
    delete centerImg.dataset.src;
    centerImg.addEventListener("load", () => centerImg.classList.add("loaded"), { once: true });
    centerImg.src = src;
  }

  // 相邻幅只是预取，用户还没滑到 —— 等当前这幅下载完再开始。
  // fetchpriority 只影响发起顺序，一旦同时在飞就照样平分带宽
  // （t_a450af65 实测：3 张共 839KB，在 1.6Mbps 下把首屏主图的下载
  //   从 1.7s 拖到 4.2s）。
  for (let i = 0; i < slides.length; i++) {
    if (i === center) continue;
    const img = slides[i].querySelector("img");
    if (!img || img.dataset.src === undefined) continue;
    if (Math.abs(i - center) > 2) continue;
    const src = img.dataset.src;
    delete img.dataset.src;
    img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
    afterImageSettled(centerImg, () => {
      if (img.isConnected && !img.src) img.src = src;
    });
  }
}

// 等指定图片加载完（或已完成 / 失败）后，在空闲时机执行 fn。
// 图片不存在或已解码完成则直接排队，不会永久挂起。
function afterImageSettled(img, fn) {
  const run = () => {
    if ("requestIdleCallback" in window) requestIdleCallback(fn, { timeout: 1500 });
    else setTimeout(fn, 100);
  };
  if (!img || !img.getAttribute("src") || (img.complete && img.naturalWidth > 0)) {
    run();
    return;
  }
  img.addEventListener("load", run, { once: true });
  img.addEventListener("error", run, { once: true });
}

function maybeLoadNextIssue() {
  if (endShown) return;
  if (totalSlides - currentIndex > 3) return;
  const lastDate = loaded[loaded.length - 1].date;
  const pos = allDates.indexOf(lastDate);
  const next = pos >= 0 ? allDates[pos + 1] : undefined;
  if (!next) {
    endShown = true;
    scroller.insertAdjacentHTML(
      "beforeend",
      `<section class="endpage"><div class="wordmark">${esc(WORDMARK)}</div><p>已经翻到最早的一期了</p></section>`
    );
    return;
  }
  if (loaded.some((l) => l.date === next)) return;
  data.loadIssue(next)
    .then((issue) => {
      loaded.push({ date: next, works: issue.works || [] });
      const before = totalSlides;
      for (const w of issue.works || []) {
        scroller.insertAdjacentHTML("beforeend", slideHTML(w, next));
        totalSlides++;
      }
      rebindSlides(before);
    })
    .catch(() => {
      /* 期文件缺失：index 为权威，自然跳过（SPE §7.8） */
      allDates = allDates.filter((d) => d !== next);
    });
}

function rebindSlides(from) {
  const slides = scroller.querySelectorAll(".slide");
  for (let i = from; i < slides.length; i++) {
    const s = slides[i];
    const sw = slideWorkAt(i);
    if (!sw) continue;
    s.querySelector(".frame").addEventListener("click", () => {
      savePos();
      navigate(`#/work/${sw.work.id}`);
    });
    s.querySelector(".learn-inline").addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      savePos();
      navigate(`#/work/${sw.work.id}`);
    });
  }
}

function updateCapsule(date) {
  document.getElementById("date-capsule").innerHTML =
    `${esc(data.dateCapsule(date))} ${Icon('nav-chevron-down', { size: 16, hidden: true })}`;
}

function openDateSheet() {
  const backdrop = document.createElement("div");
  backdrop.className = "sheet-backdrop";
  const sheet = document.createElement("div");
  sheet.className = "sheet";
  sheet.innerHTML = `<div class="sheet-title">选择一期</div>` +
    allDates.map((d) =>
      `<button class="issue-row" data-date="${d}" style="${d === loaded[0].date ? "color:var(--gold)" : ""}">${esc(data.issueLabel(d))}</button>`
    ).join("");
  backdrop.addEventListener("click", close);
  sheet.querySelectorAll(".issue-row").forEach((b) =>
    b.addEventListener("click", () => {
      const date = b.dataset.date;
      close();
      jumpToIssue(date);
    })
  );
  document.body.appendChild(backdrop);
  document.body.appendChild(sheet);
  requestAnimationFrame(() => {
    backdrop.classList.add("show");
    sheet.classList.add("show");
  });
  function close() {
    backdrop.classList.remove("show");
    sheet.classList.remove("show");
    setTimeout(() => {
      backdrop.remove();
      sheet.remove();
    }, 250);
  }
}

function jumpToIssue(date) {
  data.loadIssue(date).then((issue) => {
    loaded = [{ date, works: issue.works || [] }];
    buildSlides();
    updateCapsule(date);
    currentIndex = 0;
    scroller.scrollTop = 0;
    ensureImages(0);
    savePos();
  });
}

// 当期 feed 图片后台预缓存（t_a450af65）：
// 首屏渲染完成后把当期图片 URL 交给 SW，让它在后台写进图片缓存。
// 用户往下滑时图片已在本地，断网后也能连图显示（验收标准 5）。
// 用 requestIdleCallback 让出主线程，绝不与首屏渲染抢资源；无 SW 环境静默跳过。
function prefetchIssueImages(works) {
  const urls = (works || []).map((w) => w.image?.feed).filter(Boolean);
  if (!urls.length) return;
  const send = () => {
    navigator.serviceWorker?.ready
      .then((reg) => {
        const target = reg.active || navigator.serviceWorker.controller;
        target?.postMessage({ type: "PREFETCH_IMAGES", urls });
      })
      .catch(() => {
        /* 无 SW 环境：跳过 */
      });
  };
  if ("requestIdleCallback" in window) requestIdleCallback(send, { timeout: 3000 });
  else setTimeout(send, 500);
}

function readPos() {
  try {
    return JSON.parse(sessionStorage.getItem(POS_KEY) || "null");
  } catch {
    return null;
  }
}

function savePos() {
  const sw = slideWorkAt(currentIndex);
  if (!sw) return;
  try {
    sessionStorage.setItem(POS_KEY, JSON.stringify({ issue: sw.issue, index: currentIndex }));
  } catch {
    /* 隐私模式，忽略 */
  }
}
