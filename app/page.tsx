"use client";

import { useCallback, useState, useMemo, useEffect, useRef, use, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PipelineCanvas } from "@/components/PipelineCanvas";
import { ResultPanel } from "@/components/panels/ResultPanel";
import { PanelDrawer } from "@/components/PanelDrawer";
import { Onboarding } from "@/components/Onboarding";
import { useFullScreenLayout } from "@/components/FullScreenLayoutContext";
import { Button } from "@/components/ui/Button";
import { useThemeAndLocale } from "@/components/ThemeAndLocaleProvider";
import { t } from "@/lib/translations";
import { loadVault, saveVault } from "@/lib/vault";
import { compositeLogoOntoBanner } from "@/lib/compositeLogo";
import { loadLibrary, addToLibrary } from "@/lib/bannerLibrary";
import type { ExtractResult, CopyVariation, BannerConcept, GeneratedBanner, GenerationStyle } from "@/types/pipeline";
import type { PipelineNodeData } from "@/components/nodes/PipelineNode";

const NODE_IDS = ["upload", "extract", "copy", "concepts", "generate", "gallery"] as const;

/** Max banners per run. Loop generates this many, one at a time with pause, to avoid rate limits. */
const MAX_BANNERS_PER_RUN = 15;

/** Backoff wait times in seconds when API returns 429. */
const RATE_LIMIT_BACKOFF_SECONDS = [60, 120, 180];

function isRateLimitResponse(res: Response, body: { error?: string | { code?: number; message?: string } }): boolean {
  if (res.status === 429) return true;
  const err = body?.error;
  const msg = typeof err === "string" ? err : err?.message ?? "";
  const code = typeof err === "object" && err !== null ? (err as { code?: number }).code : undefined;
  return code === 429 || msg.includes("429") || msg.includes("Resource exhausted") || msg.includes("RESOURCE_EXHAUSTED");
}

async function fetchWith429Retry(
  url: string,
  options: RequestInit,
  onWaiting?: (attempt: number, waitSeconds: number) => void
): Promise<Response> {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, options);
    const text = await res.text();
    let body: { error?: string | { code?: number; message?: string } } = {};
    try {
      body = JSON.parse(text) as { error?: string | { code?: number; message?: string } };
    } catch {
      /* non-JSON response */
    }
    const rateLimited = isRateLimitResponse(res, body);
    if (!rateLimited || attempt >= RATE_LIMIT_BACKOFF_SECONDS.length) {
      return new Response(text, { status: res.status, headers: res.headers });
    }
    const waitSec = RATE_LIMIT_BACKOFF_SECONDS[attempt];
    onWaiting?.(attempt + 1, waitSec);
    await new Promise((r) => setTimeout(r, waitSec * 1000));
    attempt++;
  }
}


type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  params?: Promise<Record<string, string | string[]>>;
};

/** Wrapper so Next.js 15 Promise props are unwrapped and stripped before dev tools (e.g. Cursor) enumerate props. */
function PageWrapper(props: PageProps) {
  const paramsPromise = props.params;
  const searchParamsPromise = props.searchParams;
  try {
    const mutable = props as Record<string, unknown>;
    if ("params" in mutable) delete mutable.params;
    if ("searchParams" in mutable) delete mutable.searchParams;
  } catch {
    // props may be frozen
  }
  if (paramsPromise != null) use(paramsPromise);
  if (searchParamsPromise != null) use(searchParamsPromise);
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-[var(--background)]" aria-busy="true" aria-label="Loading">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      }
    >
      <Home />
    </Suspense>
  );
}

export default PageWrapper;

