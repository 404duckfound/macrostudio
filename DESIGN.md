---
name: Macro Studio Dark Engine
colors:
  surface: "0a0a0c"
  surface-dim: "0a0a0c"
  surface-bright: "14181f"
  surface-container-lowest: "0a0a0c"
  surface-container-low: "0e1217"
  surface-container: "#101623"
  surface-container-high: "14181f"
  surface-container-highest: "171c24"
  on-surface: "f5f7fa"
  on-surface-variant: "aab4c2"
  inverse-surface: "f5f7fa"
  inverse-on-surface: "14181f"
  outline: "6b7480"
  outline-variant: "232a35"
  surface-tint: "7aa2e8"
  primary: "7aa2e8"
  on-primary: "001020"
  primary-container: "4b7cc4"
  on-primary-container: "e8effc"
  inverse-primary: "4b7cc4"
  secondary: "#3ddc97"
  on-secondary: "#002016"
  secondary-container: "0b2a1f"
  on-secondary-container: "#d8fff0"
  tertiary: "#ffb02e"
  on-tertiary: "#2a1a00"
  tertiary-container: "#5a3800"
  on-tertiary-container: "#ffe7c4"
  error: "#ff8a93"
  on-error: "#330006"
  error-container: "301014"
  on-error-container: "#ffe3e6"
  primary-fixed: "e8effc"
  primary-fixed-dim: "7aa2e8"
  on-primary-fixed: "001020"
  on-primary-fixed-variant: "4b7cc4"
  secondary-fixed: "#d8fff0"
  secondary-fixed-dim: "#3ddc97"
  on-secondary-fixed: "#001410"
  on-secondary-fixed-variant: "0b2a1f"
  tertiary-fixed: "#ffe7c4"
  tertiary-fixed-dim: "#ffb02e"
  on-tertiary-fixed: "#2a1a00"
  on-tertiary-fixed-variant: "#5a3800"
  background: "0a0a0c"
  on-background: "f5f7fa"
  surface-variant: "171c24"
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: "600"
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: "600"
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: "500"
    lineHeight: 28px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "500"
    lineHeight: 26px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: "400"
    lineHeight: 24px
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: "500"
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: "500"
    lineHeight: 18px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: "500"
    lineHeight: 18px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.5rem
  space-sm: 1rem
  space-md: 1.5rem
  space-lg: 2rem
  space-xl: 3rem
---

## Brand & Style

This design system is tailored for an elite, desktop-class automation workstation where precision, clarity, and rapid visual parsing are critical. Rooted in the guiding principle of _"Büyük, net, az yazı, yüksek kontrast, erişilebilir"_ (Clear, prominent, concise, high contrast, utility-first), it transforms complex workflow automation into an intuitive, low-cognitive-load environment.

The aesthetic is Modern Technical Minimalism: deep, layered architectural slate backings punctuated by vivid functional signals, razor-sharp focus states, and tactile, high-affordance controls. The interface treats every action as mission-critical. Rather than cluttering the screen with dense text and nested menus, it prioritizes generous hit targets, high-contrast visual signifiers, explicit iconography, and clear structural hierarchy. Users experience complete command over their macros through responsive state feedback and effortless spatial organization.

## Colors

The palette leverages a dark architectural scale with rigorous contrast standards (WCAG AAA for primary content, WCAG AA for secondary labels).

- **Canvas & Layering**:
  - `bg-base`: `0a0a0c` (Near-black foundation for root canvas and application frame)
  - `bg-surface`: `0e1217` (Elevated panels, node canvases, cards, and modal dialogs)
  - `bg-surface-elevated`: `14181f` (Floating palettes, active inspector panels)
  - `bg-interactive`: `171c24` (Hover states, active selections, interactive control backings)
  - `border-default`: `232a35` (Structural separation, high visibility panel dividers)
  - `border-muted`: `141920` (Secondary internal dividers, data rows)

- **Typography & Text Surfaces**:
  - `text-primary`: `f5f7fa` (Near-white, maximum AAA legibility on black layers)
  - `text-secondary`: `aab4c2` (Cool gray, compliant with AA guidelines for descriptive metadata)
  - `text-disabled`: `6b7480` (Inactive states and non-interactive glyphs)

- **Accents & Telemetry**:
  - `accent-primary`: `7aa2e8` (Electric blue: interactive controls, primary triggers, active links)
  - `accent-primary-hover`: `4b7cc4` (Deeper blue for pressed/hover feedback)
  - `focus-ring`: `7aa2e8` (Crisp 2px to 3px outline with 2px offset for accessibility)
  - `status-success`: `#3DDC97` (Workflow active, macro running, trigger operational)
  - `status-neutral`: `6b7480` (Idle, queued, bypassed node)
  - `status-warning`: `#FFB02E` (Unsaved state, validation warning, rate limit threshold)
  - `status-danger`: `#FF5F6B` (Execution error, failed trigger, critical stop)

All telemetry and status states must pair color with dedicated geometric iconography or descriptive status badges to guarantee complete non-reliance on color alone.

## Typography

Typography prioritizes scannability and structural hierarchy over decorative nuance. Built on `Inter` with fallbacks to system-native geometric sans-serifs, type weights are strictly constrained to 400 (Regular), 500 (Medium), and 600 (Semi-Bold) to preserve high edge-definition against dark backgrounds without optical thinning.

