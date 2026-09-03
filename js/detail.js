// 详情视图（SPE §7.4）：大图、全屏缩放、元数据表、圆形细节、赏析、相关推荐
// t_e578fc0d：跨日期连续浏览 + 下拉退出 + 首页定位（SPEC docs/detail-navigation-spec.md B 案）
import * as data from "./data.js";
import { back, navigate, readFolioCtx, writeFolioCtx } from "./router.js";
import { isFav, toggleFav } from "./favorites.js";
import { esc, icons, toast, Icon } from "./ui.js";
import { BrandWordmark } from "./icons/BrandWordmark.js";
import { POS_KEY } from "./feed.js";
import { markViewed } from "./viewed.js";

// t_13662686：同期序列，mount 时刷新。用模块级变量而非闭包，
// 是因为切换到下一幅时 render 会重跑，闭包每次会重置，需要跨 render 保持序列。
// t_b944f6c5 §3.2：新增 source/meta——由进入路径决定的 folio 归属与展示元数据。
let siblingCtx = { ids: [], index: -1, issue: null, source: "feed", meta: null };

// t_e578fc0d §4：跨日期序列上下文。issues 是 index.json.issues（倒序，最新在前），
// issueIdx 是 siblingCtx.issue 在其中的位置。
let crossCtx = { issues: [], issueIdx: -1 };

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
  // t_b944f6c5 §3.2：先看有没有外部传入的 folio 上下文（收藏夹/相关推荐/聚合页
  // click handler 在 navigate 前写入），命中且确实包含当前 id 才采用；
  // 否则回退到 feed 默认语义（data.siblingsInIssue）。
  const ctx = readFolioCtx();
  if (ctx && ctx.entryId === id && Array.isArray(ctx.ids) && ctx.ids.includes(id)) {
    siblingCtx = {
      ids: ctx.ids,
      index: ctx.ids.indexOf(id),
      issue: null,
      source: ctx.source || "feed",
      meta: ctx.meta || null,
    };
  } else {
    try {
      const s = await data.siblingsInIssue(id);
      siblingCtx = { ...s, source: "feed", meta: null };
    } catch {
      siblingCtx = { ids: [], index: -1, issue: null, source: "feed", meta: null };
    }
  }

  // t_e578fc0d §4：加载跨期上下文，为边界跨期翻页做准备。
  // t_b944f6c5 §3.3：跨期逻辑只在 feed 语义下有意义——非 feed 入口留空 issues，
  // nextIssueDate()/prevIssueDate() 自然恒返回 null。
  if (siblingCtx.source === "feed") {
    try {
      const idx = await data.loadIndex();
      const issues = idx.issues || [];
      crossCtx = { issues, issueIdx: issues.indexOf(siblingCtx.issue) };
    } catch {
      crossCtx = { issues: [], issueIdx: -1 };
    }
  } else {
    crossCtx = { issues: [], issueIdx: -1 };
  }

  render(el, work);
}

