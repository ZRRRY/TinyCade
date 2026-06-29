/* ============================================================
   TINYCADE - 8-bit 音效系统
   使用 Web Audio API 合成复古音效，无需音频文件
   ============================================================ */

const Sounds = (() => {
  let ctx = null;
  let enabled = true;
  let masterGain = null;

  function getCtx() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = 0.3;
        masterGain.connect(ctx.destination);
      } catch (e) {
        console.warn('Web Audio not supported', e);
        return null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function setEnabled(v) {
    enabled = !!v;
    if (masterGain) masterGain.gain.value = enabled ? 0.3 : 0;
  }

  function isEnabled() { return enabled; }

  // 基础音符频率
  const NOTE = {
    C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50
  };

  // 播放单个音符
  function tone(freq, duration = 0.1, type = 'square', vol = 0.3) {
    if (!enabled) return;
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain).connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + duration);
  }

  // 滑音 (频率滑动)
  function sweep(f1, f2, duration = 0.2, type = 'square', vol = 0.3) {
    if (!enabled) return;
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f2, c.currentTime + duration);
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain).connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + duration);
  }

  // 噪声 (用于爆炸等)
  function noise(duration = 0.2, vol = 0.2) {
    if (!enabled) return;
    const c = getCtx();
    if (!c) return;
    const bufSize = c.sampleRate * duration;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    }
    const src = c.createBufferSource();
    const gain = c.createGain();
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1500;
    src.buffer = buf;
    gain.gain.setValueAtTime(vol, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    src.connect(filter).connect(gain).connect(masterGain);
    src.start();
  }

  // ==================== 预设音效 ====================
  const sfx = {
    blip: () => tone(NOTE.E5, 0.06, 'square', 0.2),
    blip2: () => tone(NOTE.A5, 0.06, 'square', 0.2),
    select: () => { tone(NOTE.E4, 0.05, 'square', 0.2); setTimeout(() => tone(NOTE.G4, 0.05, 'square', 0.2), 50); },
    move: () => tone(NOTE.C4, 0.04, 'square', 0.15),
    eat: () => { tone(NOTE.E5, 0.08, 'square', 0.25); setTimeout(() => tone(NOTE.G5, 0.08, 'square', 0.25), 60); },
    hit: () => noise(0.15, 0.3),
    explode: () => { noise(0.3, 0.3); tone(NOTE.C2, 0.2, 'sawtooth', 0.3); },
    shoot: () => sweep(800, 200, 0.1, 'square', 0.2),
    powerup: () => {
      const notes = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6];
      notes.forEach((n, i) => setTimeout(() => tone(n, 0.08, 'square', 0.25), i * 60));
    },
    clear: () => {
      const notes = [NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5];
      notes.forEach((n, i) => setTimeout(() => tone(n, 0.1, 'square', 0.25), i * 80));
    },
    gameover: () => {
      const notes = [NOTE.E5, NOTE.D5, NOTE.C5, NOTE.B4, NOTE.A4];
      notes.forEach((n, i) => setTimeout(() => tone(n, 0.2, 'square', 0.3), i * 150));
    },
    win: () => {
      const notes = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.G5, NOTE.C6];
      notes.forEach((n, i) => setTimeout(() => tone(n, 0.12, 'square', 0.3), i * 100));
    },
    error: () => { tone(NOTE.A3, 0.1, 'square', 0.25); setTimeout(() => tone(NOTE.A2, 0.2, 'square', 0.25), 100); },
    countdown: () => tone(NOTE.A4, 0.1, 'square', 0.3),
    start: () => { tone(NOTE.C4, 0.1); setTimeout(() => tone(NOTE.E4, 0.1), 80); setTimeout(() => tone(NOTE.G4, 0.15), 160); },
    drop: () => sweep(400, 100, 0.1, 'square', 0.2),
    jump: () => sweep(300, 600, 0.15, 'square', 0.2),
    place: () => tone(NOTE.G3, 0.06, 'square', 0.2),
    line: () => { for (let i = 0; i < 4; i++) setTimeout(() => tone(NOTE.C5 + i * 100, 0.06, 'square', 0.25), i * 50); },
    flip: () => tone(NOTE.E4, 0.04, 'square', 0.2),
    beep: () => tone(NOTE.A5, 0.05, 'square', 0.15),
    deny: () => { tone(NOTE.E3, 0.08, 'sawtooth', 0.25); setTimeout(() => tone(NOTE.C3, 0.12, 'sawtooth', 0.25), 80); },
    click: () => tone(NOTE.G5, 0.03, 'square', 0.15),
    pop: () => { sweep(400, 800, 0.08, 'sine', 0.3); },
    swoosh: () => sweep(200, 1200, 0.2, 'triangle', 0.2)
  };

  return { sfx, setEnabled, isEnabled, getCtx, tone, sweep, noise, NOTE };
})();

