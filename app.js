/* ============================================================
   TINYCADE - 主控逻辑（ES Module 化 · 阶段 2）
   - 启动动画
   - 路由 (游戏库/游戏/关于)
   - 筛选 & 搜索
   - 游戏加载与清理（懒加载 + 老 Games 回退）
   - 触摸控制改 input.setBtn（不再伪造 KeyboardEvent）
   - P 暂停 / R 重开 / ?record=1 录制导出
   ============================================================ */

import { MANIFEST, findById } from './games/manifest.js';
import { runGame } from './engine/engine.js';
import { createInput } from './engine/input.js';
import { createRecorder } from './engine/recorder.js';
import { makeRng } from './engine/rng.js';

// 模块脚本对 window 全局可见；解构局部别名以便压缩。
const Sounds = window.Sounds;
const Games = () => window.Games;

// ================== 状态 ==================
const State = {
  view: 'library',         // library | game | about
  currentGame: null,
  cleanup: null,           // engine stop()
  touchCleanup: null,
  currentInput: null,      // engine/input 实例，供触摸按钮 setBtn
  currentInst: null,       // 游戏实例（更新已包装的版本）
  paused: false,
  recording: false,
  recorder: null,
  recSeed: 0,
  recordMode: false,       // ?record=1 标记
  played: new Set(),
  totalScore: 0,
  cat: 'all',
  search: '',
  soundOn: true,
};

// 固定步长 tick 频率（snake 10Hz；其他游戏先用 snake 的默认，迁移后跟随游戏自身声明的 tickHz）。
const CANVAS_SIZE = 400;
const FIXED_SEED = 123456789; // ?record=1 时固定，与 snake.tape.json 一致

// ================== 工具 ==================
function safeEl(id) {
  try { return document.getElementById(id); } catch (e) { return null; }
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function load() {
  try {
    const raw = localStorage.getItem('pixel-arcade');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data && typeof data === 'object') {
      if (Array.isArray(data.played)) {
        State.played = new Set(data.played.filter(x => typeof x === 'string'));
      }
      if (Number.isFinite(data.totalScore)) State.totalScore = data.totalScore;
      if (typeof data.soundOn === 'boolean') State.soundOn = data.soundOn;
    }
  } catch (e) {}
}
function save() {
  try {
    localStorage.setItem('pixel-arcade', JSON.stringify({
      played: [...State.played],
      totalScore: State.totalScore,
      soundOn: State.soundOn
    }));
  } catch (e) {
    const quota = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
    if (quota && typeof status !== 'undefined' && status) {
      status.textContent = '⚠ 本地存储已满，进度保存失败';
    }
  }
}

function announce(msg) {
  const el = document.getElementById('a11y-status');
  if (el) {
    el.textContent = '';
    setTimeout(() => { el.textContent = msg; }, 50);
  }
}

// ================== 启动动画 ==================
function bootAnimation() {
  const bar = document.getElementById('boot-bar-fill');
  const tip = document.getElementById('boot-tip');
  const screen = document.getElementById('boot-screen');
  if (!bar || !screen) return;
  let progress = 0;
  const tipMessages = [
    'INITIALIZING PIXEL MATRIX',
    'LOADING ROM FILE',
    'CALIBRATING CRT',
    'WARMING UP JOYSTICK',
    'PRESS ANY KEY TO START'
  ];
  const interval = setInterval(() => {
    progress += 12 + Math.random() * 6;
    if (progress > 100) progress = 100;
    bar.style.width = progress + '%';
    if (progress > 80) {
      tip.textContent = tipMessages[Math.min(Math.floor((progress - 80) / 5), tipMessages.length - 1)];
    }
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        screen.classList.add('fade-out');
        try { Sounds.sfx.start(); } catch (e) {}
        setTimeout(() => { try { screen.remove(); } catch (e) {} }, 600);
      }, 400);
    }
  }, 80);
}