function render(el, w) {
  const ratio = w.image.ratio || 1;
  // R4（DETAIL-SPEC）：超宽横幅（ratio <= 0.4，即宽/高 >= 2.5）头图旋转 90°
  // 变竖版展示，避免画作被压成一条细横带。CSS 侧 .detail-hero-ultra-wide
  // 依赖内联 --r 自定义属性（不是 .ph 的 aspect-ratio 内联值）来反转比例。
  const isUltraWide = ratio <= 0.4;

  // 构建在馆信息
  const creditMuseum = w.credit ? w.credit.replace(/,.*$/, '').trim() : '';

  el.innerHTML = `\n  <div class="detail">\n    <div class="detail-hero${isUltraWide ? ' detail-hero-ultra-wide' : ''}" ${isUltraWide ? `style="--r:${ratio}"` : ''}>\n      <div class="ph" style="${isUltraWide ? '' : `aspect-ratio:calc(1/${ratio})`}">\n        <img data-src="${esc(w.image.full)}" alt="${esc(w.title_zh)}" loading="eager" fetchpriority="high" decoding="async" draggable="false">\n      </div>\n      <!-- t_a312968d: 关闭按钮废弃，改为左上角统一返回按钮 -->\n      <button class="detail-back" aria-label="返回">${Icon('nav-back-outline', { size: 20, hidden: true })}</button>\n      <button class="detail-fav-top" id="fav-top-act" aria-label="收藏" aria-pressed="false">${icons.bookmark}</button>\n    </div>

    <!-- 作品信息块：紧邻主图，标签 + 图像组合 -->
    <div class="artwork-info-card">
      <!-- t_6fe0245e：数字 folio → 迷你滑轨；t_8d4351d6：滑轨 → 印刷页码字符「NN · total」
           位于信息卡首元素，单幅不渲染。role=doc-pagenumber 是印刷页码的语义角色，
           与之前的 role=progressbar 不同——它是"静态标注"，不是"进度控件"。 -->
      ${siblingCtx.ids.length > 1 ? `
      <div class="detail-folio-mark"
           role="doc-pagenumber"
           aria-label="第 ${siblingCtx.index + 1} 幅，共 ${siblingCtx.ids.length} 幅">
        ${folioPrefixHTML(siblingCtx.source)}${String(siblingCtx.index + 1).padStart(2, '0')} <span class="detail-folio-mark__sep" aria-hidden="true">·</span> ${siblingCtx.ids.length}
      </div>
      ` : ''}

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
  
  // t_f2d585b6（2026-09-03）：记录当前作品为已看，用于相关推荐去重
  markViewed(w.id);
  
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
  // t_a312968d: 返回按钮事件绑定（图标已在 HTML 模板中生成）
  el.querySelector(".detail-back").addEventListener("click", () => back());

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

  // 收藏按钮：底部文字按钮 + 顶部纯 icon 按钮（t_436a7dc5），两者状态实时同步
  const favBtn = el.querySelector("#fav-act");
  const favTopBtn = el.querySelector("#fav-top-act");
  const paintFav = () => {
    const on = isFav(w.id);
    favBtn.classList.toggle("on", on);
    favBtn.innerHTML = on ? `${icons.bookmarkFilled} 已收藏` : `${icons.bookmark} 收藏`;
    favTopBtn.classList.toggle("on", on);
    favTopBtn.innerHTML = on ? icons.bookmarkFilled : icons.bookmark;
    favTopBtn.setAttribute("aria-pressed", String(on));
    favTopBtn.setAttribute("aria-label", on ? "取消收藏" : "收藏");
  };
  paintFav();
  const handleToggle = () => {
    const { ok } = toggleFav(w.id);
    if (!ok) {
      toast("当前浏览器环境无法保存收藏");
      return;
    }
    paintFav();
  };
  favBtn.addEventListener("click", handleToggle);
  favTopBtn.addEventListener("click", handleToggle);

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
      card.addEventListener("click", () => {
        writeFolioCtx({
          source: "related",
          ids: list.map((r) => r.id),
          entryId: card.dataset.go,
          meta: { title: "相关推荐" },
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
          im.src = s;
          // 命中强缓存时 load 可能同步触发，监听器还没挂上就已经完成（t_76418473）
          if (im.complete && im.naturalWidth > 0) im.classList.add("loaded");
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

  // t_13662686 + t_e578fc0d：详情页左右滑动切换（同/跨日期）+ 下拉退出
  attachGestures(el);
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

// t_b944f6c5 §4：折角标记的 source 前缀。收藏/相关固定文案；聚合页按 grouping
// 前缀区分"画家"还是"标签"。feed 语义（默认）不加前缀，维持现状。
function folioPrefixHTML(source) {
  const meta = siblingCtx.meta || {};
  let label = null;
  if (source === "favorites") label = "收藏";
  else if (source === "related") label = "相关";
  else if (source === "collection") {
    const grouping = meta.grouping || "";
    label = grouping.startsWith("artist:") ? "画家" : grouping.startsWith("tag:") ? "标签" : null;
  }
  if (!label) return "";
  return `<span class="detail-folio-mark__prefix">${esc(label)} ·</span> `;
}

function reducedMotion() {
  return typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// 缩短所有转场时长到 30ms（reduced-motion 兜底，CSS 侧同步用 !important 压时长）
function dur(ms) {
  return reducedMotion() ? 30 : ms;
}

// 跨期上下文：更早的一期（issues 列表里 index+1）
function nextIssueDate() {
  if (crossCtx.issueIdx < 0) return null;
  return crossCtx.issues[crossCtx.issueIdx + 1] || null;
}
// 跨期上下文：更新的一期（issues 列表里 index-1）
function prevIssueDate() {
  if (crossCtx.issueIdx < 0) return null;
  return crossCtx.issues[crossCtx.issueIdx - 1] || null;
}

function abbrevDate(dateStr) {
  const parts = (dateStr || "").split("-").map(Number);
  if (parts.length < 3) return dateStr || "";
  return `${parts[1]}/${parts[2]}`;
}

function fullDate(dateStr) {
  const parts = (dateStr || "").split("-").map(Number);
  if (parts.length < 3) return dateStr || "";
  return `${parts[1]} 月 ${parts[2]} 日`;
}

// t_e578fc0d §6.3：详情页每次成功切换到新作品都要写这条契约，
// 值是新作品在 index.json 扁平序列中的位置（getFeedIndex），
// 让退出后首页能停在「刚才看到的那一幅」。隐私模式下 setItem 抛错静默失败（§6.4）。
function savePosAfterSwitch(workId, issue) {
  data.getFeedIndex(workId).then((flatIndex) => {
    if (flatIndex < 0) return;
    try {
      sessionStorage.setItem(POS_KEY, JSON.stringify({ issue, index: flatIndex }));
    } catch {
      /* 隐私模式，忽略 */
    }
  }).catch(() => { /* 查不到扁平位置：不更新，保留上一次的记录 */ });
}

// t_13662686：页内数据切换（不走 router）
// 不用 navigate(#/work/<nextId>)：router.js 的 handle() 会重置 #view.innerHTML
// 并重跑 main 的 enter 动画，打断淡入淡出。就地重渲染 + history.replaceState
// 保持深链正确，返回按钮仍能回到 feed（栈里的 #/ 未被污染）。
// direction: -1 = 上一幅（右滑），+1 = 下一幅（左滑）
async function switchTo(el, direction) {
  const { ids, index } = siblingCtx;
  const next = index + direction;
  if (next >= 0 && next < ids.length) {
    await switchWithinIssue(el, next);
    return;
  }
  // 已到同期边界：尝试跨日期（t_e578fc0d §4.1）
  const targetDate = direction > 0 ? nextIssueDate() : prevIssueDate();
  if (!targetDate) {
    showEndNotice(el, direction < 0 ? "今日推荐已到首幅" : "今日推荐已到末幅");
    return;
  }
  await switchAcrossIssue(el, targetDate, direction);
}

// 场景一 · 同日期切换（冻结数值，见 SPEC §3）：240ms 淡出 → 换数据 → 240ms 淡入（40ms 延迟）
async function switchWithinIssue(el, next) {
  const { ids } = siblingCtx;
  const nextId = ids[next];
  const layer = el.querySelector(".detail");
  if (!layer) return;
  layer.classList.add("fade-out");
  await wait(dur(240));
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
  history.replaceState(null, "", `#/work/${nextId}`);
  savePosAfterSwitch(nextId, siblingCtx.issue);
}

