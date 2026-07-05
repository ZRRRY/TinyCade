#!/usr/bin/env node
/* ============================================================
   scripts/record-all-tapes.mjs — 批量给所有缺 tape 的游戏录带
   跳过 tape 已存在的游戏 (idempotent)。失败时打印并继续。
   用法: node scripts/record-all-tapes.mjs
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GAMES_DIR = path.join(ROOT, 'games');
const TAPE_DIR = path.join(ROOT, 'test', 'replay');

// 复用 record-tape.mjs 的核心逻辑。直接 dynamic import。
const { spawn } = await import('node:child_process');

function listGames() {
  return fs.readdirSync(GAMES_DIR)
    .filter((f) => f.endsWith('.js') && f !== 'manifest.js' && f !== 'snake.js')
    .map((f) => f.replace(/\.js$/, ''));
}

function hasTape(id) {
  return fs.existsSync(path.join(TAPE_DIR, id + '.tape.json'));
}

async function recordOne(id) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['scripts/record-tape.mjs', id, '--seed', '12345', '--max-ticks', '500'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '', err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('close', (code) => {
      if (code === 0) {
        const m = out.match(/expect:\s*(\S+)/);
        resolve({ id, ok: true, expect: m ? m[1] : '?', code });
      } else {
        resolve({ id, ok: false, code, err: err.slice(-300) });
      }
    });
  });
}

const ids = listGames();
const missing = ids.filter((id) => !hasTape(id));
const allTapeIds = (fs.existsSync(TAPE_DIR) ? fs.readdirSync(TAPE_DIR) : []).filter((f) => f.endsWith('.tape.json')).map((f) => f.replace(/\.tape\.json$/, ''));
const reRecord = process.argv.includes('--all');
const target = reRecord ? ids : missing;
console.log(`[batch] total=${ids.length} missing=${missing.length} existing=${ids.length - missing.length} mode=${reRecord ? 'all' : 'missing-only'}`);

let ok = 0, fail = 0;
const failed = [];
for (const id of target) {
  const r = await recordOne(id);
  if (r.ok) {
    ok++;
    console.log(`[batch] ✓ ${id} (${r.expect})`);
  } else {
    fail++;
    failed.push({ id, ...r });
    console.error(`[batch] ✗ ${id} (code=${r.code}) ${r.err.split('\n').slice(-1)[0]}`);
  }
}

console.log(`\n[batch] done: ${ok} ok / ${fail} fail`);
if (failed.length) {
  console.log('[batch] failed ids:', failed.map((f) => f.id).join(', '));
  process.exit(1);
}