// ================== 视图切换 ==================
function showView(name) {
  State.view = name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('view-active'));
  document.getElementById('view-' + name)?.classList.add('view-active');
  document.querySelectorAll('.nav-btn[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === name);
  });
  if (name !== 'game') {
    if (State.cleanup) {
      try { State.cleanup(); } catch (e) {}
      State.cleanup = null;
      State.currentGame = null;
      State.currentInput = null;
      State.currentInst = null;
    }
    if (State.touchCleanup) {
      try { State.touchCleanup(); } catch (e) {}
      State.touchCleanup = null;
    }
  }
  if (name === 'about') updateAboutStats();
  requestAnimationFrame(() => {
    const main = document.getElementById('view-' + name);
    if (main) {
      const focusTarget = main.querySelector('h1, h2, [tabindex]') || main;
      if (focusTarget && focusTarget.setAttribute) {
        if (!focusTarget.hasAttribute('tabindex')) focusTarget.setAttribute('tabindex', '-1');
        focusTarget.focus({ preventScroll: false });
      }
    }
  });
  announce(name === 'library' ? '游戏库' : name === 'about' ? '关于' : '游戏状态');
}

// ================== 游戏库渲染 ==================
function renderLibrary() {
  const grid = document.getElementById('game-grid');
  const filtered = MANIFEST.filter(g => {
    if (State.cat !== 'all' && g.cat !== State.cat) return false;
    if (State.search) {
      const q = State.search.toLowerCase();
      if (!g.name.toLowerCase().includes(q) && !g.desc.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  grid.innerHTML = '';
  filtered.forEach(g => {
    const card = document.createElement('div');
    card.className = 'game-card' + (State.played.has(g.id) ? ' played' : '');
    card.dataset.id = g.id;
    card.innerHTML = '<span class="game-icon"></span><div class="game-name"></div><div class="game-desc"></div><span class="game-cat"></span>';
    card.querySelector('.game-icon').textContent = g.icon || '';
    card.querySelector('.game-name').textContent = g.name || '';
    card.querySelector('.game-desc').textContent = g.desc || '';
    const cat = card.querySelector('.game-cat');
    cat.dataset.cat = g.cat || '';
    cat.textContent = (g.cat || '').toUpperCase();
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', g.name + ': ' + g.desc);
    card.addEventListener('click', () => {
      try { Sounds.sfx.select(); } catch (e) {}
      launchGame(g.id);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        try { Sounds.sfx.select(); } catch (e) {}
        launchGame(g.id);
      }
    });
    grid.appendChild(card);
  });
  if (!filtered.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:#888;font-family:VT323;font-size:24px;">未找到匹配的游戏</div>';
  }
  // 统计
  { const e = safeEl('game-count'); if (e) e.textContent = String(MANIFEST.length).padStart(2, '0'); }
  { const e = safeEl('games-played'); if (e) e.textContent = String(State.played.size).padStart(2, '0'); }
  { const e = safeEl('total-score'); if (e) e.textContent = String(State.totalScore).padStart(6, '0'); }
  { const e = safeEl('stat-games'); if (e) e.textContent = MANIFEST.length; }
  const cats = new Set(MANIFEST.map(g => g.cat));
  { const e = safeEl('stat-cats'); if (e) e.textContent = cats.size; }
}

function updateAboutStats() {
  { const e = safeEl('stat-games'); if (e) e.textContent = MANIFEST.length; }
  const cats = new Set(MANIFEST.map(g => g.cat));
  { const e = safeEl('stat-cats'); if (e) e.textContent = cats.size; }
  const ver = document.getElementById('about-version');
  if (ver) {
    const v = (typeof window !== 'undefined' && window.TINYCADE_VERSION) || '1.0.0';
    const b = (typeof window !== 'undefined' && window.TINYCADE_BUILD) || '';
    ver.textContent = `v${v}${b ? ' · ' + b : ''}`;
  }
}

// ================== 加载老 Games（fallback 用） ==================
let legacyGamesPromise = null;
function ensureLegacyGames() {
  if (Games()) return Promise.resolve(Games());
  if (legacyGamesPromise) return legacyGamesPromise;
  legacyGamesPromise = new Promise((resolve, reject) => {
    const loadOne = (src) => new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;       // 顺序：games.js 必须在 games-extra.js 之前
      s.onload = () => res();
      s.onerror = () => rej(new Error('failed to load ' + src));
      document.head.appendChild(s);
    });
    loadOne('games.js')
      .then(() => loadOne('games-extra.js'))
      .then(() => {
        if (!window.Games) { reject(new Error('Games global not defined after legacy load')); return; }
        resolve(window.Games);
      })
      .catch(reject);
  });
  return legacyGamesPromise;
}

// ================== 启动游戏 ==================
function pickSeed() {
  return State.recordMode ? FIXED_SEED : ((Math.random() * 0x100000000) >>> 0);
}

function showSpinner(stage) {
  stage.style.position = 'relative';
  stage.innerHTML = '';
  const sp = document.createElement('div');
  sp.className = 'game-loading';
  sp.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#00ffff;font-family:VT323;font-size:24px;';
  sp.textContent = 'LOADING…';
  stage.appendChild(sp);
  return sp;
}

function showLoadError(stage, err) {
  stage.innerHTML = '';
  const box = document.createElement('div');
  box.style.cssText = 'color:#ff0066;font-family:VT323;font-size:20px;padding:24px;text-align:center;line-height:1.5;';
  box.innerHTML = '';
  const title = document.createElement('div');
  title.textContent = '⚠ 游戏加载失败';
  title.style.cssText = 'font-size:28px;margin-bottom:12px;';
  box.appendChild(title);
  const msg = document.createElement('div');
  msg.textContent = (err && err.message) ? err.message : String(err);
  box.appendChild(msg);
  const retry = document.createElement('button');
  retry.className = 'pixel-btn primary';
  retry.style.cssText = 'margin-top:16px;';
  retry.textContent = '🔄 重试';
  retry.onclick = () => { if (State.currentGame) launchGame(State.currentGame); };
  box.appendChild(retry);
  const back = document.createElement('button');
  back.className = 'pixel-btn';
  back.style.cssText = 'margin-top:8px;';
  back.textContent = '◀ 返回游戏库';
  back.onclick = () => showView('library');
  box.appendChild(back);
  stage.appendChild(box);
}

async function launchGame(id) {
  const meta = findById(id);
  if (!meta) return;
  // 清理上一局
  if (State.cleanup) { try { State.cleanup(); } catch (e) {} State.cleanup = null; }
  if (State.touchCleanup) { try { State.touchCleanup(); } catch (e) {} State.touchCleanup = null; }
  State.currentGame = id;
  State.paused = false;
  State.recording = false;
  State.recorder = null;
  State.played.add(id);
  save();

  // header
  { const e = safeEl('game-title'); if (e) e.textContent = (meta.name || id).toUpperCase(); }
  const gc = document.getElementById('game-controls');
  gc.innerHTML = '';
  const label = document.createElement('span');
  label.textContent = '操作：';
  gc.appendChild(label);
  const strong = document.createElement('strong');
  strong.textContent = meta.controls || '';
  gc.appendChild(strong);

  // 舞台 + spinner
  const stage = document.getElementById('game-stage');
  showSpinner(stage);
  const hud = document.createElement('div');
  hud.className = 'game-hud';
  hud.innerHTML = '<span class="hud-score">SCORE 0</span><span class="hud-info">' + (meta.cat || '').toUpperCase() + '</span>';
  stage.appendChild(hud);
  const status = document.getElementById('game-status');
  status.textContent = '';

  // 1) 尝试懒加载新模块
  let mod = null;
  let loadErr = null;
  try {
    const url = `./games/${id}.js`;
    const imported = await import(/* @vite-ignore */ url);
    mod = imported.default || imported;
  } catch (e) {
    loadErr = e;
  }

  if (mod && typeof mod.create === 'function') {
    // 新引擎路径
    try {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      canvas.style.width = Math.min(CANVAS_SIZE, 480) + 'px';
      canvas.style.height = Math.min(CANVAS_SIZE, 480) + 'px';
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      stage.appendChild(canvas);

      const input = createInput();
      State.currentInput = input;

      const seed = pickSeed();
      State.recSeed = seed;
      const rng = makeRng(seed);
      const events = [];
      const inst = mod.create(rng, {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        emit(name) { events.push(name); }
      });
      State.events = events;
      inst.events = events;

      // 包装 update：拦截 start 边沿 → 暂停/恢复；不破坏确定性（暂停时整个 tick 跳过）。
      State.paused = false;
      let prevStart = false;
      const origUpdate = inst.update.bind(inst);
      inst.update = (snap) => {
        const curStart = !!snap.held.start;
        if (curStart && !prevStart) {
          State.paused = !State.paused;
          announce(State.paused ? '已暂停' : '继续');
        }
        prevStart = curStart;
        if (State.paused) return; // 暂停期间不前进状态
        origUpdate(snap);
      };

      State.currentInst = inst;

      // 录制器
      let recorder = null;
      if (State.recordMode) {
        recorder = createRecorder();
        State.recorder = recorder;
        State.recording = true;
      }

      const stop = runGame(inst, ctx, {
        input,
        recorder,
        onEvent: (s) => { try { Sounds.sfx[s]?.(); } catch (e) {} }
      });
      State.cleanup = () => {
        try { stop(); } catch (e) {}
        try { input.destroy(); } catch (e) {}
        // 复制 recorder.frames 状态供 UI 取（按钮点击时导出）
      };

      // 注入控制按钮（含 R 重开、复制金样本）
      injectControlButtons(id);
      injectTouchControls();
      try { Sounds.sfx.powerup(); } catch (e) {}
      showView('game');
      announce(meta.name + ' 已加载');
      setTimeout(renderLibrary, 100);
      return;
    } catch (e) {
      loadErr = e;
      // 走 fallback
    }
  }

  // 2) Fallback：旧 Games registry（lazy load games.js + games-extra.js）
  try {
    const Registry = await ensureLegacyGames();
    const old = Registry.get(id);
    if (!old || !old.factory) { throw new Error('game not found in legacy registry'); }
    if (State.cleanup) { try { State.cleanup(); } catch (e) {} State.cleanup = null; }
    stage.innerHTML = '';
    stage.appendChild(hud);
    const cleanup = old.factory(stage, hud, status);
    State.cleanup = typeof cleanup === 'function' ? cleanup : null;
    // 老游戏走的全局键盘监听器，旧路径继续持有（input.setBtn 不适用）。
    // 触摸按钮为了兼容这里仍可注入，但只对老游戏无影响（已在 factory 内挂自己的键盘）。
    injectControlButtons(id);
    injectTouchControls();
    try { Sounds.sfx.powerup(); } catch (e) {}
    showView('game');
    announce(meta.name + ' 已加载（兼容模式）');
    setTimeout(renderLibrary, 100);
  } catch (e2) {
    console.error('launchGame failed', loadErr, e2);
    showLoadError(stage, loadErr || e2);
    State.currentInst = null;
    State.currentInput = null;
    showView('game');
  }
}

// ================== 控制按钮（R 重开 / ESC 返回 / ?record 复制金样本） ==================
function injectControlButtons(id) {
  const ctrls = document.getElementById('game-controls');
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;';

  const restart = document.createElement('button');
  restart.className = 'pixel-btn primary';
  restart.textContent = '🔄 重新开始 (R)';
  restart.onclick = () => { try { Sounds.sfx.start(); } catch (e) {} launchGame(id); };
  wrap.appendChild(restart);

  const back = document.createElement('button');
  back.className = 'pixel-btn';
  back.textContent = '◀ 返回 (ESC)';
  back.onclick = () => { try { Sounds.sfx.beep(); } catch (e) {} showView('library'); };
  wrap.appendChild(back);

  // ?record=1 时显示复制按钮
  if (State.recordMode) {
    const copy = document.createElement('button');
    copy.className = 'pixel-btn';
    copy.id = 'rec-copy-btn';
    copy.textContent = '📋 复制金样本';
    copy.onclick = async () => {
      const tape = State.recorder ? State.recorder.export(State.recSeed) : null;
      const text = JSON.stringify({
        game: id,
        seed: State.recSeed,
        frames: tape ? tape.frames : []
      }, null, 2);
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // fallback：临时 textarea
          const ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta);
          ta.select(); document.execCommand('copy'); ta.remove();
        }
        copy.textContent = '✓ 已复制';
        setTimeout(() => { copy.textContent = '📋 复制金样本'; }, 1500);
      } catch (e) {
        copy.textContent = '⚠ 复制失败';
      }
    };
    wrap.appendChild(copy);
    const recLabel = document.createElement('span');
    recLabel.style.cssText = 'color:#ff00ff;font-family:VT323;font-size:18px;';
    recLabel.textContent = `● REC seed=${State.recSeed}`;
    wrap.appendChild(recLabel);
  }

  ctrls.appendChild(wrap);
}

