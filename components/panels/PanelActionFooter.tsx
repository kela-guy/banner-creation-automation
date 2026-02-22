"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import { useThemeAndLocale } from "@/components/ThemeAndLocaleProvider";
import { panelT, t } from "@/lib/translations";

const MAX_BANNERS = 15;

interface PanelActionFooterProps {
  imageGenerationCount: number;
  onImageGenerationCountChange: (count: number) => void;
  onRunPipeline: () => void;
  isRunning: boolean;
}

export const PanelActionFooter = React.memo(function PanelActionFooter({
  imageGenerationCount,
  onImageGenerationCountChange,
  onRunPipeline,
  isRunning,
}: PanelActionFooterProps) {
  const { locale } = useThemeAndLocale();

  return (
    <div className="shrink-0 border-t border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3 flex items-center gap-3">
      <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--foreground)] flex-1 min-w-0">
        <input
          type="number"
          min={1}
          max={MAX_BANNERS}
          value={imageGenerationCount}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!Number.isNaN(n)) onImageGenerationCountChange(Math.min(MAX_BANNERS, Math.max(1, n)));
          }}
          className="w-14 rounded-md border border-[var(--border-default)] bg-[var(--background)] px-2 py-1.5 text-sm text-center text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label={panelT(locale, "numberImagesAria")}
        />
        {panelT(locale, "bannersLabel")}
      </label>
      <Button
        type="button"
        onClick={onRunPipeline}
        disabled={isRunning}
        aria-busy={isRunning}
        className="shrink-0"
      >
        {isRunning ? t(locale, "running") : t(locale, "createBanners")(imageGenerationCount)}
      </Button>
    </div>
  );
});
