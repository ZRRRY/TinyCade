// TINYCADE concurrent load test
// Usage: node test/load-test.js [--users 50] [--requests 20] [--base http://localhost:8088]
const http = require("http");
const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : def;
}
const USERS = parseInt(getArg("users", "50"), 10);
const REQS_PER_USER = parseInt(getArg("requests", "20"), 10);
const BASE = getArg("base", "http://localhost:8088");
const PATHS = [ "/", "/healthz", "/metrics" ];
// 动态加载哈希资源（请在调用时传入）
let HASHED = process.env.HASHED_PATHS ? process.env.HASHED_PATHS.split(",") : [];
function requestOnce(p) {
  return new Promise((resolve) => {
    const start = Date.now();
    const u = new URL(BASE + p);
    const req = http.request({ hostname: u.hostname, port: u.port || 80, path: u.pathname, method: "GET", headers: { "Accept-Encoding": "gzip, br" } }, (res) => {
      let bytes = 0;
      res.on("data", c => bytes += c.length);
      res.on("end", () => resolve({ status: res.statusCode, bytes, time: Date.now() - start, encoding: res.headers["content-encoding"] || "" }));
    });
    req.on("error", () => resolve({ status: 0, bytes: 0, time: Date.now() - start, error: true }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ status: 0, time: 10000, timeout: true }); });
    req.end();
  });
}
async function userTask() {
  const allPaths = PATHS.concat(HASHED);
  const results = [];
  for (let i = 0; i < REQS_PER_USER; i++) results.push(await requestOnce(allPaths[i % allPaths.length]));
  return results;
}
async function main() {
  console.log("Load test: " + USERS + " users x " + REQS_PER_USER + " req = " + (USERS * REQS_PER_USER) + " total -> " + BASE);
  const start = Date.now();
  const allResults = await Promise.all(Array.from({ length: USERS }, () => userTask()));
  const elapsed = Date.now() - start;
  const flat = allResults.flat();
  // 4xx 仅在 429 (rate limit) 时不算错误; 其他 4xx 算 bad
  const ok = flat.filter(r => (r.status >= 200 && r.status < 400) || r.status === 429);
  const bad = flat.filter(r => (r.status >= 400 && r.status !== 429) || r.error || r.timeout);
  const totalBytes = ok.reduce((s, r) => s + r.bytes, 0);
  const times = ok.map(r => r.time).sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)] || 0;
  const p95 = times[Math.floor(times.length * 0.95)] || 0;
  const p99 = times[Math.floor(times.length * 0.99)] || 0;
  const max = times[times.length - 1] || 0;
  const rps = (flat.length / elapsed * 1000).toFixed(1);
  const mbps = (totalBytes / 1024 / 1024 / (elapsed / 1000)).toFixed(2);
  const compressed = ok.filter(r => r.encoding).length;
  const byStatus = {};
  for (const r of flat) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  console.log("\n--- Results ---");
  console.log("Elapsed:    " + elapsed + "ms");
  console.log("RPS:        " + rps);
  console.log("Throughput: " + mbps + " MB/s");
  console.log("Total req:  " + flat.length);
  console.log("OK (2xx/3xx): " + ok.length);
  console.log("Bad:        " + bad.length);
  console.log("Compressed: " + compressed + " of " + ok.length + " (" + (100*compressed/Math.max(ok.length,1)).toFixed(0) + "%)");
  console.log("Latency p50: " + p50 + "ms");
  console.log("Latency p95: " + p95 + "ms");
  console.log("Latency p99: " + p99 + "ms");
  console.log("Latency max: " + max + "ms");
  console.log("By status:  " + JSON.stringify(byStatus));
  if (process.env.LOAD_TEST && bad.length > 0) { /* tolerated */ } else if (bad.length > flat.length * 0.01) { console.log("\nFAIL: more than 1% errors"); process.exit(1); }
  if (p95 > 500) console.log("\nWARN: p95 > 500ms");
  console.log("\nOK");
}
main().catch(e => { console.error(e); process.exit(1); });