// ================== 触摸虚拟手柄 ==================
function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  try {
    var sp = location.search || "";
    if (sp.indexOf("touchpad=1") !== -1) return true;
    if (sp.indexOf("touchpad=0") !== -1) return false;
  } catch (e) {}
  var hasTouch = ('ontouchstart' in window) ||
    (navigator && navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
    (navigator && navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);
  var narrow;
  try {
    narrow = !!(window.matchMedia && window.matchMedia('(max-width: 720px)').matches);
  } catch (e) { narrow = false; }
  if (!narrow) {
    try { narrow = (window.innerWidth || 0) <= 720; } catch (e) { narrow = false; }
  }
  var ua = (navigator && navigator.userAgent) || '';
  var isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk|MicroMessenger|QQ\/|MQQBrowser|UCBrowser|UCWEB/i.test(ua);
  var hasOrientation = (typeof window.orientation !== 'undefined') || (window.screen && window.screen.orientation && typeof window.screen.orientation.type === 'string');
  if (hasTouch && narrow) return true;
  if (hasTouch && isMobileUA) return true;
  if (narrow && isMobileUA) return true;
  if (hasTouch) return true;
  if (narrow && hasOrientation) return true;
  if (isMobileUA && narrow) return true;
  return false;
}

// 安装单向触摸按钮（按下/松开直接写到 input.setBtn，不再伪造 KeyboardEvent）
function attachTouchBtn(btn, btnName, momentary, onTap) {
  var active = false;
  function onStart(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (active) return;
    active = true;
    btn.classList.add('pressed');
    if (State.currentInput) {
      State.currentInput.setBtn(btnName, true);
    }
    if (momentary && onTap) { onTap(); }
  }
  function onEnd(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!active) return;
    active = false;
    btn.classList.remove('pressed');
    if (State.currentInput && !momentary) {
      State.currentInput.setBtn(btnName, false);
    }
  }
  btn.addEventListener('touchstart', onStart, { passive: false });
  btn.addEventListener('touchend', onEnd, { passive: false });
  btn.addEventListener('touchcancel', onEnd, { passive: false });
  btn.addEventListener('mousedown', onStart);
  btn.addEventListener('mouseup', onEnd);
  btn.addEventListener('mouseleave', onEnd);
  return function cleanup() {
    btn.removeEventListener('touchstart', onStart);
    btn.removeEventListener('touchend', onEnd);
    btn.removeEventListener('touchcancel', onEnd);
    btn.removeEventListener('mousedown', onStart);
    btn.removeEventListener('mouseup', onEnd);
    btn.removeEventListener('mouseleave', onEnd);
    if (active && State.currentInput && !momentary) {
      try { State.currentInput.setBtn(btnName, false); } catch (e) {}
    }
  };
}

