// TINYCADE 一键测试
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const STANDALONE = [
  ['lint',  ['node', 'test/lint.js']],
  ['jsdom', ['node', 'test/jsdom-smoke.js']],
  ['unit',  ['node', 'test/unit-test.js']],
  ['audit', ['node', 'test/audit-test.js']]
];
const NEED_SERVER = [
  ['smoke',  ['node', 'test/smoke.js']],
  ['server', ['node', 'test/server-test.js']]
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((res, rej) => {
        const req = http.get(url, (r) => { r.resume(); res(r.statusCode); });
        req.on('error', rej);
        req.setTimeout(500, () => req.destroy(new Error('timeout')));
      });
      return true;
    } catch (e) { await sleep(200); }
  }
  return false;
}

function run(cmd, args) {
  return new Promise((res) => {
    const p = spawn(cmd, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', d => { out += d; process.stdout.write(d); });
    p.stderr.on('data', d => { err += d; process.stderr.write(d); });
    p.on('close', code => res({ code, out, err }));
    // 防 stdout buffer 满: 定期 drain
    setInterval(() => {}, 1000).unref();
  });
}

async function main() {
  let pass = 0, fail = 0;
  console.log('=== standalone ===');
  for (const [name, args] of STANDALONE) {
    const r = await run(args[0], args.slice(1));
    const last = (r.out + r.err).split('\n').filter(Boolean).pop() || '';
    const ok = r.code === 0;
    if (ok) pass++; else fail++;
    console.log((ok ? 'PASS ' : 'FAIL ') + name + ' :: ' + last);
  }

  console.log('=== with server ===');
  const server = spawn('node', ['server.js'], { cwd: ROOT, stdio: 'ignore' });
  server.unref();
  if (!await waitForServer('http://localhost:8088/healthz', 5000)) {
    console.log('FAIL server-startup');
    fail++;
  } else {
    for (const [name, args] of NEED_SERVER) {
      const r = await run(args[0], args.slice(1));
      const last = (r.out + r.err).split('\n').filter(Boolean).pop() || '';
      const ok = r.code === 0;
      if (ok) pass++; else fail++;
      console.log((ok ? 'PASS ' : 'FAIL ') + name + ' :: ' + last);
    }
  }
  server.kill();

  // 负载测试（可选）
  if (!process.env.SKIP_LOAD) {
    const { spawnSync } = require('child_process');
    const dist = require('path').join(__dirname, '..', 'dist');
    const fsx = require('fs');
    const html = fsx.existsSync(dist + '/index.html') ? fsx.readFileSync(dist + '/index.html', 'utf8') : '';
    const m = html.match(/(app|sounds|style|version)\.[a-f0-9]{8}\.(js|css)/g) || [];
    const hashed = m.filter((v, i, a) => a.indexOf(v) === i).map(p => '/' + p).join(',');
    if (hashed) {
      const r = spawnSync('node', ['test/load-test.js', '--users', '50', '--requests', '20', '--base', 'http://localhost:8088'], {
        cwd: ROOT, env: { ...process.env, HASHED_PATHS: hashed, LOAD_TEST: '1' }, encoding: 'utf8'
      });
      const out = (r.stdout || '') + (r.stderr || '');
      const last = out.split('\n').filter(Boolean).pop() || '';
      const ok = r.status === 0;
      if (ok) pass++; else fail++;
      console.log((ok ? 'PASS ' : 'FAIL ') + 'load' + ' :: ' + last.trim());
    }
  }

  console.log('\n=== TOTAL: ' + pass + ' pass / ' + fail + ' fail ===');
  process.exit(fail ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });