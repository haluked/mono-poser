---
name: Mono Poser
description: A quiet instrument for folding one tab's stereo audio into mono.
colors:
  paper: "#fbfaf8"
  graphite: "#1b1a18"
  ink: "#1c1b19"
  bone: "#ece7de"
  muted: "#605c55"
  muted-dark: "#a39d93"
  hairline: "#e7e3dc"
  hairline-dark: "#37342f"
  surface: "#f4f2ee"
  surface-dark: "#242220"
  track: "#e2ded6"
  accent: "#1a73e8"
  accent-dark: "#8ab4f8"
  accent-text: "#1457b8"
  accent-text-dark: "#a8c7fa"
  danger: "#b3261e"
  key-highlight: "rgba(255, 255, 255, 0.12)"
  knob-shadow: "rgba(0, 0, 0, 0.3)"
typography:
  title:
    fontFamily: "ui-serif, Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.2
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
  button:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.2
  measurement:
    fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Cascadia Mono, Consolas, monospace"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.25
  value:
    fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Cascadia Mono, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  meta:
    fontFamily: "ui-monospace, SFMono-Regular, SF Mono, Cascadia Mono, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.64
rounded:
  control: "8px"
  gauge: "10px"
  track: "3px"
  marker: "1px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "#1a73e826"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "#1a73e834"
    textColor: "{colors.ink}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "32px"
  link:
    textColor: "{colors.accent-text}"
---

# Design System: Mono Poser

## Overview

**Creative North Star: "The Instrument Panel"**

Mono Poser is a small piece of audio gear that happens to live in a browser
popup. The surface is warm graphite or paper, the seams are hairlines, and the
only saturated thing is the blue indicator that carries the signal. The chrome
stays quiet so the half-circle balance dial can be the one authored moment.

The system is built for a single glance: what tab is captured, where the balance
sits, and how much boost is applied. Nothing decorates; every mark is a
measurement or a state.

**Key Characteristics:**
- Warm neutral surfaces, never a tinted background.
- One cool blue accent reserved for the dial, selection, and live values.
- System UI for language; a mono voice for numbers and states.
- A physical balance control with a visible center detent.
- Quiet, short motion that explains state.

## Colors

A warm paper/graphite ramp with a single cobalt indicator.

