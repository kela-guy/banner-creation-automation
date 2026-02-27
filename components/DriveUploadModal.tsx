"use client";

import { useCallback, useState, useEffect } from "react";
import type { GeneratedBanner } from "@/types/pipeline";
import { getDriveAccessToken, uploadToDrive } from "@/lib/drive";
import { Button } from "@/components/ui/Button";
import { useThemeAndLocale } from "@/components/ThemeAndLocaleProvider";
import { panelT } from "@/lib/translations";
import { cn } from "@/lib/cn";

export interface DriveUploadModalProps {
  banners: GeneratedBanner[];
  open: boolean;
  onClose: () => void;
}

export function DriveUploadModal({ banners, open, onClose }: DriveUploadModalProps) {
  const { locale } = useThemeAndLocale();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [progress, setProgress] = useState({ uploaded: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open && banners.length > 0) {
      setSelectedIds(new Set(banners.map((b) => b.id)));
      setStatus("idle");
      setProgress({ uploaded: 0, total: 0 });
      setErrorMsg("");
    }
  }, [open, banners]);

  const toggle = useCallback((id: string) => {
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

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleUpload = useCallback(async () => {
    const selected = banners.filter((b) => selectedIds.has(b.id));
    if (selected.length === 0) return;
    setStatus("uploading");
    setProgress({ uploaded: 0, total: selected.length });
    setErrorMsg("");
    try {
      const token = await getDriveAccessToken();
      let uploaded = 0;
      for (const b of selected) {
        await uploadToDrive(token, `banner-${b.id}.png`, b.imageBase64);
        uploaded++;
        setProgress({ uploaded, total: selected.length });
      }
      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Upload failed");
      setStatus("error");
    }
  }, [banners, selectedIds]);

  if (!open || banners.length === 0) return null;

  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === banners.length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={panelT(locale, "driveModalTitle")}
      onClick={status === "uploading" ? undefined : onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] rounded-xl bg-[var(--surface-card)] border border-[var(--border-default)] shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-default)] shrink-0">
          <div>
            <h2 className="font-semibold text-[var(--foreground)]">
              {panelT(locale, "driveModalTitle")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {panelT(locale, "driveModalSubtitle")}
            </p>
          </div>
          {status !== "uploading" && (
            <Button type="button" variant="ghost" onClick={onClose} aria-label={panelT(locale, "close")}>
              {panelT(locale, "close")}
            </Button>
          )}
        </div>

        {/* Banner grid */}
        {status !== "done" && (
          <div className="flex-1 min-h-0 overflow-auto p-3">
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={allSelected ? deselectAll : selectAll}
                className="text-xs font-medium text-accent hover:underline"
              >
                {allSelected
                  ? panelT(locale, "driveDeselectAll")
                  : panelT(locale, "driveSelectAll")}
              </button>
              <span className="text-xs text-slate-400">
                {panelT(locale, "driveSelectedCount").replace("{{count}}", String(selectedCount)).replace("{{total}}", String(banners.length))}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {banners.map((b) => {
                const isSelected = selectedIds.has(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggle(b.id)}
                    disabled={status === "uploading"}
                    className={cn(
                      "relative rounded-lg border-2 overflow-hidden transition-all aspect-square",
                      isSelected
                        ? "border-accent ring-1 ring-accent/30"
                        : "border-transparent opacity-50 hover:opacity-80",
                      status === "uploading" && "pointer-events-none"
                    )}
                  >
                    <img
                      src={`data:image/png;base64,${b.imageBase64}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div
                      className={cn(
                        "absolute top-1.5 right-1.5 h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-colors",
                        isSelected
                          ? "bg-accent border-accent text-white"
                          : "bg-white/80 border-slate-300 dark:bg-slate-800/80 dark:border-slate-600"
                      )}
                    >
                      {isSelected && "\u2713"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload progress */}
        {status === "uploading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-sm font-medium text-[var(--foreground)]">
              {panelT(locale, "driveUploading")
                .replace("{{uploaded}}", String(progress.uploaded))
                .replace("{{total}}", String(progress.total))}
            </p>
          </div>
        )}

        {/* Done state */}
        {status === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
            <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <span className="text-emerald-600 dark:text-emerald-400 text-xl font-bold">{"\u2713"}</span>
            </div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              {panelT(locale, "driveUploadDone").replace("{{count}}", String(progress.uploaded))}
            </p>
          </div>
        )}

        {/* Error */}
        {errorMsg && (
          <p className="px-4 pb-2 text-xs text-red-600 dark:text-red-400" role="alert">
            {errorMsg}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border-default)] shrink-0">
          {status === "done" ? (
            <Button type="button" variant="primary" onClick={onClose}>
              {panelT(locale, "driveDone")}
            </Button>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={onClose} disabled={status === "uploading"}>
                {panelT(locale, "driveSkip")}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleUpload}
                disabled={selectedCount === 0 || status === "uploading"}
              >
                {status === "uploading"
                  ? panelT(locale, "uploading")
                  : panelT(locale, "driveUploadBtn").replace("{{count}}", String(selectedCount))}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
