---
name: WellSync
description: An adaptive task scheduler rendered as a soft glassmorphic surface over a peach-to-lavender gradient ground.
colors:
  bg-gradient-peach: "#fce9d8"
  bg-gradient-pink: "#f6dce3"
  bg-gradient-lavender: "#e3d6f2"
  glass-white: "rgba(255, 255, 255, 0.62)"
  glass-white-strong: "rgba(255, 255, 255, 0.82)"
  glass-border: "rgba(255, 255, 255, 0.75)"
  stat-dark: "#1c1c1e"
  stat-dark-raised: "#2a2a2d"
  stat-dark-ink: "#f5f5f7"
  amber: "#ffc94d"
  amber-strong: "#ffc52e"
  ink: "#1a1a1e"
  ink-muted: "#6b6b72"
  ink-faint: "#9c9ca3"
  priority-low-bg: "#dff5e1"
  priority-low-text: "#2f9e44"
  priority-medium-bg: "#fdecd3"
  priority-medium-text: "#c97a1e"
  priority-high-bg: "#fbe0e4"
  priority-high-text: "#d6455b"
  status-todo-bg: "#eef0f4"
  status-todo-text: "#5b6472"
  status-inprogress-bg: "#ede3fb"
  status-inprogress-text: "#6b4fbb"
  status-inreview-bg: "#ddeefb"
  status-inreview-text: "#2c7bb0"
  status-done-bg: "#dff5e1"
  status-done-text: "#2f9e44"
typography:
  headline:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "17-18px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13-14px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12-13px"
    fontWeight: 600-700
rounded:
  pill: "999px"
  lg: "26px"
  md: "18px"
  sm: "12px"
spacing:
  content-inline: "20px"
  content-top: "18px"
  content-bottom: "110px"
  card-gap: "12px"
  card-padding: "18-22px"
components:
  glass-card:
    backgroundColor: "{colors.glass-white}"
    rounded: "{rounded.lg}"
  stat-card:
    backgroundColor: "{colors.stat-dark}"
    textColor: "{colors.stat-dark-ink}"
    rounded: "{rounded.lg}"
    padding: "22px"
  button-primary:
    backgroundColor: "{colors.stat-dark}"
    textColor: "{colors.stat-dark-ink}"
    rounded: "{rounded.pill}"
    padding: "16px"
  button-primary-disabled:
    backgroundColor: "{colors.stat-dark}"
    textColor: "{colors.stat-dark-ink}"
    rounded: "{rounded.pill}"
    padding: "16px"
  button-google:
    backgroundColor: "{colors.glass-white-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "15px"
  filter-chip:
    backgroundColor: "{colors.glass-white-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  filter-chip-active:
    backgroundColor: "{colors.stat-dark}"
    textColor: "{colors.stat-dark-ink}"
    rounded: "{rounded.pill}"
    padding: "10px 18px"
  priority-pill-low:
    backgroundColor: "{colors.priority-low-bg}"
    textColor: "{colors.priority-low-text}"
    rounded: "{rounded.pill}"
  priority-pill-medium:
    backgroundColor: "{colors.priority-medium-bg}"
    textColor: "{colors.priority-medium-text}"
    rounded: "{rounded.pill}"
  priority-pill-high:
    backgroundColor: "{colors.priority-high-bg}"
    textColor: "{colors.priority-high-text}"
    rounded: "{rounded.pill}"
  status-pill-inprogress:
    backgroundColor: "{colors.status-inprogress-bg}"
    textColor: "{colors.status-inprogress-text}"
    rounded: "{rounded.pill}"
---

# Design System: WellSync

## Overview

**Creative North Star: "The Soft Concourse"**

WellSync presents its adaptive task scheduler on a single warm-to-cool gradient ground — peach sliding into pink into lavender — with every surface above it rendered as a translucent, blurred glass card rather than an opaque panel. The system replaces WellSync's earlier dark "split-flap departures board" identity in full: this is a light, airy, atmospheric world, not a dense mechanical one. The one deliberate carry-over from the old identity is the amber accent, retained in place of the reference image's green as a considered brand-continuity call, not a build error.

Depth comes from softness, not hard edges: diffused, colored (not neutral-gray) shadows sit under every glass surface, and the near-black "Today's Progress" stat card is the system's single planned dark surface — a contrast anchor in an otherwise light, pastel field, not a second competing mode. Corners are generous everywhere; nothing in the shipped screens uses a sharp or small-radius corner.

