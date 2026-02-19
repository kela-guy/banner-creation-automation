"use client";

import { useMemo, useState } from "react";
import type { GeneratedBanner } from "@/types/pipeline";
import { useThemeAndLocale } from "@/components/ThemeAndLocaleProvider";
import { panelT } from "@/lib/translations";
import { GalleryPanel } from "@/components/panels/GalleryPanel";
import type { GallerySortOption } from "@/components/panels/GalleryPanel";

const MS_7_DAYS = 7 * 24 * 60 * 60 * 1000;
const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000;

export type DateFilterOption = "7" | "30" | "all";

export interface ImageGalleryViewProps {
  banners: GeneratedBanner[];
}

function filterByDate(banners: GeneratedBanner[], filter: DateFilterOption): GeneratedBanner[] {
  if (filter === "all") return banners;
  const now = Date.now();
  const cutoff = filter === "7" ? now - MS_7_DAYS : now - MS_30_DAYS;
  return banners.filter((b) => b.createdAt >= cutoff);
}

function sortBanners(banners: GeneratedBanner[], sortBy: GallerySortOption): GeneratedBanner[] {
  const list = [...banners];
  switch (sortBy) {
    case "newest":
      return list.sort((a, b) => b.createdAt - a.createdAt);
    case "oldest":
      return list.sort((a, b) => a.createdAt - b.createdAt);
    case "concept":
      return list.sort((a, b) => a.conceptIndex - b.conceptIndex);
    case "conceptDesc":
      return list.sort((a, b) => b.conceptIndex - a.conceptIndex);
    default:
      return list;
  }
}

export function ImageGalleryView({ banners }: ImageGalleryViewProps) {
  const { locale } = useThemeAndLocale();
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("all");
  const [sortBy, setSortBy] = useState<GallerySortOption>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredAndSorted = useMemo(() => {
    const filtered = filterByDate(banners, dateFilter);
    return sortBanners(filtered, sortBy);
  }, [banners, dateFilter, sortBy]);

  if (banners.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] p-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {panelT(locale, "noBannersYet")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>{panelT(locale, "sortBy")}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as GallerySortOption)}
            className="rounded-[var(--panel-radius)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-2.5 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label={panelT(locale, "sortBy")}
          >
            <option value="newest">{panelT(locale, "sortNewestFirst")}</option>
            <option value="oldest">{panelT(locale, "sortOldestFirst")}</option>
            <option value="concept">{panelT(locale, "sortConceptOrder")}</option>
            <option value="conceptDesc">{panelT(locale, "sortConceptReverse")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <span>{panelT(locale, "filterByDate")}</span>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
            className="rounded-[var(--panel-radius)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-2.5 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label={panelT(locale, "filterByDate")}
          >
            <option value="7">{panelT(locale, "filterLast7Days")}</option>
            <option value="30">{panelT(locale, "filterLast30Days")}</option>
            <option value="all">{panelT(locale, "filterAll")}</option>
          </select>
        </label>
        <div className="flex rounded-lg border border-[var(--border-default)] p-0.5" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "grid"
                ? "bg-accent text-accent-foreground"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            {panelT(locale, "viewGallery")}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
              viewMode === "list"
                ? "bg-accent text-accent-foreground"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            {panelT(locale, "viewList")}
          </button>
        </div>
      </div>

      {filteredAndSorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {panelT(locale, "emptyFilteredGallery")}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <GalleryPanel banners={filteredAndSorted} viewMode="grid" hideSort />
      ) : (
        <GalleryPanel banners={filteredAndSorted} viewMode="list" hideSort />
      )}
    </div>
  );
}
