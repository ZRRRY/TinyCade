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
const ASSETS = ['app.js', 'games.js', 'games-extra.js', 'sounds.js', 'version.js', 'style.css'];
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
  for (const [orig, hashed] of Object.entries(manifest)) {
    const escOrig = orig.replace(/\./g, '\\.');
    html = html.replace(new RegExp(escOrig, 'g'), hashed);
  }
  for (const [orig, info] of Object.entries(sri)) {
    if (orig.endsWith('.css')) {
      const re = new RegExp(`<link rel="stylesheet" href="${info.file.replace(/\./g, '\\.')}"\\s*/?>`);
      html = html.replace(re, `<link rel="stylesheet" href="${info.file}" integrity="${info.integrity}" crossorigin="anonymous" />`);
    } else {
      const re = new RegExp(`<script defer src="${info.file.replace(/\./g, '\\.')}"></script>`);
      html = html.replace(re, `<script defer src="${info.file}" integrity="${info.integrity}" crossorigin="anonymous"></script>`);
    }
  }
  const verHash = sha(Buffer.from(fs.readFileSync(path.join(ROOT, 'version.js'), 'utf8')));
  const preload = `  <meta name="build-hash" content="${verHash}" />
  <link rel="preload" as="script" href="${manifest['app.js']}" crossorigin="anonymous" />
  <link rel="preload" as="style" href="${manifest['style.css']}" crossorigin="anonymous" />
  <link rel="preload" as="script" href="${manifest['games.js']}" crossorigin="anonymous" />`;
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
