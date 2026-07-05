// TINYCADE 静态分析器
// 检查 HTML / CSS / JS 中的常见质量问题。

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const files = {
  html:  ['index.html'],
  css:   ['style.css'],
  js:    ['app.js', 'sounds.js', 'version.js', 'server.js', 'build.js', 'sw.js']
};

let failed = 0, passed = 0;
function ok(name, cond, detail) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

// =========== HTML 检查 ===========
{
  const html = read('index.html');
  ok('html 含 <html lang>', /<html\s+lang=/.test(html));
  ok('html 含 <meta charset>', /<meta\s+charset=/.test(html));
  ok('html 含 <meta viewport>', /<meta\s+name="viewport"/.test(html));
  ok('html 含 <meta description>', /<meta\s+name="description"/.test(html));
  ok('html 含 <meta theme-color>', /<meta\s+name="theme-color"/.test(html));
  ok('html 含 <title>', /<title>/.test(html));
  ok('html 含 skip-link', /skip-link/.test(html));
  ok('html 含 main landmark', /<main[^>]+aria-labelledby/.test(html));
  ok('html 含 role=list', /role="list"/.test(html));
  ok('html 含 noscript 兜底', /<noscript>/.test(html));
  // 先剔除 HTML 注释,避免注释中描述的 <script> 文本触发误报。
  const htmlNoComment = html.replace(/<!--[\s\S]*?-->/g, '');
  ok('html 所有 script 带 defer 或 src', /<script(?![^>]*defer)(?![^>]*src=)/.test(htmlNoComment) === false);
  ok('html 不包含 inline script（无 defer 且无 src）', /<script>(?![\s\S]*document\.|\s*<)/.test(html) === false || !/<script>(?!\s*<\/)/.test(html));
  ok('html 不引入 google ads', !/googletagmanager|google-analytics|adsbygoogle/.test(html));
  ok('html 不使用 document.write', !/document\.write/.test(html));
  ok('html 含 preconnect 提示', /preconnect.*fonts\.googleapis\.com/.test(html));
  ok('html 含 dns-prefetch', /dns-prefetch/.test(html));
  ok('html 含 manifest', /<link rel="manifest"/.test(html));
  // 验证 link 顺序：css 在 head 中
  const cssPos = html.indexOf('<link rel="stylesheet"');
  const headEnd = html.indexOf('</head>');
  ok('CSS 在 </head> 之前', cssPos > 0 && cssPos < headEnd);
}

