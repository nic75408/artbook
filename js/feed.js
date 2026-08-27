// Feed 视图（SPE §7.3）：竖滑 snap、跨期连播、懒加载、日期胶囊、位置记忆
import { WORDMARK } from "../config.js";
import * as data from "./data.js";
import { navigate } from "./router.js";
import { esc, icons, learnBtnSVG } from "./ui.js";
import { Icon } from "./icons/Icon.js";

const POS_KEY = "artbook.feedpos";
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
  } catch (e) {
    el.querySelector(".feed-scroller").innerHTML = `
      <div class="empty"><div class="wordmark brand-title">${esc(WORDMARK)}</div>
      <p>暂时加载不出来</p>
      <button class="action-btn" id="retry">重试</button></div>`;
    el.querySelector("#retry").addEventListener("click", () => navigate("#/"));
  }
}

function slideHTML(w, date) {
  const ph = w.palette?.[0] ? `background:${w.palette[0]}` : "";
  return `
  <section class="slide" data-id="${esc(w.id)}" data-issue="${date}">
    <div class="frame" style="--r:${w.image.ratio}">
      <div class="ph" style="${ph}">
        <img data-src="${esc(w.image.feed)}" alt="${esc(w.title_zh)}" loading="lazy" decoding="async">
      </div>
    </div>
    <div class="names">
      <div class="artist-zh work-title">${esc(w.artist_zh)}</div>
      <div class="title-en meta-text">${esc(w.title_en)}</div>
    </div>
    <button class="learn-btn" data-go="${esc(w.id)}" aria-label="了解更多">${learnBtnSVG(w.id)}</button>
  </section>`;
}

function buildSlides() {
  scroller.innerHTML = "";
  totalSlides = 0;
  endShown = false;
  for (const { date, works } of loaded) {
    for (const w of works) {
      scroller.insertAdjacentHTML("beforeend", slideHTML(w, date));
      totalSlides++;
    }
  }
  scroller.querySelectorAll(".slide").forEach((s, i) => {
    const sw = slideWorkAt(i);
    s.dataset.issue = sw.issue;
    s.querySelector(".frame").addEventListener("click", () => {
      savePos();
      navigate(`#/work/${sw.work.id}`);
    });
    s.querySelector(".learn-btn").addEventListener("click", (ev) => {
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
  for (let i = 0; i < slides.length; i++) {
    const img = slides[i].querySelector("img");
    if (!img || img.dataset.src === undefined) continue;
    if (Math.abs(i - center) <= 2) {
      const src = img.dataset.src;
      delete img.dataset.src;
      img.src = src;
      img.addEventListener("load", () => img.classList.add("loaded"), { once: true });
    }
  }
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
    s.querySelector(".learn-btn").addEventListener("click", (ev) => {
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