function injectTouchControls() {
  if (!isTouchDevice()) return;
  var ctrls = document.getElementById('game-controls');
  if (!ctrls || ctrls.querySelector('.touch-controls')) return;
  var dpad = document.createElement('div');
  dpad.className = 'touch-controls show';
  dpad.setAttribute('role', 'group');
  dpad.setAttribute('aria-label', '虚拟方向键');

  function mkBtn(cls, label, title) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'touch-btn ' + cls;
    b.textContent = label;
    b.setAttribute('aria-label', title || label);
    return b;
  }
  dpad.appendChild(mkBtn('up', '▲', '上'));
  dpad.appendChild(mkBtn('left', '◀', '左'));
  // 中央键: 新模块游戏中映射到 a；老游戏无 input 句柄，触发发 keydown a（兜底）
  dpad.appendChild(mkBtn('center', 'A', '跳跃/确认/射击'));
  dpad.appendChild(mkBtn('right', '▶', '右'));
  dpad.appendChild(mkBtn('down', '▼', '下'));
  ctrls.appendChild(dpad);

  var row = document.createElement('div');
  row.className = 'touch-action-row show';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', '游戏动作');
  row.appendChild(mkBtn('act-pause', 'PAUSE', '暂停 (P)'));
  row.appendChild(mkBtn('act-restart', 'RESTART', '重新开始 (R)'));
  row.appendChild(mkBtn('act-back', 'BACK', '返回 (ESC)'));
  ctrls.appendChild(row);

  var cleanups = [];
  cleanups.push(attachTouchBtn(dpad.querySelector('.up'), 'up', false));
  cleanups.push(attachTouchBtn(dpad.querySelector('.down'), 'down', false));
  cleanups.push(attachTouchBtn(dpad.querySelector('.left'), 'left', false));
  cleanups.push(attachTouchBtn(dpad.querySelector('.right'), 'right', false));

  // 中央 A：短暂触发 a 边沿（等价按键边沿）。仅在新模块游戏（State.currentInput 存在）
  // 时有效；老游戏走物理键盘路径，触摸中央键不会触发键盘事件（设计如此：阶段 3 迁完老
  // 游戏后再也不需要任何 KeyboardEvent 兜底）。
  var center = dpad.querySelector('.center');
  cleanups.push(attachTouchBtn(center, 'a', true));

  cleanups.push(attachTouchBtn(row.querySelector('.act-pause'), 'start', true));
  cleanups.push(attachTouchBtn(row.querySelector('.act-restart'), null, true, function () {
    try { Sounds.sfx.start(); } catch (e) {}
    launchGame(State.currentGame);
  }));
  cleanups.push(attachTouchBtn(row.querySelector('.act-back'), null, true, function () {
    try { Sounds.sfx.beep(); } catch (e) {}
    showView('library');
  }));

  State.touchCleanup = function () {
    cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
    if (dpad.parentNode) dpad.parentNode.removeChild(dpad);
    if (row.parentNode) row.parentNode.removeChild(row);
  };
}

