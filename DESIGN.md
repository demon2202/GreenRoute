---
name: GreenRoute
description: Intelligent Eco-Friendly Navigation & Carbon-Optimized Routing
colors:
  primary: "#16a34a"
  primary-hover: "#15803d"
  primary-glow: "rgba(22,163,74,0.25)"
  bg-primary: "#f0faf5"
  bg-secondary: "#ffffff"
  text-primary: "#0a1f14"
  text-secondary: "#2d6a4a"
  accent-blue: "#0ea5e9"
  accent-amber: "#f59e0b"
  accent-red: "#ef4444"
typography:
  display:
    fontFamily: "Outfit, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System: GreenRoute

## Overview

**Creative North Star: "The Emerald Navigation Terminal"**

GreenRoute brings precision environmental telemetry into high-visibility, glanceable map navigation. The visual language blends crisp, modern spatial telemetry (Outfit headings, glassmorphic floating panels, vibrant emerald accents) with high-legibility map overlays designed for low-distraction decision making while in transit.

### Key Characteristics
- **Glassmorphic Overlays**: Translucent backdrop blur panels floating effortlessly over Mapbox GL canvases.
- **Emerald Telemetry**: High-contrast green indicators for carbon savings, eco-score gauges, and low-emission routes.
- **Adaptive Contrast Mode**: Dynamic light/dark theme switching maintaining WCAG AA contrast across map controls.
- **Micro-Interactions**: Smooth spring-eased transitions on route selection, tab toggles, and drawer reveals.

## Colors

GreenRoute uses an emerald-dominant semantic palette paired with high-contrast text and purposeful status accents.

### Primary
- **Emerald Green** (`#16a34a`): Primary action buttons, active route highlights, eco-score meters, and positive metric callouts.

### Accents
- **Electric Cyan** (`#0ea5e9`): EV charging station markers, secondary route paths, and alternative mode badges.
- **Amber Warning** (`#f59e0b`): Moderate traffic congestion alerts and elevated emission warnings.
- **Crimson Red** (`#ef4444`): Heavy traffic jams, high-pollution zones, and critical alerts.

### Neutral
- **Deep Botanical Tint** (`#0a1f14`): Primary text and high-contrast titles.
- **Forest Slate** (`#2d6a4a`): Secondary labels and metadata text.
- **Mint Mist** (`#f0faf5`): Light mode primary background canvas.

### Named Rules
**The Emerald Hierarchy Rule.** The primary green accent (`#16a34a`) is reserved for positive environmental impact and primary navigation callouts. It must never be diluted by non-essential decorative fills.

## Typography

**Display Font:** Outfit (`'Outfit', sans-serif`)  
**Body Font:** Inter (`'Inter', sans-serif`)

### Hierarchy
- **Display** (Bold 700, clamp(2rem, 5vw, 3.5rem), 1.15): Hero metric callouts and page titles.
- **Headline** (SemiBold 600, 1.5rem, 1.25): Card headers, drawer titles, and route summary headers.
- **Body** (Regular 400, 1rem, 1.55): Turn-by-turn directions, description text, and modal content.
- **Label** (Medium 500 / SemiBold 600, 0.875rem, letter-spacing 0.02em): Input labels, badge metrics, and tab controls.

## Layout

Floating sidebar layout (`--sidebar-width: 256px`, `--panel-width: 400px`) over a full-viewport Mapbox GL canvas. Mobile layouts collapse sidebars into bottom sheet drawers with smooth touch-drag handles.

## Elevation & Depth

Surfaces use subtle, layered depth (`--shadow-md: 0 4px 16px rgba(0,0,0,0.08)`) and soft green glowing drop shadows (`--shadow-green: 0 4px 20px rgba(22,163,74,0.22)`) on active eco-navigation controls.

### Named Rules
**The Floating Overlay Rule.** Navigation drawers and search controls float above the map canvas with `12px` to `16px` border-radius and `backdrop-filter: blur(12px)`.

## Shapes

- **Corner Radius**: `12px` (`--r-md`) for cards and input fields, `16px` (`--r-lg`) for modals, `9999px` (`--r-full`) for pills and badges.
- **Border Treatment**: `1px solid var(--border-color)` (`#d1ece0` light / `#1f2937` dark).

## Components

### Buttons
- **Shape:** Rounded rectangle (`12px` radius).
- **Primary:** `background: #16a34a; color: #ffffff; padding: 12px 24px; font-weight: 600;`
- **Hover:** `background: #15803d; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(22,163,74,0.25);`

### Cards / Panels
- **Shape:** `16px` radius (`--r-lg`), `backdrop-filter: blur(12px)`.
- **Background:** `var(--bg-glass)` (`rgba(255,255,255,0.82)` light / `rgba(17,24,39,0.88)` dark).
- **Border:** `1px solid var(--bg-glass-border)`.

### Inputs / Search
- **Shape:** `12px` radius (`--r-md`).
- **Style:** `background: var(--bg-input); border: 1px solid var(--border-color); padding: 12px 16px;`
- **Focus:** `border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.15);`

## Do's and Don't's

### Do:
- **Do** show carbon savings metrics alongside trip duration on every route selection card.
- **Do** maintain high visual contrast between map route polylines and map background features.
- **Do** use responsive bottom-sheet drawers for mobile map navigation.

### Don't:
- **Don't** use pure un-tinted black (`#000000`) for text or dark mode backgrounds; use deep botanical dark tones (`#090d16`).
- **Don't** clutter the map viewport with redundant floating buttons.
- **Don't** rely on color alone to distinguish route safety or emissions; include text badges and icons.
