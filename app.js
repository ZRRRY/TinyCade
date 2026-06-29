/* ============================================================
   TINYCADE - 主控逻辑
   - 启动动画
   - 路由 (游戏库/游戏/关于)
   - 筛选 & 搜索
   - 游戏加载与清理
   ============================================================ */

(function () {
  'use strict';

  // ================== 状态 ==================
  const State = {
    view: 'library',         // library | game | about
    currentGame: null,
    cleanup: null,
    played: new Set(),
    totalScore: 0,
    cat: 'all',
    search: '',
    soundOn: true
  };

  // 容错的 getElementById: 找不到时返回 null 而非抛错
  function safeEl(id) {
    try { return document.getElementById(id); } catch (e) { return null; }
  }

  // 持久化
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

  // ================== 启动动画 ==================
  function bootAnimation() {
    const bar = document.getElementById('boot-bar-fill');
    const tip = document.getElementById('boot-tip');
    const screen = document.getElementById('boot-screen');
    let progress = 0;
    const tipMessages = [
      'INITIALIZING PIXEL MATRIX',
      'LOADING ROM FILE',
      'CALIBRATING CRT',
      'WARMING UP JOYSTICK',
      'PRESS ANY KEY TO START'
    ];
    const interval = setInterval(() => {
      progress += Math.random() * 12 + 3;
      if (progress > 100) progress = 100;
      bar.style.width = progress + '%';
      if (progress > 80) {
        tip.textContent = tipMessages[Math.min(Math.floor((progress - 80) / 5), tipMessages.length - 1)];
      }
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          screen.classList.add('fade-out');
          Sounds.sfx.start();
          setTimeout(() => screen.remove(), 600);
        }, 400);
      }
    }, 80);
  }

  // ================== 无障碍辅助 ==================
  function announce(msg) {
    const el = document.getElementById('a11y-status');
    if (el) {
      // 清空再设置，以保证同一内容也会被重读
      el.textContent = '';
      setTimeout(() => { el.textContent = msg; }, 50);
    }
  }

  // ================== 视图切换 ==================
  function showView(name) {
    State.view = name;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('view-active'));
    document.getElementById('view-' + name)?.classList.add('view-active');
    document.querySelectorAll('.nav-btn[data-view]').forEach(b => {
      b.classList.toggle('active', b.dataset.view === name);
    });
    if (name !== 'game' && State.cleanup) {
      State.cleanup();
      State.cleanup = null;
      State.currentGame = null;
    }
    if (name === 'about') updateAboutStats();
    // 焦点管理：跳到主标题
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
    const games = Games.list();
    const filtered = games.filter(g => {
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
        Sounds.sfx.select();
        launchGame(g.id);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          Sounds.sfx.select();
          launchGame(g.id);
        }
      });
      grid.appendChild(card);
    });
    if (!filtered.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:#888;font-family:VT323;font-size:24px;">未找到匹配的游戏</div>';
    }
    // 统计
    { const e = safeEl('game-count'); if (e) e.textContent = String(games.length).padStart(2, '0'); }
    { const e = safeEl('games-played'); if (e) e.textContent = String(State.played.size).padStart(2, '0'); }
    { const e = safeEl('total-score'); if (e) e.textContent = String(State.totalScore).padStart(6, '0'); }
    { const e = safeEl('stat-games'); if (e) e.textContent = games.length; }
    const cats = new Set(games.map(g => g.cat));
    { const e = safeEl('stat-cats'); if (e) e.textContent = cats.size; }
  }

  function updateAboutStats() {
    const games = Games.list();
    { const e = safeEl('stat-games'); if (e) e.textContent = games.length; }
    const cats = new Set(games.map(g => g.cat));
    { const e = safeEl('stat-cats'); if (e) e.textContent = cats.size; }
    const ver = document.getElementById('about-version');
    if (ver) {
      const v = (typeof window !== 'undefined' && window.TINYCADE_VERSION) || '1.0.0';
      const b = (typeof window !== 'undefined' && window.TINYCADE_BUILD) || '';
      ver.textContent = `v${v}${b ? ' · ' + b : ''}`;
    }
  }

  // ================== 启动游戏 ==================
  function launchGame(id) {
    const meta = Games.get(id);
    if (!meta) return;
    if (State.cleanup) { State.cleanup(); State.cleanup = null; }
    State.currentGame = id;
    State.played.add(id);
    save();

    // 设置 header
    { const e = safeEl('game-title'); if (e) e.textContent = meta.name.toUpperCase(); }
    const gc = document.getElementById('game-controls');
    gc.textContent = '操作：';
    const strong = document.createElement('strong');
    strong.textContent = meta.controls || '';
    gc.appendChild(strong);

    // 准备舞台
    const stage = document.getElementById('game-stage');
    stage.style.position = 'relative';
    stage.innerHTML = '';
    const hud = document.createElement('div');
    hud.className = 'game-hud';
    hud.innerHTML = '<span class="hud-score">SCORE 0</span><span class="hud-info">' + meta.cat.toUpperCase() + '</span>';
    stage.appendChild(hud);

    const status = document.getElementById('game-status');
    status.textContent = '';

    // 启动游戏
    try {
      const cleanup = meta.factory(stage, hud, status);
      State.cleanup = typeof cleanup === 'function' ? cleanup : null;
      // 注入返回与重开按钮
      injectControlButtons(id);
      Sounds.sfx.powerup();
    } catch (e) {
      console.error(e);
      stage.innerHTML = '';
      const errDiv = document.createElement('div');
      errDiv.style.cssText = 'color:#ff0066;font-family:VT323;font-size:24px;padding:24px;';
      errDiv.textContent = `游戏加载出错: ${e && e.message ? e.message : String(e)}`;
      stage.appendChild(errDiv);
    }

    showView('game');
    announce(meta.name + ' 已加载');
    // 标记已玩
    setTimeout(renderLibrary, 100);
  }

  function injectControlButtons(id) {
    const ctrls = document.getElementById('game-controls');
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:8px;';
    const restart = document.createElement('button');
    restart.className = 'pixel-btn primary';
    restart.textContent = '🔄 重新开始 (R)';
    restart.onclick = () => { Sounds.sfx.start(); launchGame(id); };
    wrap.appendChild(restart);

    const back = document.createElement('button');
    back.className = 'pixel-btn';
    back.textContent = '◀ 返回 (ESC)';
    back.onclick = () => { Sounds.sfx.beep(); showView('library'); };
    wrap.appendChild(back);

    ctrls.appendChild(wrap);
  }

  // ================== 绑定事件 ==================
  function bindEvents() {
    // 导航
    document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.sfx.beep();
        showView(btn.dataset.view);
      });
    });

    // 返回按钮
    { const e = safeEl('back-btn'); if (e) e.addEventListener('click', () => {
      Sounds.sfx.beep();
      showView('library');
    });

    // 筛选
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        State.cat = btn.dataset.cat;
        Sounds.sfx.select();
        renderLibrary();
      });
    });

    // 搜索
    document.getElementById('game-search').addEventListener('input', (e) => {
      State.search = e.target.value.trim();
      renderLibrary();
    });

    // 声音开关
    const soundBtn = document.getElementById('sound-toggle');
    soundBtn.addEventListener('click', () => {
      State.soundOn = !State.soundOn;
      Sounds.setEnabled(State.soundOn);
      soundBtn.textContent = State.soundOn ? '♪ SOUND: ON' : '♪ SOUND: OFF';
      soundBtn.style.color = State.soundOn ? '' : '#888';
      save();
      if (State.soundOn) Sounds.sfx.beep();
    });
    Sounds.setEnabled(State.soundOn);
    if (!State.soundOn) {
      soundBtn.textContent = '♪ SOUND: OFF';
      soundBtn.style.color = '#888';
    }

    // 全局键盘
    window.addEventListener('keydown', (e) => {
      if (State.view === 'game') {
        if (e.key === 'Escape') { Sounds.sfx.beep(); showView('library'); }
        if (e.key.toLowerCase() === 'r' && e.target.tagName !== 'INPUT') {
          // R 重开由各游戏自己处理
        }
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
  function init() {
    try {
      load();
      bindEvents();
      renderLibrary();
      bootAnimation();
    } catch (e) {
      console.error('Init failed:', e);
      const root = document.getElementById('view-library') || document.body;
      const msg = document.createElement('div');
      msg.style.cssText = 'padding:24px;color:#ff0066;font-family:VT323;font-size:18px;text-align:center;';
      msg.textContent = '初始化失败: ' + (e && e.message ? e.message : String(e));
      root.prepend(msg);
    }
  }

  // 全局错误报告（仅在同源或本地调用，以保护隐私）
  window.addEventListener('error', (ev) => {
    try { console.error('[tinycade]', ev.error || ev.message); } catch (e) {}
  });

  // 注册 Service Worker（PWA + 离线）
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW register failed', e));
    });
  }

  // 上报 Web Vitals（LCP / FID / CLS）
  function reportVital(name, value, id) {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
      // 降级为 fetch（在 file: 下也可用）
      try {
        fetch('/api/vitals', { method: 'POST', body: JSON.stringify({ m: name, v: value, id, route: location.pathname }), keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
      } catch (e) {}
      return;
    }
    try {
      const ok = navigator.sendBeacon('/api/vitals', new Blob([JSON.stringify({ m: name, v: value, id, route: location.pathname })], { type: 'application/json' }));
      if (!ok) throw new Error('beacon fail');
    } catch (e) {
      try { fetch('/api/vitals', { method: 'POST', body: JSON.stringify({ m: name, v: value, id, route: location.pathname }), keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {}); } catch (e2) {}
    }
  }
  function observeVitals() {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      // LCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) reportVital('LCP', last.startTime, last.id || '');
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}
    try {
      // CLS
      let cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (!e.hadRecentInput) cls += e.value || 0;
        }
        reportVital('CLS', cls, '');
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}
    try {
      // FID / INP
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
  window.addEventListener('unhandledrejection', (ev) => {
    try { console.error('[tinycade] unhandled rejection', ev.reason); } catch (e) {}
  });

  // 等待 DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

