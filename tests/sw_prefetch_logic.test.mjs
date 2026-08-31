// sw.js 预缓存与懒预取逻辑测试（t_dac8f66a：详情页和第二艺术品缓存优化）
//
// 用 Node vm 沙箱模拟 Service Worker 环境（fake CacheStorage + fetch 桩），
// 直接加载仓库根目录的 sw.js，验证：
//   1. install 预缓存 App Shell + 核心数据（index/catalog/artists）+ 最新一期
//   2. PREFETCH_ISSUES 消息：去重、限量（PREFETCH_MAX=4）、已缓存跳过
//   3. 数据请求缓存优先：离线时 detail 数据仍从 Cache Storage 秒出
//   4. 导航离线回退缓存 index.html
//   5. VERSION_CHANGED 消息回归：后台刷数据 + VERSION_REFRESHED 回执
//
// 运行：node tests/sw_prefetch_logic.test.mjs
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const ROOT = new URL("../", import.meta.url);
const SW_SRC = readFileSync(new URL("sw.js", ROOT), "utf8");
const ORIGIN = "http://localhost:8080";

// ---------- fake CacheStorage ----------
class FakeCache {
  constructor(name) {
    this.name = name;
    this.store = new Map();
  }
  // 真实浏览器：Request/URL 键一律解析为绝对 URL（相对字符串按页面基址解析）
  key(req) {
    const u = typeof req === "string" ? req : req.url;
    return new URL(u, ORIGIN).href;
  }
  async match(req) {
    return this.store.get(this.key(req)) || undefined;
  }
  async put(req, res) {
    this.store.set(this.key(req), res);
  }
  async addAll(requests) {
    for (const r of requests) {
      const url = typeof r === "string" ? r : r.url;
      const res = await globalThis.__fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error(`addAll failed: ${url} -> ${res.status}`);
      this.store.set(this.key(r), res);
    }
  }
  async keys() {
    return [...this.store.keys()];
  }
  async delete(key) {
    return this.store.delete(this.key(key));
  }
}

const cacheMap = new Map();
const fakeCaches = {
  async open(name) {
    if (!cacheMap.has(name)) cacheMap.set(name, new FakeCache(name));
    return cacheMap.get(name);
  },
  async keys() {
    return [...cacheMap.keys()];
  },
  async delete(name) {
    return cacheMap.delete(name);
  },
  // sw.js 离线兜底用 caches.match() 找 offline.html
  async match(url) {
    for (const c of cacheMap.values()) {
      const hit = await c.match(url);
      if (hit) return hit;
    }
    return undefined;
  },
};
function resetCaches() {
  cacheMap.clear();
}

// ---------- fetch 桩：从仓库磁盘真实文件回包，可切换离线 ----------
import { statSync } from "node:fs";