Color is functional before it is decorative: priority and status pills carry real, distinct semantic meaning (traffic-light urgency; a five-way status lifecycle), and are never used as ambient decoration elsewhere in the UI. The amber accent is reserved for the one thing that represents user progress — the ring fill, selected-state lamps, focus rings — and does not bleed into card chrome or navigation.

**Key Characteristics:**
- Diagonal peach → pink → lavender gradient ground, fixed behind every screen including modals
- Frosted glass cards (`backdrop-filter: blur(18px)`) over the gradient, not opaque panels
- One deliberate dark surface (the stat card) for contrast; everything else is light
- Amber accent reserved for progress/selection, never for card or nav chrome
- Fully rounded, pill-shaped interactive controls; no sharp corners anywhere

## Colors

The palette is a soft pastel gradient ground with white-glass surfaces on top, one near-black contrast surface, a single amber accent, and two closed sets of semantic pill colors that must not be treated as decorative.

### Primary
- **WellSync Amber** (`#ffc94d`, strong variant `#ffc52e`): the sole accent color. Used for the progress ring's fill arc, the selected-state "lamp" dot on onboarding option rows, the filled segment of the onboarding progress track, text-selection highlight, and the `:focus-visible` outline. It is carried over from WellSync's prior brand identity and deliberately replaces the green accent shown in the reference image.

### Neutral
- **Peach Ground** (`#fce9d8`) / **Pink Ground** (`#f6dce3`) / **Lavender Ground** (`#e3d6f2`): the three stops of the fixed 135° background gradient (`--ws-bg-gradient`), applied to `body`, `ion-content`, and modal content so the ground is continuous across every screen, including full-screen modals like Add Task.
- **Glass White** (`rgba(255,255,255,0.62)`) / **Glass White Strong** (`rgba(255,255,255,0.82)`): the two translucent card-surface tones. The lighter one is the base `.ws-glass-card`; the stronger one is used for smaller controls that need more contrast against the busier gradient (icon buttons, chips, inputs, the tab bar).
- **Stat Dark** (`#1c1c1e`, raised `#2a2a2d`): the near-black surface reserved for the Dashboard's "Today's Progress" card, the tab bar's active-tab pill, primary buttons, and the floating add-task button. It is the system's one intentional dark note.
- **Ink** (`#1a1a1e`) / **Ink Muted** (`#6b6b72`) / **Ink Faint** (`#9c9ca3`): the text scale on light glass surfaces — primary text, secondary/meta text, and disabled/placeholder text respectively.
- **Stat Dark Ink** (`#f5f5f7`, muted `rgba(245,245,247,0.62)`): the text scale used only inside the dark stat card and other dark chrome (tab bar active label, primary button label).

### Named Rules
**The One Dark Surface Rule.** The near-black stat-card tone (`--ws-dark`) is reserved for a small, fixed set of chrome — the progress stat card, the active tab pill, the FAB, and primary buttons. It never becomes a general card background; introducing a second competing dark surface would erase the "one contrast anchor" read the reference establishes.

**The Functional Pill Rule.** Priority colors (green/orange/red) and status colors (gray/purple/blue/green) are closed, semantic sets tied to `priorityPillStyle()` and `statusPillStyle()` in `src/utils/board.ts`. They label real task state and must not be reused as decorative accents on unrelated UI, and no third pill palette should be invented for a new surface without extending that same mapping.

## Typography

**Display/Body Font:** Plus Jakarta Sans (self-hosted via Google Fonts `@400;500;600;700;800`, falling back to `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`), applied globally to every text element including form controls — there is no separate display face.

**Character:** A single rounded, geometric sans carries the whole hierarchy; weight and size alone create the scale, standing in for the reference's distinct rounded display face.

### Hierarchy
- **Headline** (700, 30px, line-height 1.12, letter-spacing -0.01em): the one large per-page headline (`.ws-headline`), e.g. "Let's Make Today Productive", "Task Schedule".
- **Title** (700, 17-18px): card titles (task card title, section headers, modal title, greeting name).
- **Label** (600-700, 12-13px): field labels, pill text, chip text, meta rows — always at higher weight than body text despite the small size, so it reads as structural rather than incidental.
- **Body** (400-500, 13-14px): descriptions, meta text, empty-state copy.

