# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People listening to a browser tab whose stereo is lopsided or broken: old TV
recordings with one dead channel, camera audio, lecture captures, and mixes that
need centering. The author and engineers like them want a small local tool, not
a streaming service or an audio workstation.

## Product Purpose

Mono Poser folds the current tab's stereo audio into mono. It can copy either
channel into both ears, blend between them on a half-circle dial, and boost the
level from 100% to 400%. Success is that a one-sided recording becomes listenable
in one click, without touching any other tab and without installing anything but
the extension.

## Positioning

A single-tab, local, dependency-free fold with a physical balance control. It
does not record, upload, analyze, or touch page content; it only reroutes the
audio of the tab the user invoked it on.

## Operating Context

Desktop Brave or Chrome, Chromium 116+, extension popup. Audio is captured with
`tabCapture`, processed in an offscreen `AudioContext`, and played back to the
default output. Capture must start from the toolbar, lasts while the popup is
closed, and ends when the tab closes or the user presses Stop. DRM-protected
audio may not be capturable. The browser mutes the tab's direct output while the
extension is processing it.

## Capabilities and Constraints

- One captured tab at a time.
- Stereo channel controls: Left only, Right only, continuous blend, true mono at
  center.
- Boost 100–400% with a native safety limiter.
- Ratio and boost persist between sessions.
- Light and dark system themes.
- No host permissions, content scripts, analytics, network requests, or
  third-party libraries.
- No build step; the extension is plain HTML/CSS/JS.
- Keyboard-operable dial and boost; visible focus; reduced-motion path.

## Brand Commitments

The name is Mono Poser. The interface is a quiet instrument panel: warm graphite
or paper surfaces, one cool blue indicator, system type with a mono voice for
measurements, and the semicircle dial as the distinctive element. The logo and
header mark are the same arch-and-center-tick glyph. Copy is plain and specific,
never promotional.

## Evidence on Hand

- `README.md`: usage, architecture, permissions, limits, and the WASM rationale.
- The DSP was verified with an `OfflineAudioContext`: left only → both channels
  at the left signal, mono → `(L+R)/2`, right only → both at the right signal,
  boost 100% → unity, 400% → limited near 0 dBFS.
- The extension loads in Brave, the service worker responds, and the popup
  renders without console errors.
- No testimonials, customer counts, benchmarks, or store claims exist.

## Product Principles

1. One job: fold one tab's audio, then get out of the way.
2. The dial is the interface; every other control is quiet chrome.
3. The tab is the boundary: never touch another tab or the page.
4. No network and no dependencies; the whole tool stays inspectable.
5. Be honest about limits: one tab, one capture, and DRM caveats.

## Accessibility & Inclusion

Keyboard access to the dial, side keys, boost, start and stop; visible focus
rings; `aria` slider semantics with spoken values; AA contrast in both themes;
a reduced-motion path for the entrance and the dial.