// ================== 事件绑定 ==================
function bindEvents() {
  // 导航
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      try { Sounds.sfx.beep(); } catch (e) {}
      showView(btn.dataset.view);
    });
  });

  // 返回按钮
  {
    const e = safeEl('back-btn');
    if (e) {
      e.addEventListener('click', () => {
        try { Sounds.sfx.beep(); } catch (e) {}
        showView('library');
      });
    }
  }

  // 筛选
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.cat = btn.dataset.cat;
      try { Sounds.sfx.select(); } catch (e) {}
      renderLibrary();
    });
  });

  // 搜索
  const searchBox = document.getElementById('game-search');
  if (searchBox) {
    searchBox.addEventListener('input', (e) => {
      State.search = e.target.value.trim();
      renderLibrary();
    });
  }

  // 声音开关
  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      State.soundOn = !State.soundOn;
      Sounds.setEnabled(State.soundOn);
      soundBtn.textContent = State.soundOn ? '♪ SOUND: ON' : '♪ SOUND: OFF';
      soundBtn.style.color = State.soundOn ? '' : '#888';
      save();
      if (State.soundOn) { try { Sounds.sfx.beep(); } catch (e) {} }
    });
    Sounds.setEnabled(State.soundOn);
    if (!State.soundOn) {
      soundBtn.textContent = '♪ SOUND: OFF';
      soundBtn.style.color = '#888';
    }
  }

  // 全局键盘（ESC 返回；R 重开；新引擎路径下 R 调 launchGame 重启）
  window.addEventListener('keydown', (e) => {
    if (State.view !== 'game') return;
    if (e.key === 'Escape') {
      try { Sounds.sfx.beep(); } catch (e) {}
      showView('library');
      return;
    }
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.key && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      try { Sounds.sfx.start(); } catch (e) {}
      if (State.currentGame) launchGame(State.currentGame);
      return;
    }
  });

  // 后台标签页暂停游戏循环，避免浪费 CPU/GPU
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && State.cleanup) {
      try { State.cleanup(); } catch (e) {}
    }
  });

  // 第一次点击激活音频上下文
  document.addEventListener('click', () => Sounds.getCtx(), { once: true });
  document.addEventListener('keydown', () => Sounds.getCtx(), { once: true });
}