## Layout

The app is phone-width by design: on desktop viewports (`min-width: 768px`) `ion-app` is capped at `max-width: 430px` and centered with a soft ambient shadow, rather than stretching content edge-to-edge — a deliberate product decision (per PRODUCT.md) to keep the mobile-first layout honest on desktop browsers.

Content areas use a consistent 20px horizontal inset (`--padding-start`/`--padding-end` on `ion-content`), 18px top padding, and 110px bottom padding to clear the floating tab bar and FAB. Cards stack in a single column with a 12px rhythm (`.ws-task-list` gap). Horizontally-scrolling strips (day picker, filter chips, count chips) hide their scrollbars and use small fixed-width or flex-shrink-0 items. Add Task opens as a full-screen modal (`--width: 100%; --height: 100%; --border-radius: 0`), matching the reference's whole-page task form rather than an iOS peek-behind sheet.

## Elevation & Depth

The system is layered, not flat: every glass surface sits above the gradient ground via `backdrop-filter: blur(18px)` plus a soft, warm-tinted (not neutral-gray) diffused shadow. Depth comes from blur and glow rather than hard offsets — there is no directional drop-shadow language anywhere in the build.

### Shadow Vocabulary
- **Glass Shadow** (`box-shadow: 0 12px 32px rgba(94, 63, 107, 0.14)`): the standard elevation for `.ws-glass-card` and the tab bar — a large, soft, purple-tinted diffusion.
- **Glass Shadow Small** (`box-shadow: 0 6px 18px rgba(94, 63, 107, 0.1)`): a tighter version of the same tint for smaller controls (icon buttons, chips, inputs, day-strip buttons).
- **Dark Surface Shadow** (`box-shadow: 0 16px 32px rgba(20, 15, 10, 0.28)` on the stat card; `0 10px 26px rgba(20, 15, 10, 0.32)` on the FAB): a warmer, darker-tinted diffusion reserved for the dark surfaces, distinguishing them from the purple-tinted glass shadows used everywhere else.

### Named Rules
**The Tinted-Not-Gray Shadow Rule.** Every shadow in the system carries a color tint matched to what it sits under (purple-warm for glass surfaces, warm-black for dark surfaces) — never a neutral `rgba(0,0,0,...)` — reinforcing the soft, atmospheric read instead of a generic material-elevation look.

## Shapes

Rounding is generous and consistent, scaled to element size: 26px (`--ws-radius-lg`) for major cards and the tab bar, 18px (`--ws-radius-md`) for inputs, datetime pills, day-strip buttons, and onboarding option rows, 12px (`--ws-radius-sm`) for the smallest incidental shapes, and full pill radius (999px) for every button, chip, and priority/status pill. Circular shapes (50%) are reserved for icon buttons, the avatar, the FAB, checkboxes, and progress-ring hosts. There are no sharp (0px) corners anywhere in the shipped UI except the intentionally edge-to-edge Add Task modal.

## Components

### Buttons
- **Shape:** fully pill-rounded (`border-radius: 999px`) for every button variant.
- **Primary:** dark-surface background (`--ws-dark`) with light ink text (`--ws-dark-ink`), 700 weight, 15px, no text-transform, no box-shadow (`ion-button` and `.ws-button-block`); disabled state drops to 50% opacity.
- **Google Sign-in:** glass-white-strong background, dark ink text, thin 1px hairline border (`rgba(0,0,0,0.12)`) instead of a shadow — the one button variant that uses a border for definition rather than elevation.
- **Icon buttons:** 44px circular glass buttons (`.ws-icon-btn`) for header actions; a `--dark` modifier swaps to the stat-dark surface for the single primary action per header (add task).

### Chips (filter / count / tag)
- **Filter chip:** glass-white-strong pill; active state swaps to the dark surface (background + light ink), not a color tint.
- **Count chip:** glass pill with a small circular number badge; the badge itself switches from a neutral gray fill to amber-on-dark when its chip is active — the one place amber marks selection on a non-progress element.
- **Tag chip:** uses the status "in-progress" purple pair (`--ws-inprogress-bg`/`text`) as its fixed color, with a small round remove button.

