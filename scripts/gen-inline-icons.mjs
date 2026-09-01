// 内联图标生成器（t_a450af65）
//
// 为什么要内联：首屏渲染原先 await preloadIcons() 拉 11 个 svg 文件，
// 在 100ms RTT 下白白多付一整轮往返（实测 791→1215ms）。而全站 UI 同步渲染
// 路径上真正用到的图标只有 INLINE_ICONS 这几个，把它们的源码直接编进 JS，
// 首屏图标请求数归零。
//
// 单一事实来源仍是 icons/svg/*.svg：本脚本从 svg 文件生成 js/icons/inline.js，
// tests/icons-inline-sync.test.mjs 校验两者一致，杜绝手改 JS 造成的漂移。
//
// 用法：node scripts/gen-inline-icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// UI 同步渲染路径上真正用到的图标（grep "Icon(" js/*.js 得出）
// nav-back            → favorites.js 返回按钮
// action-bookmark-*   → feed.js 收藏夹入口 / detail.js 收藏按钮
// nav-chevron-down    → feed.js 日期胶囊
export const INLINE_ICONS = [
  "nav-back-outline",
  "nav-chevron-down-outline",
  "action-bookmark-outline",
  "action-bookmark-filled",
];

// 压掉注释和多余空白：内联进 JS 的体积要尽量小，但不改变任何绘制指令
export function minifySVG(src) {
  return src
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s+/g, " ")
    .trim();
}

export function readIcon(name) {
  return minifySVG(readFileSync(join(ROOT, "icons", "svg", `${name}.svg`), "utf8"));
}

export function buildSource() {
  const entries = INLINE_ICONS.map(
    (name) => `  ${JSON.stringify(name)}: ${JSON.stringify(readIcon(name))},`
  ).join("\n");
  return `// 【自动生成，请勿手改】由 scripts/gen-inline-icons.mjs 从 icons/svg/*.svg 生成。
// 修改图标请改 icons/svg/ 下的源文件后重新运行该脚本；
// tests/icons-inline-sync.test.mjs 会校验本文件与 svg 源文件一致。
//
// 作用：首屏同步渲染用到的图标直接内联，避免为图标多付一轮网络往返（t_a450af65）。
export const INLINE_ICON_SVG = {
${entries}
};
`;
}

// 作为脚本直接运行时才写文件（被测试 import 时不写）
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const out = join(ROOT, "js", "icons", "inline.js");
  writeFileSync(out, buildSource());
  console.log(`generated ${out} (${INLINE_ICONS.length} icons)`);
}
