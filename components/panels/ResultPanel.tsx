"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import type { ExtractResult, CopyVariation, BannerConcept, GeneratedBanner, GenerationStyle } from "@/types/pipeline";
import { CopyList } from "@/components/panels/CopyList";
import { GalleryPanel } from "@/components/panels/GalleryPanel";
import { Button } from "@/components/ui/Button";
import { ConfigAccordion } from "@/components/ui/ConfigAccordion";
import { useThemeAndLocale } from "@/components/ThemeAndLocaleProvider";
import { panelT } from "@/lib/translations";
import { cn } from "@/lib/cn";
import { getAvatarTemplate, downloadAvatarTemplate } from "@/lib/avatarTemplate";
import { Tooltip } from "@/components/ui/Tooltip";

const MIN_PASTE_CHARS = 50;
const ACCEPTED_FILE_TYPES = ".pdf,.docx,.doc,.txt,.md";

export interface ResultPanelProps {
  selectedNodeId: string | null;
  documentText: string;
  onDocumentParsed: (text: string) => void;
  salesPageUrl: string;
  onSalesPageUrlChange: (url: string) => void;
  salesPageText: string;
  onSalesPageChange: (text: string) => void;
  brandLogo: string | null;
  onBrandLogoChange: (value: string | null) => void;
  brandColors: string[];
  onBrandColorsChange: (colors: string[]) => void;
  referenceBanners: string[];
  onReferenceBannersChange: (images: string[]) => void;
  generationStyle: GenerationStyle;
  onGenerationStyleChange: (style: GenerationStyle) => void;
  infographicTopicHeadline: string;
  onInfographicTopicHeadlineChange: (value: string) => void;
  runInfographicVariations: () => Promise<void>;
  isRunningInfographic: boolean;
  imageGenerationCount: number;
  onImageGenerationCountChange: (count: number) => void;
  imageGenerationDelaySeconds: number;
  onImageGenerationDelaySecondsChange: (seconds: number) => void;
  insights: ExtractResult | null;
  copyVariations: CopyVariation[];
  concepts: BannerConcept[];
  banners: GeneratedBanner[];
  currentRunBanners: GeneratedBanner[];
}

