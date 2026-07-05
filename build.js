// TINYCADE build script
// - copies static files to dist/
// - emits content-hashed copies of cacheable assets
// - generates gzip + brotli pre-compressed copies
// - injects SRI sha384 hashes + <link rel=preload> into index.html

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
// 顶层入口：浏览器 index.html 直接引用，必须做 SRI + 内容哈希。
const ASSETS_TOP = ['app.js', 'sounds.js', 'version.js', 'style.css'];

// 阶段 2+：扫描 engine/ + games/ 目录生成动态 ASSETS。
// 这些文件经过哈希 + 写入 manifest.json；但浏览器通过 import('./engine/rng.js') 这类
// 静态字面量导入，并不会被构建改写，所以下方会再以**原文**复制一份进入 dist/。
// 原文与哈希版共存：前者满足 import 字面量解析，后者为 asset-manifest.json 报告。
function scanJsDir(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full)
    .filter((f) => f.endsWith('.js') && !f.startsWith('_'))
    .map((f) => path.posix.join(dir, f));
}
const ASSETS_DYNAMIC = [...scanJsDir('engine'), ...scanJsDir('games')];
const ASSETS = [...ASSETS_TOP, ...ASSETS_DYNAMIC];

const STATIC_FILES = [
  'index.html', 'README.md', 'SECURITY.md', 'CHANGELOG.md', 'CODE_REVIEW.md',
  'DEPLOYMENT_PLAN.md', 'nginx.conf', 'Caddyfile', 'vercel.json', 'Dockerfile',
  'sw.js', 'manifest.webmanifest',
  'test/smoke.js', 'test/jsdom-smoke.js', 'test/server-test.js', 'test/lint.js', 'test/run-all.js',
  'package.json', 'benchmark.html'
];
const COMPRESSIBLE = /\.(js|css|html|json|webmanifest|svg|txt|map)$/i;

function sha(buf, len = 8) {
  return crypto.createHash('sha256').update(buf).digest('hex').slice(0, len);
}
function sri384(buf) {
  return 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
}

function rmrf(target) {
  if (!fs.existsSync(target)) return;
  const stat = fs.lstatSync(target);
  if (stat.isDirectory()) {
    for (const f of fs.readdirSync(target)) rmrf(path.join(target, f));
    try { fs.rmdirSync(target); } catch (e) {}
  } else {
    try { fs.unlinkSync(target); } catch (e) {}
  }
}

function compress(file, content) {
  const gz = zlib.gzipSync(content, { level: 9 });
  fs.writeFileSync(file + '.gz', gz);
  // brotli may not be available on older Node; degrade to gzip only
  if (typeof zlib.brotliCompressSync === 'function') {
    try {
      const br = zlib.brotliCompressSync(content, {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 }
      });
      fs.writeFileSync(file + '.br', br);
    } catch (e) { /* ignore */ }
  }
  return { gz: gz.length };
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateOgSvgDefault() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <pattern id="og-grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,255,255,0.08)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="#0a0014"/>
  <rect width="1200" height="630" fill="url(#og-grid)"/>
  <rect x="90" y="90" width="40" height="40" fill="#ff00ff"/>
  <rect x="140" y="90" width="40" height="40" fill="#00ffff"/>
  <rect x="190" y="90" width="40" height="40" fill="#ffff00"/>
  <rect x="90" y="140" width="40" height="40" fill="#00ffff"/>
  <rect x="140" y="140" width="40" height="40" fill="#ff00ff"/>
  <rect x="190" y="140" width="40" height="40" fill="#ffff00"/>
  <text x="600" y="300" text-anchor="middle" font-family="monospace" font-size="96" fill="#00ffff" font-weight="bold">TINYCADE</text>
  <text x="600" y="390" text-anchor="middle" font-family="monospace" font-size="36" fill="#ffffff">111 款复古小游戏 · 纯前端 · 零依赖</text>
  <text x="600" y="560" text-anchor="middle" font-family="monospace" font-size="24" fill="#888888">TINYCADE</text>
</svg>`;
}

function generateOgSvgGame(meta) {
  const name = escapeXml(meta.name || meta.id);
  const desc = escapeXml(meta.desc || '');
  const cat = escapeXml((meta.cat || '').toUpperCase());
  const icon = escapeXml(meta.icon || '▣');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <pattern id="og-grid-${meta.id}" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,255,255,0.08)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="#0a0014"/>
  <rect width="1200" height="630" fill="url(#og-grid-${meta.id})"/>
  <rect x="80" y="80" width="1040" height="470" fill="none" stroke="rgba(0,255,255,0.25)" stroke-width="4"/>
  <text x="600" y="160" text-anchor="middle" font-family="monospace" font-size="28" fill="#ff00ff" font-weight="bold">${cat}</text>
  <text x="600" y="270" text-anchor="middle" font-family="monospace" font-size="140">${icon}</text>
  <text x="600" y="430" text-anchor="middle" font-family="monospace" font-size="72" fill="#00ffff" font-weight="bold">${name}</text>
  <text x="600" y="500" text-anchor="middle" font-family="monospace" font-size="32" fill="#ffffff">${desc}</text>
  <text x="600" y="580" text-anchor="middle" font-family="monospace" font-size="24" fill="#888888">TINYCADE · 复古小游戏合集</text>
</svg>`;
}