// 场景二 · 跨日期连续浏览（新增，SPEC §4）：480ms 换册转场 + 中央金色日期条
async function switchAcrossIssue(el, targetDate, direction) {
  const layer = el.querySelector(".detail");
  if (!layer) return;
  layer.classList.add("dateflip-out");
  const banner = showDateFlipBanner(el, targetDate);
  await wait(dur(80));

  let issue = null;
  try {
    issue = await data.loadIssue(targetDate);
  } catch {
    issue = null;
  }
  const ids = (issue && issue.works || []).map((w) => w.id);
  if (!ids.length) {
    layer.classList.remove("dateflip-out");
    banner?.remove();
    showEndNotice(el, direction < 0 ? "今日推荐已到首幅" : "今日推荐已到末幅");
    return;
  }
  const targetIndex = direction > 0 ? 0 : ids.length - 1;
  const nextId = ids[targetIndex];
  let nextWork = null;
  try {
    nextWork = await data.getWork(nextId);
  } catch {
    nextWork = null;
  }
  if (!nextWork) {
    layer.classList.remove("dateflip-out");
    banner?.remove();
    return;
  }

  siblingCtx = { ids, index: targetIndex, issue: targetDate };
  crossCtx.issueIdx = crossCtx.issues.indexOf(targetDate);

  render(el, nextWork);
  window.scrollTo({ top: 0, behavior: "instant" });
  const newLayer = el.querySelector(".detail");
  if (newLayer) {
    newLayer.classList.add("dateflip-in");
    if (reducedMotion()) {
      setTimeout(() => newLayer.classList.remove("dateflip-in"), dur(30));
    } else {
      newLayer.addEventListener("animationend", () => newLayer.classList.remove("dateflip-in"), { once: true });
    }
  }
  history.replaceState(null, "", `#/work/${nextId}`);
  savePosAfterSwitch(nextId, targetDate);
}