export function ResultPanel({
  selectedNodeId,
  documentText,
  onDocumentParsed,
  salesPageUrl,
  onSalesPageUrlChange,
  salesPageText,
  onSalesPageChange,
  brandLogo,
  onBrandLogoChange,
  brandColors,
  onBrandColorsChange,
  referenceBanners,
  onReferenceBannersChange,
  generationStyle,
  onGenerationStyleChange,
  infographicTopicHeadline,
  onInfographicTopicHeadlineChange,
  runInfographicVariations,
  isRunningInfographic,
  imageGenerationCount,
  onImageGenerationCountChange,
  imageGenerationDelaySeconds,
  onImageGenerationDelaySecondsChange,
  insights,
  copyVariations,
  concepts,
  banners,
  currentRunBanners,
}: ResultPanelProps) {
  const { locale } = useThemeAndLocale();
  const [pastedText, setPastedText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isFetchingSalesPage, setIsFetchingSalesPage] = useState(false);
  const [salesPageFetchError, setSalesPageFetchError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [refsModalOpen, setRefsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const salesPageFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFetchSalesPage = useCallback(async () => {
    const url = salesPageUrl.trim();
    if (!url) return;
    setSalesPageFetchError(null);
    setIsFetchingSalesPage(true);
    try {
      const res = await fetch("/api/sales-page/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Fetch failed");
      }
      const data = (await res.json()) as { text: string };
      onSalesPageChange(data.text);
    } catch (e) {
      setSalesPageFetchError(e instanceof Error ? e.message : "Failed to fetch");
    } finally {
      setIsFetchingSalesPage(false);
    }
  }, [salesPageUrl, onSalesPageChange]);

  useEffect(() => {
    const url = salesPageUrl.trim();
    if (!url) {
      onSalesPageChange("");
      return;
    }
    if (salesPageFetchTimeoutRef.current) clearTimeout(salesPageFetchTimeoutRef.current);
    salesPageFetchTimeoutRef.current = setTimeout(() => {
      salesPageFetchTimeoutRef.current = null;
      handleFetchSalesPage();
    }, 800);
    return () => {
      if (salesPageFetchTimeoutRef.current) clearTimeout(salesPageFetchTimeoutRef.current);
    };
  }, [salesPageUrl, handleFetchSalesPage, onSalesPageChange]);

  const handlePasteSubmit = useCallback(async () => {
    if (!pastedText.trim()) return;
    setParseError(null);
    setIsParsing(true);
    try {
      const res = await fetch("/api/documents/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Parse failed");
      }
      const data = (await res.json()) as { text: string };
      onDocumentParsed(data.text);
      setPastedText("");
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Failed to parse");
    } finally {
      setIsParsing(false);
    }
  }, [pastedText, onDocumentParsed]);

  const parseFile = useCallback(
    async (file: File): Promise<void> => {
      setParseError(null);
      setIsParsing(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/documents/parse", {
          method: "POST",
          body: form,
        });
        const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Parse failed");
        }
        const text = typeof data.text === "string" ? data.text : "";
        if (!text.trim()) {
          setParseError("No text could be extracted from this file.");
          return;
        }
        onDocumentParsed(text);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Failed to parse file");
      } finally {
        setIsParsing(false);
      }
    },
    [onDocumentParsed]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await parseFile(file);
      e.target.value = "";
    },
    [parseFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (isParsing) return;
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const ext = file.name.toLowerCase().split(".").pop();
      if (!["pdf", "docx", "doc", "txt", "md"].includes(ext ?? "")) {
        setParseError("Please use PDF, DOCX, TXT, or MD.");
        return;
      }
      parseFile(file);
    },
    [isParsing, parseFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleClearDocument = useCallback(() => {
    onDocumentParsed("");
    setPastedText(documentText);
    setParseError(null);
  }, [onDocumentParsed, documentText]);

  if (!selectedNodeId) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-muted/50">
          <svg className="h-7 w-7 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-[var(--foreground)]">{panelT(locale, "configuration")}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {panelT(locale, "configurationHint")}
          </p>
        </div>
        </div>
      </div>
    );
  }

  if (selectedNodeId === "upload") {
    const hasDocument = Boolean(documentText.trim());
    const canUsePaste = pastedText.trim().length >= MIN_PASTE_CHARS;

    const inputBase =
      "rounded-[var(--panel-radius)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2.5 text-[var(--foreground)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent";
    const inputSm = "rounded-[var(--panel-radius)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-[var(--foreground)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent";

    return (
      <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-[var(--panel-gap)] p-[var(--panel-padding)] panel-content-text flex-1 min-h-0 overflow-auto">
        <ConfigAccordion defaultValue={["avatar", "optional"]}>
          <ConfigAccordion.Section value="avatar" title={panelT(locale, "avatarTitle")}>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {panelT(locale, "avatarIntro")}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {panelT(locale, "avatarHint")}
              <Tooltip.Root content={panelT(locale, "avatarHelpText")} side="top">
                <button
                  type="button"
                  className="text-accent underline hover:no-underline cursor-help"
                >
                  {panelT(locale, "whatsAvatar")}
                </button>
              </Tooltip.Root>
            </p>

            {!hasDocument && (
              <div className="mt-3 flex flex-col gap-3">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isParsing}
                  aria-busy={isParsing}
                  aria-label={panelT(locale, "chooseFile")}
                >
                  {isParsing ? panelT(locale, "parsingFile") : panelT(locale, "uploadDocument")}
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setPastedText(getAvatarTemplate(locale))}
                    aria-label={panelT(locale, "startFromTemplate")}
                  >
                    {panelT(locale, "startFromTemplate")}
                  </Button>
                  <button
                    type="button"
                    onClick={() => downloadAvatarTemplate(locale)}
                    className="text-sm text-accent underline hover:no-underline"
                    aria-label={panelT(locale, "downloadTemplate")}
                  >
                    {panelT(locale, "downloadTemplate")}
                  </button>
                </div>
              </div>
            )}

            {hasDocument ? (
            <>
              <div className="mt-4 rounded-[var(--panel-radius)] border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200" role="status">
                <strong>{panelT(locale, "documentLoaded")}</strong> {documentText.length.toLocaleString()} {panelT(locale, "documentLoadedChars")}
              </div>
              {documentText.length < 350 && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300" role="status">
                  {panelT(locale, "nudgeAvatarShort")}
                </p>
              )}
              <Button type="button" variant="secondary" onClick={handleClearDocument} className="mt-3">
                {panelT(locale, "changeDocument")}
              </Button>
            </>
          ) : (
            <>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "mt-4 rounded-[var(--panel-radius)] border-2 border-dashed p-4 transition-colors",
                  isDragOver ? "border-accent bg-accent-muted/20" : "border-[var(--border-default)] bg-[var(--surface-card)]"
                )}
              >
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  {panelT(locale, "dropOrPaste")}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={handleFileSelect}
                  disabled={isParsing}
                  className="sr-only"
                  aria-label={panelT(locale, "chooseFile")}
                />
                <div className="mt-3">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">{panelT(locale, "pasteLabel")}</label>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={panelT(locale, "pastePlaceholder")}
                    className={cn("w-full", inputBase)}
                    rows={5}
                    aria-label={panelT(locale, "pasteLabel")}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handlePasteSubmit}
                      disabled={!canUsePaste || isParsing}
                      aria-busy={isParsing}
                    >
                      {isParsing ? panelT(locale, "parsingFile") : panelT(locale, "usePastedText")}
                    </Button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isParsing}
                      className="text-sm text-accent underline hover:no-underline disabled:opacity-50"
                    >
                      {panelT(locale, "orChooseFile")}
                    </button>
                  </div>
                </div>
              </div>
              {isParsing && (
                <p className="mt-2 text-sm text-accent font-medium" role="status">
                  {panelT(locale, "parsingFile")}
                </p>
              )}
              {parseError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  {parseError}
                </p>
              )}
            </>
          )}
          </ConfigAccordion.Section>

          <ConfigAccordion.Section value="optional" title={panelT(locale, "optionalTitle")}>
            <div className="space-y-5">
              {documentText.trim() && !salesPageText.trim() && (
                <p className="text-xs text-amber-700 dark:text-amber-300" role="status">
                  {panelT(locale, "nudgeSalesPage")}
                </p>
              )}
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
                <h3 className="panel-heading-text font-medium text-[var(--foreground)] mb-1">
                  <Tooltip.Root content={panelT(locale, "salesPageHint")} side="top">
                    <span className="cursor-help border-b border-dotted border-slate-400 dark:border-slate-500">
                      {panelT(locale, "salesPage")}
                    </span>
                  </Tooltip.Root>
                </h3>
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{panelT(locale, "salesPageHint")}</p>
                <input
                  type="url"
                  value={salesPageUrl}
                  onChange={(e) => onSalesPageUrlChange(e.target.value)}
                  placeholder={panelT(locale, "salesPagePlaceholder")}
                  className={cn("w-full", inputSm)}
                  aria-label={panelT(locale, "salesPage")}
                />
                {isFetchingSalesPage && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400" role="status">{panelT(locale, "fetching")}</p>
                )}
                {salesPageFetchError && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">{salesPageFetchError}</p>
                )}
                {!isFetchingSalesPage && salesPageText.trim() && (
                  <p className="mt-2 text-xs text-green-600 dark:text-green-400" role="status">
                    {panelT(locale, "salesPageLoaded")}
                  </p>
                )}
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
                <h3 className="panel-heading-text font-medium text-[var(--foreground)] mb-1">
                  <Tooltip.Root content={panelT(locale, "brandHint")} side="top">
                    <span className="cursor-help border-b border-dotted border-slate-400 dark:border-slate-500">
                      {panelT(locale, "brandAndRefs")}
                    </span>
                  </Tooltip.Root>
                </h3>
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{panelT(locale, "brandHint")}</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1">{panelT(locale, "brandLogo")}</label>
                    {brandLogo ? (
                      <div className="flex items-center gap-2">
                        <img src={brandLogo} alt={panelT(locale, "brandLogo")} className="h-12 w-12 object-contain rounded border border-[var(--border-default)]" />
                        <Button type="button" variant="secondary" onClick={() => onBrandLogoChange(null)}>{panelT(locale, "clear")}</Button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => onBrandLogoChange(reader.result as string);
                          reader.readAsDataURL(file);
                          e.target.value = "";
                        }}
                        className="block w-full text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-accent-muted file:px-2 file:py-1.5 file:text-xs file:font-medium file:text-accent dark:text-slate-400"
                        aria-label={panelT(locale, "brandLogo")}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1">{panelT(locale, "brandColors")}</label>
                    <div className="flex gap-2 flex-wrap">
                      {[0, 1].map((i) => (
                        <div key={i} className="flex items-center gap-1">
                          <input
                            type="color"
                            value={brandColors[i]?.startsWith("#") || brandColors[i]?.startsWith("oklch") ? brandColors[i] : "oklch(0.62 0.072 259.597)"}
                            onChange={(e) => {
                              const next = [...brandColors];
                              next[i] = e.target.value;
                              onBrandColorsChange(next);
                            }}
                            className="h-8 w-8 rounded border border-[var(--border-default)] cursor-pointer"
                            aria-label={`${panelT(locale, "brandColor")} ${i + 1}`}
                          />
                          <input
                            type="text"
                            value={brandColors[i] ?? ""}
                            onChange={(e) => {
                              const next = [...brandColors];
                              next[i] = e.target.value;
                              onBrandColorsChange(next);
                            }}
                            placeholder="#hex"
                            className="w-20 rounded-[var(--panel-radius)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-2 py-1 text-xs font-mono text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1">{panelT(locale, "referenceBanners")}</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files?.length) return;
                        Promise.all(
                          Array.from(files).map(
                            (file) =>
                              new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onload = () => resolve(reader.result as string);
                                reader.readAsDataURL(file);
                              })
                        )
                        ).then((newUrls) => onReferenceBannersChange([...referenceBanners, ...newUrls]));
                        e.target.value = "";
                      }}
                      className="block w-full text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-accent-muted file:px-2 file:py-1.5 file:text-xs file:font-medium file:text-accent dark:text-slate-400"
                      aria-label={panelT(locale, "referenceBanners")}
                    />
                    {referenceBanners.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {referenceBanners.slice(0, 4).map((src, i) => (
                          <img key={i} src={src} alt="" role="presentation" className="h-12 w-12 object-cover rounded border border-[var(--border-default)]" />
                        ))}
                        {referenceBanners.length > 4 && <span className="text-xs text-slate-500">+{referenceBanners.length - 4}</span>}
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setRefsModalOpen(true)}
                          aria-label={panelT(locale, "viewAllRefsCount").replace("{{count}}", String(referenceBanners.length))}
                        >
                          {panelT(locale, "viewAllRefsCount").replace("{{count}}", String(referenceBanners.length))}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => onReferenceBannersChange([])}>{panelT(locale, "clearAll")}</Button>
                      </div>
                    )}
                  </div>
                  <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] p-3">
                    <label className="block text-xs font-medium text-[var(--foreground)] mb-1">{panelT(locale, "generationStyle")}</label>
                    <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{panelT(locale, "generationStyleIntro")}</p>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="generationStyle"
                          checked={generationStyle === "typography"}
                          onChange={() => onGenerationStyleChange("typography")}
                          className="mt-0.5 rounded-full border-[var(--border-default)] text-accent focus:ring-accent"
                        />
                        <span>
                          <span className="text-sm font-medium text-[var(--foreground)]">{panelT(locale, "minimalTypography")}</span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">{panelT(locale, "minimalTypographyDesc")}</span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="generationStyle"
                          checked={generationStyle === "infographic"}
                          onChange={() => onGenerationStyleChange("infographic")}
                          disabled={referenceBanners.length === 0}
                          className="mt-0.5 rounded-full border-[var(--border-default)] text-accent focus:ring-accent disabled:opacity-50"
                        />
                        <span>
                          <span className="text-sm font-medium text-[var(--foreground)]">{panelT(locale, "infographicFromRefs")}</span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400">{panelT(locale, "infographicFromRefsDesc")}</span>
                        </span>
                      </label>
                    </div>
                    {referenceBanners.length === 0 && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{panelT(locale, "uploadRefsToEnable")}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
                <h3 className="panel-heading-text font-medium text-[var(--foreground)] mb-1">{panelT(locale, "infographicVariations")}</h3>
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                  {panelT(locale, "infographicHint")}
                </p>
                <input
                  type="text"
                  value={infographicTopicHeadline}
                  onChange={(e) => onInfographicTopicHeadlineChange(e.target.value)}
                  placeholder={panelT(locale, "infographicPlaceholder")}
                  className={cn("w-full mb-2", inputSm)}
                  aria-label={panelT(locale, "infographicVariations")}
                />
                <Button
                  type="button"
                  onClick={runInfographicVariations}
                  disabled={referenceBanners.length === 0 || isRunningInfographic}
                  aria-busy={isRunningInfographic}
                >
                  {isRunningInfographic ? panelT(locale, "generating") : panelT(locale, "generateVariations")}
                </Button>
              </div>
            </div>
          </ConfigAccordion.Section>
        </ConfigAccordion>
      </div>
      {refsModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={panelT(locale, "referenceBanners")}
          onClick={() => setRefsModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl bg-[var(--surface-card)] border border-[var(--border-default)] shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 p-3 border-b border-[var(--border-default)] shrink-0">
              <h3 className="font-medium text-[var(--foreground)]">{panelT(locale, "referenceBanners")} ({referenceBanners.length})</h3>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => { onReferenceBannersChange([]); setRefsModalOpen(false); }}>
                  {panelT(locale, "clearAll")}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setRefsModalOpen(false)} aria-label={panelT(locale, "closePreview")}>
                  {panelT(locale, "close")}
                </Button>
              </div>
            </div>
            <div className="p-3 overflow-auto flex-1 grid grid-cols-3 sm:grid-cols-4 gap-3">
              {referenceBanners.map((src, i) => (
                <div key={i} className="relative group rounded-lg border border-[var(--border-default)] overflow-hidden bg-[var(--surface-panel)]">
                  <img src={src} alt="" role="presentation" className="w-full aspect-square object-cover" />
                  <button
                    type="button"
                    onClick={() => onReferenceBannersChange(referenceBanners.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 h-7 w-7 rounded-full bg-red-500/90 text-white text-sm font-bold flex items-center justify-center hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-white"
                    aria-label={`Remove image ${i + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }

  if (selectedNodeId === "extract") {
    return (
      <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-[var(--panel-gap)] p-[var(--panel-padding)] panel-content-text flex-1 min-h-0 overflow-auto">
        <div>
          <h2 className="panel-heading-text font-semibold text-[var(--foreground)]">{panelT(locale, "extractedInsights")}</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{panelT(locale, "extractedSubtitle")}</p>
        </div>
        {!insights ? (
          <div className="rounded-[var(--panel-radius)] border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] p-8 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">{panelT(locale, "runToExtract")}</p>
          </div>
        ) : (
          <>
            {((insights.painPoints.length < 2) || (insights.desires.length < 2) || (insights.usps.length < 2)) && (
              <p className="mb-3 text-xs text-amber-700 dark:text-amber-300" role="status">
                {panelT(locale, "nudgeFewInsights")}
              </p>
            )}
            <ConfigAccordion defaultValue={["pain", "desires", "usps"]}>
            <ConfigAccordion.Section value="pain" title={panelT(locale, "painPoints")}>
              <ul className="space-y-1.5 text-sm text-[var(--foreground)]">
                {insights.painPoints.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </ConfigAccordion.Section>
            <ConfigAccordion.Section value="desires" title={panelT(locale, "desires")}>
              <ul className="space-y-1.5 text-sm text-[var(--foreground)]">
                {insights.desires.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </ConfigAccordion.Section>
            <ConfigAccordion.Section value="usps" title={panelT(locale, "usps")}>
              <ul className="space-y-1.5 text-sm text-[var(--foreground)]">
                {insights.usps.map((u, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{u}</span>
                  </li>
                ))}
              </ul>
            </ConfigAccordion.Section>
          </ConfigAccordion>
          </>
        )}
      </div>
      </div>
    );
  }

  if (selectedNodeId === "copy") {
    return (
      <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-[var(--panel-gap)] p-[var(--panel-padding)] panel-content-text flex-1 min-h-0 overflow-auto">
        <ConfigAccordion defaultValue={["copy"]}>
          <ConfigAccordion.Section value="copy" title={panelT(locale, "hebrewCopyTitle")}>
            {copyVariations.length === 0 ? (
              <div className="rounded-[var(--panel-radius)] border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] p-6 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">{panelT(locale, "runToGenerateCopy")}</p>
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400" role="status">
                  {panelT(locale, "nudgeCopyPick")}
                </p>
                <CopyList variations={copyVariations} />
              </>
            )}
          </ConfigAccordion.Section>
        </ConfigAccordion>
      </div>
      </div>
    );
  }

  if (selectedNodeId === "concepts") {
    return (
      <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-[var(--panel-gap)] p-[var(--panel-padding)] panel-content-text flex-1 min-h-0 overflow-auto">
        <ConfigAccordion defaultValue={["concepts"]}>
          <ConfigAccordion.Section value="concepts" title={panelT(locale, "conceptsTitle")}>
            {concepts.length === 0 ? (
              <div className="rounded-[var(--panel-radius)] border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] p-6 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">{panelT(locale, "runToGenerateConcepts")}</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {concepts.map((c, i) => (
                  <li
                    key={i}
                    className="rounded-[var(--panel-radius)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4"
                  >
                    <p className="text-sm text-[var(--foreground)]">{c.description}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {panelT(locale, "fontLabel")}: {c.fontSuggestion} · {panelT(locale, "rtlLabel")}: {c.rtlNotes}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </ConfigAccordion.Section>
        </ConfigAccordion>
      </div>
      </div>
    );
  }

  if (selectedNodeId === "generate") {
    const maxBanners = 15;
    return (
      <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-[var(--panel-gap)] p-[var(--panel-padding)] panel-content-text flex-1 min-h-0 overflow-auto">
        <ConfigAccordion defaultValue={["count", "delay", "run"]}>
          <ConfigAccordion.Section value="count" title={panelT(locale, "howManyImages")}>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              {panelT(locale, "loopHint")}
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={maxBanners}
                value={imageGenerationCount}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isNaN(n)) {
                    onImageGenerationCountChange(Math.min(maxBanners, Math.max(1, n)));
                  }
                }}
                className="w-20 rounded-lg border border-[var(--border-default)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label={panelT(locale, "numberImagesAria")}
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {panelT(locale, "ofLoop")}
              </span>
            </div>
          </ConfigAccordion.Section>
          <ConfigAccordion.Section value="delay" title={panelT(locale, "pauseBetween")}>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              {panelT(locale, "pauseHint")}
            </p>
            <input
              type="number"
              min={0}
              max={120}
              value={imageGenerationDelaySeconds}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!Number.isNaN(n)) {
                  onImageGenerationDelaySecondsChange(Math.min(120, Math.max(0, n)));
                }
              }}
              className="w-20 rounded-lg border border-[var(--border-default)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label={panelT(locale, "pauseAria")}
            />
          </ConfigAccordion.Section>
          <ConfigAccordion.Section value="run" title={panelT(locale, "runPipelineSection")}>
            <p className="text-sm text-slate-500 dark:text-slate-400">{panelT(locale, "runPipelineHint")}</p>
          </ConfigAccordion.Section>
        </ConfigAccordion>
      </div>
      </div>
    );
  }

  if (selectedNodeId === "gallery") {
    return (
      <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-[var(--panel-gap)] p-[var(--panel-padding)] panel-content-text flex-1 min-h-0 overflow-auto">
        <ConfigAccordion defaultValue={["gallery"]}>
          <ConfigAccordion.Section value="gallery" title={panelT(locale, "galleryExport")}>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{panelT(locale, "galleryStepHint")}</p>
            <GalleryPanel banners={currentRunBanners} />
          </ConfigAccordion.Section>
        </ConfigAccordion>
      </div>
      </div>
    );
  }

  return null;
}
