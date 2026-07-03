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

function main() {
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
  const sizes = {};
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
    sizes[f] = { raw: buf.length };
  }
  fs.writeFileSync(path.join(DIST, 'asset-manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(DIST, 'sri.json'), JSON.stringify(sri, null, 2));

  // 3. rewrite index.html
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  // 仅顶层资源参与字面量改写 + SRI 注入；engine/*.js 与 games/*.js 通过静态 import()
  // 引用，URL 字面量不能改写（需要 import-map），因此跳过。
  const TOP_LEVEL_PATHS = new Set(ASSETS_TOP);
  for (const [orig, hashed] of Object.entries(manifest)) {
    if (!TOP_LEVEL_PATHS.has(orig)) continue;
    const escOrig = orig.replace(/\./g, '\\.');
    html = html.replace(new RegExp(escOrig, 'g'), hashed);
  }
  for (const [orig, info] of Object.entries(sri)) {
    if (!TOP_LEVEL_PATHS.has(orig)) continue;
    if (orig.endsWith('.css')) {
      const re = new RegExp(`<link rel="stylesheet" href="${info.file.replace(/\./g, '\\.')}"\\s*/?>`);
      html = html.replace(re, `<link rel="stylesheet" href="${info.file}" integrity="${info.integrity}" crossorigin="anonymous" />`);
    } else {
      const re = new RegExp(`<script defer src="${info.file.replace(/\./g, '\\.')}"></script>`);
      html = html.replace(re, `<script defer src="${info.file}" integrity="${info.integrity}" crossorigin="anonymous"></script>`);
    }
  }
  const verHash = sha(Buffer.from(fs.readFileSync(path.join(ROOT, 'version.js'), 'utf8')));
  // 顶层入口已经在 index.html 通过静态 <script type="module" src="app.js"> 引入；
  // 这里的 preload 是额外加速提示。
  const preload = `  <meta name="build-hash" content="${verHash}" />
  <link rel="preload" as="script" href="${manifest['app.js']}" crossorigin="anonymous" />
  <link rel="preload" as="style" href="${manifest['style.css']}" crossorigin="anonymous" />
  <link rel="preload" as="script" href="${manifest['engine/engine.js'] || 'engine/engine.js'}" crossorigin="anonymous" />
  <link rel="preload" as="script" href="${manifest['games/manifest.js'] || 'games/manifest.js'}" crossorigin="anonymous" />`;
  html = html.replace('</head>', `${preload}\n</head>`);
  fs.writeFileSync(path.join(DIST, 'index.html'), html);
  if (COMPRESSIBLE.test('index.html')) compress(path.join(DIST, 'index.html'), Buffer.from(html));

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

main();
