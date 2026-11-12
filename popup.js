'use strict';

(() => {
  const state = { running: false, ratio: 0, boost: 100, tabId: null, title: '' };
  let tab = null;
  let dial = null;
  let pending = null;
  let timer = 0;
  let lastSent = 0;
  let pendingBoost = null;
  let boostTimer = 0;
  let boostSentAt = 0;

  const $ = id => document.getElementById(id);

  /* ------------------------------------------------------------- dial --- */

  const CX = 74;
  const CY = 74;
  const R = 64;
  const ARC = `M${CX - R} ${CY}A${R} ${R} 0 0 1${CX + R} ${CY}`;

  function createDial(host, onChange) {
    host.classList.add('is-animating');
    host.tabIndex = 0;
    host.setAttribute('role', 'slider');
    host.setAttribute('aria-valuemin', '-100');
    host.setAttribute('aria-valuemax', '100');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 148 88');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML =
      `<path class="track" d="${ARC}"/>` +
      `<path class="fill" d="${ARC}" pathLength="100" stroke-dasharray="100" stroke-dashoffset="50"/>` +
      `<g class="knob-group"><circle class="knob-halo" r="9"/><circle class="knob" r="6"/></g>`;
    host.appendChild(svg);

    const readout = document.createElement('output');
    readout.className = 'readout';
    host.appendChild(readout);

    const fill = svg.querySelector('.fill');
    const knob = svg.querySelector('.knob-group');
    let value = 0;
    let dragging = false;

    const quantize = next => Math.round(Math.max(-1, Math.min(1, next)) * 100) / 100;

    function paint() {
      const angle = Math.PI + ((value + 1) / 2) * Math.PI;
      const x = CX + R * Math.cos(angle);
      const y = CY + R * Math.sin(angle);
      knob.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)`;
      fill.style.strokeDashoffset = (100 - ((value + 1) / 2) * 100).toFixed(2);

      const left = Math.round(((1 - value) / 2) * 100);
      const right = 100 - left;
      const magnitude = Math.abs(value);

      readout.textContent =
        magnitude < 0.02 ? 'Mono' :
        magnitude > 0.98 ? (value < 0 ? 'Left only' : 'Right only') :
        value < 0 ? `Left ${left}%` : `Right ${right}%`;

      host.setAttribute('aria-valuenow', String(Math.round(value * 100)));
      host.setAttribute('aria-valuetext',
        magnitude < 0.02 ? 'Mono, equal left and right' :
        magnitude > 0.98 ? `${value < 0 ? 'Left' : 'Right'} channel only, in both ears` :
        `${left}% left, ${right}% right`);
    }

    function set(next, { animate = true, emit = false } = {}) {
      value = quantize(next);
      if (!animate) host.classList.remove('is-animating');
      paint();
      if (!animate) {
        void host.offsetWidth;
        host.classList.add('is-animating');
      }
      if (emit) onChange(value, true);
    }

    function valueAt(event) {
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return value;
      const x = ((event.clientX - rect.left) / rect.width) * 148;
      const y = ((event.clientY - rect.top) / rect.height) * 88;
      let angle = Math.atan2(y - CY, x - CX);
      if (angle < 0) angle += Math.PI * 2;
      if (angle < Math.PI) angle = x < CX ? Math.PI : Math.PI * 2;
      return quantize(((angle - Math.PI) / Math.PI) * 2 - 1);
    }

    host.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      dragging = true;
      host.classList.remove('is-animating');
      host.focus({ preventScroll: true });
      try { host.setPointerCapture(event.pointerId); } catch {}
      set(valueAt(event), { animate: false, emit: true });
      event.preventDefault();
    });

    host.addEventListener('pointermove', event => {
      if (dragging) set(valueAt(event), { animate: false, emit: true });
    });

    const release = event => {
      if (!dragging) return;
      dragging = false;
      host.classList.add('is-animating');
      try { host.releasePointerCapture(event.pointerId); } catch {}
      onChange(value, true);
    };
    host.addEventListener('pointerup', release);
    host.addEventListener('pointercancel', release);

    host.addEventListener('keydown', event => {
      const step = event.shiftKey ? 0.01 : 0.05;
      let next = null;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = value - step;
      else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = value + step;
      else if (event.key === 'Home') next = -1;
      else if (event.key === 'End') next = 1;
      else if (event.key === 'PageDown') next = value - 0.25;
      else if (event.key === 'PageUp') next = value + 0.25;
      else if (event.key === 'Enter' || event.key === ' ') next = 0;
      if (next === null) return;
      event.preventDefault();
      event.stopPropagation();
      set(next);
      onChange(value, true);
    });

    host.addEventListener('dblclick', () => {
      set(0);
      onChange(value, true);
    });

    paint();

    return {
      set: (next, options) => set(next, options),
      get: () => value,
    };
  }

  /* ---------------------------------------------------------- messaging --- */

  async function send(message) {
    try {
      return await chrome.runtime.sendMessage({ target: 'mp-sw', ...message });
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    }
  }

  function friendly(error) {
    const raw = error?.message || String(error);
    if (/invoked|activeTab|chrome:\/\/|cannot capture|tabcapture|capture/i.test(raw)) {
      return 'Couldn’t capture this tab. Try reopening the popup, or use a normal website tab.';
    }
    if (/denied|permission/i.test(raw)) {
      return 'The browser denied the capture. Reopen the popup and try again.';
    }
    return raw;
  }

  /* ------------------------------------------------------------- ratio --- */

  function queueRatio(value, commit) {
    pending = value;
    if (commit) chrome.storage.local.set({ mpRatio: value }).catch(() => {});
    const now = performance.now();
    if (commit || now - lastSent > 45) flushRatio();
    else if (!timer) timer = setTimeout(flushRatio, 45 - (now - lastSent));
  }

  function flushRatio() {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
    if (pending === null) return;
    const value = pending;
    pending = null;
    lastSent = performance.now();
    send({ type: 'set-ratio', ratio: value }).then(reply => {
      if (state.running && reply && reply.ok === false) {
        state.running = false;
        render();
        showError('The capture stopped. Open Mono Poser again to restart it.');
      }
    });
  }

  function onDialChange(value, commit) {
    state.ratio = value;
    paintPressed(value);
    queueRatio(value, commit);
  }

  function paintPressed(value) {
    $('left').setAttribute('aria-pressed', value <= -0.995 ? 'true' : 'false');
    $('right').setAttribute('aria-pressed', value >= 0.995 ? 'true' : 'false');
  }

  /* ------------------------------------------------------------- boost --- */

  function setBoostUI(value, syncState = true) {
    const boost = Math.max(100, Math.min(400, Math.round(value / 10) * 10));
    const input = $('boost');
    input.value = String(boost);
    input.style.setProperty('--pct', `${((boost - 100) / 300) * 100}%`);
    input.setAttribute('aria-valuetext', `${boost} percent`);
    $('boostValue').textContent = `${boost}%`;
    $('boostValue').classList.toggle('is-boosted', boost > 100);
    if (syncState) state.boost = boost;
  }

  function queueBoost(value, commit) {
    pendingBoost = value;
    if (commit) chrome.storage.local.set({ mpBoost: value }).catch(() => {});
    const now = performance.now();
    if (commit || now - boostSentAt > 50) flushBoost();
    else if (!boostTimer) boostTimer = setTimeout(flushBoost, 50 - (now - boostSentAt));
  }

  function flushBoost() {
    if (boostTimer) {
      clearTimeout(boostTimer);
      boostTimer = 0;
    }
    if (pendingBoost === null) return;
    const value = pendingBoost;
    pendingBoost = null;
    boostSentAt = performance.now();
    send({ type: 'set-boost', boost: value });
  }

  /* -------------------------------------------------------------- render -- */

  function showError(message) {
    $('error').textContent = message;
    $('error').hidden = false;
  }

  function hideError() {
    $('error').hidden = true;
  }

  function render() {
    const live = state.running;
    $('idle').hidden = live;
    $('live').hidden = !live;
    $('status').hidden = !live;
    $('stop').hidden = !live;

    if (live) {
      if (dial.get() !== state.ratio) dial.set(state.ratio, { animate: false });
      paintPressed(state.ratio);
      setBoostUI(state.boost, false);
    }

    const other = live && tab && tab.id !== state.tabId;
    const title = (live ? state.title : tab?.title) || '';
    $('tabline').textContent = title
      ? `${other ? 'Other tab' : 'This tab'} · ${title}`
      : other ? 'Other tab' : 'This tab';
    $('note').textContent = live ? 'Keeps playing if you close this.' : 'Only this tab is affected.';
  }

  /* -------------------------------------------------------------- actions -- */

  async function start() {
    if (!tab?.id) return;
    const button = $('start');
    button.disabled = true;
    button.textContent = 'Starting…';
    hideError();

    try {
      const reply = await send({
        type: 'start',
        tabId: tab.id,
        title: tab.title || '',
        ratio: dial.get(),
        boost: state.boost,
      });
      if (!reply?.ok) throw new Error(reply?.error || 'The capture did not start.');

      Object.assign(state, {
        running: true,
        ratio: reply.ratio,
        boost: reply.boost,
        tabId: reply.tabId,
        title: reply.title,
      });
      dial.set(reply.ratio, { animate: false });
      hideError();
      render();
    } catch (error) {
      showError(friendly(error));
    } finally {
      button.disabled = false;
      button.textContent = 'Start mono';
    }
  }

  async function stop() {
    const reply = await send({ type: 'stop' });
    state.running = false;
    if (typeof reply?.ratio === 'number') state.ratio = reply.ratio;
    hideError();
    render();
  }

  /* ----------------------------------------------------------------- boot -- */

  async function init() {
    let tabs = [];
    try {
      tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    } catch {}
    tab = tabs[0] || null;

    let persisted = 0;
    let persistedBoost = 100;
    try {
      const stored = await chrome.storage.local.get(['mpRatio', 'mpBoost']);
      if (typeof stored.mpRatio === 'number') persisted = stored.mpRatio;
      if (typeof stored.mpBoost === 'number') persistedBoost = stored.mpBoost;
    } catch {}

    dial = createDial($('gauge'), onDialChange);
    dial.set(persisted, { animate: false });
    setBoostUI(persistedBoost);

    const engine = await send({ type: 'get-state' });
    if (engine?.ok && engine.running) {
      Object.assign(state, {
        running: true,
        ratio: engine.ratio,
        boost: typeof engine.boost === 'number' ? engine.boost : persistedBoost,
        tabId: engine.tabId,
        title: engine.title,
      });
      dial.set(engine.ratio, { animate: false });
      setBoostUI(state.boost, false);
    } else {
      state.ratio = persisted;
    }

    if (tab && typeof tab.url === 'string' && !/^(https?|file):/i.test(tab.url)) {
      $('start').disabled = true;
      showError('This page can’t be captured. Open a normal website tab.');
    }

    render();
  }

  chrome.runtime.onMessage.addListener(message => {
    if (!message || message.target !== 'mp-popup' || message.type !== 'state') return;
    Object.assign(state, {
      running: Boolean(message.running),
      tabId: message.tabId ?? null,
      title: message.title || '',
    });
    if (typeof message.ratio === 'number') state.ratio = message.ratio;
    if (typeof message.boost === 'number') state.boost = message.boost;
    if (state.running) hideError();
    render();
  });

  const onBoost = event => {
    const value = Number(event.target.value);
    setBoostUI(value);
    queueBoost(value, event.type === 'change');
  };

  $('start').addEventListener('click', start);
  $('stop').addEventListener('click', stop);
  $('left').addEventListener('click', () => dial.set(-1, { emit: true }));
  $('right').addEventListener('click', () => dial.set(1, { emit: true }));
  $('boost').addEventListener('input', onBoost);
  $('boost').addEventListener('change', onBoost);
  window.addEventListener('pagehide', () => {
    flushRatio();
    flushBoost();
  });

  init();
})();
