"use client";

import { useEffect } from "react";
import { useDialKit, type DialConfig } from "dialkit";

const PANEL_DESIGN_CONFIG = {
  panel: {
    padding: [0, 0, 48],
    gap: [20, 8, 40],
    radius: [12, 4, 24],
    accordionGap: [4, 0, 16],
    triggerPaddingX: [16, 8, 24],
    triggerPaddingY: [12, 8, 20],
  },
  content: {
    fontSize: [14, 12, 18],
    headingSize: [16, 14, 22],
  },
  accentColor: "oklch(0.62 0.072 259.597)",
} as const;

type PanelDesignValues = {
  panel: { padding: number; gap: number; radius: number; accordionGap: number; triggerPaddingX: number; triggerPaddingY: number };
  content: { fontSize: number; headingSize: number };
  accentColor: string;
};

export function PanelDesignDialKit() {
  const d = useDialKit("Panel design", PANEL_DESIGN_CONFIG as unknown as DialConfig) as PanelDesignValues;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--panel-padding", `${d.panel.padding}px`);
    root.style.setProperty("--panel-gap", `${d.panel.gap}px`);
    root.style.setProperty("--panel-radius", `${d.panel.radius}px`);
    root.style.setProperty("--panel-accordion-gap", `${d.panel.accordionGap}px`);
    root.style.setProperty("--panel-trigger-padding-x", `${d.panel.triggerPaddingX}px`);
    root.style.setProperty("--panel-trigger-padding-y", `${d.panel.triggerPaddingY}px`);
    root.style.setProperty("--panel-content-font-size", `${d.content.fontSize}px`);
    root.style.setProperty("--panel-heading-font-size", `${d.content.headingSize}px`);
    root.style.setProperty("--color-accent", d.accentColor);
    // Foreground and muted from accent (OKLCH: use L for contrast; hex fallback for dial picker)
    const oklchMatch = d.accentColor.match(/oklch\(([^ ]+)\s/);
    const L = oklchMatch ? parseFloat(oklchMatch[1]) : null;
    let hex: string | null = null;
    if (L == null && d.accentColor.startsWith("#")) {
      const h = d.accentColor.replace("#", "").slice(0, 6);
      if (h.length === 3) hex = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      else hex = h;
    }
    const luminance =
      L != null
        ? L
        : hex
          ? (() => {
              const r = parseInt(hex!.slice(0, 2), 16);
              const g = parseInt(hex!.slice(2, 4), 16);
              const b = parseInt(hex!.slice(4, 6), 16);
              return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            })()
          : 0.5;
    const lightFg = "oklch(0.98 0.006 259.597)";
    const darkFg = "oklch(0.29 0.041 259.597)";
    root.style.setProperty(
      "--color-accent-foreground",
      luminance > 0.5 ? darkFg : lightFg
    );
    root.style.setProperty(
      "--color-accent-muted",
      luminance > 0.5 ? "oklch(0.93 0.02 259.597)" : "oklch(0.25 0.03 259.597)"
    );
  }, [d]);

  return null;
}