Body text maintains a comfortable 1.5× line-height (`24px` on `16px` base) to promote prolonged fatigue-free scanning during script configuration. Labels, keys, and technical attributes use medium weights with slight positive tracking for crisp readability at compact scales (`13px` / `14px`). For script parameters, variable tokens, and shortcut sequences, `JetBrains Mono` provides tabular monospaced alignment.

## Layout & Spacing

The layout is structured on a strict 8px spatial grid (`8px`, `16px`, `24px`, `32px`, `48px`), architected for flexible, multi-pane desktop productivity:

- **Desktop Workspace Anatomy**:
  - Left Sidebar / Trigger Library: Collapsible, 280px fixed width.
  - Main Macro Graph / Flow Canvas: Fluid panel conforming to remaining space with contextual infinite zoom.
  - Right Inspector / Properties Panel: Fixed 360px dockable panel.
  - Bottom Execution Log: Collapsible drawer, standard height 240px.

- **Ergonomics & Touch Targets**:
  - Minimum interactive element height is locked to `44px` across buttons, inputs, dropdowns, and list trigger rows.
  - Compact utility buttons inside nodes maintain a strict `36px` minimum boundary with generous hover-target expansions.

- **Responsive Adaptations**:
  - Desktop (`>= 1280px`): Full multi-column view with simultaneous macro pipeline, node inspector, and event stream.
  - Tablet / Half-Screen (`768px - 1279px`): Inspector and Sidebar convert to overlay drawers; gutters compress to `16px`.
  - Compact / Remote Companion (`< 768px`): Single-column view with top-level tab navigation; bottom sheets replace dockable inspectors.

## Elevation & Depth

Visual depth is driven primarily through **tonal layering** and **high-contrast structural outlines**, avoiding muddy dark shadows:

- **Layer 0 (Canvas Base - `0a0a0c`)**: The infinite stage and root frame. Recessed inputs and inactive canvas areas sit directly here.
- **Layer 1 (Panels & Node Cards - `0e1217`)**: Standard working plane for cards, list blocks, and macro action steps. Outlined with a 1px border (`232a35`).
- **Layer 2 (Raised Controls & Dropdowns - `14181f`)**: Flyout menus, parameter selectors, and hovering palette elements. Supported by a crisp, low-spread ambient shadow: `0 8px 24px -4px rgba(0, 0, 0, 0.45)`.
- **Layer 3 (Modals & Command Palettes - `0e1217`)**: Root-level overlays paired with a 60% alpha backdrop scrim (`000000` at 70% opacity). Border elevated to `6b7480`.
- **Focus Elevation**: Focused elements do not use blur shadows; they render an unmistakable `3px` solid stroke in `7aa2e8` with a `2px` transparent offset gap.

## Shapes

The interface embraces a balanced, ergonomic curve system (`roundedness: 2`). Form controls, buttons, and individual macro action blocks employ `12px` corner radii, offering an approachable, polished look while preserving compact workspace geometry.

Larger container frames, flyout modals, and grouped panel sections utilize `16px` (`rounded-lg` / `rounded-xl`). Status indicators, counter badges, and keystroke pill tags employ fully rounded ends (`9999px`) to visually differentiate metadata chips from actionable square-bracket controls.

## Components

### Buttons

- **Primary**: Background `7aa2e8`, text `000000`, font-weight 600, minimum height 44px, horizontal padding 20px, border-radius 12px. Active/hover transitions to `4b7cc4`. Focus visible: 3px outline `7aa2e8` with 2px offset.
- **Secondary / Surface**: Background `0e1217`, border 1px solid `232a35`, text `f5f7fa`. Hover brings background to `171c24` and border to `6b7480`.
- **Danger**: Background `#FF5F6B` with text `f5f7fa`, or subtle ghost with text `#FF5F6B` and border `#FF5F6B`. Used exclusively for macro termination, node deletion, or destructive actions.

### Macro Action Cards & Canvas Nodes

- Container: Surface background `0e1217`, border 1px solid `232a35`, border-radius 14px, internal padding 16px.
- Selected State: Border changes to 2px solid `7aa2e8`, background shifts subtly to `14181f`.
- Header: Icon avatar with high-contrast glyph, macro step name in `16px` Semi-Bold `f5f7fa`, trailing status pill badge, and drag handle.

### Input Fields & Selectors

- Minimum height: 44px. Background `0a0a0c` with border 1px solid `232a35` and border-radius 12px.
- Typography: 15px `f5f7fa`, placeholder `6b7480`.
- Focus state: Border color transitions to `7aa2e8` with a 2px outline ring.

### Badges & Status Chips

- Pill geometry (height: 26px, padding: 0 10px, radius: 9999px).
- Pair an 8px circular status pip or Lucide icon with concise 13px medium text:
  - Active: `#3DDC97` tint (15% background `0b2a1f`, solid text `#3DDC97`).
  - Error: `#FF5F6B` tint (15% background `301014`, solid text `#FF8A93`).
  - Idle: `6b7480` tint (15% background `0e1217`, solid text `aab4c2`).

### Checkboxes & Toggle Switches

- Checkboxes: 20×20px box with 6px border-radius, border 2px solid `232a35`. Checked state fills `7aa2e8` with `000000` checkmark.
- Switches: Track 48×28px, background `171c24` (off) to `7aa2e8` (on). Thumb 22×22px pure white `#FFFFFF` with smooth physical spring transit.

### Keystroke & Hotkey Chips (Kbd)

- Monospaced 13px text inside an elevated `171c24` container with a 1px solid border `232a35`, border-radius 6px, and 2px bottom bevel highlight (`0e1217`) creating a tactile keycap impression.
