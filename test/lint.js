// TINYCADE \u9759\u6001\u5206\u6790\u5668
// \u68c0\u67e5 HTML / CSS / JS \u4e2d\u7684\u5e38\u89c1\u8d28\u91cf\u95ee\u9898\u3002

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const files = {
  html:  ['index.html'],
  css:   ['style.css'],
  js:    ['app.js', 'games.js', 'games-extra.js', 'sounds.js', 'version.js', 'server.js', 'build.js', 'sw.js']
};

let failed = 0, passed = 0;
function ok(name, cond, detail) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

// =========== HTML \u68c0\u67e5 ===========
{
  const html = read('index.html');
  ok('html \u542b <html lang>', /<html\s+lang=/.test(html));
  ok('html \u542b <meta charset>', /<meta\s+charset=/.test(html));
  ok('html \u542b <meta viewport>', /<meta\s+name="viewport"/.test(html));
  ok('html \u542b <meta description>', /<meta\s+name="description"/.test(html));
  ok('html \u542b <meta theme-color>', /<meta\s+name="theme-color"/.test(html));
  ok('html \u542b <title>', /<title>/.test(html));
  ok('html \u542b skip-link', /skip-link/.test(html));
  ok('html \u542b main landmark', /<main[^>]+aria-labelledby/.test(html));
  ok('html \u542b role=list', /role="list"/.test(html));
  ok('html \u542b noscript \u843d\u9000', /<noscript>/.test(html));
  ok('html \u6240\u6709 script \u5e26 defer', /<script(?![^>]*defer)(?![^>]*src=)/.test(html) === false);
  ok('html \u4e0d\u5305\u542b inline script', /<script>(?![\s\S]*document\.|\s*<)/.test(html) === false || !/<script>(?!\s*<\/)/.test(html));
  ok('html \u4e0d\u5f15\u5165 google ads', !/googletagmanager|google-analytics|adsbygoogle/.test(html));
  ok('html \u4e0d\u4f7f\u7528 document.write', !/document\.write/.test(html));
  ok('html \u542b preconnect \u63d0\u793a', /preconnect.*fonts\.googleapis\.com/.test(html));
  ok('html \u542b dns-prefetch', /dns-prefetch/.test(html));
  ok('html \u542b manifest', /<link rel="manifest"/.test(html));
  // \u9a8c\u8bc1 link \u987a\u5e8f\uff1acss \u5728 head \u4e2d
  const cssPos = html.indexOf('<link rel="stylesheet"');
  const headEnd = html.indexOf('</head>');
  ok('CSS \u5728 </head> \u4e4b\u524d', cssPos > 0 && cssPos < headEnd);
}

// =========== CSS \u68c0\u67e5 ===========
{
  const css = read('style.css');
  ok('css \u4f7f\u7528 CSS \u53d8\u91cf', /:root\s*{/.test(css));
  ok('css \u542b prefers-reduced-motion', /prefers-reduced-motion/.test(css));
  ok('css \u542b sr-only', /\.sr-only/.test(css));
  ok('css \u542b skip-link', /\.skip-link/.test(css));
  ok('css \u542b touch-action', /touch-action/.test(css));
  ok('css \u4e0d\u5305\u542b\u5371\u9669\u9009\u62e9\u5668 \u6216 !important \u8fc7\u5ea6', !/expression\s*\(/.test(css));
  // \u6839\u636e\u5168\u6587\u7edf\u8ba1 !important \u6570\u91cf
  const important = (css.match(/!important/g) || []).length;
  ok('!important \u4f7f\u7528\u4e0d\u8fc7\u5ea6', important < 30, 'count=' + important);
}

// =========== JS \u68c0\u67e5 ===========
{
  const app = read('app.js');
  ok('app.js \u4e0d\u4f7f\u7528 eval', !/\beval\(/.test(app));
  ok('app.js \u4e0d\u4f7f\u7528 new Function', !/new Function\(/.test(app));
  ok('app.js \u542b\u9519\u8bef\u8fb9\u754c', /try\s*{[\s\S]*?init\(\)/.test(app) || /try[\s\S]{0,400}init\(\)/.test(app));
  ok('app.js \u4f7f\u7528 textContent', /textContent/.test(app));
  ok('app.js \u4e0d\u4f7f\u7528 innerHTML \u62fc\u63a5\u6a21\u677f', !/innerHTML\s*=\s*\`/.test(app));
  ok('app.js \u542b visibilitychange \u5904\u7406', /visibilitychange/.test(app));
  ok('app.js \u6ce8\u518c SW', /serviceWorker/.test(app));

  for (const f of files.js) {
    const s = read(f);
    ok(f + ' \u4e0d\u4f7f\u7528 eval', !/\beval\(/.test(s));
    ok(f + ' \u4e0d\u4f7f\u7528 new Function', !/new Function\(/.test(s));
    ok(f + ' \u4e0d\u4f7f\u7528 with(', !/\bwith\s*\(/.test(s));
  }

  const server = read('server.js');
  ok('server.js \u8def\u5f84\u68c0\u67e5', /path\.resolve[\s\S]+path\.sep/.test(server));
  ok('server.js CSP', /Content-Security-Policy/.test(server));
  ok('server.js rate limit', /rateLimit/.test(server));

  const games = read('games.js');
  const extra = read('games-extra.js');
  const totalDefines = (games.match(/define\(/g) || []).length + (extra.match(/define\(/g) || []).length;
  ok('\u6e38\u620f\u603b\u6570 >= 100', totalDefines >= 100, 'actual=' + totalDefines);

  const sw = read('sw.js');
  ok('sw.js \u542b\u4e16\u4ee3 cache', /CACHE_NAME/.test(sw));
  ok('sw.js fetch handler', /addEventListener\(['"]fetch/.test(sw));
}

// =========== \u6587\u4ef6\u5408\u89c4 ===========
{
  for (const f of files.html.concat(files.css).concat(files.js)) {
    const s = read(f);
    ok(f + ' \u4e0d\u4ee5 BOM \u5f00\u5934', s.charCodeAt(0) !== 0xFEFF);
    ok(f + ' \u4ee5 \\n \u7ed3\u5c3e', s.endsWith('\n'));
  }
}

console.log('\nLint: ' + passed + ' pass / ' + failed + ' fail');
process.exit(failed ? 1 : 0);
