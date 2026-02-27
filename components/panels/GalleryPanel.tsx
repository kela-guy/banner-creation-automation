"use client";

import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import type { GeneratedBanner, BannerTag, HebrewValidationStatus } from "@/types/pipeline";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { ListBullets, GridFour } from "@phosphor-icons/react";
import { getDriveAccessToken, uploadToDrive } from "@/lib/drive";
import { useThemeAndLocale } from "@/components/ThemeAndLocaleProvider";
import { panelT } from "@/lib/translations";
import { cn } from "@/lib/cn";

export type GallerySortOption = "newest" | "oldest" | "concept" | "conceptDesc";

const TAG_COLORS: Record<BannerTag["type"], string> = {
  copy: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  trend: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  style: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  meta: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
};

function TagBadge({ tag }: { tag: BannerTag }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) setIsTruncated(el.scrollWidth > el.clientWidth);
  }, [tag.label]);

  const badge = (
    <span
      ref={ref}
      className={cn(
        "inline-block px-1.5 py-0.5 text-[10px] leading-tight font-medium border rounded-[3px] truncate max-w-[140px]",
        TAG_COLORS[tag.type]
      )}
    >
      {tag.label}
    </span>
  );

  if (!isTruncated) return badge;

  return (
    <Tooltip.Root content={tag.label} side="top">
      {badge}
    </Tooltip.Root>
  );
}

function TagBadges({ tags }: { tags?: BannerTag[] }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag, i) => (
        <TagBadge key={i} tag={tag} />
      ))}
    </div>
  );
}

function HebrewBadge({ status }: { status?: HebrewValidationStatus }) {
  if (!status || status === "skipped") return null;
  const isVerified = status === "verified";
  return (
    <Tooltip.Root
      content={isVerified ? "Hebrew text verified correct" : "Hebrew text may contain errors"}
      side="top"
    >
      <span
        className={cn(
          "inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] leading-tight font-medium border rounded-[3px]",
          isVerified
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
        )}
      >
        {isVerified ? "\u2713 Hebrew" : "\u26A0 Hebrew"}
      </span>
    </Tooltip.Root>
  );
}

export interface GalleryPanelProps {
  banners: GeneratedBanner[];
  /** When "list", render compact rows and hide sort (caller controls sort). Default "grid". */
  viewMode?: "grid" | "list";
  /** When true, hide sort dropdown (caller e.g. ImageGalleryView controls sort). */
  hideSort?: boolean;
}

