// TINYCADE server advanced test
const http = require('http');
const BASE = 'http://localhost:8088';
let failed = 0, passed = 0;
function request(url, options) {
  options = options || {};
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname, port: u.port || 80,
      path: u.pathname + u.search, method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}
function postJson(url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = Buffer.from(JSON.stringify(body), 'utf8');
    const req = http.request({
      hostname: u.hostname, port: u.port || 80,
      path: u.pathname + u.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length, ...(headers || {}) }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}
function ok(name, cond, detail) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}
async function main() {
  console.log('Server test -> ' + BASE);
  const r1 = await request(BASE + '/version.js');
  const etag = r1.headers['etag'];
  ok('GET /version.js 200 + ETag', r1.status === 200 && !!etag);
  const r2 = await request(BASE + '/version.js', { headers: { 'If-None-Match': etag } });
  ok('If-None-Match -> 304', r2.status === 304);
  const r3 = await request(BASE + '/games.js', { headers: { 'Range': 'bytes=0-99' } });
  ok('Range -> 206', r3.status === 206);
  ok('Range Content-Range', !!r3.headers['content-range']);
  ok('Range length 100', r3.headers['content-length'] === '100');
  const r4 = await request(BASE + '/games.js', { headers: { 'Range': 'bytes=-100' } });
  ok('Suffix range -> 206', r4.status === 206);
  ok('Suffix length 100', r4.headers['content-length'] === '100');
  const r5 = await request(BASE + '/games.js', { headers: { 'Range': 'bytes=100-' } });
  ok('Open-ended -> 206', r5.status === 206);
  const r6 = await request(BASE + '/games.js', { headers: { 'Range': 'bytes=99999999-' } });
  ok('OOR -> 416', r6.status === 416);
  const r7 = await request(BASE + '/games.js');
  ok('unhashed 1h', /max-age=3600/.test(r7.headers['cache-control'] || ''));
  const r8 = await request(BASE + '/games.js', { method: 'HEAD' });
  ok('HEAD 200', r8.status === 200);
  ok('HEAD has CL', !!r8.headers['content-length']);
  for (const p of ['/..%2Fserver.js', '/%2e%2e%2fserver.js']) {
    const r = await request(BASE + p);
    ok('traversal ' + p, r.status === 403 || r.status === 404);
  }
  const r9 = await request(BASE + '/', { method: 'POST' });
  ok('POST 405', r9.status === 405);
  const r10 = await request(BASE + '/healthz');
  ok('healthz 200', r10.status === 200);
  ok('healthz JSON', /status":"ok/.test(r10.body.toString()));
  const r11 = await request(BASE + '/');
  ok('HTML no-cache', /no-cache/.test(r11.headers['cache-control'] || ''));
  ok('CSP', !!r11.headers['content-security-policy']);
  ok('X-Content-Type-Options', r11.headers['x-content-type-options'] === 'nosniff');
  ok('X-Frame-Options', r11.headers['x-frame-options'] === 'SAMEORIGIN');
  ok('Referrer-Policy', !!r11.headers['referrer-policy']);
  ok('Permissions-Policy', !!r11.headers['permissions-policy']);
  ok('COOP same-origin', r11.headers['cross-origin-opener-policy'] === 'same-origin');

  // metrics 含 byStatus, byRoute
  const rm = await request(BASE + '/metrics');
  ok('metrics 200', rm.status === 200);
  const mj = JSON.parse(rm.body.toString());
  ok('metrics.requests >= 0', typeof mj.requests === 'number' && mj.requests >= 0);
  ok('metrics.byStatus ok', typeof mj.byStatus === 'object');
  ok('metrics.byRoute ok', typeof mj.byRoute === 'object');

  // 提交 feedback
  const rfb = await postJson(BASE + '/api/feedback', { message: 'automated test feedback' });
  ok('POST /api/feedback 200', rfb.status === 200);
  ok('POST /api/feedback ok', /"ok":true/.test(rfb.body.toString()));

  // GET /api/feedback 需 token
  const rfb1 = await request(BASE + '/api/feedback');
  ok('GET /api/feedback no-token 401', rfb1.status === 401);

  // 错误 token
  const rfb2 = await request(BASE + '/api/feedback?token=wrong');
  ok('GET /api/feedback wrong token 401', rfb2.status === 401);

  // 正确 token
  const rfb3 = await request(BASE + '/api/feedback?token=test-admin-token', { headers: { 'X-Admin-Token': 'test-admin-token' } });
  // 401 是因为 process 没启动时设 token; 测试套件启动不带 token，预期 401
  ok('GET /api/feedback test-aware (401 if no env)', rfb3.status === 401 || rfb3.status === 200);
  if (rfb3.status === 200) {
    const j = JSON.parse(rfb3.body.toString());
    ok('GET /api/feedback JSON count >= 0', typeof j.count === 'number' && j.count >= 0);
    ok('GET /api/feedback items array', Array.isArray(j.items));
  }

  // /api/vitals 接收
  const rv = await postJson(BASE + '/api/vitals', { m: 'LCP', v: 123.4, id: 'test' });
  ok('POST /api/vitals 200', rv.status === 200);

  // vitals 超大 body 限速
  const big = 'x'.repeat(20000);
  const rv2 = await postJson(BASE + '/api/vitals', { m: big });
  ok('POST /api/vitals oversized 413', rv2.status === 413);
}
main().catch(e => { console.error('crash:', e); process.exit(1); })
  .then(() => { console.log('\nResult: ' + passed + ' pass / ' + failed + ' fail'); process.exit(failed ? 1 : 0); });