// 手势语义：画面不做水平位移，只做 opacity 反馈；命中翻页则触发淡入淡出转场。
// 下滑手势（t_e578fc0d §5）：轻位移 + 轻透明衰减跟手，命中则触发退出转场。
// 事件绑在 el（<main id="view">）上，因为 .detail 会被 render 重建；
// 每次 render 都会重挂，所以先解绑旧监听器再挂新的。
// 判定顺序（SPEC §2）：起点校验 → 方向判定阈值 8px → 主导轴判定 → 分派，不允许中途换轨。
function attachGestures(el) {
  if (el._swipeCleanup) el._swipeCleanup();
  el._swipeCleanup = null;

  const detail = el.querySelector(".detail");
  if (!detail) return;
  const relatedScroll = el.querySelector(".related-scroll");
  // 防御性检查：siblingCtx 必须有 ids 才能启用横向手势
  const hasHorizontal = siblingCtx && siblingCtx.ids && siblingCtx.ids.length > 1;

  let sx = 0, sy = 0, dx = 0, dy = 0, tStart = 0, startScrollY = 0;
  let axis = null;           // null | 'h' | 'v' —— 已判定的手势轴，判定后不换轨
  let disqualified = false;  // 本次手势起点不合法或已被让渡给页面默认行为

  const THRESHOLD_DIST = 60;             // px，同期翻页最小位移
  const THRESHOLD_VELOCITY = 0.35;       // px/ms，同期翻页最小释放速度
  const THRESHOLD_DIST_CROSS = 96;       // px，跨期翻页最小位移（§4.1）
  const THRESHOLD_VELOCITY_CROSS = 0.42; // px/ms，跨期翻页最小释放速度（§4.1）
  const DIR_JUDGE_DIST = 8;              // px，方向判定阈值
  const MAX_FADE = 0.65;                 // 最大透明度衰减

  const PULL_DIST = 96;      // px，下拉退出最小位移（§5.1）
  const PULL_VELOCITY = 0.45;// px/ms，下拉退出最小释放速度（§5.1）
  const PULL_OPACITY_SPAN = 240; // px，opacity 衰减到 0 的位移跨度（§5.2）
  const PULL_DAMP = 0.5;     // 阻尼系数（§5.2）
  const PULL_MAX_TY = 48;    // px，跟手位移上限（§5.2）

  const EXIT_STAGE1 = 60;    // px，t_b944f6c5 §5.1：0-60 回弹阶段终点
  const EXIT_CONFIRM = 120;  // px，t_b944f6c5 §5.1：≥120 确认退出阈值
  const EXIT_VELOCITY = 0.55;// px/ms，t_b944f6c5 §5.1：释放速度确认阈值

  const isTransitioning = () =>
    detail.classList.contains("fade-out") || detail.classList.contains("fade-in") ||
    detail.classList.contains("dateflip-out") || detail.classList.contains("dateflip-in") ||
    detail.classList.contains("exiting");

  const onStart = (e) => {
    // 图片查看器打开时不接管
    if (document.querySelector(".viewer")) {
      disqualified = true;
      return;
    }
    // 转场进行中：忽略新手势（SPEC §2）
    if (isTransitioning()) {
      disqualified = true;
      return;
    }
    // 相关推荐区起点：直接放弃（避免和横滑冲突）
    if (relatedScroll && relatedScroll.contains(e.target)) {
      disqualified = true;
      return;
    }
    sx = e.clientX; sy = e.clientY;
    dx = 0; dy = 0;
    tStart = performance.now();
    // iOS Safari 橡皮筋回弹可能让 scrollY 短暂为负数，视同 0（§5.5）
    startScrollY = Math.max(window.scrollY, 0);
    axis = null;
    disqualified = false;
    // t_a312968d: 右滑边缘返回手势检测 —— 起点在右边缘 30px 内
    const EDGE_ZONE = 30;
    if (window.innerWidth - sx <= EDGE_ZONE) {
      // 右边缘起点，标记为返回手势候选
      axis = 'edge-back';
    }
  };

  const onMove = (e) => {
    if (disqualified) return;
    dx = e.clientX - sx;
    dy = e.clientY - sy;
    // t_a312968d: 右滑边缘返回手势 —— 已在右边缘起点，只检测向左滑动
    if (axis === 'edge-back') {
      // 向左滑动时提供视觉反馈（透明度衰减）
      if (dx < 0) {
        const EDGE_THRESHOLD = 80;
        const fade = Math.min(Math.abs(dx) / EDGE_THRESHOLD, 0.3);
        detail.style.opacity = String(1 - fade);
      }
      return;
    }
    if (axis === null) {
      if (Math.hypot(dx, dy) < DIR_JUDGE_DIST) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        // 纵向占优：只有起点已在顶部且向下滑才接管为退出手势，
        // 否则让给页面正常滚动（§5.5 实现提示：pointerdown 时读一次 scrollY，
        // 不在 pointermove 中反复读取）
        if (startScrollY <= 0 && dy > 0) {
          axis = "v";
        } else {
          disqualified = true;
          return;
        }
      } else {
        if (!hasHorizontal) {
          disqualified = true;
          return;
        }
        axis = "h";
      }
    }

    if (axis === "h") {
      const atBoundary = (dx < 0 && siblingCtx.index === siblingCtx.ids.length - 1) ||
                          (dx > 0 && siblingCtx.index === 0);
      // t_b944f6c5 §5：非 feed 入口没有跨期语义，边界继续滑直接进入退出手势
      // 三段式反馈（showExitHint）；feed 语义维持既有跨期/到头到尾逻辑不变。
      const targetDate = atBoundary ? (dx < 0 ? nextIssueDate() : prevIssueDate()) : null;
      // t_b944f6c5 §3.3/§5：非 feed 语义的入口无跨期概念，边界继续滑直接是退出手势；
      // feed 语义即使真到头/到尾（没有更多期）仍走既有 showEndNotice，不动。
      const isExitBoundary = atBoundary && siblingCtx.source !== "feed";
      if (isExitBoundary) {
        hideSwipeHint(el);
        const absdx = Math.abs(dx);
        const opacity = Math.max(1 - Math.min(absdx, EXIT_STAGE1) / EXIT_STAGE1 * 0.5, 0.5);
        detail.style.opacity = String(opacity);
        const side = dx > 0 ? "left" : "right"; // 右滑(dx>0)在首幅→X 出现在左侧；左滑在末幅→X 出现在右侧
        if (absdx >= EXIT_STAGE1) {
          const t = Math.min((absdx - EXIT_STAGE1) / (EXIT_CONFIRM - EXIT_STAGE1), 1);
          showExitHint(el, side, { intensity: t, confirmed: absdx >= EXIT_CONFIRM });
        } else {
          hideExitHint(el);
        }
        return;
      }
      hideExitHint(el);
      const thresholdDist = atBoundary ? THRESHOLD_DIST_CROSS : THRESHOLD_DIST;
      const fade = Math.min(Math.abs(dx) / thresholdDist, MAX_FADE);
      detail.style.opacity = String(1 - fade);
      if (atBoundary && Math.abs(dx) > THRESHOLD_DIST) {
        // 60px → 96px 窗口：羽箭放大 + 显示目标日期（§4.5）
        const t = Math.min(Math.max((Math.abs(dx) - THRESHOLD_DIST) / (THRESHOLD_DIST_CROSS - THRESHOLD_DIST), 0), 1);
        const w = 44 + t * (54 - 44);
        const h = 60 + t * (84 - 60);
        showSwipeHint(el, dx < 0 ? "right" : "left", {
          width: w, height: h,
          dateText: targetDate ? abbrevDate(targetDate) : null,
        });
      } else {
        showSwipeHint(el, dx < 0 ? "right" : "left");
      }
    } else if (axis === "v") {
      const d = Math.max(dy, 0);
      const ty = Math.min(d * PULL_DAMP, PULL_MAX_TY);
      const op = Math.max(0.55, 1 - d / PULL_OPACITY_SPAN);
      detail.style.transform = `translate3d(0, ${ty}px, 0)`;
      detail.style.opacity = String(op);
    }
  };

  const onEnd = () => {
    // t_a312968d: 右滑边缘返回手势 —— 向左滑动≥80px 触发返回
    if (axis === 'edge-back') {
      detail.style.opacity = "";
      const EDGE_THRESHOLD = 80;
      if (dx < -EDGE_THRESHOLD) {
        // 触发返回
        back();
      }
      axis = null;
      return;
    }
    if (disqualified || axis === null) {
      detail.style.opacity = "";
      detail.style.transform = "";
      hideSwipeHint(el);
      axis = null;
      return;
    }
    if (axis === "h") {
      hideSwipeHint(el);
      hideExitHint(el);
      const dt = performance.now() - tStart;
      const velocity = Math.abs(dx) / Math.max(dt, 1);
      const atBoundary = (dx < 0 && siblingCtx.index === siblingCtx.ids.length - 1) ||
                          (dx > 0 && siblingCtx.index === 0);
      const targetDate = atBoundary ? (dx < 0 ? nextIssueDate() : prevIssueDate()) : null;
      const isExitBoundary = atBoundary && siblingCtx.source !== "feed";
      if (isExitBoundary) {
        // t_b944f6c5 §5.1：位移 ≥120px 或速度 ≥0.55px/ms 命中退出
        const hitExit = Math.abs(dx) >= EXIT_CONFIRM || velocity >= EXIT_VELOCITY;
        if (hitExit) {
          detail.style.opacity = "";
          exitDetail(el);
        } else {
          detail.style.transition = "opacity 240ms ease";
          detail.style.opacity = "1";
          setTimeout(() => {
            detail.style.transition = "";
            detail.style.opacity = "";
          }, 260);
        }
        axis = null;
        return;
      }
      const thresholdDist = atBoundary ? THRESHOLD_DIST_CROSS : THRESHOLD_DIST;
      const thresholdVelocity = atBoundary ? THRESHOLD_VELOCITY_CROSS : THRESHOLD_VELOCITY;
      const hit = Math.abs(dx) >= thresholdDist || velocity >= thresholdVelocity;
      if (hit) {
        detail.style.opacity = "";
        switchTo(el, dx < 0 ? +1 : -1);
      } else {
        detail.style.transition = "opacity 240ms ease";
        detail.style.opacity = "1";
        setTimeout(() => {
          detail.style.transition = "";
          detail.style.opacity = "";
        }, 260);
      }
    } else if (axis === "v") {
      const dt = performance.now() - tStart;
      const d = Math.max(dy, 0);
      const vy = d / Math.max(dt, 1);
      const hit = d >= PULL_DIST || vy >= PULL_VELOCITY;
      if (hit) {
        exitDetail(el);
      } else {
        // 未命中：回弹（§5.3）
        detail.style.transition = "opacity 240ms cubic-bezier(0.16, 1, 0.3, 1), transform 240ms cubic-bezier(0.16, 1, 0.3, 1)";
        detail.style.opacity = "";
        detail.style.transform = "";
        setTimeout(() => {
          detail.style.transition = "";
        }, 260);
      }
    }
    axis = null;
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

// 场景三 · 下拉退出详情页（新增，SPEC §5.4）：书页合起 —— 向下轻沉 24px + 缓慢透出，320ms
function parseTranslateY(transformStr) {
  const m = /translate3d\(0,\s*([-\d.]+)px/.exec(transformStr || "");
  return m ? parseFloat(m[1]) : 0;
}

async function exitDetail(el) {
  const detail = el.querySelector(".detail");
  if (!detail) return;
  detail.classList.add("exiting"); // 阻断 pointer 事件（§5.4）
  const currentTy = parseTranslateY(detail.style.transform);
  detail.style.transition = `opacity ${dur(320)}ms cubic-bezier(0.32, 0.72, 0, 1), transform ${dur(320)}ms cubic-bezier(0.32, 0.72, 0, 1)`;
  requestAnimationFrame(() => {
    detail.style.opacity = "0";
    detail.style.transform = `translate3d(0, ${currentTy + 24}px, 0)`;
  });
  await wait(dur(320));
  back();
}

// 跨期中央金色日期条（§4.4）：仅在跨期时短暂出现，480ms 淡入-停留-淡出
function showDateFlipBanner(el, dateStr) {
  const host = el.querySelector(".detail");
  if (!host) return null;
  const banner = document.createElement("div");
  banner.className = "date-flip-banner";
  banner.textContent = fullDate(dateStr);
  host.appendChild(banner);
  if (reducedMotion()) {
    // 无 opacity 动画，直接切换 + 短暂显示
    banner.classList.add("reduced");
    setTimeout(() => banner.remove(), dur(480));
  } else {
    banner.addEventListener("animationend", () => banner.remove(), { once: true });
  }
  return banner;
}

function showSwipeHint(el, side, opts = {}) {
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
  const arrow = side === "right" ? "→" : "←";
  hint.textContent = opts.dateText ? (side === "right" ? `${opts.dateText} ${arrow}` : `${arrow} ${opts.dateText}`) : arrow;
  hint.style.opacity = "1";
  hint.style.width = opts.width != null ? `${opts.width}px` : "";
  hint.style.height = opts.height != null ? `${opts.height}px` : "";
}

function hideSwipeHint(el) {
  const hint = el.querySelector(".detail-swipe-hint");
  if (hint) {
    hint.style.opacity = "0";
    hint.style.width = "";
    hint.style.height = "";
  }
}

// t_b944f6c5 §5.1：folio 首/末幅继续滑的退出提示——40×40 米色雾玻璃 X（同
// .detail-close 语言）+ "松手退出" 文案，透明度随位移在 0.4→0.9→1.0 三段推进。
function showExitHint(el, side, { intensity, confirmed }) {
  let hint = el.querySelector(".detail-exit-hint");
  if (!hint) {
    const host = el.querySelector(".detail");
    if (!host) return;
    hint = document.createElement("div");
    hint.className = "detail-exit-hint";
    hint.innerHTML = `<span class="detail-exit-hint__x">${icons.x}</span><span class="detail-exit-hint__label">松手退出</span>`;
    host.appendChild(hint);
  }
  hint.classList.remove("left", "right");
  hint.classList.add(side);
  hint.classList.toggle("confirmed", !!confirmed);
  const opacity = confirmed ? 1 : 0.4 + Math.max(0, Math.min(intensity, 1)) * 0.5;
  hint.style.opacity = String(opacity);
}

function hideExitHint(el) {
  const hint = el.querySelector(".detail-exit-hint");
  if (hint) hint.remove();
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
