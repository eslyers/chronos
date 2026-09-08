---
version: 1.0.0
name: Chronos Corporate Slate
description: Design system and visual language specification for Chronos Financial Closing & Workflow Cockpit.
colors:
  background: "#030712"
  foreground: "#f8fafc"
  card: "#0b0f19"
  card-foreground: "#f8fafc"
  popover: "#0b0f19"
  popover-foreground: "#f8fafc"
  primary: "#2563eb"
  primary-foreground: "#ffffff"
  secondary: "#1e293b"
  secondary-foreground: "#f8fafc"
  muted: "#1e293b"
  muted-foreground: "#94a3b8"
  accent: "#1e293b"
  accent-foreground: "#f8fafc"
  destructive: "#ef4444"
  destructive-foreground: "#ffffff"
  border: "#1e293b"
  input: "#1e293b"
  ring: "#3b82f6"
  status-done: "#10b981"
  status-progress: "#0284c7"
  status-review: "#8b5cf6"
  status-blocked: "#dc2626"
  fastclose-d0: "#ec4899"
  priority-critical: "#ef4444"
  priority-high: "#f97316"
  priority-medium: "#3b82f6"
  priority-low: "#64748b"
typography:
  display:
    fontFamily: Inter, sans-serif
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  heading-lg:
    fontFamily: Inter, sans-serif
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: -0.015em
  heading-md:
    fontFamily: Inter, sans-serif
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.01em
  body:
    fontFamily: Inter, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter, sans-serif
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0em
  label:
    fontFamily: Inter, sans-serif
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.04em
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
components:
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: 10px
  kanban-column:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.xl}"
    padding: 12px
---

# Chronos Design System

## Overview
Chronos is a high-density, mission-critical financial closing cockpit and workflow tracking platform designed for FP&A and accounting teams. The aesthetic embraces an executive dark-slate canvas with precise structural borders, data-dense cards, micro-animations, and immediate feedback states.

## Colors
The color palette uses deep neutral slates (`#030712`, `#0b0f19`) to reduce eye fatigue during intensive monthly closing windows. Functional accents provide clear informational hierarchy:
- **Primary Accent (`#2563eb` / `#3b82f6`)**: Used for primary action buttons, active navigation markers, and focus states.
- **Fast Close D0 Milestone (`#ec4899`)**: High-contrast pink/magenta reserved strictly for the Cut-off date (D0) representing ERP system lockout.
- **Status Accents**: Emerald green for completed tasks (`#10b981`), Sky blue for active routines (`#0284c7`), Amber/Orange for warnings (`#f97316`), and Carmine red for overdue or blocked items (`#ef4444`).

## Typography
The system uses the `Inter` and `Geist` font stacks, prioritizing vertical rhythm and numeric legibility with tabular figures for dates, offsets, and currency values.
- **Display & Headings**: Crisp negative letter spacing (`-0.02em` to `-0.01em`) with semi-bold to bold weights.
- **Data & Tables**: Compact 12px/14px fonts with clear contrast against dark backgrounds (`#f8fafc` text, `#94a3b8` muted secondary text).

## Layout
- Executive dashboards use responsive grid layouts (`grid-cols-1 md:grid-cols-2 xl:grid-cols-4`).
- Kanban boards feature horizontal scroll containers with sticky headers, resilient column widths (`w-80` to `w-96`), and comfortable card spacing (`gap-3` to `gap-4`).
- Modals and overlays use centered glassmorphism backdrop blurs (`backdrop-blur-md bg-black/60`).

## Elevation & Depth
Depth is created through layered borders and subtle ambient glows rather than aggressive drop shadows:
- Base panels: `border border-border/80 bg-card`
- Interactive hover states: `hover:border-primary/40 hover:shadow-lg transition-all`
- Active drags: elevated drag overlays with `scale-102 shadow-2xl`

## Shapes
Components utilize modern rounded corners (`rounded-xl` / 12px and `rounded-2xl` / 16px) for major cards, with tighter radii (`rounded-md` / 8px) for buttons, badges, and small inputs.

## Components
- **Skeletons**: Content-aware shimmering placeholders matching the layout dimensions of boards and metric grids, completely eliminating layout shifts.
- **Empty States**: High-empathy empty states featuring contextual icon banners, helpful guidance copy, and primary action buttons (e.g. "+ Adicionar Tarefa", "Importar Planilha").
- **Badges**: Monospace tags with pastel alpha backgrounds (`bg-blue-500/15 text-blue-400 border-0`) for fast visual scanning.

## Do's and Don'ts
- **DO** use skeleton loaders that match the target cards and columns to prevent Cumulative Layout Shift (CLS).
- **DO** provide clear action triggers within every empty state to guide the user towards their next step.
- **DO** maintain strict WCAG AAA contrast for muted labels against the `#0b0f19` card background.
- **DON'T** use plain spinners that center-jump content when data finishes loading.
- **DON'T** use generic alert boxes for missing project data — use styled empty-state cards with actionable CTAs.
