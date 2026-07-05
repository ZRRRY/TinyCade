// TINYCADE 烟雾测试
// 使用：npm run smoke
// 依赖：启动 server.js，本脚本会以 HTTP 请求验证关键资源

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
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; errors.push(name + (detail ? ' :: ' + detail : '')); console.log(`  ✗ ${name}${detail ? ' :: ' + detail : ''}`); }
}

async function main() {
  console.log(`TINYCADE smoke test -> ${BASE}`);

  // 1. 首页
  const home = await request(BASE + '/');
  ok('GET / 200', home.status === 200);
  ok('HTML 含标题', /TINYCADE/.test(home.body));
  ok('HTML 含游戏库', /game-grid/.test(home.body));
  ok('HTML 含跳过链接', /skip-link/.test(home.body));
  ok('Cache-Control on HTML', /no-cache/.test(home.headers['cache-control'] || ''));
  ok('CSP header set', typeof home.headers['content-security-policy'] === 'string');
  ok('X-Content-Type-Options set', home.headers['x-content-type-options'] === 'nosniff');

  // 2. 静态资源
  for (const path of ['/app.js', '/sounds.js', '/style.css', '/version.js', '/games/manifest.js']) {
    const r = await request(BASE + path);
    ok(`GET ${path} 200`, r.status === 200);
    ok(`${path} 有 cache`, !!r.headers['cache-control']);
  }

  // 3. 路径遍历
  for (const path of ['/..%2Fserver.js', '/%2e%2e%2fserver.js', '/..%5c..%5cwindows%5csystem32%5cdrivers%5cetc%5chosts']) {
    const r = await request(BASE + path);
    ok(`Path traversal ${path} 被拒绝`, r.status === 403 || r.status === 404);
  }

  // 4. 不存在的资源
  const nf = await request(BASE + '/no-such-file.js');
  ok('GET 不存在资源 404', nf.status === 404);

  // 5. 健康检查
  const h = await request(BASE + '/healthz');
  ok('GET /healthz 200', h.status === 200);
  ok('/healthz 返回 JSON', /"status":"ok"/.test(h.body));

  // 6. HEAD 方法
  const head = await request(BASE + '/app.js', 'HEAD');
  ok('HEAD /app.js 200', head.status === 200);
  ok('HEAD 有 Content-Length', !!head.headers['content-length']);

  // 7. POST 被拒绝
  const post = await request(BASE + '/index.html', 'POST');
  ok('POST 被拒绝', post.status === 405);

  // 8. JS 文件含关键引用
  const app = await request(BASE + '/app.js');
  ok('app.js 含 MANIFEST 引用', /MANIFEST/.test(app.body));
  ok('app.js 含 Sounds 引用', /Sounds\./.test(app.body));
  ok('app.js 使用 textContent', /textContent/.test(app.body));
  // 后台暂停由 engine.js 内部 document.hidden 跳过帧完成。旧 app.js 监听 visibilitychange + cleanup 会导致切回前台后游戏卡死,已移除。
  ok('app.js 不再有破坏性 visibilitychange 清理', !/visibilitychange[\s\S]{0,400}?cleanup\s*\(/.test(app.body));
  const manifest = await request(BASE + '/games/manifest.js');
  ok('games/manifest.js 是 ES Module', /export\s+const\s+MANIFEST/.test(manifest.body));
  ok('games/manifest.js 含 100+ 游戏', (manifest.body.match(/"id":/g) || []).length >= 100, 'actual=' + (manifest.body.match(/"id":/g) || []).length);

  // 9. 文件合规
  const index = await request(BASE + '/');
  ok('HTML 使用 defer', /<script defer src=/.test(index.body));
  ok('HTML 有 noscript', /<noscript>/.test(index.body));
  ok('HTML 有 ARIA', /aria-label=/.test(index.body));
  ok('HTML 有预连接', /preconnect.*fonts\.googleapis\.com/.test(index.body));

  console.log(`\n结果：${passed} 通过 / ${failed} 失败`);
  if (failed) { console.log('错误列表：'); for (const e of errors) console.log('  - ' + e); process.exit(1); }
}

main().catch((e) => { console.error('Smoke 崩溃：', e); process.exit(1); });
