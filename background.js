/* SPDX-License-Identifier: GPL-3.0-only */
'use strict';

const ENGINE = 'mp-engine';
const SERVICE = 'mp-sw';
const POPUP = 'mp-popup';
const OFFSCREEN_URL = 'offscreen.html';
const RUNTIME_KEY = 'mpRuntime';
const BOOST_KEY = 'mpBoost';

let creating = null;

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

/* ---------------------------------------------------------------- state -- */

async function readRuntime() {
  const stored = await chrome.storage.session.get(RUNTIME_KEY);
  return { running: false, tabId: null, title: '', ...(stored[RUNTIME_KEY] || {}) };
}

async function writeRuntime(patch) {
  const next = { ...(await readRuntime()), ...patch };
  await chrome.storage.session.set({ [RUNTIME_KEY]: next });
  return next;
}

async function readRatio() {
  const stored = await chrome.storage.local.get('mpRatio');
  return clampRatio(stored.mpRatio ?? 0);
}

async function writeRatio(value) {
  await chrome.storage.local.set({ mpRatio: clampRatio(value) });
}

async function readBoost() {
  const stored = await chrome.storage.local.get(BOOST_KEY);
  return clampBoost(stored[BOOST_KEY] ?? 100);
}

async function writeBoost(value) {
  await chrome.storage.local.set({ [BOOST_KEY]: clampBoost(value) });
}

async function snapshot() {
  const [runtime, ratio, boost] = await Promise.all([readRuntime(), readRatio(), readBoost()]);
  return { ...runtime, ratio, boost };
}

/* --------------------------------------------------------------- engine -- */

async function hasEngine() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  });
  return contexts.length > 0;
}

async function ensureEngine() {
  if (await hasEngine()) return;
  if (!creating) {
    // USER_MEDIA has no lifetime limit, unlike AUDIO_PLAYBACK.
    creating = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_URL,
        reasons: ['USER_MEDIA'],
        justification: 'Fold the captured tab audio into mono and play it back.',
      })
      .finally(() => {
        creating = null;
      });
  }
  await creating;
}

async function notify() {
  try {
    await chrome.runtime.sendMessage({ target: POPUP, type: 'state', ...(await snapshot()) });
  } catch {
    // The popup is closed; that is the normal case while listening.
  }
}

async function stopCapture() {
  const wasRunning = (await readRuntime()).running;
  if (await hasEngine()) {
    try {
      await chrome.runtime.sendMessage({ target: ENGINE, type: 'stop' });
    } catch {
      // The engine may already be gone.
    }
    try {
      await chrome.offscreen.closeDocument();
    } catch {}
  }
  await writeRuntime({ running: false, tabId: null, title: '' });
  if (wasRunning) await notify();
}

/* -------------------------------------------------------------- actions -- */

async function startCapture(message) {
  const tabId = Number(message.tabId);
  if (!Number.isInteger(tabId)) throw new Error('There is no tab to capture.');
  if ((await readRuntime()).running) await stopCapture();

  try {
    await ensureEngine();
    // Chrome only allows a stream ID minted by the service worker to be
    // consumed by the offscreen document (same extension, same renderer).
    const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
    const requested = Number(message.ratio);
    const ratio = Number.isFinite(requested) ? clampRatio(requested) : await readRatio();
    const boost = message.boost == null ? await readBoost() : clampBoost(message.boost);
    await writeBoost(boost);
    const reply = await chrome.runtime.sendMessage({
      target: ENGINE,
      type: 'start',
      streamId,
      ratio,
      boost,
    });
    if (!reply?.ok) throw new Error(reply?.error || 'The audio engine did not start.');
    await writeRuntime({ running: true, tabId, title: String(message.title || '') });
  } catch (error) {
    await stopCapture();
    throw error;
  }

  await notify();
  return { ok: true, ...(await snapshot()) };
}

async function handle(message) {
  switch (message.type) {
    case 'get-state': {
      let state = await snapshot();
      if (state.running) {
        let alive = false;
        try {
          const reply = await chrome.runtime.sendMessage({ target: ENGINE, type: 'ping' });
          alive = Boolean(reply?.ok && reply.running);
        } catch {}
        if (!alive) {
          await writeRuntime({ running: false, tabId: null, title: '' });
          state = await snapshot();
          if (await hasEngine()) {
            try {
              await chrome.offscreen.closeDocument();
            } catch {}
          }
        }
      }
      return { ok: true, ...state };
    }

    case 'start':
      return startCapture(message);

    case 'set-ratio': {
      const ratio = clampRatio(message.ratio);
      await writeRatio(ratio);
      try {
        await chrome.runtime.sendMessage({ target: ENGINE, type: 'set-ratio', ratio });
      } catch {
        // A missed update is harmless; the next one lands.
      }
      return { ok: true, ratio };
    }

    case 'set-boost': {
      const boost = clampBoost(message.boost);
      await writeBoost(boost);
      try {
        await chrome.runtime.sendMessage({ target: ENGINE, type: 'set-boost', boost });
      } catch {
        // A missed update is harmless; the next one lands.
      }
      return { ok: true, boost };
    }

    case 'stop':
      await stopCapture();
      return { ok: true, ...(await snapshot()) };

    case 'capture-ended':
      await stopCapture();
      return { ok: true };

    default:
      return { ok: false, error: 'Unknown request.' };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object' || message.target !== SERVICE) return;
  handle(message).then(sendResponse, error => {
    sendResponse({ ok: false, error: error?.message || String(error) });
  });
  return true;
});

chrome.tabs.onRemoved.addListener(async tabId => {
  const state = await readRuntime();
  if (state.running && state.tabId === tabId) await stopCapture();
});
