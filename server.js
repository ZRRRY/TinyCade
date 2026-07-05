// TINYCADE - production static server
// Features: path traversal guard, ETag/304, Range (RFC 7233),
// per-IP rate limit, security headers, pre-compressed .gz / .br serving.
//
// Usage: node server.js [--port 8088] [--root .] [--max-req 240] [--window-ms 60000]

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
}
const PORT = parseInt(getArg('port', '8088'), 10);
const ROOT = path.resolve(getArg('root', __dirname));
const MAX_REQ = parseInt(getArg('max-req', '240'), 10);
const WINDOW_MS = parseInt(getArg('window-ms', '60000'), 10);
const SERVE_DIST = process.env.SERVE_DIST !== '0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.map':  'application/json; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.gz':   'application/octet-stream',
  '.br':   'application/octet-stream'
};

function cacheHeaderFor(file) {
  const base = path.basename(file);
  if (/^[\w-]+\.[a-f0-9]{8,}\.(js|css|woff2?|svg|png|jpe?g|gif|webp|ico)$/i.test(base)) {
    return 'public, max-age=31536000, immutable';
  }
  const ext = path.extname(file).toLowerCase();
  if (ext === '.html' || ext === '' || ext === '.webmanifest') return 'no-cache';
  if (ext === '.json' || ext === '.txt' || ext === '.map') return 'no-cache';
  return 'public, max-age=3600';
}

function etagFor(stat) {
  return '"' + stat.size.toString(16) + '-' + stat.mtimeMs.toString(16) + '"';
}

function applySecurityHeaders(res, file) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  if (res.socket && res.socket.encrypted) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' https://fonts.googleapis.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data:; " +
    "connect-src 'self'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );
  res.setHeader('Cache-Control', cacheHeaderFor(file));
}

const buckets = new Map();
function rateLimit(ip) {
  const now = Date.now();
  const b = buckets.get(ip) || { count: 0, reset: now + WINDOW_MS };
  if (now > b.reset) { b.count = 0; b.reset = now + WINDOW_MS; }
  b.count++;
  buckets.set(ip, b);
  return b.count <= MAX_REQ;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
}, WINDOW_MS).unref();

// 结构化访问日志（最近 N 条）
const ACCESS_LOG_MAX = 500;
const accessLog = [];
function pushAccess(entry) {
  accessLog.push(entry);
  if (accessLog.length > ACCESS_LOG_MAX) accessLog.shift();
  // 控制台输出默认关闭 (避免 stdout pipe 阻塞); 用 ACCESS_LOG=1 启用
  if (process.env.ACCESS_LOG === '1') {
    setImmediate(() => { try { process.stdout.write(JSON.stringify(entry) + '\n'); } catch (e) {} });
  }
}

let inflight = 0;
let shuttingDown = false;
function gracefulShutdown(sig) {
  if (shuttingDown) return;
  shuttingDown = true;
  try { console.log(JSON.stringify({ t: 'shutdown', signal: sig, inFlight: inflight })); } catch (e) {}
  server.close((err) => {
    try { console.log(JSON.stringify({ t: 'shutdown-done', err: err ? err.message : null })); } catch (e) {}
    process.exit(err ? 1 : 0);
  });
  setTimeout(() => {
    try { console.log(JSON.stringify({ t: 'shutdown-timeout', inFlight: inflight })); } catch (e) {}
    process.exit(1);
  }, 5000).unref();
}
// In-memory metrics
const metrics = {
  startedAt: Date.now(),
  requests: 0,
  bytes: 0,
  byStatus: {},
  byRoute: {}
};
function recordMetric(status, route, bytes) {
  metrics.requests++;
  metrics.bytes += bytes;
  metrics.byStatus[status] = (metrics.byStatus[status] || 0) + 1;
  // 防止攻击者通过任意路径(GET /aaaa1, /aaaa2 ...)膨胀 metrics: byRoute 最多保留 200 个条目。
  if (!Object.prototype.hasOwnProperty.call(metrics.byRoute, route)) {
    const keys = Object.keys(metrics.byRoute);
    if (keys.length >= 200) { delete metrics.byRoute[keys[0]]; }
  }
  metrics.byRoute[route] = (metrics.byRoute[route] || 0) + 1;
}

// In-memory feedback log
const feedback = [];
const FEEDBACK_MAX = 200;

function sendFile(res, filePath, stat, encoding) {
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Vary', 'Accept-Encoding');
  if (encoding) res.setHeader('Content-Encoding', encoding);
  res.writeHead(200);
  const stream = fs.createReadStream(filePath);
  let bytes = 0;
  stream.on('data', (c) => { bytes += c.length; });
  stream.on('end', () => recordMetric(200, '/file', bytes));
  stream.on('error', () => { try { res.end(); } catch (e) {} });
  stream.pipe(res);
}