### Cards / Containers
- **Corner Style:** 26px (`--ws-radius-lg`).
- **Background:** `.ws-glass-card` at `rgba(255,255,255,0.62)` with `backdrop-filter: blur(18px)` and a near-white 1px border (`rgba(255,255,255,0.75)`) for edge definition against the busy gradient.
- **Shadow Strategy:** Glass Shadow (see Elevation & Depth).
- **Internal Padding:** 18-22px.

### Inputs / Fields
- **Style:** glass-white-strong background, 18px radius, no visible border, label rendered above the field in the Label type role.
- **Focus:** amber-strong highlight (`--highlight-color-focused`) on Ionic inputs; the same amber-strong 2px outline on native datetime inputs and on `:focus-visible` globally — focus is the one state besides progress that is allowed to show amber.
- **Themed Date/Time Pills:** `.ws-datetime-pill` wraps a native `<input type="date">`/`<input type="time">` behind one leading ionicon. The browser's own picker-indicator glyph is not removed — it is kept as the full-size click target but set to `opacity: 0`, so exactly one icon is ever visible per field. This was a deliberate finish-review fix for previously undrawn native browser chrome.

### Navigation
- **Style:** a floating, glass-blurred rounded tab bar (`--ws-radius-lg`, `blur(18px)`) inset from the screen edges rather than full-width. Inactive icons/labels use `--ink-faint`; the active tab gets a solid dark-surface pill drawn behind its icon+label (`::before` pseudo-element, `--ws-radius-md`) with light ink text — the same dark-surface-as-selection language used elsewhere in the system, not a separate nav-only treatment.

### Progress Ring (signature component)
An SVG donut on the Dashboard's stat card: a faint white track (`rgba(255,255,255,0.14)`) with an amber-filled arc (`--ws-amber`) representing completion percentage. A white "host disc" sits behind the percentage numeral specifically so the text reads as a bright focal point against the dark stat card, rather than dark ink floating on a dark card with no light backing — a deliberate finish-review fix, and the reason the ring's text uses `--ws-ink` (dark-on-white) rather than the dark-card's own light ink token.

### Timeline Rail (signature component)
The Task Schedule screen groups tasks by time-of-day and connects stacked task cards with a vertical dot-and-line rail (`.ws-timeline-item__rail`, `__dot`, `__line`) to the left of each card — a small gray dot per task joined by a thin vertical line, hidden after the last item in a group so it never dangles past the final card. This agenda-rail treatment was a deliberate finish-review restoration to match the reference's vertical timeline layout and should not be replicated as generic list-item decoration outside a genuinely time-ordered agenda.

### Avatar
Shows the user's Google profile photo when available; otherwise falls back to a colored initials circle, with the fill color deterministically hashed per user name from a fixed 7-color palette (`#FF8A65, #7C9EFF, #4FD1C5, #F6AD55, #B794F4, #68D391, #FC8181`). There is no user-uploaded photo path — only Google's photo or the initials fallback.

## Do's and Don'ts

### Do:
- **Do** keep the gradient ground (`--ws-bg-gradient`, 135°, peach → pink → lavender) fixed and continuous behind every screen and modal, never swapped for a solid color.
- **Do** use `backdrop-filter: blur(18px)` plus a warm/purple-tinted soft shadow for any new translucent card, matching `.ws-glass-card`.
- **Do** treat priority and status pill colors as a closed, semantic set sourced from `priorityPillStyle()`/`statusPillStyle()` — extend that mapping rather than inventing new ad hoc pill colors.
- **Do** reserve the amber accent for progress, selection state, and focus — not for card backgrounds or general chrome.
- **Do** keep every interactive control (buttons, chips, pills) fully pill-rounded; use 26/18/12px only for card- and field-scale containers.

### Don't:
- **Don't** introduce a second dark/near-black surface competing with the stat card, tab bar, and primary-button chrome — the dark surface is a single reserved contrast anchor, not a general option.
- **Don't** leave a native browser control (date/time picker glyph, select arrow) undrawn or double-drawn; suppress or theme it explicitly the way `.ws-datetime-pill` does, so exactly one icon appears per control.
- **Don't** use a hard-edged, offset drop-shadow anywhere in this system — all elevation in this world is soft and diffused; a crisp neobrutalist-style shadow does not belong here.
- **Don't** add kickers, eyebrow labels, or a second display typeface — the shipped hierarchy uses only Plus Jakarta Sans at varying weight/size, with no small-caps or overline convention anywhere in the build.