export function GalleryPanel({ banners, viewMode: externalViewMode, hideSort = false }: GalleryPanelProps) {
  const { locale } = useThemeAndLocale();
  const [internalView, setInternalView] = useState<"grid" | "list">("grid");
  const viewMode = externalViewMode ?? internalView;
  const [sortBy, setSortBy] = useState<GallerySortOption>("newest");
  const [previewBanner, setPreviewBanner] = useState<GeneratedBanner | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [driveStatus, setDriveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [driveMessage, setDriveMessage] = useState<string>("");
  const previewCloseRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const sortedBanners = useMemo(() => {
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
  }, [banners, sortBy]);

  useEffect(() => {
    if (previewBanner) {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
      queueMicrotask(() => previewCloseRef.current?.focus());
    } else if (previousActiveElementRef.current?.focus) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [previewBanner]);

  const downloadOne = useCallback((b: GeneratedBanner) => {
    const a = document.createElement("a");
    a.href = `data:image/png;base64,${b.imageBase64}`;
    a.download = `banner-${b.id}.png`;
    a.click();
  }, []);

  const downloadZip = useCallback(async () => {
    if (sortedBanners.length === 0) return;
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      sortedBanners.forEach((b, i) => {
        zip.file(
          `banner-${i + 1}.png`,
          b.imageBase64,
          { base64: true }
        );
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `banners-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error("ZIP export failed:", e);
      }
    }
  }, [sortedBanners]);

  const downloadSelectedZip = useCallback(async () => {
    const selected = banners.filter((b) => selectedIds.has(b.id));
    if (selected.length === 0) return;
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      selected.forEach((b, i) => {
        zip.file(
          `banner-${i + 1}.png`,
          b.imageBase64,
          { base64: true }
        );
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `banners-selected-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.error("ZIP export failed:", e);
      }
    }
  }, [banners, selectedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(banners.map((b) => b.id)));
  }, [banners]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const uploadSelectedToDrive = useCallback(async () => {
    const selected = banners.filter((b) => selectedIds.has(b.id));
    if (selected.length === 0) {
      setDriveMessage("Select at least one banner.");
      setDriveStatus("error");
      return;
    }
    setDriveStatus("loading");
    setDriveMessage("");
    try {
      const token = await getDriveAccessToken();
      let uploaded = 0;
      for (const b of selected) {
        await uploadToDrive(token, `banner-${b.id}.png`, b.imageBase64);
        uploaded++;
        setDriveMessage(`Uploaded ${uploaded} of ${selected.length}…`);
      }
      setDriveMessage(`Uploaded ${uploaded} banner${uploaded === 1 ? "" : "s"} to your Drive.`);
      setDriveStatus("success");
      setSelectedIds(new Set());
    } catch (e) {
      setDriveMessage(e instanceof Error ? e.message : "Upload failed");
      setDriveStatus("error");
    }
  }, [banners, selectedIds]);

  if (banners.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] p-8 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {panelT(locale, "noBannersYet")}
        </p>
      </div>
    );
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!externalViewMode && (
          <div className="flex rounded-md border border-[var(--border-default)] overflow-hidden">
            <button
              type="button"
              onClick={() => setInternalView("grid")}
              className={cn(
                "px-2 py-1.5 transition-colors",
                viewMode === "grid" ? "bg-accent text-white" : "bg-[var(--surface-panel)] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
              aria-label="Grid view"
            >
              <GridFour size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => setInternalView("list")}
              className={cn(
                "px-2 py-1.5 transition-colors",
                viewMode === "list" ? "bg-accent text-white" : "bg-[var(--surface-panel)] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
              aria-label="List view"
            >
              <ListBullets size={16} weight="bold" />
            </button>
          </div>
        )}
        {!hideSort && (
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
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={downloadZip}
          aria-label={panelT(locale, "downloadAllZip")}
        >
          {panelT(locale, "downloadAllZipBtn")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={selectAll}
          aria-label={panelT(locale, "selectAll")}
        >
          {panelT(locale, "selectAll")}
        </Button>
        {selectedCount > 0 && (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={downloadSelectedZip}
              aria-label={panelT(locale, "downloadSelectedZip")}
            >
              {panelT(locale, "downloadSelectedZipBtn")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={clearSelection}
              aria-label={panelT(locale, "clearSelection")}
            >
              {panelT(locale, "clearSelectionCount")} ({selectedCount})
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={uploadSelectedToDrive}
              disabled={driveStatus === "loading"}
              aria-label={panelT(locale, "uploadToDrive")}
            >
              {driveStatus === "loading" ? panelT(locale, "uploading") : panelT(locale, "uploadToDriveBtn")}
            </Button>
          </>
        )}
      </div>
      {driveMessage && (
        <p
          className={`text-sm ${
            driveStatus === "error"
              ? "text-red-600 dark:text-red-400"
              : driveStatus === "success"
                ? "text-green-600 dark:text-green-400"
                : "text-slate-600 dark:text-slate-400"
          }`}
          role="status"
        >
          {driveMessage}
        </p>
      )}
      {viewMode === "list" ? (
        <ul className="space-y-2">
          {sortedBanners.map((b) => (
            <li
              key={b.id}
              className="flex items-start gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-2.5 shadow-sm"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(b.id)}
                onChange={() => toggleSelect(b.id)}
                className="mt-1 rounded border-[var(--border-default)] text-accent focus:ring-accent"
                aria-label={`${panelT(locale, "selectBanner")} ${b.conceptIndex + 1}`}
              />
              <button
                type="button"
                onClick={() => setPreviewBanner(b)}
                className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--border-default)] focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label={`${panelT(locale, "previewBanner")} ${b.conceptIndex + 1}`}
              >
                <img
                  src={`data:image/png;base64,${b.imageBase64}`}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
              <div className="flex-1 min-w-0 space-y-1">
                <span className="block truncate text-sm text-[var(--foreground)]">
                  {b.copySnippet ? `${b.copySnippet.slice(0, 50)}${b.copySnippet.length > 50 ? "…" : ""}` : `Concept ${b.conceptIndex + 1}`}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  <TagBadges tags={b.tags} />
                  <HebrewBadge status={b.hebrewValidation} />
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="py-1.5 text-xs"
                  onClick={() => downloadOne(b)}
                  aria-label={`${panelT(locale, "downloadBanner")} ${b.conceptIndex + 1}`}
                >
                  {panelT(locale, "download")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
      <div className="grid grid-cols-2 gap-3">
        {sortedBanners.map((b) => (
          <div
            key={b.id}
            className="flex flex-col rounded-xl border border-[var(--border-default)] overflow-hidden bg-[var(--surface-card)] shadow-card"
          >
            <button
              type="button"
              onClick={() => setPreviewBanner(b)}
              className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
              aria-label={`${panelT(locale, "previewBanner")} ${b.conceptIndex + 1}`}
            >
              <img
                src={`data:image/png;base64,${b.imageBase64}`}
                alt={`Banner ${b.conceptIndex + 1}`}
                className="aspect-square w-full object-cover"
              />
            </button>
            <div className="p-2 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1">
                <TagBadges tags={b.tags} />
                <HebrewBadge status={b.hebrewValidation} />
              </div>
              <div className="flex items-center justify-between gap-1">
                <label className="flex items-center gap-1.5 cursor-pointer min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(b.id)}
                    onChange={() => toggleSelect(b.id)}
                    className="rounded border-[var(--border-default)] text-accent focus:ring-accent"
                    aria-label={`${panelT(locale, "selectBanner")} ${b.conceptIndex + 1}`}
                  />
                  <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {b.copySnippet ? `${b.copySnippet.slice(0, 20)}…` : `#${b.conceptIndex + 1}`}
                  </span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-xs py-1 shrink-0"
                  onClick={() => downloadOne(b)}
                  aria-label={`${panelT(locale, "downloadBanner")} ${b.conceptIndex + 1}`}
                >
                  {panelT(locale, "download")}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Large preview modal */}
      {previewBanner && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={panelT(locale, "bannerPreview")}
          onClick={() => setPreviewBanner(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] rounded-xl overflow-hidden bg-[var(--surface-card)] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`data:image/png;base64,${previewBanner.imageBase64}`}
              alt={`Banner ${previewBanner.conceptIndex + 1} preview`}
              className="max-h-[85vh] max-w-full w-auto h-auto object-contain"
            />
            <div className="p-3 border-t border-[var(--border-default)]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
                  {previewBanner.copySnippet ?? `Concept ${previewBanner.conceptIndex + 1}`}
                </span>
                <div className="flex gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => downloadOne(previewBanner)}
                  >
                    {panelT(locale, "download")}
                  </Button>
                  <Button
                    ref={previewCloseRef}
                    type="button"
                    variant="ghost"
                    onClick={() => setPreviewBanner(null)}
                    aria-label={panelT(locale, "closePreview")}
                  >
                    {panelT(locale, "close")}
                  </Button>
                </div>
              </div>
              {(previewBanner.tags?.length || previewBanner.hebrewValidation) && (
                <div className="mt-2 pt-2 border-t border-[var(--border-default)] flex flex-wrap items-center gap-1">
                  <TagBadges tags={previewBanner.tags} />
                  <HebrewBadge status={previewBanner.hebrewValidation} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