async function main() {
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
  for (const f of fs.readdirSync(DIST)) rmrf(path.join(DIST, f));

  // 0a. 递归复制 engine/ 与 games/（**原文**，无哈希），保证 import('./engine/X.js')
  //     与 await import(`./games/${id}.js`) 在 dist/ 中可直接解析。
  for (const dir of ['engine', 'games']) {
    const src = path.join(ROOT, dir);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(DIST, dir);
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) {
      if (!f.endsWith('.js') || f.startsWith('_')) continue;
      const s = path.join(src, f);
      const d = path.join(dst, f);
      fs.copyFileSync(s, d);
      if (COMPRESSIBLE.test(f)) compress(d, fs.readFileSync(d));
    }
  }

  // 1. copy static files
  for (const f of STATIC_FILES) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(DIST, f);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    if (COMPRESSIBLE.test(f)) compress(dst, fs.readFileSync(dst));
  }

  // 2. emit hashed copies + compress
  const manifest = {};
  const sri = {};
  for (const f of ASSETS) {
    const src = path.join(ROOT, f);
    if (!fs.existsSync(src)) { console.warn('skip missing', f); continue; }
    const buf = fs.readFileSync(src);
    const h = sha(buf);
    const ext = path.extname(f);
    const base = path.basename(f, ext);
    const hashed = `${base}.${h}${ext}`;
    const dst = path.join(DIST, hashed);
    fs.writeFileSync(dst, buf);
    if (COMPRESSIBLE.test(f)) compress(dst, buf);
    manifest[f] = hashed;
    sri[f] = { file: hashed, integrity: sri384(buf), size: buf.length };
  }
  fs.writeFileSync(path.join(DIST, 'asset-manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(DIST, 'sri.json'), JSON.stringify(sri, null, 2));

  // 3. rewrite index.html
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  // 仅顶层资源参与字面量改写 + SRI 注入；engine/*.js 与 games/*.js 通过静态 import()
  // 引用，URL 字面量不能改写（需要 import-map），因此跳过。
  const TOP_LEVEL_PATHS = new Set(ASSETS_TOP);
  for (const [orig, hashed] of Object.entries(manifest)) {
    // 所有 manifest entry 都参与 orig→hashed 替换(顶层补 SRI,engine/games 通过下方 sri 循环补 integrity)。
    const escOrig = orig.replace(/\./g, '\\.');
    html = html.replace(new RegExp(escOrig, 'g'), hashed);
  }
  for (const [orig, info] of Object.entries(sri)) {
    // 与上面的 orig 替换循环保持一致: 所有 manifest entry 都进入, integrity 仅在 orig 循环内部条件分支注入。
    if (orig.endsWith('.css')) {
      const re = new RegExp(`<link rel="stylesheet" href="${info.file.replace(/\./g, '\\.')}"\\s*/?>`);
      html = html.replace(re, `<link rel="stylesheet" href="${info.file}" integrity="${info.integrity}" crossorigin="anonymous" />`);
    } else {
      // 同时匹配 defer 与 type="module" 两种顶层脚本,保证 ESM 入口(app.js)也注入 SRI。
      const esc = info.file.replace(/\./g, '\\.');
      const reDefer = new RegExp(`<script defer src="${esc}"></script>`);
      const reModule = new RegExp(`<script type="module" src="${esc}"></script>`);
      const replaced = `<script src="${info.file}" integrity="${info.integrity}" crossorigin="anonymous"></script>`;
      html = html.replace(reDefer, replaced.replace('<script ', '<script defer '));
      // preload 元素(开发期 index.html 模板里的额外加速提示)也补 integrity,防止中间人篡改。
      if (TOP_LEVEL_PATHS.has(orig) || /^engine[/]/.test(orig) || /^games[/]/.test(orig)) {
        const rePreload = new RegExp("<link rel=\"preload\"[^>]*href=\"" + esc + "\"\\s*/>");
        const newPreload = "<link rel=\"preload\" href=\"" + info.file + "\" integrity=\"" + info.integrity + "\" crossorigin=\"anonymous\" />";
        html = html.replace(rePreload, newPreload);
      }
      html = html.replace(reModule, replaced.replace('<script ', '<script type="module" '));
    }
  }
  const verHash = sha(Buffer.from(fs.readFileSync(path.join(ROOT, 'version.js'), 'utf8')));
  // 顶层入口已经在 index.html 通过静态 <script type="module" src="app.js"> 引入；
  // 这里的 preload 是额外加速提示。
  // 给 preload 同步加 integrity: 浏览器对 module preload 也做 SRI 校验,防止中间人篡改。
  const mkPreload = (key, fallback) => {
    const m = manifest[key];
    const i = sri[key];
    const href = m || fallback;
    return i
      ? `<link rel="preload" as="script" href="${href}" integrity="${i.integrity}" crossorigin="anonymous" />`
      : `<link rel="preload" as="script" href="${href}" crossorigin="anonymous" />`;
  };
  const mkPreloadStyle = (key, fallback) => {
    const m = manifest[key];
    const i = sri[key];
    const href = m || fallback;
    return i
      ? `<link rel="preload" as="style" href="${href}" integrity="${i.integrity}" crossorigin="anonymous" />`
      : `<link rel="preload" as="style" href="${href}" crossorigin="anonymous" />`;
  };
  const preload = `  <meta name="build-hash" content="${verHash}" />
${mkPreload('app.js', 'app.js')}
${mkPreloadStyle('style.css', 'style.css')}
${mkPreload('engine/engine.js', 'engine/engine.js')}
${mkPreload('games/manifest.js', 'games/manifest.js')}`;
  html = html.replace('</head>', `${preload}\n</head>`);
  fs.writeFileSync(path.join(DIST, 'index.html'), html);
  if (COMPRESSIBLE.test('index.html')) compress(path.join(DIST, 'index.html'), Buffer.from(html));

  // 3a. 重写 dist/sw.js 的 PRECACHE 路径,使用 hashed 后的资源名,保证 dist 部署的 PWA 离线有效。
  let swSrc = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  // 自动 bump SW_VERSION(基于 build 时间戳): 让每次 build 出来的 dist/sw.js 与旧 cache 名不同,
  // 确保 install → activate 流程会清掉旧 PWA cache,用户拿到的是新资源,而不是 SW cache 里的旧版。
  const swVer = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  swSrc = swSrc.replace(/const SW_VERSION = '[^']*';/, 'const SW_VERSION = \'' + swVer + '\';');
  // manifest[orig] = hashed 文件名(字符串),不是对象。用 sri 才有 { file, integrity, size }。
  for (const [orig, hashed] of Object.entries(manifest)) {
    const esc = orig.replace(/\\./g, '\\\\.');
    const re = new RegExp('\\./' + esc, 'g');
    swSrc = swSrc.replace(re, './' + hashed);
  }
  fs.writeFileSync(path.join(DIST, 'sw.js'), swSrc);
  if (COMPRESSIBLE.test('sw.js')) compress(path.join(DIST, 'sw.js'), Buffer.from(swSrc));

  // 3b. 生成 Open Graph 图：默认封面 + 每款游戏封面（静态 SVG）。
  const { MANIFEST } = await import('./games/manifest.js');
  const ogDir = path.join(DIST, 'og');
  fs.mkdirSync(ogDir, { recursive: true });
  const defaultSvg = generateOgSvgDefault();
  const defaultSvgPath = path.join(ogDir, 'default.svg');
  fs.writeFileSync(defaultSvgPath, defaultSvg);
  compress(defaultSvgPath, Buffer.from(defaultSvg));
  for (const g of MANIFEST) {
    const svg = generateOgSvgGame(g);
    const p = path.join(ogDir, `${g.id}.svg`);
    fs.writeFileSync(p, svg);
    compress(p, Buffer.from(svg));
  }

  // 4. summary
  console.log('Build done. dist/ ready:');
  let totalRaw = 0, totalGz = 0;
  for (const [k, v] of Object.entries(manifest)) {
    const raw = sri[k].size;
    const gzPath = path.join(DIST, v + '.gz');
    const gz = fs.existsSync(gzPath) ? fs.statSync(gzPath).size : raw;
    totalRaw += raw; totalGz += gz;
    console.log(`  ${k} -> ${v}  raw=${(raw/1024).toFixed(1)}KB gz=${(gz/1024).toFixed(1)}KB`);
  }
  const idx = path.join(DIST, 'index.html');
  const idxGz = path.join(idx + '.gz');
  if (fs.existsSync(idxGz)) {
    totalRaw += fs.statSync(idx).size;
    totalGz += fs.statSync(idxGz).size;
  }
  console.log(`\nTotal: raw=${(totalRaw/1024).toFixed(1)}KB gz=${(totalGz/1024).toFixed(1)}KB (${Math.round(100 - 100 * totalGz / totalRaw)}% smaller)`);
}

main().catch((e) => { console.error('Build failed:', e); process.exit(1); });
