import { makeRng } from '../engine/rng.js';
const files = ['tetris','minesweeper','g2048','fifteen','hangman','maze','sudoku','kakuro','bridges','shikaku','sokoban','pipes','sliding','wordsearch','match3','checkers','shapematch','mini4','mathrush','killer','fill','ice','frogjump','slide3','path','make24','jigsaw','letters','colorcode'];
let ok = 0, fail = 0;
const events = [];
const api = { width: 400, height: 400, emit: (s) => events.push(s) };
for (const f of files) {
  try {
    const rng = makeRng(12345);
    const mod = await import('../games/' + f + '.js');
    const m = mod.default;
    if (!m.meta || m.meta.id !== f) throw new Error('meta.id mismatch: ' + (m.meta && m.meta.id));
    if (typeof m.create !== 'function') throw new Error('create missing');
    const inst = m.create(rng, api);
    inst.update({ held: {}, pressed: {} });
    inst.update({ held: { up:true, down:true, left:true, right:true, a:true, b:true, start:true, select:true }, pressed: { up:true, down:true, left:true, right:true, a:true, b:true, start:true, select:true } });
    const ser = inst.serialize();
    if (!ser || typeof ser !== 'object') throw new Error('serialize bad');
    console.log('OK', f, JSON.stringify(ser).slice(0, 120));
    ok++;
  } catch (e) {
    console.error('FAIL', f, e.message);
    fail++;
  }
}
console.log('TOTAL: ok=' + ok + ' fail=' + fail);
process.exit(fail > 0 ? 1 : 0);