function tryCompressed(filePath, acceptEncoding, cb) {
  // prefer brotli, fallback gzip
  const candidates = [];
  if (acceptEncoding && acceptEncoding.includes('br')) candidates.push({ suffix: '.br', encoding: 'br' });
  if (acceptEncoding && acceptEncoding.includes('gzip')) candidates.push({ suffix: '.gz', encoding: 'gzip' });
  let i = 0;
  function next() {
    if (i >= candidates.length) return cb(null);
    const c = candidates[i++];
    fs.stat(filePath + c.suffix, (err, st) => {
      if (err || !st.isFile()) return next();
      cb({ filePath: filePath + c.suffix, stat: st, encoding: c.encoding });
    });
  }
  next();
}

const server = http.createServer((req, res) => {
  if (shuttingDown) { res.writeHead(503, { 'Connection': 'close' }); res.end('Server shutting down'); return; }
  inflight++;
  const _startNs = process.hrtime.bigint();
  // 用 done 标志防止 finish/close 重复触发导致 inflight 计数减两次(常见于 abort 场景)。
  let done = false;
  const doneOnce = () => { if (done) return; done = true; inflight = Math.max(0, inflight - 1); };
  res.on('finish', () => {
    doneOnce();
    const durMs = Number((process.hrtime.bigint() - _startNs) / 1000000n);
    pushAccess({ t: 'req', m: req.method, p: (req.url || '').split('?')[0], s: res.statusCode, ms: durMs, ip: (req.socket.remoteAddress || '').replace(/^::ffff:/, '') });
  });
  res.on('close', doneOnce);
  const ip = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
  if (!rateLimit(ip)) {
    recordMetric(429, '/ratelimit', 0);
    res.writeHead(429, { 'Retry-After': '60', 'Content-Type': 'text/plain' });
    res.end('Too Many Requests');
    return;
  }

  // 读取请求体（POST 反馈使用）
  function readBody(cb) {
    let body = '';
    let aborted = false;
    req.setEncoding('utf8');
    req.on('data', (c) => { if (aborted) return; if (body.length + c.length > 16384) { aborted = true; body += c.slice(0, 16384 - body.length); return; } body += c; });
    req.on('end', () => cb(body, aborted));
    req.on('error', () => cb('', true));
  }

  let url = req.url.split('?')[0];
  try { url = decodeURIComponent(url); } catch (e) { res.writeHead(400); res.end('Bad Request'); return; }

  // Health & metrics
  if (url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), ts: Date.now() }));
    recordMetric(200, '/healthz', 50);
    return;
  }
  if (url === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify({ ...metrics, uptime: (Date.now() - metrics.startedAt) / 1000 }, null, 2));
    recordMetric(200, '/metrics', 100);
    return;
  }
  // GET /api/feedback admin list / POST /api/feedback
  if (url === '/api/feedback' || url.startsWith('/api/feedback?')) {
    if (req.method === 'GET') {
      // 简单 admin 鉴权：通过 ?token= 或 x-admin-token 头；token 来自环境 TINYCADE_ADMIN_TOKEN
      const adminToken = process.env.TINYCADE_ADMIN_TOKEN || '';
      const qs = url.indexOf('?') >= 0 ? url.slice(url.indexOf('?') + 1) : '';
      const params = new URLSearchParams(qs);
      const provided = params.get('token') || req.headers['x-admin-token'] || '';
      if (!adminToken || provided !== adminToken) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'unauthorized' }));
        recordMetric(401, url, 0);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ count: feedback.length, items: feedback }));
      recordMetric(200, url, 0);
      return;
    }
    if (req.method !== 'POST') { res.writeHead(405, { 'Allow': 'GET, POST' }); res.end(); return; }
    readBody((body, truncated) => {
      if (truncated) { res.writeHead(413, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'too large' })); recordMetric(413, url, 0); return; }
      try {
        const data = JSON.parse(body || '{}');
        if (typeof data.message !== 'string' || data.message.length > 1000 || data.message.length < 1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid' }));
          return;
        }
        feedback.push({ ts: Date.now(), ip, message: data.message, ua: req.headers['user-agent'] || '', route: req.headers['referer'] || '' });
        if (feedback.length > FEEDBACK_MAX) feedback.shift();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'parse' }));
      }
    });
    return;
  }
  // POST /api/vitals 接收 Web Vitals 上报
  if (url === '/api/vitals') {
    if (req.method !== 'POST') { res.writeHead(405, { 'Allow': 'POST' }); res.end(); return; }
    readBody((body, truncated) => {
      if (truncated) { res.writeHead(413, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'too large' })); recordMetric(413, url, 0); return; }
      try {
        const data = JSON.parse(body || '{}');
        // 仅记录成子集
        if (data && typeof data === 'object') {
          const entry = { ts: Date.now(), ip, ...data };
          feedback.push(entry);
          if (feedback.length > FEEDBACK_MAX) feedback.shift();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'parse' }));
      }
    });
    return;
  }

  if (url === '/' || url === '') url = '/index.html';
  if (url.indexOf('\0') !== -1) { res.writeHead(400); res.end('Bad Request'); return; }

  const resolvedRoot = path.resolve(ROOT) + path.sep;
  const filePath = path.resolve(path.join(ROOT, url));
  if (filePath !== resolvedRoot.slice(0, -1) && !filePath.startsWith(resolvedRoot)) {
    res.writeHead(403); res.end('Forbidden'); recordMetric(403, url, 0); return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('Not Found'); recordMetric(404, url, 0); return; }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const etag = etagFor(stat);

    res.setHeader('Content-Type', mime);
    res.setHeader('Accept-Ranges', 'bytes');
    applySecurityHeaders(res, filePath);
    res.setHeader('ETag', etag);

    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304);
      res.end();
      recordMetric(304, url, 0);
      return;
    }

    // Range
    const range = req.headers['range'];
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (m) {
        let start = m[1] === '' ? null : parseInt(m[1], 10);
        let end = m[2] === '' ? null : parseInt(m[2], 10);
        if (start === null && end === null) { send416(); return; }
        if (start === null) {
          start = Math.max(0, stat.size - end);
          end = stat.size - 1;
        } else if (end === null) {
          end = stat.size - 1;
        }
        if (!Number.isFinite(start) || !Number.isFinite(end) ||
            start < 0 || start >= stat.size || end >= stat.size || start > end) {
          send416();
          return;
        }
        const chunkLen = end - start + 1;
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Content-Length': chunkLen
        });
        if (req.method === 'HEAD') { res.end(); recordMetric(206, url, 0); return; }
        const stream = fs.createReadStream(filePath, { start, end });
        let bytes = 0;
        stream.on('data', c => bytes += c.length);
        stream.on('end', () => recordMetric(206, url, bytes));
        stream.on('error', () => { try { res.end(); } catch (e) {} });
        stream.pipe(res);
        return;
      }
    }
    function send416() {
      try {
        if (!res.headersSent) res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size, 'Content-Length': '0' });
      } finally { res.end(); recordMetric(416, url, 0); }
    }

    // Try compressed version
    if (req.method === 'GET') {
      tryCompressed(filePath, req.headers['accept-encoding'] || '', (comp) => {
        if (comp) {
          res.setHeader('Content-Length', comp.stat.size);
          res.setHeader('Vary', 'Accept-Encoding');
          res.setHeader('Content-Encoding', comp.encoding);
          res.writeHead(200);
          const stream = fs.createReadStream(comp.filePath);
          let bytes = 0;
          stream.on('data', c => bytes += c.length);
          stream.on('end', () => recordMetric(200, url, bytes));
          stream.on('error', () => { try { res.end(); } catch (e) {} });
          stream.pipe(res);
          return;
        }
        // No compressed version; serve raw
        res.setHeader('Content-Length', stat.size);
        if (req.method === 'HEAD') { res.writeHead(200); res.end(); recordMetric(200, url, 0); return; }
        res.writeHead(200);
        const stream = fs.createReadStream(filePath);
        let bytes = 0;
        stream.on('data', c => bytes += c.length);
        stream.on('end', () => recordMetric(200, url, bytes));
        stream.on('error', () => { try { res.end(); } catch (e) {} });
        stream.pipe(res);
      });
      return;
    }

    // 其他 method 一律 405（POST/PUT/DELETE 等）
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      res.writeHead(405, { 'Content-Length': '0' });
      res.end();
      recordMetric(405, url, 0);
      return;
    }
    // HEAD
    res.setHeader('Content-Length', stat.size);
    res.writeHead(200);
    res.end();
    recordMetric(200, url, 0);
  });
});

server.listen(PORT, () => {
  console.log(`TINYCADE server: http://localhost:${PORT}/  (root: ${ROOT})`);
  console.log(`rate-limit: ${MAX_REQ} req per ${WINDOW_MS}ms per IP`);
  console.log(`endpoints: /healthz /metrics /api/feedback (POST)`);
});