// ================== 启动 ==================
function detectUrlFlags() {
  try {
    var qs = location.search.substring(1);
    if (/(?:^|&)record=1(?:&|$)/.test(qs)) State.recordMode = true;
  } catch (e) {}
}

function init() {
  try {
    detectUrlFlags();
    load();
    bindEvents();
    renderLibrary();
    bootAnimation();
    try {
      var _qs = location.search.substring(1);
      var _m = _qs.match(/(?:^|&)game=([a-z0-9_-]+)/i);
      if (_m && findById(_m[1])) {
        setTimeout(function () { launchGame(_m[1]); }, 200);
      }
    } catch (e) {}
  } catch (e) {
    console.error('Init failed:', e);
    const root = document.getElementById('view-library') || document.body;
    const msg = document.createElement('div');
    msg.style.cssText = 'padding:24px;color:#ff0066;font-family:VT323;font-size:18px;text-align:center;';
    msg.textContent = '初始化失败: ' + (e && e.message ? e.message : String(e));
    root.prepend(msg);
  }
}

// 全局错误兜底
window.addEventListener('error', (ev) => {
  try { console.error('[tinycade]', ev.error || ev.message); } catch (e) {}
});
window.addEventListener('unhandledrejection', (ev) => {
  try { console.error('[tinycade] unhandled rejection', ev.reason); } catch (e) {}
});

