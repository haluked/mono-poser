/* SPDX-License-Identifier: GPL-3.0-only */
'use strict';

(() => {
  if (window.__monoPoser) return;
  window.__monoPoser = true;

  const clampRatio = value => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(-1, Math.min(1, Math.round(number * 100) / 100));
  };

  const clampBoost = value => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 100;
    return Math.max(100, Math.min(400, Math.round(number / 10) * 10));
  };

  let ctx = null;
  let splitter = null;
  let gainLeft = null;
  let gainRight = null;
  let boostGain = null;
  let ratio = 0;
  let boost = 100;
  let running = false;
  let gestureBound = false;
  const sources = new Map();

  function setGain(node, target, now, instant) {
    const param = node.gain;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    if (instant) param.setValueAtTime(target, now);
    else param.linearRampToValueAtTime(target, now + 0.025);
  }

  function applyRatio(next, instant = false) {
    ratio = clampRatio(next);
    if (!ctx || !gainLeft) return;
    const now = ctx.currentTime;
    setGain(gainLeft, (1 - ratio) / 2, now, instant);
    setGain(gainRight, (1 + ratio) / 2, now, instant);
  }

  function applyBoost(next, instant = false) {
    boost = clampBoost(next);
    if (!ctx || !boostGain) return;
    setGain(boostGain, boost / 100, ctx.currentTime, instant);
  }

  function ensureGraph() {
    if (ctx) return;
    ctx = new AudioContext({ latencyHint: 'interactive' });
    splitter = ctx.createChannelSplitter(2);
    gainLeft = ctx.createGain();
    gainRight = ctx.createGain();
    const merger = ctx.createChannelMerger(2);
    boostGain = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = 0;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;

    gainLeft.connect(merger, 0, 0);
    gainLeft.connect(merger, 0, 1);
    gainRight.connect(merger, 0, 0);
    gainRight.connect(merger, 0, 1);
    merger.connect(boostGain);
    boostGain.connect(limiter);
    limiter.connect(ctx.destination);
    splitter.connect(gainLeft, 0);
    splitter.connect(gainRight, 1);

    applyRatio(ratio, true);
    applyBoost(boost, true);
  }

  function attach(element) {
    if (!ctx || sources.has(element)) return;
    try {
      const source = ctx.createMediaElementSource(element);
      sources.set(element, source);
      source.connect(running ? splitter : ctx.destination);
    } catch {
      // DRM, CORS, or an element already owned by another AudioContext.
    }
  }

  function collectMedia() {
    const found = new Set();
    const visit = root => {
      if (!root) return;
      try { root.querySelectorAll('video, audio').forEach(element => found.add(element)); } catch {}
      let all;
      try { all = root.querySelectorAll('*'); } catch { return; }
      all.forEach(element => {
        if (element.shadowRoot) visit(element.shadowRoot);
        if (element.tagName === 'IFRAME') {
          try {
            if (element.contentDocument) visit(element.contentDocument);
          } catch {}
        }
      });
    };
    visit(document);
    return [...found];
  }

  function state() {
    return {
      ok: true,
      running,
      ratio,
      boost,
      count: sources.size,
      suspended: ctx ? ctx.state !== 'running' : true,
    };
  }

  function bindGesture() {
    if (gestureBound) return;
    gestureBound = true;
    const wake = () => {
      if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
    };
    document.addEventListener('pointerdown', wake, true);
    document.addEventListener('keydown', wake, true);
  }

  async function start(message) {
    ensureGraph();
    applyRatio(message.ratio, true);
    applyBoost(message.boost, true);
    await ctx.resume().catch(() => {});

    if (ctx.state !== 'running') {
      bindGesture();
      return { ok: false, error: 'Click the recording once, then press Start mono again.' };
    }

    running = true;
    collectMedia().forEach(attach);
    if (sources.size === 0) {
      running = false;
      return {
        ok: false,
        error: 'This page has no audio or video element to fold. Start the recording first.',
      };
    }

    for (const source of sources.values()) {
      try { source.disconnect(); } catch {}
      source.connect(splitter);
    }
    return state();
  }

  function stop() {
    running = false;
    if (ctx) {
      for (const source of sources.values()) {
        try { source.disconnect(); } catch {}
        try { source.connect(ctx.destination); } catch {}
      }
    }
    return state();
  }

  new MutationObserver(records => {
    if (!running || !ctx) return;
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!node || node.nodeType !== 1) continue;
        if (node.matches?.('video, audio')) attach(node);
        node.querySelectorAll?.('video, audio').forEach(attach);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  browser.runtime.onMessage.addListener(message => {
    if (!message || typeof message.type !== 'string' || !message.type.startsWith('mp-')) return;
    switch (message.type) {
      case 'mp-state':
        return Promise.resolve(state());
      case 'mp-start':
        return start(message);
      case 'mp-stop':
        return Promise.resolve(stop());
      case 'mp-ratio':
        applyRatio(message.ratio);
        return Promise.resolve({ ok: true, ratio });
      case 'mp-boost':
        applyBoost(message.boost);
        return Promise.resolve({ ok: true, boost });
      default:
        return Promise.resolve({ ok: false, error: 'Unknown request.' });
    }
  });
})();