function Home() {
  const { locale } = useThemeAndLocale();
  const { setFullScreen } = useFullScreenLayout();
  const searchParams = useSearchParams();
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const forceOnboarding = searchParams.get("forceOnboarding") === "1";
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("upload");
  const [documentText, setDocumentText] = useState("");
  const [salesPageUrl, setSalesPageUrl] = useState("");
  const [salesPageText, setSalesPageText] = useState("");
  const [brandLogo, setBrandLogo] = useState<string | null>(null);
  const [brandColors, setBrandColors] = useState<string[]>(["", ""]);
  const [referenceBanners, setReferenceBanners] = useState<string[]>([]);
  const [generationStyle, setGenerationStyle] = useState<GenerationStyle>("typography");
  const [infographicTopicHeadline, setInfographicTopicHeadline] = useState("");
  const vaultRestoredRef = useRef(false);

  // App gate: show onboarding if setup not complete
  useEffect(() => {
    fetch("/api/setup")
      .then((res) => res.json())
      .then((data: { completedAt?: string }) => {
        setSetupComplete(Boolean(data?.completedAt));
      })
      .catch(() => setSetupComplete(false));
  }, []);

  // Hide sidebar during onboarding (or when ?forceOnboarding=1)
  useEffect(() => {
    setFullScreen(forceOnboarding || setupComplete === false);
    return () => setFullScreen(false);
  }, [forceOnboarding, setupComplete, setFullScreen]);

  // Restore vault from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    const v = loadVault();
    setDocumentText(v.documentText);
    setSalesPageUrl(v.salesPageUrl);
    setSalesPageText(v.salesPageText);
    setBrandLogo(v.brandLogo);
    setBrandColors(v.brandColors.length ? v.brandColors : ["", ""]);
    setReferenceBanners(v.referenceBanners);
    setGenerationStyle(v.generationStyle ?? "typography");
    // Mark restore as done only after state has committed, so the persist effect
    // doesn't run with empty state and overwrite the vault in the same tick.
    const t = setTimeout(() => {
      vaultRestoredRef.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Persist vault when user changes anything (only after restore so we don't overwrite with empty)
  useEffect(() => {
    if (!vaultRestoredRef.current) return;
    saveVault({
      documentText,
      salesPageUrl,
      salesPageText,
      brandLogo,
      brandColors,
      referenceBanners,
      generationStyle,
    });
  }, [documentText, salesPageUrl, salesPageText, brandLogo, brandColors, referenceBanners, generationStyle]);

  // Load banner library (last 30 days) on mount
  useEffect(() => {
    setBanners(loadLibrary());
  }, []);

  const [imageGenerationCount, setImageGenerationCount] = useState(1);
  const [imageGenerationDelaySeconds, setImageGenerationDelaySeconds] = useState(3);
  const [insights, setInsights] = useState<ExtractResult | null>(null);
  const [copyVariations, setCopyVariations] = useState<CopyVariation[]>([]);
  const [concepts, setConcepts] = useState<BannerConcept[]>([]);
  const [banners, setBanners] = useState<GeneratedBanner[]>([]);
  const [currentRunBanners, setCurrentRunBanners] = useState<GeneratedBanner[]>([]);
  const [nodeStatus, setNodeStatus] = useState<Record<string, "idle" | "running" | "success" | "error">>({
    upload: "idle",
    extract: "idle",
    copy: "idle",
    concepts: "idle",
    generate: "idle",
    gallery: "idle",
  });
  const [nodeSummaries, setNodeSummaries] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const setNode = useCallback((id: string, status: "idle" | "running" | "success" | "error", summary?: string) => {
    setNodeStatus((s) => ({ ...s, [id]: status }));
    if (summary !== undefined) {
      setNodeSummaries((s) => ({ ...s, [id]: summary }));
    }
  }, []);

  const nodeData = useMemo(() => {
    const d: Partial<Record<string, Partial<PipelineNodeData>>> = {};
    NODE_IDS.forEach((id) => {
      d[id] = { status: nodeStatus[id], summary: nodeSummaries[id] };
    });
    return d;
  }, [nodeStatus, nodeSummaries]);

  const runPipeline = useCallback(async () => {
    setError(null);
    if (!documentText.trim()) {
      setError("Upload or paste an Avatar document first.");
      return;
    }
    setCurrentRunBanners([]);
    setIsRunning(true);
    try {
      setNode("extract", "running");
      const extRes = await fetchWith429Retry(
        "/api/extract",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: documentText,
            ...(salesPageText.trim() ? { salesPageText: salesPageText.trim() } : {}),
          }),
        },
        (attempt, sec) => setNode("extract", "running", `Rate limited. Waiting ${sec}s (retry ${attempt})…`)
      );
      if (!extRes.ok) {
        const err = await extRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? extRes.statusText);
      }
      const extJson = (await extRes.json()) as ExtractResult;
      setInsights(extJson);
      setNode("extract", "success", `${extJson.painPoints.length} pain points, ${extJson.usps.length} USPs`);

      setNode("copy", "running");
      const copyRes = await fetchWith429Retry(
        "/api/copy",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ insights: extJson }),
        },
        (attempt, sec) => setNode("copy", "running", `Rate limited. Waiting ${sec}s (retry ${attempt})…`)
      );
      if (!copyRes.ok) {
        const err = await copyRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? copyRes.statusText);
      }
      const copyJson = (await copyRes.json()) as { variations: CopyVariation[] };
      setCopyVariations(copyJson.variations ?? []);
      setNode("copy", "success", `${(copyJson.variations ?? []).length} variations`);

      // Loop between last 2 nodes: request exactly N concepts, then generate N banners (one per concept).
      const count = Math.min(Math.max(1, imageGenerationCount), MAX_BANNERS_PER_RUN);

      setNode("concepts", "running");
      const conceptsRes = await fetchWith429Retry(
        "/api/concepts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            insights: extJson,
            copySample: copyJson.variations?.slice(0, 5) ?? [],
            count,
            brandColors: brandColors.filter((c) => c.trim()),
            hasReferenceBanners: referenceBanners.length > 0,
            style: generationStyle,
          }),
        },
        (attempt, sec) => setNode("concepts", "running", `Rate limited. Waiting ${sec}s (retry ${attempt})…`)
      );
      if (!conceptsRes.ok) {
        const err = await conceptsRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? conceptsRes.statusText);
      }
      const conceptsJson = (await conceptsRes.json()) as { concepts: BannerConcept[] };
      const conceptList = conceptsJson.concepts ?? [];
      setConcepts(conceptList);
      setNode("concepts", "success", `${conceptList.length} concepts`);

      if (conceptList.length === 0) {
        throw new Error("No concepts to generate from.");
      }

      const minDelaySeconds = count > 1 ? 10 : 0;
      const delaySeconds = Math.max(minDelaySeconds, Math.max(0, imageGenerationDelaySeconds));
      const delayMs = delaySeconds * 1000;
      const generated: GeneratedBanner[] = [];

      const fetchImageWithRetry = async (concept: BannerConcept, headline: string | undefined): Promise<{ image: string }> => {
        const res = await fetchWith429Retry(
          "/api/generate-image",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              concept,
              headline,
              brandColors: brandColors.filter((c) => c.trim()),
              referenceImages: referenceBanners.length > 0 ? referenceBanners : undefined,
              style: generationStyle,
            }),
          },
          (attempt, sec) => setNode("generate", "running", `Rate limited. Waiting ${sec}s (retry ${attempt})…`)
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string })?.error ?? res.statusText);
        }
        return res.json() as Promise<{ image: string }>;
      };

      // Generate one banner per concept (loop between concepts and generate nodes).
      for (let i = 0; i < count; i++) {
        setNode("generate", "running", `Generating ${i + 1} of ${count}…`);
        const concept = conceptList[i % conceptList.length];
        const headline = copyJson.variations?.[i % (copyJson.variations?.length ?? 1)]?.headline;
        const imgJson = await fetchImageWithRetry(concept, headline);
        let imageBase64 = imgJson.image;
        if (brandLogo) {
          try {
            imageBase64 = await compositeLogoOntoBanner(imgJson.image, brandLogo);
          } catch {
            imageBase64 = imgJson.image;
          }
        }
        generated.push({
          id: `banner-${i}-${Date.now()}`,
          imageBase64,
          conceptIndex: i,
          copySnippet: headline,
          createdAt: Date.now(),
        });
        if (i < count - 1 && delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
      const library = addToLibrary(generated);
      setCurrentRunBanners(generated);
      setBanners(library);
      setNode("generate", "success", `${generated.length} banners`);
      setNode("gallery", "success", `${library.length} in library`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Pipeline failed";
      setError(msg);
      setNode("extract", "error");
      setNode("copy", "error");
      setNode("concepts", "error");
      setNode("generate", "error");
    } finally {
      setIsRunning(false);
    }
  }, [documentText, salesPageText, brandLogo, brandColors, referenceBanners, generationStyle, imageGenerationCount, imageGenerationDelaySeconds, setNode]);

  const [isRunningInfographic, setIsRunningInfographic] = useState(false);
  const runInfographicVariations = useCallback(async () => {
    setError(null);
    if (referenceBanners.length === 0) {
      setError("Upload at least one reference image for infographic variations.");
      return;
    }
    setCurrentRunBanners([]);
    setIsRunningInfographic(true);
    try {
      const count = Math.min(Math.max(1, imageGenerationCount), MAX_BANNERS_PER_RUN);
      const delayMs = Math.max(10, imageGenerationDelaySeconds) * 1000;
      let descriptionFromRef: string | undefined;
      try {
        const describeRes = await fetchWith429Retry("/api/describe-reference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referenceImages: referenceBanners,
            imageCount: count,
          }),
        });
        if (describeRes.ok) {
          const desc = (await describeRes.json()) as {
            styleSummary?: string;
            structureSummary?: string;
            suggestedVariationTopics?: string[];
          };
          const parts: string[] = [];
          if (desc.styleSummary) parts.push(desc.styleSummary);
          if (desc.structureSummary) parts.push(desc.structureSummary);
          if (parts.length) descriptionFromRef = parts.join(" ");
        }
      } catch {
        // optional step; continue without description
      }
      const generated: GeneratedBanner[] = [];
      const topicOrHeadline = infographicTopicHeadline.trim() || undefined;
      for (let i = 0; i < count; i++) {
        const headline = topicOrHeadline;
        const res = await fetchWith429Retry(
          "/api/generate-image",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              style: "infographic",
              referenceImages: referenceBanners,
              topic: topicOrHeadline,
              headline,
              brandColors: brandColors.filter((c) => c.trim()),
              descriptionFromRef,
            }),
          },
          () => {}
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string })?.error ?? res.statusText);
        }
        const imgJson = (await res.json()) as { image: string };
        let imageBase64 = imgJson.image;
        if (brandLogo) {
          try {
            imageBase64 = await compositeLogoOntoBanner(imgJson.image, brandLogo);
          } catch {
            imageBase64 = imgJson.image;
          }
        }
        generated.push({
          id: `infographic-${i}-${Date.now()}`,
          imageBase64,
          conceptIndex: i,
          copySnippet: topicOrHeadline,
          createdAt: Date.now(),
        });
        if (i < count - 1 && delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
      const library = addToLibrary(generated);
      setCurrentRunBanners(generated);
      setBanners(library);
      setSelectedNodeId("gallery");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Infographic variations failed");
    } finally {
      setIsRunningInfographic(false);
    }
  }, [referenceBanners, imageGenerationCount, imageGenerationDelaySeconds, infographicTopicHeadline, brandLogo, brandColors]);

  const handleParseDocument = useCallback(
    async (text: string) => {
      setDocumentText(text);
      setNode("upload", "success", `${text.slice(0, 50).replace(/\n/g, " ")}…`);
    },
    [setNode]
  );

  if (setupComplete === null) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--background)]" aria-busy="true" aria-label="Loading">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (forceOnboarding || !setupComplete) {
    return <Onboarding onComplete={() => setSetupComplete(true)} />;
  }

  return (
    <div className="flex h-dvh flex-col bg-[var(--background)]">
      <header className="flex shrink-0 items-center justify-between bg-[var(--surface-panel)] shadow-sm px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <svg className="h-4 w-4 text-accent-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
              {t(locale, "appTitle")}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(locale, "appSubtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300" role="alert">
              {error}
            </div>
          )}
          {!drawerOpen && (
            <Button type="button" variant="secondary" onClick={() => setDrawerOpen(true)}>
              {t(locale, "openPanel")}
            </Button>
          )}
          <Button
            type="button"
            onClick={runPipeline}
            disabled={isRunning}
            aria-label={t(locale, "runPipeline")}
            aria-busy={isRunning}
          >
            {isRunning ? t(locale, "running") : t(locale, "runPipeline")}
          </Button>
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0 bg-[var(--surface-canvas)]">
          <PipelineCanvas
            onNodeSelect={(id) => {
              setSelectedNodeId(id);
              setDrawerOpen(true);
            }}
            selectedNodeId={selectedNodeId}
            nodeData={nodeData}
          />
        </main>
        <PanelDrawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <ResultPanel
            selectedNodeId={selectedNodeId}
            documentText={documentText}
            onDocumentParsed={handleParseDocument}
            salesPageUrl={salesPageUrl}
            onSalesPageUrlChange={setSalesPageUrl}
            salesPageText={salesPageText}
            onSalesPageChange={setSalesPageText}
            brandLogo={brandLogo}
            onBrandLogoChange={setBrandLogo}
            brandColors={brandColors}
            onBrandColorsChange={setBrandColors}
            referenceBanners={referenceBanners}
            onReferenceBannersChange={setReferenceBanners}
            generationStyle={generationStyle}
            onGenerationStyleChange={setGenerationStyle}
            infographicTopicHeadline={infographicTopicHeadline}
            onInfographicTopicHeadlineChange={setInfographicTopicHeadline}
            runInfographicVariations={runInfographicVariations}
            isRunningInfographic={isRunningInfographic}
            imageGenerationCount={imageGenerationCount}
            onImageGenerationCountChange={setImageGenerationCount}
            imageGenerationDelaySeconds={imageGenerationDelaySeconds}
            onImageGenerationDelaySecondsChange={setImageGenerationDelaySeconds}
            insights={insights}
            copyVariations={copyVariations}
            concepts={concepts}
            banners={banners}
            currentRunBanners={currentRunBanners}
          />
        </PanelDrawer>
      </div>
    </div>
  );
}