// 注册 Service Worker（PWA + 离线）
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW register failed', e));
  });
}

// ================== Web Vitals（保留原 observeVitals，行为不变） ==================
function reportVital(name, value, id) {
  if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
    try {
      fetch('/api/vitals', {
        method: 'POST',
        body: JSON.stringify({ m: name, v: value, id, route: location.pathname }),
        keepalive: true,
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    } catch (e) {}
    return;
  }
  try {
    const ok = navigator.sendBeacon('/api/vitals', new Blob(
      [JSON.stringify({ m: name, v: value, id, route: location.pathname })],
      { type: 'application/json' }
    ));
    if (!ok) throw new Error('beacon fail');
  } catch (e) {
    try {
      fetch('/api/vitals', {
        method: 'POST',
        body: JSON.stringify({ m: name, v: value, id, route: location.pathname }),
        keepalive: true,
        headers: { 'Content-Type': 'application/json' }
      }).catch(() => {});
    } catch (e2) {}
  }
}

function observeVitals() {
  if (typeof PerformanceObserver === 'undefined') return;
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) reportVital('LCP', last.startTime, last.id || '');
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
  try {
    let cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) cls += e.value || 0;
      }
      reportVital('CLS', cls, '');
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const dt = (e.processingEnd - e.startTime) || e.duration;
        reportVital(e.entryType === 'first-input' ? 'FID' : 'INP', dt, '');
      }
    }).observe({ type: 'first-input', buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        reportVital('INP', e.duration, '');
      }
    }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
  } catch (e) {}
}

if (document.readyState === 'complete') observeVitals();
else window.addEventListener('load', observeVitals);

// DOM 就绪后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 把 launchGame 暴露到 window 方便外部/调试调用。
window.launchGame = launchGame;