### Primary
- **Signal Blue** (#1a73e8 light / #8ab4f8 dark): the dial arc, knob ring, center detent at mono, selection borders, and the live value. Text uses the darker **Signal Ink** (#1457b8 / #a8c7fa) so contrast stays above 4.5:1.

### Neutral
- **Warm Paper** (#fbfaf8) and **Warm Graphite** (#1b1a18): the popup surface.
- **Ink** (#1c1b19) and **Bone** (#ece7de): primary text and the inverse primary button.
- **Muted** (#605c55 / #a39d93): secondary labels and the tab title.
- **Faint** (#736e66 / #8b857b): captions and the boost scale.
- **Hairline** (#e7e3dc / #37342f): every border and divider.
- **Surface** (#f4f2ee / #242220): raised side keys and disabled controls.

### Named Rules
**The One Signal Rule.** Blue appears on the instrument, the selected side, live values, focus, and the primary action's translucent glaze. It never becomes an opaque fill or tints a surface.

**The Warm Chrome Rule.** Surfaces stay warm neutral; semantic red is the only other hue, and it only reports an error.

## Typography

**Nameplate Font:** the platform serif stack (Palatino Linotype, Iowan Old Style, Georgia).
**Body Font:** the platform UI stack (Segoe UI on Windows, SF Pro on macOS, Roboto on Android).
**Measurement Font:** the platform mono stack (Cascadia Mono, SF Mono, Consolas).

**Character:** a serif nameplate over the browser's own UI voice, with mono for every readout. The serif is the human object; the mono is the instrument.

### Hierarchy
- **Title** (500, 18px/1.2, serif): the Mono Poser nameplate.
- **Body** (400, 12px/18): errors and explanatory copy.
- **Label** (500, 12px/18): buttons, captions.
- **Button** (500, 13px/1.2): the primary action label.
- **Measurement** (500, 15px/1.25, tabular): the dial readout.
- **Value** (500, 13px): the boost value.
- **Meta** (400, 11px): the boost scale.

### Named Rules
**The Readout Rule.** Every number that changes with a control uses the mono face and tabular figures. No decorative use of mono elsewhere.

## Layout

A 304px popup with 16px edges. A single column: header (mark, serif wordmark, Stop),
then either the idle Start action or the dial and boost. The dial is a 148px gauge
above a full-width pair of 36px keys, 8px apart; the keys sit in a lower row under
the arc. Spacing follows a 4px grid; the slider thumb is the only optical value.

## Elevation & Depth

Depth comes from surface steps and hairlines, not shadows. The only shadows are
the knob's small neutral drop shadow and the primary button's inset top
highlight. No colored glow, blur, or backdrop treatment.

### Shadow Vocabulary
- **Knob lift** (`filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))`): makes the physical knob sit above the arc.
- **Key edge** (`inset 0 1px 0 rgba(255, 255, 255, 0.08)`): the primary button's top light.

## Shapes

An arch language: the dial, the header glyph, and the icon are all a semicircle
with a center mark. Controls use an 8px radius; the gauge focus area uses 10px;
the knob, thumb, and detent are pure circles or caps. The icon tile uses a 28px
radius on a 128px canvas. No pills and no nested cards.

## Components

### Buttons
- **Shape:** 8px radius; primary 36px tall, side keys 36px tall and full width below the gauge.
- **Primary:** a translucent blue glaze (26% accent fill, 52% accent hairline) with primary text, 13px/500, a 1px inset top light, and a 34% / 70% hover. In dark the accent is #8ab4f8 and the text is bone; in light it is #1a73e8 and the text is ink.
- **Hover / Focus:** a surface step on hover, a 0.985 press, a 2px accent focus ring with a 2px offset.
- **Secondary:** the warmed surface with a hairline; the selected side gets a blue hairline and a 10% blue tint.
- **Stop:** a quiet 11px muted text button with a 5px square, 24px tall, in the header. It turns danger red only on hover; at rest it stays chrome-quiet.

### Inputs / Fields
- **Boost rail:** a native range input in a 28px row with a 3px track; the lit portion is Signal Blue; the round thumb grows from 14px to 22px as the boost rises, with a 1px-to-4px accent halo and a 120ms transition.
- **Scale:** 100/200/300/400 mono labels at 11px directly beneath the rail, positioned at the exact values.
- **Focus:** a 2px accent ring, 2px offset.

### Signature Component: Balance Dial
A 148×88 SVG arc above a full-width pair of 36px keys. The track is a 4px warm
line; the fill is Signal Blue from the left end to the current position. The knob
is a background-filled circle with a 2.5px blue ring and a soft neutral shadow. A
center detent tick sits below the knob: neutral when off-center, Signal Blue at
mono. The readout inside the arc is mono, 15px/500, and reports Mono, Left/Right
only, or the blend percentage. Pointer, keyboard, and double-click reset are all
supported. The Left and Right keys sit beneath the arc as a balanced pair; the
selected side carries the accent hairline and tint.

## Do's and Don'ts

### Do:
- **Do** keep every surface warm neutral and every border a hairline.
- **Do** use Signal Blue only on the dial, the selected side, a live value, focus, and the primary action's translucent glaze.
- **Do** use the mono face with tabular figures for any changing number.
- **Do** keep the serif only in the nameplate; it never appears in labels or controls.
- **Do** keep controls at 8px radius and targets at least 32px tall.
- **Do** respect reduced motion: keep color states, drop travel and blooms.

### Don't:
- **Don't** add gradients, glows, glass, blobs, grain, or colored shadows.
- **Don't** set labels in uppercase or track them wide.
- **Don't** use emoji as icons; the arch-and-tick glyph is the only mark.
- **Don't** add a second accent hue or tint the popup background toward it.
- **Don't** use weights above 500 or introduce a font file without a measured
  need; the system and mono stacks are deliberate.
