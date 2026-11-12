/* SPDX-License-Identifier: GPL-3.0-only */
'use strict';

(() => {
  let ctx = null;
  let stream = null;
  let gainLeft = null;
  let gainRight = null;
  let boostGain = null;
  let ratio = 0;
  let boost = 100;

  const clamp = value => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(-1, Math.min(1, Math.round(number * 100) / 100));
  };

  function applyRatio(next, instant = false) {
    ratio = clamp(next);
    if (!ctx || !gainLeft || !gainRight) return;
    const now = ctx.currentTime;
    setGain(gainLeft, (1 - ratio) / 2, now, instant);
    setGain(gainRight, (1 + ratio) / 2, now, instant);
  }

  function setGain(node, target, now, instant) {
    const param = node.gain;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    if (instant) param.setValueAtTime(target, now);
    else param.linearRampToValueAtTime(target, now + 0.025);
  }

  function applyBoost(value, instant = false) {
    const number = Number(value);
    boost = Number.isFinite(number)
      ? Math.max(100, Math.min(400, Math.round(number / 10) * 10))
      : 100;
    if (!ctx || !boostGain) return;
    setGain(boostGain, boost / 100, ctx.currentTime, instant);
  }

  function teardown() {
    if (stream) {
      for (const track of stream.getTracks()) {
        track.onended = null;
        track.stop();
      }
      stream = null;
    }
    gainLeft = null;
    gainRight = null;
    boostGain = null;
    if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
    ctx = null;
  }

  function state() {
    return { ok: true, running: Boolean(stream), ratio, boost };
  }

  async function start(message) {
    teardown();

    const captured = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: message.streamId,
        },
      },
      video: false,
    });

    stream = captured;

    try {
      const track = captured.getAudioTracks()[0];
      if (!track) throw new Error('This tab did not provide an audio track.');

      const context = new AudioContext({ latencyHint: 'interactive' });
      const source = context.createMediaStreamSource(captured);
      const splitter = context.createChannelSplitter(2);
      const left = context.createGain();
      const right = context.createGain();
      const merger = context.createChannelMerger(2);

      source.connect(splitter);
      splitter.connect(left, 0);
      splitter.connect(right, 1);

      // Every channel of the merger sums its inputs, so both outputs carry
      // exactly (left * gainLeft + right * gainRight): a true mono fold.
      left.connect(merger, 0, 0);
      left.connect(merger, 0, 1);
      right.connect(merger, 0, 0);
      right.connect(merger, 0, 1);

      // Boost, then a transparent safety limiter so loud sources do not clip
      // the output into distortion when the boost is turned up.
      const boostNode = context.createGain();
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = 0;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;

      merger.connect(boostNode);
      boostNode.connect(limiter);
      limiter.connect(context.destination);

      ctx = context;
      gainLeft = left;
      gainRight = right;
      boostGain = boostNode;
      applyRatio(message.ratio, true);
      applyBoost(message.boost, true);
      await context.resume();

      track.onended = () => {
        teardown();
        chrome.runtime
          .sendMessage({ target: 'mp-sw', type: 'capture-ended' })
          .catch(() => {});
      };
    } catch (error) {
      teardown();
      throw error;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.target !== 'mp-engine') return;

    if (message.type === 'ping') {
      sendResponse(state());
      return;
    }

    if (message.type === 'start') {
      start(message).then(
        () => sendResponse(state()),
        error => sendResponse({ ok: false, error: error?.message || String(error) }),
      );
      return true;
    }

    if (message.type === 'set-ratio') {
      applyRatio(message.ratio);
      sendResponse({ ok: true, ratio });
      return;
    }

    if (message.type === 'set-boost') {
      applyBoost(message.boost);
      sendResponse({ ok: true, boost });
      return;
    }

    if (message.type === 'stop') {
      teardown();
      sendResponse({ ok: true });
    }
  });
})();