// =========== CSS 检查 ===========
{
  const css = read('style.css');
  ok('css 使用 CSS 变量', /:root\s*{/.test(css));
  ok('css 含 prefers-reduced-motion', /prefers-reduced-motion/.test(css));
  ok('css 含 sr-only', /\.sr-only/.test(css));
  ok('css 含 skip-link', /\.skip-link/.test(css));
  ok('css 含 touch-action', /touch-action/.test(css));
  ok('css 不包含危险选择器 或 !important 过度', !/expression\s*\(/.test(css));
  // 根据全文统计 !important 数量
  const important = (css.match(/!important/g) || []).length;
  ok('!important 使用不过度', important < 30, 'count=' + important);
}

// =========== JS 检查 ===========
{
  const app = read('app.js');
  ok('app.js 不使用 eval', !/\beval\(/.test(app));
  ok('app.js 不使用 new Function', !/new Function\(/.test(app));
  ok('app.js 含错误边界', /try\s*{[\s\S]*?init\(\)/.test(app) || /try[\s\S]{0,400}init\(\)/.test(app));
  ok('app.js 使用 textContent', /textContent/.test(app));
  ok('app.js 不使用 innerHTML 拼接模板', !/innerHTML\s*=\s*\`/.test(app));
  // visibilitychange 后台暂停由 engine.js 内部 document.hidden 跳过帧完成,
  // app.js 不必再监听(监听了反而会触发 stop() 永久终止)。
  const badVis = /addEventListener\([\'\"]visibilitychange[\'\"][\s\S]{0,300}?State\.cleanup\s*\(/.test(app);
  ok('app.js 不再有破坏性 visibilitychange 清理', !badVis);
  ok('app.js 注册 SW', /serviceWorker/.test(app));
  ok('app.js 不再用 createKeyDispatcher（触摸不再伪造键盘）', !/createKeyDispatcher/.test(app));
  // 阶段 3 结束后已删除老游戏 fallback 路径, app.js 不再派发 KeyboardEvent。
  const keb = (app.match(/new\s+KeyboardEvent/g) || []).length;
  ok('app.js 不再为老游戏 fallback 派发 KeyboardEvent (==0 处)', keb === 0, 'count=' + keb);

  for (const f of files.js) {
    const s = read(f);
    ok(f + ' 不使用 eval', !/\beval\(/.test(s));
    ok(f + ' 不使用 new Function', !/new Function\(/.test(s));
    ok(f + ' 不使用 with(', !/\bwith\s*\(/.test(s));
  }

  const server = read('server.js');
  ok('server.js 路径检查', /path\.resolve[\s\S]+path\.sep/.test(server));
  ok('server.js CSP', /Content-Security-Policy/.test(server));
  ok('server.js rate limit', /rateLimit/.test(server));

  const sw = read('sw.js');
  ok('sw.js 含世代 cache', /CACHE_NAME/.test(sw));
  ok('sw.js fetch handler', /addEventListener\(['"]fetch/.test(sw));
  ok('sw.js PRECACHE 包含 engine/engine.js', /['"]\.\/engine\/engine\.js['"]/.test(sw));
  ok('sw.js PRECACHE 包含 games/manifest.js', /['"]\.\/games\/manifest\.js['"]/.test(sw));
}

// =========== 文件合规 ===========
{
  for (const f of files.html.concat(files.css).concat(files.js)) {
    const s = read(f);
    ok(f + ' 不以 BOM 开头', s.charCodeAt(0) !== 0xFEFF);
    ok(f + ' 以 \\n 结尾', s.endsWith('\n'));
  }
}

// =========== games/*.js 纯净性规则（§13） ===========
// 目的：守住"update 必须是纯逻辑"的护栏。任何使用不确定来源（Math.random / 日期
// / DOM / 直接音效）的命中即 CI 红灯，强制改用 rng / tick / api.emit。
{
  const gamesDir = path.join(ROOT, 'games');
  let gameFiles = [];
  try {
    gameFiles = fs.readdirSync(gamesDir)
      .filter((f) => f.endsWith('.js') && !f.startsWith('_'));
  } catch (e) {
    ok('games/ 目录可读', false, e && e.message);
  }
  // 提取每个游戏的 update(...) 段：基于花括号匹配(遇 render/serialize/over 边界或 } 结束)，
  // 不依赖缩进,避免被内层 if/for 的 4 空格 "  " 闭合花括号过早截断。
  function extractUpdateBlock(src) {
    // 兼容 update(input)/update(input_)/update(snap) 等参数命名。
    const m = src.match(/update\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{/);
    if (!m) return src;
    const i = m.index;
    if (i < 0) return src;
    const start = src.indexOf("{", i);
    if (start < 0) return src;
    let depth = 0;
    for (let j = start; j < src.length; j++) {
      const ch = src[j];
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) return src.substring(start + 1, j); }
    }
    return src;
  }
  for (const f of gameFiles) {
    const rel = 'games/' + f;
    const src = read(rel);
    // manifest.js 是元数据，不是游戏，必须跳过纯净性规则。
    if (f === 'manifest.js') {
      ok(rel + ' 是 ES Module（命名导出）', /^\s*export\s+(const|function|class)\s/m.test(src));
      continue;
    }
    ok(rel + ' 是 ES Module（默认导出）', /export\s+default\s+\{[\s\S]*meta\s*:/.test(src));
    ok(rel + ' 显式声明 tickHz', /\btickHz\s*:/.test(src));
    ok(rel + ' 不出现 Math.random', !/\bMath\.random\b/.test(src));
    ok(rel + ' 不出现 Date.now', !/\bDate\.now\b/.test(src));
    ok(rel + ' 不出现 new Date()', !/\bnew\s+Date\s*\(/.test(src));
    ok(rel + ' 不出现 performance.now', !/\bperformance\.now\b/.test(src));
    ok(rel + ' 不直接调 Sounds.sfx.*', !/\bSounds\.sfx\.\w+/.test(src));
    ok(rel + ' 不直接调 Sounds.sfx[', !/\bSounds\.sfx\[/.test(src));
    // update 段内禁止 DOM/window
    const up = extractUpdateBlock(src);
    ok(rel + ' update 段不出现 document.', !/\bdocument\.\b/.test(up));
    ok(rel + ' update 段不出现 window.', !/\bwindow\.\b/.test(up));
  }
  ok('games/*.js 数量 >= 2（manifest + 至少 1 个迁移游戏）', gameFiles.length >= 2, 'actual=' + gameFiles.length);
}

console.log('\nLint: ' + passed + ' pass / ' + failed + ' fail');
process.exit(failed ? 1 : 0);
