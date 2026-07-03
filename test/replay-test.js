/* ============================================================
   test/replay-test.js — 无头回放测试 runner（§7.1）
   遍历 test/replay/*.tape.json，动态 import 对应 games/<game>.js，
   replay(mod, tape) → hashState(终态)，断言 === tape.expect。
   没有 tape 时打印"无金样本"提示并绿灯通过。
   原生 ESM · 零依赖。
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { replay, hashState } from '../engine/recorder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const replayDir = path.join(__dirname, 'replay');
const gamesDir = path.join(__dirname, '..', 'games');

function listTapes() {
  if (!fs.existsSync(replayDir)) return [];
  return fs.readdirSync(replayDir)
    .filter((f) => f.endsWith('.tape.json'))
    .map((f) => path.join(replayDir, f));
}

async function main() {
  const tapes = listTapes();
  if (tapes.length === 0) {
    console.log('[replay] 无金样本（test/replay/*.tape.json 为空），跳过回放测试 ✓');
    return 0;
  }

  let failed = 0;
  for (const tapePath of tapes) {
    const rel = path.relative(process.cwd(), tapePath);
    let tape;
    try {
      tape = JSON.parse(fs.readFileSync(tapePath, 'utf8'));
    } catch (e) {
      console.error(`[replay] ✗ ${rel} 解析失败: ${e.message}`);
      failed++;
      continue;
    }

    const game = tape.game;
    if (!game) {
      console.error(`[replay] ✗ ${rel} 缺少 "game" 字段`);
      failed++;
      continue;
    }

    const modUrl = pathToFileURL(path.join(gamesDir, `${game}.js`)).href;
    let mod;
    try {
      mod = await import(modUrl);
    } catch (e) {
      console.error(`[replay] ✗ ${rel} 无法加载 games/${game}.js: ${e.message}`);
      failed++;
      continue;
    }

    let actual;
    try {
      const finalState = replay(mod, tape);
      actual = hashState(finalState);
    } catch (e) {
      console.error(`[replay] ✗ ${rel} 回放异常: ${e.message}`);
      failed++;
      continue;
    }

    if (actual === tape.expect) {
      console.log(`[replay] ✓ ${game} (${actual})`);
    } else {
      console.error(`[replay] ✗ ${game} 哈希不一致`);
      console.error(`         期望 expect: ${tape.expect}`);
      console.error(`         实际 actual: ${actual}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n[replay] ${failed} 个金样本回放失败`);
    return 1;
  }
  console.log(`\n[replay] 全部 ${tapes.length} 个金样本回放通过 ✓`);
  return 0;
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error('[replay] runner 崩溃:', e);
  process.exit(1);
});
