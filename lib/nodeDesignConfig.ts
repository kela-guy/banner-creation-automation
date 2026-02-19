/**
 * Node design configuration — from Figma C2 (node 539-93).
 * Card: white rounded-xl, border-gray-200/80, soft shadow; TRIGGER/Step badge above; description in slate-50 box; footer tag.
 */

import type { RunStatus } from "@/types/pipeline";

// ─── Canvas layout ─────────────────────────────────────────────────────────
export const canvas = {
  nodeWidth: 220,
  nodeHeight: 160,
  nodeTotalHeight: 200,
  gap: 72,
} as const;

export const NODE_SIZE_PX = canvas.nodeWidth;
export const NODE_HEIGHT_PX = canvas.nodeHeight;
export const NODE_TOTAL_HEIGHT_PX = canvas.nodeTotalHeight;

// ─── Node card (from reference: bg-white rounded-xl border-gray-200/80 shadow) ─
export const nodeCard = {
  border: "border border-gray-200/80 dark:border-[var(--border-default)]",
  bg: "bg-white dark:bg-[var(--surface-card)]",
  shadow: "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:shadow-lg",
  shadowHover: "group-hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)]",
  rounded: "rounded-xl",
  padding: "p-6",
  transition: "transition-all duration-300",
  hoverBorder: "hover:border-blue-300/60 dark:hover:border-blue-500/40",
  selectedRing:
    "ring-2 ring-blue-500 dark:ring-accent ring-offset-2 ring-offset-[var(--surface-canvas)] shadow-md",
} as const;

// ─── Type badge above card (reference: bg-blue-50 border-blue-100/50, 11px uppercase) ─
export const typeBadge = {
  base: "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 shadow-sm backdrop-blur-sm text-[11px] font-medium tracking-wide uppercase shrink-0",
  trigger: {
    bg: "bg-blue-50 dark:bg-blue-950/50",
    border: "border border-blue-100/50 dark:border-blue-800/50",
    text: "text-blue-600 dark:text-blue-300",
  },
  action: {
    bg: "bg-slate-50 dark:bg-slate-800/50",
    border: "border border-slate-200/80 dark:border-slate-600/50",
    text: "text-slate-600 dark:text-slate-300",
  },
} as const;

// ─── Connection handle (reference: w-3.5 h-3.5 bg-white border-2 border-slate-300 rounded-full shadow-sm) ─
export const handle = {
  size: "!w-3.5 !h-3.5",
  border: "!border-2 !border-slate-300 dark:!border-[var(--border-default)]",
  bg: "!bg-white dark:!bg-[var(--surface-card)]",
  rounded: "!rounded-full",
  shadow: "!shadow-sm",
} as const;

// ─── Header (reference: font-bold text-slate-900 text-[16px], mb-3 mt-2) ─
export const headline = {
  wrapper: "flex items-end justify-center w-fit mb-3 mt-2",
  font: "font-bold",
  color: "text-slate-900 dark:text-[var(--foreground)]",
  size: "text-[16px]",
} as const;

// ─── Description (reference: bg-slate-50/50 rounded-lg p-3 -mx-3 mb-4, text-slate-500 text-[13px] leading-relaxed) ─
export const descriptionBox = {
  wrapper: "bg-slate-50/50 dark:bg-slate-800/30 rounded-lg p-3 -mx-3 mb-4 border border-transparent hover:border-slate-100 dark:hover:border-slate-700 transition-colors",
  text: "text-slate-500 dark:text-slate-400 text-[13px] leading-relaxed",
} as const;

// ─── Footer badge (reference: bg-white border-gray-200 rounded-md px-2.5 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)]) ─
export const integrationTag = {
  base: "inline-flex items-center gap-2 bg-white dark:bg-[var(--surface-card)] border border-gray-200 dark:border-[var(--border-default)] rounded-md px-2.5 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-sm transition-shadow cursor-default",
  text: "text-[12px] font-bold text-slate-700 dark:text-slate-300",
  iconSize: "shrink-0 [&>svg]:w-4 [&>svg]:h-4",
} as const;

// ─── Status badge (small indicator: lightning / check / X) ────────────────────
export const statusBadge = {
  position: "absolute top-2 right-2",
  size: "h-6 w-6",
  border: "border-0",
  bg: "bg-white dark:bg-[var(--surface-card)] shadow-sm rounded-full flex items-center justify-center",
  runningIcon: "text-amber-600 dark:text-amber-400",
  successIcon: "text-emerald-600 dark:text-emerald-400",
  errorIcon: "text-red-600 dark:text-red-400",
} as const;

export const statusBadgeIconSizePx = 10;

// Legacy (for compatibility)
export const content = { gap: "gap-3" } as const;
export const subheadline = { marginTop: "mt-0.5", size: "text-sm", color: "text-slate-500", lineHeight: "leading-snug" } as const;
export const iconCircle = { size: "h-9 w-9", iconSize: "[&>svg]:w-5 [&>svg]:h-5" } as const;
export const countBadge = { position: "-top-0.5 -right-0.5", size: "h-5 w-5", bg: "bg-slate-400", textColor: "text-white", textSize: "text-[10px]", font: "font-medium", border: "border-0" } as const;
export const headlinePill = { rounded: "rounded", bg: "bg-slate-100", padding: "px-1.5 py-0.5", textSize: "text-[10px]", font: "font-medium", color: "text-slate-600" } as const;

// ─── Node card state styles (subtle border + background by status) ─────────
export const statusStyles: Record<
  RunStatus,
  { border: string; bg: string; badge: string }
> = {
  idle: {
    border: "border-[#e0e0e0] dark:border-[var(--border-default)]",
    bg: "bg-white dark:bg-[var(--surface-card)]",
    badge: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  },
  running: {
    border: "border-amber-300 dark:border-amber-500",
    bg: "bg-amber-50/70 dark:bg-amber-950/20",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  success: {
    border: "border-emerald-300 dark:border-emerald-500",
    bg: "bg-emerald-50/70 dark:bg-emerald-950/20",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
  error: {
    border: "border-red-300 dark:border-red-500",
    bg: "bg-red-50/70 dark:bg-red-950/20",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
};
