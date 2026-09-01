// 本地 HTTP/2 静态服务器（t_a450af65 验证用）
//
// 为什么需要它：npm 的 http-server 是 HTTP/1.1，浏览器对同一域名只开 6 条连接。
// 首屏要并行拉 11 个模块 + 数据，在 HTTP/1.1 下会被硬切成两波，白白多付一整轮 RTT
// ——而生产环境 GitHub Pages 走 HTTP/2，多路复用，根本没有这一波。
// 拿 HTTP/1.1 的数字评判 modulepreload 的效果会严重低估，故用本脚本还原生产协议。
//
// 用法：node scripts/serve-h2.mjs [--port 8443] [--root <dir>]
// 证书为进程内生成的自签名证书，仅用于本机测量（Playwright 侧忽略证书错误）。
import http2 from "node:http2";
import { readFileSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { gzipSync } from "node:zlib";

const args = process.argv.slice(2);
const getArg = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : d;
};
const PORT = Number(getArg("--port", 8443));
const ROOT = getArg("--root", process.cwd());

// 自签名证书（仅本机测量用）
const certDir = mkdtempSync(join(tmpdir(), "artbook-h2-"));
execFileSync("openssl", [
  "req", "-x509", "-newkey", "rsa:2048", "-nodes",
  "-keyout", join(certDir, "k.pem"), "-out", join(certDir, "c.pem"),
  "-days", "1", "-subj", "/CN=localhost",
], { stdio: "ignore" });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

const server = http2.createSecureServer({
  key: readFileSync(join(certDir, "k.pem")),
  cert: readFileSync(join(certDir, "c.pem")),
  allowHTTP1: true,
});

server.on("stream", (stream, headers) => {
  let path = decodeURIComponent((headers[":path"] || "/").split("?")[0]);
  // 目录 → index.html
  let file = join(ROOT, normalize(path).replace(/^(\.\.[/\\])+/, ""));
  try {
    if (statSync(file).isDirectory()) file = join(file, "index.html");
  } catch {
    stream.respond({ ":status": 404 });
    stream.end("not found");
    return;
  }
  try {
    const raw = readFileSync(file);
    const type = MIME[extname(file)] || "application/octet-stream";
    // GitHub Pages 对文本资源发 gzip；本地不压缩会让 Lighthouse 误报
    // uses-text-compression，测出的分数低于生产实际。
    const compressible = /text\/|javascript|json|svg|manifest/.test(type);
    const acceptsGzip = (headers["accept-encoding"] || "").includes("gzip");
    const body = compressible && acceptsGzip ? gzipSync(raw) : raw;
    const res = {
      ":status": 200,
      "content-type": type,
      // 冷加载测量：禁用 HTTP 缓存，保证每次都是真实网络请求
      "cache-control": "no-store",
    };
    if (body !== raw) res["content-encoding"] = "gzip";
    stream.respond(res);
    stream.end(body);
  } catch {
    stream.respond({ ":status": 404 });
    stream.end("not found");
  }
});

server.listen(PORT, () => {
  console.log(`h2 server on https://127.0.0.1:${PORT}/ root=${ROOT}`);
});
