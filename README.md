# Mono Poser

A dependency-free Brave / Chromium extension that folds the current tab's stereo
audio into mono. Pick a channel with the two buttons, blend between them on the
half-circle dial, and push the level with the boost slider.

Source size: about 31 KB (plus 11 KB of PNG icons). No libraries, no build step,
no network code, no content scripts.

## Install

1. Open `brave://extensions` (or `chrome://extensions`).
2. Turn on **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Pin Mono Poser to the toolbar.

Requires Chromium 116+ (Brave is well past that).

## Use

1. Open the tab that is playing audio.
2. Click the Mono Poser icon, then **Start mono**.
3. Close the popup whenever you like. Audio keeps running.
4. Adjust with the dial, or click **Left** / **Right** to copy that channel into
   both ears. Use **Boost** (100% to 400%) for quiet material. Press **Stop** to
   restore the tab's normal audio.

The dial's center is a true mono fold, `(L + R) / 2`. Dragging toward an end
crossfades toward that channel and lands at exactly that channel at the stop.
Keyboard: arrows, PageUp/PageDown, Home/End; double-click or Enter resets to
center.

## How it works

```
popup  ── message ──►  service worker  ── stream ID ──►  offscreen document
                            │                                  │
                     tabCapture.getMediaStreamId       getUserMedia
                                                              │
                    splitter ─► gainL ─┐                          │
                                       ├─► merger ─► boost ─► limiter ─► speakers
                    splitter ─► gainR ─┘
```

* The popup is only the UI. It sends the tab id and the dial value.
* The service worker owns the session, mints the tab capture stream ID, and
  starts the engine. `activeTab` is granted by opening the popup, which is what
  lets `getMediaStreamId` run.
* The offscreen document is where a DOM and an `AudioContext` exist. It builds
  the graph once:
  * `gainL = (1 - ratio) / 2`
  * `gainR = (1 + ratio) / 2`
  * Both gains feed both merger inputs, so each output channel is
    `left * gainL + right * gainR`. At `ratio = 0` that is the mono fold; at
    `-1` / `+1` it is one channel copied to both.
  * The merged signal then runs through the boost gain (1x to 4x) and a native
    `DynamicsCompressorNode` set as a safety limiter (threshold 0 dBFS, ratio
    20:1). Boost cannot drive the output into hard digital clipping, and 100%
    stays unity gain.
* Only the two gain values and the boost value cross from the UI to the audio
  system. Every sample is handled by Chromium's native Web Audio engine
  (C++/SIMD), not by JavaScript.

The offscreen document is created with the `USER_MEDIA` reason, which has no
lifetime cap. It is closed on Stop, so it does not sit in memory between uses.
The service worker sleeps normally; state lives in `chrome.storage.session`.

## Why not WebAssembly

This workload is four multiply-adds per sample. `ChannelSplitterNode`,
`GainNode`, and `ChannelMergerNode` already do that in native code with SIMD,
inside the browser's audio thread, at zero JS cost. Moving it to WASM would add:

* a compiled module plus an `AudioWorklet` wrapper and its own bundle,
* a `postMessage` hop for every parameter change (or a `SharedArrayBuffer`
  plus cross-origin isolation plumbing),
* more code and more failure modes than the four native connections above.

WASM is the right tool when you need custom DSP that the platform does not
provide (resampling, convolution, codecs). Mono matrixing and a fixed-gain boost
are not that, and the safety limiter is the browser's native
`DynamicsCompressorNode`. If this ever grows a custom dynamics stage, an
AudioWorklet — in plain JS — is still the first stop; only move the inner loop to
WASM if profiling says so.

## Permissions

| Permission | Why |
| --- | --- |
| `tabCapture` | Read the current tab's audio. |
| `activeTab` | Grant access to the tab you invoked it on, for that tab only. |
| `offscreen` | Keep the audio graph alive while the popup is closed. |
| `storage` | Remember the dial and boost positions. |

No host permissions, no content scripts, no analytics, no network requests.

## Files

```
manifest.json      extension manifest (MV3)
background.js      session, stream ID, lifecycle
offscreen.html/js  the audio engine
popup.html/css/js  the panel: dial, boost, buttons, state
icons/             SVG source + 16/32/48/128 PNGs
```

## Limits

* One captured tab at a time. Starting on another tab stops the first.
* Capture must start from the toolbar icon; the browser requires an explicit
  extension invocation.
* DRM-protected audio (some streaming services) may not be capturable.
* The center fold cancels out-of-phase material. That is correct mono downmix
  behavior, not a bug; use Left/Right if a recording is out of phase.
* While active, the tab's audio is routed through the extension, adding a few
  milliseconds of latency. Stop restores direct playback.
* The limiter keeps boosted peaks under control, but very high boost settings
  compress peaks (reduce dynamics) instead of letting them clip.
