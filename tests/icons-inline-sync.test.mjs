// 内联图标一致性测试（t_a450af65）
//
// 内联图标是首屏零请求的关键，但它引入了一个新风险：
// js/icons/inline.js 是 icons/svg/*.svg 的副本，有人改了 svg 源文件却忘了
// 重新生成，线上就会渲染出「旧图标」，而且本地怎么看都正常——
// 这类漂移不会报错，只会静默地画错。所以必须有测试盯着。
//
// 断言：
//   1. inline.js 的内容与当前 icons/svg/*.svg 逐字节一致（重新生成应为空 diff）
//   2. UI 同步渲染路径上 grep 出来的图标，全部在内联清单里
//      （漏掉任何一个，首屏就会退回占位圆圈 + 一轮网络往返）
//
// 运行：node tests/icons-inline-sync.test.mjs
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { INLINE_ICONS, buildSource } from "../scripts/gen-inline-icons.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (e) {
    failures++;
    console.error(`FAIL  ${name}\n      ${e.message}`);
  }
}

console.log("内联图标一致性:");

check("inline.js 与 icons/svg 源文件一致（无漂移）", () => {
  const onDisk = readFileSync(join(ROOT, "js", "icons", "inline.js"), "utf8");
  const expected = buildSource();
  if (onDisk !== expected) {
    throw new Error(
      "js/icons/inline.js 与 icons/svg/*.svg 不一致。" +
        "改过 svg 后请运行：node scripts/gen-inline-icons.mjs"
    );
  }
});

check("内联的图标文件都真实存在", () => {
  const available = new Set(
    readdirSync(join(ROOT, "icons", "svg"))
      .filter((f) => f.endsWith(".svg"))
      .map((f) => f.replace(/\.svg$/, ""))
  );
  const missing = INLINE_ICONS.filter((n) => !available.has(n));
  if (missing.length) throw new Error(`icons/svg 缺少：${missing.join(", ")}`);
});

check("UI 同步渲染用到的图标全部已内联", () => {
  // 扫描 js/*.js 里的 Icon('xxx') 调用，解析成真实文件名后比对内联清单
  const iconJs = readFileSync(join(ROOT, "js", "icons", "Icon.js"), "utf8");
  const mapBody = iconJs.slice(iconJs.indexOf("const ICON_MAP"));
  const ICON_MAP = {};
  for (const m of mapBody.matchAll(/'([\w-]+)':\s*'([\w-]+)'/g)) ICON_MAP[m[1]] = m[2];

  const used = new Set();
  for (const file of readdirSync(join(ROOT, "js")).filter((f) => f.endsWith(".js"))) {
    const src = readFileSync(join(ROOT, "js", file), "utf8");
    for (const m of src.matchAll(/\bIcon\(\s*['"]([\w-]+)['"]/g)) {
      used.add(ICON_MAP[m[1]] || m[1]);
    }
  }

  const notInlined = [...used].filter((n) => !INLINE_ICONS.includes(n));
  if (notInlined.length) {
    throw new Error(
      `以下图标被 UI 同步渲染用到但未内联，首屏会退回占位圆圈：${notInlined.join(", ")}。` +
        "请加进 scripts/gen-inline-icons.mjs 的 INLINE_ICONS 后重新生成。"
    );
  }
  if (!used.size) throw new Error("未扫描到任何 Icon() 调用，测试自身可能失效");
});

console.log(failures === 0 ? "\n内联图标一致性：全部通过" : `\n内联图标一致性：${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
