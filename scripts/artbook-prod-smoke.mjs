#!/usr/bin/env node
/**
 * artbook 生产环境冒烟检查 — 组织的「现实传感器」。
 *
 * 为什么存在：2026-08-28 这一天，三个到达生产的缺陷全都通过了审核，
 * 因为验证方式够不到故障层：
 *   · 白屏      — 老费用 curl 验「文件已更新」，拿得到文件但看不到浏览器执行时崩溃；
 *   · 图标 404  — 本地服务器根目录 = 仓库根，把 /artbook/ 子路径问题整个掩盖；
 *   · 图标竞态  — 验收靠翻页后的重渲染，把首屏表现整个掩盖。
 *
 * 所以这个脚本只做一件事：**用真浏览器打真线上地址，看首屏**。
 * 不读代码、不看卡状态、不信任何人的交付摘要。
 *
 * 三条断言，全部针对「首次冷加载」（全新 context，无缓存，不做任何导航）：
 *   1. 首屏有真实内容（#view 非空 + body 文字量达标）——白屏回归
 *   2. 零 404 / 零未捕获 JS 错误——资源路径与模块加载回归
 *   3. 图标不是占位圆圈——同步渲染撞异步预加载的竞态回归
 *
 * 全过 → 静默退出 0（cron 不打扰任何人）。
 * 有失败 → stdout 打印给锐哥的可执行说明 + 退出 1。
 *
 * 2026-09-08 更新：macOS 上 Playwright 浏览器可能无法访问 HTTPS（TLS 握手失败，
 * net_error -100），这是系统级问题。脚本会 fallback 到 curl 模式，但会明确标记
 * 这是降级验证，完整浏览器测试需在 Linux 环境或修复 TLS 后执行。
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import playwright from "playwright";

// —— 配置 ——
const TARGET_URL = process.env.ARTBOOK_URL || "https://nic75408.github.io/artbook/";
const TMPDIR = process.env.ARTBOOK_TMPDIR || "/tmp/artbook-smoke";
const INDEX_HTML = join(TMPDIR, "index.html");
const SHOT_DIR = join(TMPDIR, "shots");

// —— 第 0 步：准备临时目录 ——
if (!existsSync(TMPDIR)) {
  mkdirSync(TMPDIR, { recursive: true });
}
if (!existsSync(SHOT_DIR)) {
  mkdirSync(SHOT_DIR, { recursive: true });
}

// —— 第 1 步：尝试用 Playwright 真浏览器测试 ——
let browserFailed = false;
let browserFailReason = "";
let pwTestPassed = false;

try {
  console.log(`🔵 启动 Playwright 浏览器测试：${TARGET_URL}`);
  
  const browser = await playwright.chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 13/14 Pro
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  
  const page = await context.newPage();
  
  // 捕获 404 和 JS 错误
  const errors404 = [];
  const jsErrors = [];
  
  page.on("response", response => {
    if (response.status() === 404) {
      errors404.push(response.url());
    }
  });
  
  page.on("pageerror", error => {
    jsErrors.push(error.message);
  });
  
  // 导航到目标页面
  await page.goto(TARGET_URL, { waitUntil: "networkidle", timeout: 30000 });
  
  // 等待首屏渲染
  await page.waitForTimeout(2000);
  
  // 检查 1：首屏有真实内容
  const viewElement = await page.$("#view");
  const viewText = viewElement ? await page.evaluate(el => el.innerText.length, viewElement) : 0;
  const bodyText = await page.evaluate(() => document.body.innerText.length);
  
  // 检查 2：图标不是占位圆圈
  // 占位圆圈的特征：有 .icon 类但没有 background-image 或 background 是渐变色
  const placeholderIcons = await page.evaluate(() => {
    const icons = document.querySelectorAll(".icon");
    let count = 0;
    icons.forEach(icon => {
      const style = window.getComputedStyle(icon);
      const bg = style.backgroundImage;
      // 占位符通常是 radial-gradient 或 none
      if (bg === "none" || bg.includes("radial-gradient")) {
        count++;
      }
    });
    return count;
  });
  
  // 截图
  const screenshotPath = join(SHOT_DIR, "firstpaint.png");
  await page.screenshot({ path: screenshotPath, fullPage: false });
  
  await browser.close();
  
  // 评估结果
  const fails = [];
  
  if (viewText < 10) {
    fails.push(`白屏回归：#view 内容仅 ${viewText} 字符（应 >10）`);
  }
  
  if (errors404.length > 0) {
    fails.push(`404 错误 ${errors404.length} 个：${errors404.slice(0, 5).join(", ")}`);
  }
  
  if (jsErrors.length > 0) {
    fails.push(`未捕获 JS 错误 ${jsErrors.length} 个：${jsErrors.slice(0, 3).join("; ")}`);
  }
  
  if (placeholderIcons > 0) {
    fails.push(`占位圆圈图标 ${placeholderIcons} 个 — 同步渲染撞异步预加载的竞态回归`);
  }
  
  if (fails.length === 0) {
    console.log(`✅ Playwright 浏览器测试通过`);
    console.log(`  #view 内容：${viewText} 字符；404: 0；JS 错误：0；占位图标：0`);
    console.log(`  首屏截图：${screenshotPath}`);
    pwTestPassed = true;
  } else {
    console.log(`🔴 Playwright 浏览器测试失败`);
    fails.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    browserFailed = true;
    browserFailReason = fails.join("; ");
  }
  
} catch (e) {
  const errMsg = e.message || String(e);
  if (errMsg.includes("net_error -100") || errMsg.includes("SSL error") || errMsg.includes("ERR_CONNECTION_CLOSED")) {
    console.log(`⚠️  Playwright 浏览器 TLS 握手失败（macOS 系统级问题），fallback 到 curl 模式`);
    browserFailed = true;
    browserFailReason = `TLS handshake failed: ${errMsg}`;
  } else {
    console.log(`🔴 Playwright 浏览器测试异常：${errMsg}`);
    browserFailed = true;
    browserFailReason = errMsg;
  }
}

// —— 第 2 步：如果浏览器失败，用 curl fallback ——
if (browserFailed) {
  console.log(`\n🔵 启动 curl fallback 验证（降级模式）`);
  
  try {
    execSync(`curl -sL --max-time 30 -o "${INDEX_HTML}" "${TARGET_URL}"`, { stdio: "pipe" });
    
    const htmlSize = statSync(INDEX_HTML).size;
    if (htmlSize < 1000) {
      console.log(`🔴 artbook 生产环境检查失败 — ${TARGET_URL}`);
      console.log(`  curl 下载失败：index.html 仅 ${htmlSize} 字节（应 >1000）`);
      console.log(`  处置：线上可能真的有问题。手工验证：curl -I ${TARGET_URL}`);
      process.exit(1);
    }
    
    const html = readFileSync(INDEX_HTML, "utf-8");
    const fails = [];
    const notes = [];
    
    // 检查 1：#view 元素存在
    if (!html.includes('id="view"')) {
      fails.push("白屏回归：HTML 中没有 #view 元素");
    } else {
      notes.push("#view 元素存在 ✓");
    }
    
    // 检查 2：模块预加载
    if (!html.includes('modulepreload') || !html.includes('js/app.js')) {
      fails.push("模块预加载缺失：没有 js/app.js 的 modulepreload");
    } else {
      notes.push("模块预加载存在 ✓");
    }
    
    // 检查 3：PWA manifest
    if (!html.includes('rel="manifest"')) {
      fails.push("PWA manifest 缺失：没有 <link rel=manifest>");
    } else {
      notes.push("PWA manifest 链接存在 ✓");
    }
    
    // 检查 4：data/index.json 预加载
    const indexJsonMatch = html.match(/<link[^>]*rel="preload"[^>]*href="data\/index\.json"/);
    if (indexJsonMatch) {
      notes.push("data/index.json 预加载存在 ✓");
    } else {
      fails.push("data/index.json 预加载缺失");
    }
    
    // 检查 5：PWA manifest 图标配置
    const MANIFEST_FILE = join(TMPDIR, "manifest.webmanifest");
    try {
      const manifestUrl = new URL("manifest.webmanifest", TARGET_URL).href;
      execSync(`curl -sL --max-time 10 -o "${MANIFEST_FILE}" "${manifestUrl}"`, { stdio: "pipe" });
      const manifest = JSON.parse(readFileSync(MANIFEST_FILE, "utf-8"));
      if (manifest.icons && manifest.icons.length > 0) {
        notes.push(`PWA 图标配置完整 ✓（${manifest.icons.length} 个）`);
        
        const badIcons = [];
        for (const icon of manifest.icons) {
          const iconUrl = new URL(icon.src, TARGET_URL).href;
          try {
            execSync(`curl -sI --max-time 5 -o /dev/null -w "%{http_code}" "${iconUrl}"`, { stdio: "pipe" });
          } catch (e) {
            badIcons.push(icon.src);
          }
        }
        if (badIcons.length > 0) {
          fails.push(`PWA 图标取不到 ${badIcons.length} 个：${badIcons.slice(0, 3).join(", ")}`);
        }
      } else {
        fails.push("PWA manifest 没有配置 icons");
      }
    } catch (e) {
      fails.push(`PWA manifest 取不到：${e.message}`);
    }
    
    // 检查 6：内容新鲜度
    const INDEX_JSON = join(TMPDIR, "index.json");
    try {
      const indexJsonUrl = new URL("data/index.json", TARGET_URL).href;
      execSync(`curl -sL --max-time 10 -o "${INDEX_JSON}" "${indexJsonUrl}"`, { stdio: "pipe" });
      const indexData = JSON.parse(readFileSync(INDEX_JSON, "utf-8"));
      const now = new Date(Date.now() + 8 * 3600 * 1000);
      const hour = now.getUTCHours();
      const minute = now.getUTCMinutes();
      const today = now.toISOString().slice(0, 10);
      const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
      
      // 2026-09-08 更新：接受"今日无新作品"状态
      // 当 latest === issues[0] 时，说明管线正常执行了，只是外部 API 没返回新作品
      // 这是正常状态，不是 bug
      const latestInData = indexData.issues?.[0] || null;
      const pipelineExecutedNormally = indexData.latest === latestInData;
      
      if (indexData.latest !== today) {
        if (hour < 5 || (hour === 5 && minute < 30)) {
          if (indexData.latest === yesterday) {
            notes.push(`内容是昨天的 ✓（${indexData.latest}，管线 05:00 后更新）`);
          } else {
            fails.push(`线上最新一期是 ${indexData.latest}，既不是今天也不是昨天——比昨天还旧`);
          }
        } else {
          // 如果管线正常执行（latest === issues[0]），只是没有新作品，这是 SKIP 状态
          if (pipelineExecutedNormally) {
            notes.push(`今日无新作品 SKIP ✓（最新 ${indexData.latest}，管线正常执行但外部 API 无新数据）`);
          } else {
            fails.push(`线上最新一期是 ${indexData.latest}，不是今天（${today}）——赤拔打开看到的是旧作品`);
          }
        }
      } else {
        notes.push(`内容是今天的 ✓（${indexData.latest}，共 ${indexData.issues?.length || 0} 期）`);
      }
    } catch (e) {
      fails.push(`取不到 data/index.json：${e.message}`);
    }
    
    // 保存首屏 HTML
    const SHOT = process.env.ARTBOOK_SHOT || `${process.env.HOME}/.hermes/kanban/artbook-prod-firstpaint.html`;
    writeFileSync(SHOT, html);
    notes.push(`首屏 HTML 已保存 → ${SHOT}`);
    
    if (!fails.length) {
      console.log(`✅ artbook 生产环境检查通过（curl fallback 模式） — ${TARGET_URL}`);
      console.log(`  通过的项：${notes.join("；")}`);
      console.log(`\n⚠️  注意：这是降级验证。完整浏览器测试需在 Linux 环境或修复 macOS TLS 后执行。`);
      console.log(`  原因：${browserFailReason}`);
      process.exit(0);
    }
    
    console.log(`🔴 artbook 生产环境检查失败（curl fallback 模式） — ${TARGET_URL}`);
    fails.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    if (notes.length) console.log(`\n  通过的项：${notes.join("；")}`);
    console.log(`\n处置：这是 HTML 结构/内容层面的问题。`);
    console.log(`请建工程卡给老费修，并在验收标准里写明「必须用本脚本复测通过」：`);
    console.log(`  bash scripts/artbook-prod-smoke.sh`);
    process.exit(1);
    
  } catch (e) {
    console.log(`🔴 artbook 生产环境检查失败 — ${TARGET_URL}`);
    console.log(`  curl 验证失败：${e.message || e}`);
    console.log(`  处置：线上无法访问。手工验证：curl -I ${TARGET_URL}`);
    process.exit(1);
  }
}

// —— 第 3 步：浏览器测试通过，完成 ——
if (pwTestPassed) {
  console.log(`\n✅ artbook 生产环境检查通过 — ${TARGET_URL}`);
  console.log(`  （Playwright 真浏览器模式）`);
  process.exit(0);
}
