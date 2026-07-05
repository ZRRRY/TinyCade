// Verifies that games/mathrush.js gen() cannot deadlock.
// Mirrors the new logic introduced to fix the gen() infinite loop.
const rngMod = require('./engine/rng.js');
const rng = rngMod.makeRng(12345);
let deadlocks = 0;
let trials = 100;
for (let t = 0; t < trials; t++) {
  const a = rng.int(20) + 1, b = rng.int(20) + 1;
  const op = ['+', '-', '*'][rng.int(3)];
  const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const choices = [ans];
  let safety = 0;
  while (choices.length < 4 && safety++ < 100) {
    const v = ans + rng.range(-10, 11);
    if (!choices.includes(v)) choices.push(v);
  }
  if (choices.length < 4) choices.push(ans + 100);
  if (choices.length < 4) deadlocks++;
}
console.log('Deadlocks in', trials, 'trials (new gen() with safety+fallback):', deadlocks);
