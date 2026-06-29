// TINYCADE \u70df\u96fe\u6d4b\u8bd5
// \u4f7f\u7528\uff1anpm run smoke
// \u4f9d\u8d56\uff1a\u542f\u52a8 server.js\uff0c\u672c\u811a\u672c\u4f1a\u4ee5 HTTP \u8bf7\u6c42\u9a8c\u8bc1\u5173\u952e\u8d44\u6e90

const http = require('http');

const BASE = process.env.BASE_URL || 'http://localhost:8088';
let failed = 0;
let passed = 0;
const errors = [];

function request(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname + u.search,
      method
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    req.end();
  });
}

function ok(name, cond, detail) {
  if (cond) { passed++; console.log(`  \u2713 ${name}`); }
  else { failed++; errors.push(name + (detail ? ' :: ' + detail : '')); console.log(`  \u2717 ${name}${detail ? ' :: ' + detail : ''}`); }
}

async function main() {
  console.log(`TINYCADE smoke test -> ${BASE}`);

  // 1. \u9996\u9875
  const home = await request(BASE + '/');
  ok('GET / 200', home.status === 200);
  ok('HTML \u542b\u6807\u9898', /TINYCADE/.test(home.body));
  ok('HTML \u542b\u6e38\u620f\u5e93', /game-grid/.test(home.body));
  ok('HTML \u542b\u8df3\u8fc7\u94fe\u63a5', /skip-link/.test(home.body));
  ok('Cache-Control on HTML', /no-cache/.test(home.headers['cache-control'] || ''));
  ok('CSP header set', typeof home.headers['content-security-policy'] === 'string');
  ok('X-Content-Type-Options set', home.headers['x-content-type-options'] === 'nosniff');

  // 2. \u9759\u6001\u8d44\u6e90
  for (const path of ['/app.js', '/games.js', '/games-extra.js', '/sounds.js', '/style.css', '/version.js']) {
    const r = await request(BASE + path);
    ok(`GET ${path} 200`, r.status === 200);
    ok(`${path} \u6709 cache`, !!r.headers['cache-control']);
  }

  // 3. \u8def\u5f84\u904d\u5386
  for (const path of ['/..%2Fserver.js', '/%2e%2e%2fserver.js', '/..%5c..%5cwindows%5csystem32%5cdrivers%5cetc%5chosts']) {
    const r = await request(BASE + path);
    ok(`Path traversal ${path} \u88ab\u62d2\u7edd`, r.status === 403 || r.status === 404);
  }

  // 4. \u4e0d\u5b58\u5728\u7684\u8d44\u6e90
  const nf = await request(BASE + '/no-such-file.js');
  ok('GET \u4e0d\u5b58\u5728\u8d44\u6e90 404', nf.status === 404);

  // 5. \u5065\u5eb7\u68c0\u67e5
  const h = await request(BASE + '/healthz');
  ok('GET /healthz 200', h.status === 200);
  ok('/healthz \u8fd4\u56de JSON', /\"status\":\"ok\"/.test(h.body));

  // 6. HEAD \u65b9\u6cd5
  const head = await request(BASE + '/app.js', 'HEAD');
  ok('HEAD /app.js 200', head.status === 200);
  ok('HEAD \u6709 Content-Length', !!head.headers['content-length']);

  // 7. POST \u88ab\u62d2\u7edd
  const post = await request(BASE + '/index.html', 'POST');
  ok('POST \u88ab\u62d2\u7edd', post.status === 405);

  // 8. JS \u6587\u4ef6\u542b\u5173\u952e\u5168\u5c40
  const app = await request(BASE + '/app.js');
  ok('app.js \u542b Games \u5f15\u7528', /Games\./.test(app.body));
  ok('app.js \u542b Sounds \u5f15\u7528', /Sounds\./.test(app.body));
  ok('app.js \u4f7f\u7528 textContent', /textContent/.test(app.body));
  ok('app.js \u542b visibilitychange \u5904\u7406', /visibilitychange/.test(app.body));
  const games = await request(BASE + '/games.js');
  ok('games.js \u5b9a\u4e49 20+ \u6e38\u620f', (games.body.match(/define\(/g) || []).length >= 20);
  ok('games.js \u63d0\u4f9b loop \u5de5\u5177', /function loop\(/.test(games.body));
  const extra = await request(BASE + '/games-extra.js');
  ok('games-extra.js \u5b9a\u4e49 90+ \u6e38\u620f', (extra.body.match(/define\(/g) || []).length >= 90);

  // 9. \u6587\u4ef6\u5408\u89c4
  const index = await request(BASE + '/');
  ok('HTML \u4f7f\u7528 defer', /<script defer src=/.test(index.body));
  ok('HTML \u6709 noscript', /<noscript>/.test(index.body));
  ok('HTML \u6709 ARIA', /aria-label=/.test(index.body));
  ok('HTML \u6709\u9884\u8fde\u63a5', /preconnect.*fonts\.googleapis\.com/.test(index.body));

  console.log(`\n\u7ed3\u679c\uff1a${passed} \u901a\u8fc7 / ${failed} \u5931\u8d25`);
  if (failed) { console.log('\u9519\u8bef\u5217\u8868\uff1a'); for (const e of errors) console.log('  - ' + e); process.exit(1); }
}

main().catch((e) => { console.error('Smoke \u5d29\u6e83\uff1a', e); process.exit(1); });
