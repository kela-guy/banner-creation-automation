"use client";

import { useCallback, useState, useRef, useEffect, useMemo } from "react";
import type { ExtractResult, CopyVariation, BannerConcept, GeneratedBanner, GenerationStyle, RunStatus } from "@/types/pipeline";
import type { TrendTopic, TrendSource, TrendInsights, TrendAngle } from "@/types/trends";
import { getAngleHook } from "@/types/trends";
import { CircleNotch, Question } from "@phosphor-icons/react";
import { CopyList } from "@/components/panels/CopyList";
import { GalleryPanel } from "@/components/panels/GalleryPanel";
import { Button } from "@/components/ui/Button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip } from "@/components/ui/Tooltip";
import { useThemeAndLocale } from "@/components/ThemeAndLocaleProvider";
import { panelT } from "@/lib/translations";
import { cn } from "@/lib/cn";
import { consumeScoutStream } from "@/lib/consumeScoutStream";
import { getAvatarTemplate, downloadAvatarTemplate } from "@/lib/avatarTemplate";
const MIN_PASTE_CHARS = 50;
const ACCEPTED_FILE_TYPES = ".pdf,.docx,.doc,.txt,.md";

function HintIcon({ tooltip }: { tooltip: string }) {
  return (
    <Tooltip.Root content={tooltip} side="top">
      <span role="img" className="inline-flex items-center justify-center h-4 w-4 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="Info">
        <Question size={14} weight="bold" />
      </span>
    </Tooltip.Root>
  );
}

function StepLoadingBlock({
  message,
  subtitle,
}: {
  message: string;
  subtitle?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-[var(--panel-radius)] border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 px-6 py-5"
      role="status"
      aria-live="polite"
    >
      <CircleNotch size={28} weight="bold" className="animate-spin text-amber-600 dark:text-amber-400" />
      <p className="text-sm font-medium text-[var(--foreground)]">{message}</p>
      {subtitle && (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{subtitle}</p>
      )}
    </div>
  );
}

export interface ResultPanelProps {
  selectedNodeId: string | null;
  nodeStatus?: Record<string, RunStatus>;
  nodeSummaries?: Record<string, string>;
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
  trendTopics: TrendTopic[];
  onTrendTopicsChange: (topics: TrendTopic[]) => void;
  trendSources: TrendSource[];
  onTrendSourcesChange: (sources: TrendSource[]) => void;
  trendInsights: TrendInsights | null;
  onTrendInsightsChange: (insights: TrendInsights | null) => void;
}

const EMPTY_STATUS: Record<string, RunStatus> = {};
const EMPTY_SUMMARIES: Record<string, string> = {};