function makeFetch({ networkDown = false } = {}) {
  const calls = [];
  const fn = async (input) => {
    const url = typeof input === "string" ? new URL(input, ORIGIN) : new URL(input.url);
    calls.push(url.href);
    if (networkDown) throw new TypeError("Network is down (test)");
    // 目录请求（如 "/"）→ 返回目录索引页，模拟真实静态服务器
    let rel = url.pathname.replace(/^\//, "");
    let file = new URL(rel, ROOT);
    if (existsSync(file) && statSync(file).isDirectory()) file = new URL("index.html", file);
    if (!existsSync(file)) return new Response("not found", { status: 404 });
    const body = readFileSync(file);
    const type = url.pathname.endsWith(".json")
      ? "application/json"
      : url.pathname.endsWith(".html")
        ? "text/html"
        : "text/plain";
    return new Response(body, { status: 200, headers: { "content-type": type } });
  };
  fn.calls = calls;
  fn.setNetworkDown = (v) => {
    networkDown = v;
  };
  return fn;
}

// ---------- 加载 sw.js 到沙箱，返回事件处理句柄 ----------
// 浏览器里 new Request("./index.html") 会按页面基址解析成绝对 URL；
// undici 直接拒绝相对 URL，这里包一层模拟浏览器行为
class SandboxRequest {
  constructor(input, init) {
    if (typeof input === "string" && !/^https?:\/\//.test(input)) {
      input = new URL(input, ORIGIN).href;
    }
    return new Request(input, init);
  }
}

function loadSW(fetchFn) {
  globalThis.__fetch = fetchFn; // FakeCache.addAll 使用（与沙箱同源）
  const sandbox = {
    console,
    Request: SandboxRequest,
    Response,
    URL,
    location: new URL(ORIGIN + "/"),
    caches: fakeCaches,
    fetch: fetchFn,
    skipWaiting() {},
    clients: { claim() {} },
    listeners: new Map(),
    addEventListener(type, cb) {
      this.listeners.set(type, cb);
    },
  };
  sandbox.self = sandbox; // sw.js 里的 self 即沙箱
  const ctx = vm.createContext(sandbox);
  vm.runInContext(SW_SRC, ctx, { filename: "sw.js" });
  return sandbox;
}

// 触发事件并等待 waitUntil 全部完成
async function fire(sandbox, type, makeEvent) {
  const cb = sandbox.listeners.get(type);
  if (!cb) throw new Error(`no listener for ${type}`);
  const pending = [];
  const evt = makeEvent((p) => pending.push(p));
  cb(evt);
  await Promise.allSettled(pending);
}

function fireInstall(sandbox) {
  return fire(sandbox, "install", (waitUntil) => ({ waitUntil }));
}

function fireMessage(sandbox, data) {
  const replies = [];
  return {
    replies,
    done: fire(sandbox, "message", (waitUntil) => ({
      data,
      waitUntil,
      source: { postMessage: (m) => replies.push(m) },
    })),
  };
}

function fetchResponse(sandbox, input, init) {
  let resolveRes;
  const resPromise = new Promise((r) => (resolveRes = r));
  const cb = sandbox.listeners.get("fetch");
  const req = new Request(input, init);
  const evt = { request: req, respondWith: (p) => p.then(resolveRes) };
  cb(evt);
  return resPromise;
}

// ---------- 断言工具 ----------
let passed = 0;
let failed = 0;
function assert(cond, name, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ok  ${name}`);
  } else {
    failed++;
    console.error(`FAIL  ${name} ${detail}`);
  }
}

// ============================================================
// 测试 1：install 预缓存 shell + 核心数据 + 最新一期
// ============================================================
console.log("== install 预缓存 ==");
{
  resetCaches();
  const fetchFn = makeFetch();
  const sandbox = loadSW(fetchFn);
  await fireInstall(sandbox);

  const cache = await fakeCaches.open("artbook-app-v1");
  const keys = await cache.keys();
  const has = (u) => keys.includes(ORIGIN + u);

  // 读真实 index.json 取 latest
  const idx = JSON.parse(readFileSync(new URL("data/index.json", ROOT), "utf8"));
  assert(has("/"), "shell: / 已缓存");
  assert(has("/index.html"), "shell: index.html 已缓存");
  assert(has("/app.css"), "shell: app.css 已缓存");
  assert(has("/js/app.js"), "shell: js/app.js 已缓存");
  assert(has("/js/detail.js"), "shell: js/detail.js 已缓存");
  assert(has("/data/index.json"), "核心数据: index.json 已缓存");
  assert(has("/data/catalog.json"), "核心数据: catalog.json 已缓存");
  assert(has("/data/artists.json"), "核心数据: artists.json 已缓存");
  assert(
    has(`/data/issues/${idx.latest}.json`),
    `最新一期 data/issues/${idx.latest}.json 已缓存`
  );
  assert(
    fetchFn.calls.filter((u) => u.includes("/data/issues/")).length === 1,
    "install 只拉取了最新一期（不预取全部期文件）"
  );
}

// ============================================================
// 测试 2：PREFETCH_ISSUES 去重 + 限量 + 已缓存跳过
// ============================================================
console.log("== PREFETCH_ISSUES ==");
{
  resetCaches();
  const fetchFn = makeFetch();
  const sandbox = loadSW(fetchFn);
  await fireInstall(sandbox);
  fetchFn.calls.length = 0;

  const { done } = fireMessage(sandbox, {
    type: "PREFETCH_ISSUES",
    dates: ["2026-08-25", "2026-08-24", "2026-08-25", "2026-08-27", "2026-08-23", "2026-08-22", "2026-08-21"],
  });
  await done;

  const cache = await fakeCaches.open("artbook-app-v1");
  const keys = await cache.keys();
  const has = (u) => keys.includes(ORIGIN + u);
  assert(has("/data/issues/2026-08-25.json"), "预取: 2026-08-25 已缓存");
  assert(has("/data/issues/2026-08-24.json"), "预取: 2026-08-24 已缓存");
  assert(has("/data/issues/2026-08-23.json"), "预取: 2026-08-23 已缓存");
  assert(!has("/data/issues/2026-08-22.json"), "限量: 2026-08-22 未预取（超 PREFETCH_MAX=4）");
  assert(!has("/data/issues/2026-08-21.json"), "限量: 2026-08-21 未预取（超 PREFETCH_MAX=4）");

  // 2026-08-27 已在 install 时缓存 → 跳过，不再 fetch
  const issueFetches = fetchFn.calls.filter((u) => u.includes("/data/issues/"));
  assert(
    !issueFetches.includes(ORIGIN + "/data/issues/2026-08-27.json"),
    "已缓存期文件跳过重取（2026-08-27 无网络请求）"
  );
  assert(issueFetches.length === 3, `实际只拉 3 个缺失期文件（拉取 ${issueFetches.length} 个）`);
}

// ============================================================
// 测试 3：数据请求缓存优先——离线时详情数据秒出
// ============================================================
console.log("== 离线数据请求 ==");
{
  resetCaches();
  const fetchFn = makeFetch();
  const sandbox = loadSW(fetchFn);
  await fireInstall(sandbox);
  fetchFn.setNetworkDown(true); // 断网

  const res = await fetchResponse(sandbox, ORIGIN + "/data/catalog.json");
  assert(res.status === 200, "离线: catalog.json 从缓存 200 返回");
  const body = await res.clone().json();
  assert(Array.isArray(body.works) && body.works.length > 0, "离线: catalog 内容完整可解析");

  const res2 = await fetchResponse(sandbox, ORIGIN + "/data/issues/2026-08-27.json");
  assert(res2.status === 200, "离线：最新一期从缓存 200 返回");
  const issue = await res2.clone().json();
  assert(Array.isArray(issue.works) && issue.works.length > 0, "离线：期文件内容完整可解析（详情页可渲染）");
}

// ============================================================
// 测试 4：导航离线回退缓存 index.html
// ============================================================
console.log("== 离线导航 ==");
{
  resetCaches();
  const fetchFn = makeFetch();
  const sandbox = loadSW(fetchFn);
  await fireInstall(sandbox);
  fetchFn.setNetworkDown(true);

  // undici 不支持直接构造 mode:"navigate" 的 Request → 定义属性覆盖
  const req = new Request(ORIGIN + "/#/work/met-436180");
  Object.defineProperty(req, "mode", { value: "navigate" });
  let resolveRes;
  const resPromise = new Promise((r) => (resolveRes = r));
  const cb = sandbox.listeners.get("fetch");
  cb({ request: req, respondWith: (p) => p.then(resolveRes) });
  const res = await resPromise;
  assert(res && res.status === 200, "离线: 导航回退缓存 index.html");
  const html = await res.clone().text();
  assert(html.includes("艺术手册"), "离线: 回退内容为应用壳（含字标）");
}

// ============================================================
// 测试 5：VERSION_CHANGED 回归——后台刷新 + 回执
// ============================================================
console.log("== VERSION_CHANGED 回归 ==");
{
  resetCaches();
  const fetchFn = makeFetch();
  const sandbox = loadSW(fetchFn);
  await fireInstall(sandbox);
  fetchFn.calls.length = 0;

  const { replies, done } = fireMessage(sandbox, {
    type: "VERSION_CHANGED",
    version: "20260826000000",
  });
  await done;

  const cache = await fakeCaches.open("artbook-app-v1");
  const keys = await cache.keys();
  const has = (u) => keys.includes(ORIGIN + u);
  assert(has("/data/catalog.json"), "刷新: catalog.json 仍在缓存");
  assert(replies.some((m) => m.type === "VERSION_REFRESHED"), "回执: VERSION_REFRESHED 已发给页面");
}

// ============================================================
// 测试 6：install 离线时数据预缓存不阻塞安装
// ============================================================
console.log("== install 离线容错 ==");
{
  resetCaches();
  const fetchFn = makeFetch({ networkDown: true });
  const sandbox = loadSW(fetchFn);
  // pending[0] = shell addAll（网络挂 → reject，既有行为，不属本任务）
  // pending[1] = precacheCoreData（必须 resolve，否则 install 失败）
  const cb = sandbox.listeners.get("install");
  const pending = [];
  cb({ waitUntil: (p) => pending.push(p) });
  const results = await Promise.allSettled(pending);
  assert(results.length === 2, "install 注册了两个 waitUntil（shell + 数据预缓存）");
  assert(
    results[1]?.status === "fulfilled",
    "离线 install：数据预缓存静默跳过、不 reject",
    JSON.stringify(results[1]?.reason)
  );
}

// ============================================================
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