export function ResultPanel({
  selectedNodeId,
  nodeStatus = EMPTY_STATUS,
  nodeSummaries = EMPTY_SUMMARIES,
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
  trendTopics,
  onTrendTopicsChange,
  trendSources,
  onTrendSourcesChange,
  trendInsights,
  onTrendInsightsChange,
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
    const maxBanners = 15;
    const hasDocument = Boolean(documentText.trim());
    const canUsePaste = pastedText.trim().length >= MIN_PASTE_CHARS;

    const inputBase =
      "rounded-[var(--panel-radius)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2.5 text-[var(--foreground)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent";
    const inputSm = "rounded-[var(--panel-radius)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-[var(--foreground)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent";

    return (
      <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-[var(--panel-gap)] panel-content-text flex-1 min-h-0 overflow-auto">
        <Accordion defaultValue={["avatar", "branding", "style", "images"]}>
          <AccordionItem value="avatar">
            <AccordionTrigger>
              {panelT(locale, "avatarTitle")}
              {hasDocument && (
                <span className="ml-2 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-300">✓</span>
              )}
            </AccordionTrigger>
            <AccordionContent>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
              {panelT(locale, "avatarIntro")}
              <HintIcon tooltip={panelT(locale, "avatarHint")} />
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
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="salesPage">
            <AccordionTrigger>
              {panelT(locale, "salesPage")}
              {salesPageText.trim() && (
                <span className="ml-2 rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-300">✓</span>
              )}
            </AccordionTrigger>
            <AccordionContent>
            <div className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
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
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="branding">
            <AccordionTrigger>
              {panelT(locale, "brandAndRefs")}
              <HintIcon tooltip={panelT(locale, "brandHint")} />
            </AccordionTrigger>
            <AccordionContent>
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
            </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="style">
            <AccordionTrigger>
              {panelT(locale, "generationStyle")}
              <HintIcon tooltip={panelT(locale, "generationStyleIntro")} />
            </AccordionTrigger>
            <AccordionContent>
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
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="images">
            <AccordionTrigger>
              {panelT(locale, "howManyImages")}
              <HintIcon tooltip={panelT(locale, "loopHint")} />
            </AccordionTrigger>
            <AccordionContent>
            <div className="flex items-center gap-3 mb-4">
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
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-[var(--foreground)] mb-1">
                {panelT(locale, "pauseBetween")}
                <HintIcon tooltip={panelT(locale, "pauseHint")} />
              </label>
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
            </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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

  if (selectedNodeId === "trends") {
    return (
      <TrendsPanel
        locale={locale}
        documentText={documentText}
        salesPageText={salesPageText}
        trendTopics={trendTopics}
        onTrendTopicsChange={onTrendTopicsChange}
        trendSources={trendSources}
        onTrendSourcesChange={onTrendSourcesChange}
        trendInsights={trendInsights}
        onTrendInsightsChange={onTrendInsightsChange}
        nodeStatus={nodeStatus}
      />
    );
  }

  if (selectedNodeId === "extract") {
    const extractRunning = nodeStatus.extract === "running";
    const hasAccordion = Boolean(insights);
    return (
      <div className="flex flex-col h-full min-h-0">
      <div className={cn("flex flex-col gap-[var(--panel-gap)] panel-content-text flex-1 min-h-0 overflow-auto", !hasAccordion && "p-3")}>
        {extractRunning && (
          <StepLoadingBlock
            message={panelT(locale, "stepExtracting")}
            subtitle={nodeSummaries.extract}
          />
        )}
        {!insights ? (
          !extractRunning && (
            <div className="rounded-[var(--panel-radius)] border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] p-8 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">{panelT(locale, "runToExtract")}</p>
            </div>
          )
        ) : (
          <>
            {((insights.painPoints.length < 2) || (insights.desires.length < 2) || (insights.usps.length < 2)) && (
              <p className="mb-3 text-xs text-amber-700 dark:text-amber-300" role="status">
                {panelT(locale, "nudgeFewInsights")}
              </p>
            )}
            <Accordion defaultValue={["pain", "desires", "usps"]}>
            <AccordionItem value="pain">
              <AccordionTrigger>
                {panelT(locale, "painPoints")}
                <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">{insights.painPoints.length}</span>
              </AccordionTrigger>
              <AccordionContent>
              <ul className="space-y-1.5 text-sm text-[var(--foreground)]">
                {insights.painPoints.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
            </AccordionItem>
            <AccordionItem value="desires">
              <AccordionTrigger>
                {panelT(locale, "desires")}
                <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">{insights.desires.length}</span>
              </AccordionTrigger>
              <AccordionContent>
              <ul className="space-y-1.5 text-sm text-[var(--foreground)]">
                {insights.desires.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
            </AccordionItem>
            <AccordionItem value="usps">
              <AccordionTrigger>
                {panelT(locale, "usps")}
                <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">{insights.usps.length}</span>
              </AccordionTrigger>
              <AccordionContent>
              <ul className="space-y-1.5 text-sm text-[var(--foreground)]">
                {insights.usps.map((u, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-slate-400">•</span>
                    <span>{u}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
            </AccordionItem>
          </Accordion>
          </>
        )}
      </div>
      </div>
    );
  }

  if (selectedNodeId === "copy") {
    const copyRunning = nodeStatus.copy === "running";
    return (
      <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-[var(--panel-gap)] panel-content-text flex-1 min-h-0 overflow-auto">
        {copyRunning && (
          <StepLoadingBlock
            message={panelT(locale, "stepGeneratingCopy")}
            subtitle={nodeSummaries.copy}
          />
        )}
        <Accordion defaultValue={["copy"]}>
          <AccordionItem value="copy">
            <AccordionTrigger>
              {panelT(locale, "hebrewCopyTitle")}
              {copyVariations.length > 0 && (
                <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">{copyVariations.length}</span>
              )}
            </AccordionTrigger>
            <AccordionContent>
            {copyVariations.length === 0 ? (
              !copyRunning && (
                <div className="rounded-[var(--panel-radius)] border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] p-6 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{panelT(locale, "runToGenerateCopy")}</p>
                </div>
              )
            ) : (
              <CopyList variations={copyVariations} />
            )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      </div>
    );
  }

  if (selectedNodeId === "concepts") {
    const conceptsRunning = nodeStatus.concepts === "running";
    return (
      <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-[var(--panel-gap)] panel-content-text flex-1 min-h-0 overflow-auto">
        {conceptsRunning && (
          <StepLoadingBlock
            message={panelT(locale, "stepGeneratingConcepts")}
            subtitle={nodeSummaries.concepts}
          />
        )}
        <Accordion defaultValue={["concepts"]}>
          <AccordionItem value="concepts">
            <AccordionTrigger>
              {panelT(locale, "conceptsTitle")}
              {concepts.length > 0 && (
                <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">{concepts.length}</span>
              )}
            </AccordionTrigger>
            <AccordionContent>
            {concepts.length === 0 ? (
              !conceptsRunning && (
                <div className="rounded-[var(--panel-radius)] border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] p-6 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{panelT(locale, "runToGenerateConcepts")}</p>
                </div>
              )
            ) : (
              <ul className="space-y-3">
                {concepts.map((c, i) => (
                  <li
                    key={i}
                    className="rounded-[var(--panel-radius)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4"
                  >
                    <p className="text-sm text-[var(--foreground)]">{c.description}</p>
                  </li>
                ))}
              </ul>
            )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      </div>
    );
  }

  if (selectedNodeId === "generate") {
    const generateRunning = nodeStatus.generate === "running";
    return (
      <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-[var(--panel-gap)] p-3 panel-content-text flex-1 min-h-0 overflow-auto">
        {generateRunning && (
          <StepLoadingBlock
            message={panelT(locale, "stepGeneratingBanners")}
            subtitle={nodeSummaries.generate}
          />
        )}
        <div className="rounded-[var(--panel-radius)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
          <h3 className="panel-heading-text font-semibold text-[var(--foreground)] flex items-center gap-1.5">
            {panelT(locale, "runPipelineSection")}
            <HintIcon tooltip={panelT(locale, "runPipelineHint")} />
          </h3>
        </div>
      </div>
      </div>
    );
  }

  if (selectedNodeId === "gallery") {
    return (
      <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-[var(--panel-gap)] panel-content-text flex-1 min-h-0 overflow-auto">
        <Accordion defaultValue={["gallery"]}>
          <AccordionItem value="gallery">
            <AccordionTrigger>
              {panelT(locale, "galleryExport")}
              {banners.length > 0 && (
                <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">{banners.length}</span>
              )}
              <HintIcon tooltip={panelT(locale, "galleryStepHint")} />
            </AccordionTrigger>
            <AccordionContent>
            <GalleryPanel banners={banners} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
      </div>
    );
  }

  return null;
}

// ─── Trends Panel ──────────────────────────────────────────────────────────────

interface TrendsPanelProps {
  locale: "en" | "he";
  documentText: string;
  salesPageText: string;
  trendTopics: TrendTopic[];
  onTrendTopicsChange: (topics: TrendTopic[]) => void;
  trendSources: TrendSource[];
  onTrendSourcesChange: (sources: TrendSource[]) => void;
  trendInsights: TrendInsights | null;
  onTrendInsightsChange: (insights: TrendInsights | null) => void;
  nodeStatus: Record<string, RunStatus>;
}

function TrendsPanel({
  locale,
  documentText,
  salesPageText,
  trendTopics,
  onTrendTopicsChange,
  trendSources,
  onTrendSourcesChange,
  trendInsights,
  onTrendInsightsChange,
  nodeStatus,
}: TrendsPanelProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [isScouting, setIsScouting] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState("");
  const [newUrlInput, setNewUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [twitterValidation, setTwitterValidation] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [twitterValidationError, setTwitterValidationError] = useState<string | null>(null);
  const twitterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  interface ScoutStep {
    id: string;
    label: string;
    status: "pending" | "active" | "done" | "failed";
    detail?: string;
  }
  const [scoutSteps, setScoutSteps] = useState<ScoutStep[]>([]);

  const hasDocument = Boolean(documentText.trim());
  const hasTopics = trendTopics.length > 0;

  const sourceLabel = useCallback((type: TrendSource["type"]): string => {
    switch (type) {
      case "google_trends": return panelT(locale, "trendsGoogleTrends");
      case "reddit": return panelT(locale, "trendsReddit");
      case "news": return panelT(locale, "trendsNews");
      case "twitter": return panelT(locale, "trendsTwitter");
      case "custom_url": return panelT(locale, "trendsCustomUrls");
    }
  }, [locale]);

  const handleExtractTopics = useCallback(async () => {
    if (!hasDocument) return;
    setIsExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/trends/extract-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText, salesPageText, locale }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to extract topics");
      }
      const data = (await res.json()) as { topics: TrendTopic[] };
      const manual = trendTopics.filter((t) => t.source === "manual");
      onTrendTopicsChange([...data.topics, ...manual]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to extract topics");
    } finally {
      setIsExtracting(false);
    }
  }, [hasDocument, documentText, salesPageText, trendTopics, onTrendTopicsChange]);

  const handleScout = useCallback(async () => {
    if (!hasTopics) return;
    setIsScouting(true);
    setError(null);
    setScoutSteps([]);

    try {
      const res = await fetch("/api/trends/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topics: trendTopics.map((t) => t.keyword),
          sources: trendSources,
          locale,
          documentText,
          salesPageText,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Scouting failed");
      }

      await consumeScoutStream(res, {
        onSourceStart: (index, label) => {
          setScoutSteps((prev) => [
            ...prev,
            {
              id: `source-${index}`,
              label: panelT(locale, "trendsScoutSourceScanning").replace("{{source}}", label),
              status: "active",
            },
          ]);
        },
        onSourceDone: (index, label, _type, count, failed) => {
          setScoutSteps((prev) =>
            prev.map((s) =>
              s.id === `source-${index}`
                ? {
                    ...s,
                    status: failed ? "failed" as const : "done" as const,
                    label: failed
                      ? panelT(locale, "trendsScoutSourceFailed").replace("{{source}}", label)
                      : panelT(locale, "trendsScoutSourceDone")
                          .replace("{{source}}", label)
                          .replace("{{count}}", String(count)),
                  }
                : s
            )
          );
        },
        onAnalyzing: () => {
          setScoutSteps((prev) => [
            ...prev,
            { id: "analyze", label: panelT(locale, "trendsScoutAnalyzing"), status: "active" },
          ]);
        },
        onDone: (insights) => {
          setScoutSteps((prev) =>
            prev.map((s) => s.status === "active" ? { ...s, status: "done" as const } : s)
          );
          onTrendInsightsChange(insights);
        },
        onError: (errMsg) => {
          setError(errMsg);
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scouting failed");
    } finally {
      setIsScouting(false);
    }
  }, [hasTopics, trendTopics, trendSources, locale, documentText, salesPageText, onTrendInsightsChange]);

  const addManualTopic = useCallback(() => {
    const keyword = newTopicInput.trim();
    if (!keyword) return;
    if (trendTopics.some((t) => t.keyword.toLowerCase() === keyword.toLowerCase())) return;
    onTrendTopicsChange([...trendTopics, { keyword, source: "manual" }]);
    setNewTopicInput("");
  }, [newTopicInput, trendTopics, onTrendTopicsChange]);

  const removeTopic = useCallback((index: number) => {
    onTrendTopicsChange(trendTopics.filter((_, i) => i !== index));
  }, [trendTopics, onTrendTopicsChange]);

  const toggleSource = useCallback((type: TrendSource["type"]) => {
    onTrendSourcesChange(
      trendSources.map((s) => s.type === type ? { ...s, enabled: !s.enabled } : s)
    );
  }, [trendSources, onTrendSourcesChange]);

  const updateSourceConfig = useCallback((type: TrendSource["type"], config: TrendSource["config"]) => {
    onTrendSourcesChange(
      trendSources.map((s) => s.type === type ? { ...s, config: { ...s.config, ...config } } : s)
    );
  }, [trendSources, onTrendSourcesChange]);

  const addCustomUrl = useCallback(() => {
    const url = newUrlInput.trim();
    if (!url) return;
    const customSrc = trendSources.find((s) => s.type === "custom_url");
    const existing = customSrc?.config?.urls ?? [];
    if (existing.includes(url)) return;
    updateSourceConfig("custom_url", { urls: [...existing, url] });
    setNewUrlInput("");
  }, [newUrlInput, trendSources, updateSourceConfig]);

  const removeCustomUrl = useCallback((index: number) => {
    const customSrc = trendSources.find((s) => s.type === "custom_url");
    const urls = (customSrc?.config?.urls ?? []).filter((_, i) => i !== index);
    updateSourceConfig("custom_url", { urls });
  }, [trendSources, updateSourceConfig]);

  const verifyTwitterToken = useCallback(async (token: string) => {
    if (!token.trim()) return;
    setTwitterValidation("checking");
    setTwitterValidationError(null);
    try {
      const res = await fetch("/api/trends/validate-twitter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bearerToken: token }),
      });
      const json = await res.json();
      if (json.valid) {
        setTwitterValidation("valid");
      } else {
        setTwitterValidation("invalid");
        setTwitterValidationError(json.error ?? null);
      }
    } catch {
      setTwitterValidation("invalid");
      setTwitterValidationError("Network error");
    }
  }, []);

  const twitterToken = trendSources.find((s) => s.type === "twitter")?.config?.bearerToken ?? "";
  useEffect(() => {
    if (twitterDebounceRef.current) clearTimeout(twitterDebounceRef.current);
    if (!twitterToken.trim()) {
      setTwitterValidation("idle");
      setTwitterValidationError(null);
      return;
    }
    setTwitterValidation("idle");
    twitterDebounceRef.current = setTimeout(() => {
      verifyTwitterToken(twitterToken);
    }, 800);
    return () => { if (twitterDebounceRef.current) clearTimeout(twitterDebounceRef.current); };
  }, [twitterToken, verifyTwitterToken]);

  const sortedSources = useMemo(
    () => [...trendSources].sort((a, b) => {
      if (a.type === "custom_url") return 1;
      if (b.type === "custom_url") return -1;
      return 0;
    }),
    [trendSources]
  );

  const inputSm = "rounded-[var(--panel-radius)] border border-[var(--border-default)] bg-[var(--surface-panel)] px-3 py-2 text-[var(--foreground)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent";

  const uniqueSources = useMemo(
    () => trendInsights
      ? [...new Set(trendInsights.results.map((r) => r.source))]
      : [],
    [trendInsights]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex flex-col gap-[var(--panel-gap)] panel-content-text flex-1 min-h-0 overflow-auto">
        <Accordion defaultValue={[...(trendInsights ? ["results"] : [])]}>
          {/* Topics section — collapsed by default, badge shows count */}
          <AccordionItem value="topics">
            <AccordionTrigger>
              {panelT(locale, "trendsTopics")}
              {isExtracting && <CircleNotch size={14} weight="bold" className="ml-2 animate-spin text-teal-500" />}
              {hasTopics && !isExtracting && (
                <span className="ml-2 rounded-full bg-teal-100 dark:bg-teal-900/40 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:text-teal-300">
                  {trendTopics.length}
                </span>
              )}
            </AccordionTrigger>
            <AccordionContent>
              {hasTopics && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {trendTopics.map((topic, i) => (
                    <span
                      key={`${topic.keyword}-${i}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                        topic.source === "auto"
                          ? "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                      )}
                    >
                      {topic.keyword}
                      <button
                        type="button"
                        onClick={() => removeTopic(i)}
                        className="ml-0.5 h-4 w-4 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center text-[10px] font-bold"
                        aria-label={`Remove ${topic.keyword}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTopicInput}
                  onChange={(e) => setNewTopicInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManualTopic(); } }}
                  placeholder={panelT(locale, "trendsAddTopic")}
                  className={cn("flex-1 text-sm", inputSm)}
                />
                <Button type="button" variant="secondary" onClick={addManualTopic} disabled={!newTopicInput.trim()}>
                  +
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Sources section — collapsed by default, badge shows enabled count */}
          <AccordionItem value="sources">
            <AccordionTrigger>
              {panelT(locale, "trendsSources")}
              <span className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                {trendSources.filter((s) => s.enabled).length}/{trendSources.length}
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {sortedSources.map((src) => (
                  <div key={src.type}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={src.enabled}
                        onChange={() => toggleSource(src.type)}
                        className="rounded border-[var(--border-default)] text-accent focus:ring-accent"
                      />
                      <span className="text-sm font-medium text-[var(--foreground)]">{sourceLabel(src.type)}</span>
                    </label>

                    {src.type === "twitter" && src.enabled && (
                      <div className="mt-2 ml-6">
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{panelT(locale, "trendsTwitterToken")}</label>
                        <input
                          type="password"
                          value={src.config?.bearerToken ?? ""}
                          onChange={(e) => updateSourceConfig("twitter", { bearerToken: e.target.value })}
                          placeholder={panelT(locale, "trendsTwitterTokenPlaceholder")}
                          className={cn("w-full text-xs", inputSm)}
                        />
                        {twitterValidation === "checking" && (
                          <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 animate-pulse">{panelT(locale, "trendsTwitterVerifying")}</p>
                        )}
                        {twitterValidation === "valid" && (
                          <p className="mt-1 text-[10px] font-medium text-green-600 dark:text-green-400">✓ {panelT(locale, "trendsTwitterValid")}</p>
                        )}
                        {twitterValidation === "invalid" && (
                          <p className="mt-1 text-[10px] font-medium text-red-500 dark:text-red-400">✗ {twitterValidationError ?? panelT(locale, "trendsTwitterInvalid")}</p>
                        )}
                        {twitterValidation === "idle" && (
                          <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{panelT(locale, "trendsTwitterTokenHint")}</p>
                        )}
                      </div>
                    )}

                    {src.type === "custom_url" && src.enabled && (
                      <div className="mt-2 ml-6 space-y-2">
                        {(src.config?.urls ?? []).map((url, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="flex-1 text-xs text-slate-600 dark:text-slate-400 truncate">{url}</span>
                            <button
                              type="button"
                              onClick={() => removeCustomUrl(i)}
                              className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-300 font-bold"
                              aria-label={`Remove ${url}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={newUrlInput}
                            onChange={(e) => setNewUrlInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomUrl(); } }}
                            placeholder={panelT(locale, "trendsUrlsPlaceholder")}
                            className={cn("flex-1 text-xs", inputSm)}
                          />
                          <Button type="button" variant="secondary" onClick={addCustomUrl} disabled={!newUrlInput.trim()}>
                            {panelT(locale, "trendsAddUrl")}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {error && (
                <p className="mt-3 text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Results section — open by default when results exist */}
          <AccordionItem value="results">
            <AccordionTrigger>
              {trendInsights ? panelT(locale, "trendsSummary") : panelT(locale, "trendsRawResults")}
              {trendInsights && (
                <span className="ml-2 rounded-full bg-teal-100 dark:bg-teal-900/40 px-2 py-0.5 text-[11px] font-medium text-teal-700 dark:text-teal-300">
                  {trendInsights.trendingAngles.length}
                </span>
              )}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-3">
              {(isScouting || nodeStatus.trends === "running") && (
                <div className="rounded-[var(--panel-radius)] border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 space-y-2">
                  {scoutSteps.length === 0 && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                      <span className="text-sm text-amber-700 dark:text-amber-300">{panelT(locale, "trendsScoutFetching")}</span>
                    </div>
                  )}
                  {scoutSteps.map((step) => (
                    <div key={step.id} className="flex items-center gap-2 text-sm">
                      {step.status === "active" && (
                        <span className="inline-block h-3 w-3 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                      )}
                      {step.status === "done" && (
                        <span className="text-green-500 text-xs font-bold">✓</span>
                      )}
                      {step.status === "failed" && (
                        <span className="text-red-400 text-xs font-bold">✗</span>
                      )}
                      <span className={cn(
                        step.status === "active" && "text-teal-700 dark:text-teal-300",
                        step.status === "done" && "text-slate-500 dark:text-slate-400",
                        step.status === "failed" && "text-red-500 dark:text-red-400",
                      )}>{step.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {!trendInsights && !isScouting && (
                <div className="rounded-[var(--panel-radius)] border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] p-6 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">{panelT(locale, "trendsNoResults")}</p>
                </div>
              )}

              {trendInsights && !isScouting && (
                <div className="flex flex-col gap-3">
                  {trendInsights.summary && (
                    <div className="rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/20 p-3">
                      <p className="text-sm text-[var(--foreground)] leading-relaxed">{trendInsights.summary}</p>
                    </div>
                  )}

                  {trendInsights.trendingAngles.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wide mb-3">
                        {panelT(locale, "trendsTrendingAngles")} ({trendInsights.trendingAngles.length})
                      </h4>
                      <div className="space-y-3">
                        {trendInsights.trendingAngles.map((angle, i) => {
                          const isObj = typeof angle === "object" && angle !== null;
                          const hook = isObj ? (angle as TrendAngle).hook : String(angle);
                          const sourceTrend = isObj ? (angle as TrendAngle).sourceTrend : "";
                          const connection = isObj ? (angle as TrendAngle).connection : "";
                          const hasDetails = sourceTrend || connection;

                          return (
                            <div
                              key={i}
                              className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden"
                            >
                              <div className="px-3 py-2.5 bg-teal-50/60 dark:bg-teal-950/30">
                                <div className="flex items-start gap-2">
                                  <span className="text-teal-500 font-bold shrink-0 text-sm leading-5">→</span>
                                  <p className="text-sm font-medium text-[var(--foreground)] leading-5">{hook}</p>
                                </div>
                              </div>
                              {hasDetails && (
                                <div className="px-3 py-2 space-y-1.5">
                                  {sourceTrend && (
                                    <div>
                                      <span className="text-[10px] uppercase font-semibold tracking-wide text-amber-600 dark:text-amber-400">
                                        {panelT(locale, "trendsSourceTrend")}
                                      </span>
                                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">{sourceTrend}</p>
                                    </div>
                                  )}
                                  {connection && (
                                    <div>
                                      <span className="text-[10px] uppercase font-semibold tracking-wide text-violet-600 dark:text-violet-400">
                                        {panelT(locale, "trendsConnection")}
                                      </span>
                                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">{connection}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-[var(--border-default)]">
                    <span>
                      {panelT(locale, "trendsResultCount")
                        .replace("{{count}}", String(trendInsights.results.length))
                        .replace("{{sources}}", String(uniqueSources.length))}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleScout}
                      disabled={!hasTopics || isScouting || trendSources.every((s) => !s.enabled)}
                      className="text-xs"
                    >
                      {panelT(locale, "trendsReScout")}
                    </Button>
                  </div>

                  {trendInsights.results.length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-xs font-medium text-accent hover:underline">
                        {panelT(locale, "trendsRawResults")} ({trendInsights.results.length})
                      </summary>
                      <ul className="mt-2 space-y-2 max-h-60 overflow-auto">
                        {trendInsights.results.slice(0, 30).map((r, i) => (
                          <li key={i} className="rounded border border-[var(--border-default)] bg-[var(--surface-card)] p-2.5">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[10px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {r.source}
                              </span>
                              {r.url && (
                                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent hover:underline truncate max-w-[180px]">
                                  {r.url}
                                </a>
                              )}
                            </div>
                            <p className="text-xs font-medium text-[var(--foreground)]">{r.title}</p>
                            {r.snippet && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{r.snippet}</p>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
