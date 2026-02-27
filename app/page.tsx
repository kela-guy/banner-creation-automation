"use client";

import { useCallback, useState, useMemo, useEffect, useRef, use, Suspense, startTransition } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ResultPanel } from "@/components/panels/ResultPanel";
import { PanelDrawer } from "@/components/PanelDrawer";
import { DriveUploadModal } from "@/components/DriveUploadModal";

const PipelineCanvas = dynamic(
  () => import("@/components/PipelineCanvas").then((m) => ({ default: m.PipelineCanvas })),
  { ssr: false }
);

const Onboarding = dynamic(
  () => import("@/components/Onboarding").then((m) => ({ default: m.Onboarding })),
  { ssr: false }
);
import { useFullScreenLayout } from "@/components/FullScreenLayoutContext";
import { useThemeAndLocale } from "@/components/ThemeAndLocaleProvider";
import { t, translations } from "@/lib/translations";
import { cn } from "@/lib/cn";
import { loadVault, saveVault } from "@/lib/vault";


import { loadLibrary, loadLibraryAsync, addToLibrary } from "@/lib/bannerLibrary";
import { PipelineActivityLog } from "@/components/PipelineActivityLog";
import { consumeScoutStream } from "@/lib/consumeScoutStream";
import type { ExtractResult, CopyVariation, BannerConcept, GeneratedBanner, GenerationStyle, BannerTag, HebrewValidationStatus } from "@/types/pipeline";
import type { TrendTopic, TrendSource, TrendInsights } from "@/types/trends";
import { DEFAULT_TREND_SOURCES } from "@/types/trends";
import type { PipelineNodeData } from "@/components/nodes/PipelineNode";

const NODE_IDS = ["upload", "trends", "extract", "copy", "concepts", "generate", "gallery"] as const;

/** Max banners per run. Loop generates this many, one at a time with pause, to avoid rate limits. */
const MAX_BANNERS_PER_RUN = 15;

/** Max reference images sent to generate-image to keep request body under Vercel 4.5MB limit. */
const MAX_REFERENCE_IMAGES_FOR_GENERATE = 2;

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
  const [useTrends, setUseTrends] = useState(true);
  const [useReferenceMode, setUseReferenceMode] = useState(false);
  const [infographicTopicHeadline, setInfographicTopicHeadline] = useState("");
  const [trendTopics, setTrendTopics] = useState<TrendTopic[]>([]);
  const [trendSources, setTrendSources] = useState<TrendSource[]>(DEFAULT_TREND_SOURCES);
  const [trendInsights, setTrendInsights] = useState<TrendInsights | null>(null);
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
    setUseTrends(v.useTrends ?? true);
    setUseReferenceMode(v.useReferenceMode ?? false);
    setTrendTopics(v.trendTopics ?? []);
    setTrendSources(v.trendSources ?? DEFAULT_TREND_SOURCES);
    setTrendInsights(v.trendInsights ?? null);
    // Hydrate banner library from IndexedDB (much larger storage than localStorage)
    loadLibraryAsync().then((idbBanners) => {
      if (idbBanners.length > 0) setBanners(idbBanners);
    });
    // Mark restore as done only after state has committed, so the persist effect
    // doesn't run with empty state and overwrite the vault in the same tick.
    const t = setTimeout(() => {
      vaultRestoredRef.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Persist vault when user changes anything (debounced to avoid blocking main thread on every keystroke)
  useEffect(() => {
    if (!vaultRestoredRef.current) return;
    const id = setTimeout(() => {
      saveVault({
        documentText,
        salesPageUrl,
        salesPageText,
        brandLogo,
        brandColors,
        referenceBanners,
        generationStyle,
        useTrends,
        useReferenceMode,
        trendTopics,
        trendSources,
        trendInsights,
      });
    }, 500);
    return () => clearTimeout(id);
  }, [documentText, salesPageUrl, salesPageText, brandLogo, brandColors, referenceBanners, generationStyle, useTrends, useReferenceMode, trendTopics, trendSources, trendInsights]);

  const [imageGenerationCount, setImageGenerationCount] = useState(1);
  const [insights, setInsights] = useState<ExtractResult | null>(null);
  const [copyVariations, setCopyVariations] = useState<CopyVariation[]>([]);
  const [concepts, setConcepts] = useState<BannerConcept[]>([]);
  const [banners, setBanners] = useState<GeneratedBanner[]>(() => loadLibrary());
  const [currentRunBanners, setCurrentRunBanners] = useState<GeneratedBanner[]>([]);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [nodeStatus, setNodeStatus] = useState<Record<string, "idle" | "running" | "success" | "error">>({
    upload: "idle",
    trends: "idle",
    extract: "idle",
    copy: "idle",
    concepts: "idle",
    generate: "idle",
    gallery: "idle",
  });
  const [nodeSummaries, setNodeSummaries] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 8000);
    return () => clearTimeout(timer);
  }, [error]);

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

  const [isRunningInfographic, setIsRunningInfographic] = useState(false);
  const runInfographicVariations = useCallback(async () => {
    setError(null);
    if (referenceBanners.length === 0) {
      setError("Upload at least one reference image for infographic variations.");
      return;
    }
    setCurrentRunBanners([]);
    setIsRunningInfographic(true);
    setIsRunning(true);
    setNodeStatus({});
    setNodeSummaries({});
    setNode("generate", "running", "Analyzing references…");
    try {
      const count = Math.min(Math.max(1, imageGenerationCount), MAX_BANNERS_PER_RUN);
      const delayMs = 10_000;
      const refsCapped = referenceBanners.slice(0, MAX_REFERENCE_IMAGES_FOR_GENERATE);
      let descriptionFromRef: string | undefined;
      setNode("concepts", "running", "Describing reference style…");
      try {
        const describeRes = await fetchWith429Retry("/api/describe-reference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referenceImages: refsCapped,
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
          setNode("concepts", "success", "Reference analyzed");
        } else {
          setNode("concepts", "success", "Skipped (will generate without analysis)");
        }
      } catch {
        setNode("concepts", "success", "Skipped (will generate without analysis)");
      }
      const generated: GeneratedBanner[] = [];
      const topicOrHeadline = infographicTopicHeadline.trim() || undefined;
      setNode("generate", "running", `Generating ${count} banner${count > 1 ? "s" : ""}…`);
      for (let i = 0; i < count; i++) {
        const headline = topicOrHeadline;
        const res = await fetchWith429Retry(
          "/api/generate-image",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              style: "infographic",
              referenceImages: refsCapped,
              topic: topicOrHeadline,
              headline,
              brandColors: brandColors.filter((c) => c.trim()),
              descriptionFromRef,
            }),
          },
          () => {}
        );
        const text = await res.text();
        if (!res.ok) {
          if (res.status === 413) {
            throw new Error("Request too large. Use fewer or smaller reference images.");
          }
          let errMsg: string;
          try {
            const body = JSON.parse(text) as { error?: string };
            errMsg = body?.error ?? res.statusText;
          } catch {
            errMsg = res.status >= 500 ? "Image generation failed (server error)." : res.statusText;
          }
          throw new Error(errMsg);
        }
        const imgJson = JSON.parse(text) as { image: string };
        let imageBase64 = imgJson.image;
        const hasLogo2 = Boolean(brandLogo);
        if (brandLogo) {
          try {
            const { compositeLogoOntoBanner } = await import("@/lib/compositeLogo");
            imageBase64 = await compositeLogoOntoBanner(imgJson.image, brandLogo);
          } catch {
            imageBase64 = imgJson.image;
          }
        }
        const infraReasoning: string[] = ["Style: Infographic from references"];
        const infraTags: BannerTag[] = [{ label: "infographic", type: "style" }];
        if (topicOrHeadline) {
          infraReasoning.push(`Topic: ${topicOrHeadline.slice(0, 60)}`);
          infraTags.push({ label: topicOrHeadline.slice(0, 40), type: "meta" });
        }
        if (descriptionFromRef) infraReasoning.push(`Ref analysis: ${descriptionFromRef.slice(0, 80)}…`);
        infraReasoning.push(`${refsCapped.length} reference image(s)`);
        if (brandColors.some((c) => c.trim())) infraReasoning.push(`Brand colors: ${brandColors.filter((c) => c.trim()).join(", ")}`);
        if (hasLogo2) infraReasoning.push("Logo composited");

        generated.push({
          id: `infographic-${i}-${Date.now()}`,
          imageBase64,
          conceptIndex: i,
          copySnippet: topicOrHeadline,
          reasoning: infraReasoning,
          tags: infraTags,
          createdAt: Date.now(),
        });
        setNode("generate", "running", `Generated ${i + 1}/${count} banner${count > 1 ? "s" : ""}…`);
        if (i < count - 1 && delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
      setNode("generate", "success", `${generated.length} banner${generated.length > 1 ? "s" : ""} created`);
      setNode("gallery", "success");
      const library = await addToLibrary(generated);
      startTransition(() => {
        setCurrentRunBanners(generated);
        setBanners(library);
        setSelectedNodeId("gallery");
        setDrawerOpen(true);
        setShowDriveModal(true);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Infographic variations failed");
      setNode("generate", "error", e instanceof Error ? e.message : "Failed");
    } finally {
      setIsRunningInfographic(false);
      setIsRunning(false);
    }
  }, [referenceBanners, imageGenerationCount, infographicTopicHeadline, brandLogo, brandColors, setNode]);

  const runPipeline = useCallback(async () => {
    setError(null);

    if (useReferenceMode) {
      if (referenceBanners.length === 0) {
        setError("Upload reference banners first.");
        return;
      }
      runInfographicVariations();
      return;
    }

    if (!documentText.trim()) {
      setError("Upload or paste an Avatar document first.");
      return;
    }
    setCurrentRunBanners([]);
    setIsRunning(true);
    setNodeStatus({});
    setNodeSummaries({});
    try {
      // ── Trends step: skip in "text" mode, run in "trends" / "combined" ──
      let currentTrendInsights = trendInsights;
      if (useTrends && trendTopics.length > 0 && trendSources.some((s) => s.enabled)) {
        setNode("trends", "running", "Scouting trends…");
        try {
          let topicsToScout = trendTopics;
          if (topicsToScout.length === 0 && documentText.trim()) {
            const topicRes = await fetchWith429Retry(
              "/api/trends/extract-topics",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ documentText, salesPageText, locale }),
              },
              (attempt, sec) => setNode("trends", "running", `Rate limited. Waiting ${sec}s (retry ${attempt})…`)
            );
            if (topicRes.ok) {
              const topicJson = (await topicRes.json()) as { topics: TrendTopic[] };
              topicsToScout = topicJson.topics ?? [];
              setTrendTopics(topicsToScout);
            }
          }

          if (topicsToScout.length > 0) {
            const scoutRes = await fetch("/api/trends/scout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                topics: topicsToScout.map((t) => t.keyword),
                sources: trendSources,
                locale,
                documentText,
                salesPageText,
              }),
            });
            if (scoutRes.ok && scoutRes.body) {
              const insights = await consumeScoutStream(scoutRes, {
                onSourceStart: (_i, label) => setNode("trends", "running", `Scanning ${label}…`),
                onSourceDone: (_i, label, _t, count) => setNode("trends", "running", `${label}: ${count} results`),
                onAnalyzing: () => setNode("trends", "running", "Connecting trends to product…"),
              });
              if (insights) {
                currentTrendInsights = insights;
                setTrendInsights(insights);
                setNode("trends", "success", `${insights.results.length} results, ${insights.trendingAngles.length} angles`);
              } else {
                setNode("trends", "error", "Scout failed");
              }
            } else {
              setNode("trends", "error", "Scout failed");
            }
          } else {
            setNode("trends", "success", "No topics to scout");
          }
        } catch {
          setNode("trends", "error", "Trend scouting failed");
        }
      } else {
        setNode("trends", "success", "Skipped");
      }

      setNode("extract", "running");
      const trendContext = currentTrendInsights?.summary
        ? { trendContext: currentTrendInsights.summary, trendingAngles: currentTrendInsights.trendingAngles }
        : {};

      const extRes = await fetchWith429Retry(
        "/api/extract",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: documentText,
            ...(salesPageText.trim() ? { salesPageText: salesPageText.trim() } : {}),
            ...trendContext,
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
          body: JSON.stringify({
            insights: extJson,
            ...trendContext,
          }),
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
            ...trendContext,
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

      const delayMs = count > 1 ? 10_000 : 0;
      const generated: GeneratedBanner[] = [];

      const referenceImagesForRequest =
        referenceBanners.length > 0
          ? referenceBanners.slice(0, MAX_REFERENCE_IMAGES_FOR_GENERATE)
          : undefined;

      const MAX_HEBREW_RETRIES = 2;

      const fetchImage = async (
        concept: BannerConcept,
        headline: string | undefined,
        overridePrompt?: string
      ): Promise<{ image: string }> => {
        const payload: Record<string, unknown> = {
          concept,
          headline,
          brandColors: brandColors.filter((c) => c.trim()),
          referenceImages: referenceImagesForRequest,
          style: generationStyle,
        };
        if (overridePrompt) payload.prompt = overridePrompt;
        const res = await fetchWith429Retry(
          "/api/generate-image",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
          (attempt, sec) => setNode("generate", "running", `Rate limited. Waiting ${sec}s (retry ${attempt})…`)
        );
        const text = await res.text();
        if (!res.ok) {
          if (res.status === 413) {
            throw new Error("Request too large. Use fewer or smaller reference images.");
          }
          let errMsg: string;
          try {
            const body = JSON.parse(text) as { error?: string };
            errMsg = body?.error ?? res.statusText;
          } catch {
            errMsg = res.status >= 500 ? "Image generation failed (server error)." : res.statusText;
          }
          throw new Error(errMsg);
        }
        return JSON.parse(text) as { image: string };
      };

      const validateHebrew = async (
        imageBase64: string,
        expectedText: string
      ): Promise<{ match: boolean; readText: string; confidence: string }> => {
        try {
          const res = await fetch("/api/validate-hebrew", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: imageBase64, expectedText }),
          });
          if (!res.ok) return { match: false, readText: "", confidence: "low" };
          return await res.json() as { match: boolean; readText: string; confidence: string };
        } catch {
          return { match: false, readText: "", confidence: "low" };
        }
      };

      for (let i = 0; i < count; i++) {
        setNode("generate", "running", `Generating ${i + 1} of ${count}…`);
        const concept = conceptList[i % conceptList.length];
        const copyVar = copyJson.variations?.[i % (copyJson.variations?.length ?? 1)];
        const headline = copyVar?.headline;

        let imgJson = await fetchImage(concept, headline);
        let imageBase64 = imgJson.image;
        let validationStatus: HebrewValidationStatus = "skipped";

        if (headline) {
          const { getImagePrompt, wrapRetryPrompt } = await import("@/lib/prompts");
          let bestImage = imageBase64;
          let validated = false;

          for (let attempt = 0; attempt <= MAX_HEBREW_RETRIES; attempt++) {
            setNode(
              "generate",
              "running",
              attempt === 0
                ? `Verifying Hebrew text (${i + 1}/${count})…`
                : `Retry ${attempt}/${MAX_HEBREW_RETRIES} — fixing Hebrew (${i + 1}/${count})…`
            );

            const validation = await validateHebrew(imageBase64, headline);

            if (validation.match) {
              bestImage = imageBase64;
              validated = true;
              break;
            }

            bestImage = imageBase64;

            if (attempt < MAX_HEBREW_RETRIES) {
              const basePrompt = getImagePrompt(concept, headline, brandColors.filter((c) => c.trim()));
              const retryPrompt = wrapRetryPrompt(basePrompt, headline, attempt + 1, validation.readText);
              setNode("generate", "running", `Re-generating with corrected Hebrew (${i + 1}/${count}, attempt ${attempt + 2})…`);
              const retryJson = await fetchImage(concept, headline, retryPrompt);
              imageBase64 = retryJson.image;
            }
          }

          imageBase64 = bestImage;
          validationStatus = validated ? "verified" : "unverified";
        }

        const hasLogo = Boolean(brandLogo);
        if (brandLogo) {
          try {
            const { compositeLogoOntoBanner } = await import("@/lib/compositeLogo");
            imageBase64 = await compositeLogoOntoBanner(imageBase64, brandLogo);
          } catch {
            /* keep imageBase64 as-is */
          }
        }

        const reasoning: string[] = [];
        const tags: BannerTag[] = [];

        if (currentTrendInsights?.trendingAngles?.length) {
          const angles = currentTrendInsights.trendingAngles;
          const angle = angles[i % angles.length];
          const hookText = typeof angle === "string" ? angle : angle.hook;
          reasoning.push(`Trend hook: ${hookText.slice(0, 100)}${hookText.length > 100 ? "…" : ""}`);
          tags.push({ label: hookText.slice(0, 50) + (hookText.length > 50 ? "…" : ""), type: "trend" });
        }
        reasoning.push(`Concept: ${concept.description.slice(0, 80)}${concept.description.length > 80 ? "…" : ""}`);
        if (copyVar) {
          reasoning.push(`Copy (${copyVar.type}): ${(headline ?? "").slice(0, 60)}${(headline ?? "").length > 60 ? "…" : ""}`);
          tags.push({ label: copyVar.type, type: "copy" });
        }
        reasoning.push(generationStyle === "infographic" ? "Style: Infographic" : "Style: Typography");
        if (brandColors.some((c) => c.trim())) {
          reasoning.push(`Brand colors: ${brandColors.filter((c) => c.trim()).join(", ")}`);
        }
        if (referenceImagesForRequest?.length) {
          reasoning.push(`${referenceImagesForRequest.length} reference image(s)`);
        }
        if (hasLogo) reasoning.push("Logo composited");
        if (validationStatus === "verified") {
          reasoning.push("Hebrew text: verified ✓");
        } else if (validationStatus === "unverified") {
          reasoning.push("Hebrew text: may need review");
        }

        generated.push({
          id: `banner-${i}-${Date.now()}`,
          imageBase64,
          conceptIndex: i,
          copySnippet: headline,
          reasoning,
          tags,
          hebrewValidation: validationStatus,
          createdAt: Date.now(),
        });
        if (i < count - 1 && delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
      const library = await addToLibrary(generated);
      startTransition(() => {
        setCurrentRunBanners(generated);
        setBanners(library);
        setNode("generate", "success", `${generated.length} banners`);
        setNode("gallery", "success", `${library.length} in library`);
        setSelectedNodeId("gallery");
        setDrawerOpen(true);
        setShowDriveModal(true);
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Pipeline failed";
      startTransition(() => {
        setError(msg);
        setNode("trends", "error");
        setNode("extract", "error");
        setNode("copy", "error");
        setNode("concepts", "error");
        setNode("generate", "error");
      });
    } finally {
      setIsRunning(false);
    }
  }, [documentText, salesPageText, brandLogo, brandColors, referenceBanners, generationStyle, useTrends, useReferenceMode, imageGenerationCount, setNode, trendTopics, trendSources, trendInsights, locale, runInfographicVariations]);

  // Auto-extract trend topics then auto-scout when a document is loaded
  const autoExtractedForDocRef = useRef("");
  useEffect(() => {
    if (!vaultRestoredRef.current) return;
    const text = documentText.trim();
    if (!text || text === autoExtractedForDocRef.current) return;
    if (trendTopics.length > 0) return;

    autoExtractedForDocRef.current = text;
    setNode("trends", "running", "Extracting topics…");

    const controller = new AbortController();
    fetch("/api/trends/extract-topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentText: text, salesPageText, locale }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(async (data: { topics?: TrendTopic[] }) => {
        if (!data.topics?.length) {
          setNode("trends", "idle");
          return;
        }
        setTrendTopics(data.topics);
        setNode("trends", "running", "Scouting trends…");

        const enabledSources = trendSources.filter((s) => s.enabled);
        if (enabledSources.length === 0) {
          setNode("trends", "success", `${data.topics.length} topics`);
          return;
        }

        const scoutRes = await fetch("/api/trends/scout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topics: data.topics.map((t) => t.keyword),
            sources: trendSources,
            locale,
            documentText: text,
            salesPageText,
          }),
          signal: controller.signal,
        });
        if (!scoutRes.ok || !scoutRes.body) throw new Error("Scout failed");
        const insights = await consumeScoutStream(scoutRes, {
          onSourceStart: (_i, label) => setNode("trends", "running", `Scanning ${label}…`),
          onAnalyzing: () => setNode("trends", "running", "Connecting trends to product…"),
        });
        if (!insights) throw new Error("Scout failed");
        setTrendInsights(insights);
        setNode("trends", "success", `${insights.trendingAngles.length} angles`);
      })
      .catch(() => {
        setNode("trends", "idle");
      });

    return () => controller.abort();
  }, [documentText, salesPageText, locale, trendTopics.length, trendSources, setNode]);

  const handleParseDocument = useCallback(
    async (text: string) => {
      setDocumentText(text);
      setTrendTopics([]);
      autoExtractedForDocRef.current = "";
      setNode("upload", "success", `${text.slice(0, 50).replace(/\n/g, " ")}…`);
    },
    [setNode]
  );

  const handleNodeSelect = useCallback((id: string) => {
    setSelectedNodeId(id);
    setDrawerOpen(true);
  }, []);

  const handleOnboardingComplete = useCallback(() => setSetupComplete(true), []);

  if (setupComplete === null) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[var(--background)]" aria-busy="true" aria-label="Loading">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (forceOnboarding || !setupComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex h-dvh bg-[var(--background)]">
      <div className="flex flex-1 min-h-0">
        <main className="relative flex-1 min-w-0 bg-[var(--surface-canvas)]">
          <PipelineCanvas
            onNodeSelect={handleNodeSelect}
            selectedNodeId={selectedNodeId}
            nodeData={nodeData}
          />
          {/* Overlay for FAB + toast + activity log — pointer-events-none so ReactFlow stays interactive */}
          <div className="absolute inset-0 z-50 pointer-events-none">
            {/* Error toast — top center */}
            {error && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <div
                  role="alert"
                  onClick={() => setError(null)}
                  className="pointer-events-auto max-w-md cursor-pointer rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 shadow-lg dark:border-red-800 dark:bg-red-950/90 dark:text-red-300 animate-in fade-in slide-in-from-top-2 duration-300"
                >
                  {error}
                </div>
              </div>
            )}
            {/* Activity log — bottom left/right depending on locale */}
            <PipelineActivityLog
              nodeStatus={nodeStatus}
              nodeSummaries={nodeSummaries}
              isRunning={isRunning}
              onStepClick={handleNodeSelect}
            />
            {/* FAB — bottom center */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <button
                type="button"
                onClick={runPipeline}
                disabled={isRunning || (useReferenceMode ? referenceBanners.length === 0 : !documentText.trim())}
                aria-label={translations[locale].createBanners(imageGenerationCount)}
                aria-busy={isRunning}
                className={cn(
                  "pointer-events-auto",
                  "flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition-all",
                  "bg-accent text-accent-foreground hover:brightness-110 active:scale-95",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                )}
              >
                {isRunning ? (
                  <span key="running" className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t(locale, "running")}
                  </span>
                ) : (
                  <span key="idle" className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                    {translations[locale].createBanners(imageGenerationCount)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </main>
        <PanelDrawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <ResultPanel
            selectedNodeId={selectedNodeId}
            nodeStatus={nodeStatus}
            nodeSummaries={nodeSummaries}
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
            useTrends={useTrends}
            onUseTrendsChange={setUseTrends}
            useReferenceMode={useReferenceMode}
            onUseReferenceModeChange={setUseReferenceMode}
            infographicTopicHeadline={infographicTopicHeadline}
            onInfographicTopicHeadlineChange={setInfographicTopicHeadline}
            runInfographicVariations={runInfographicVariations}
            isRunningInfographic={isRunningInfographic}
            imageGenerationCount={imageGenerationCount}
            onImageGenerationCountChange={setImageGenerationCount}
            insights={insights}
            copyVariations={copyVariations}
            concepts={concepts}
            banners={banners}
            currentRunBanners={currentRunBanners}
            trendTopics={trendTopics}
            onTrendTopicsChange={setTrendTopics}
            trendSources={trendSources}
            onTrendSourcesChange={setTrendSources}
            trendInsights={trendInsights}
            onTrendInsightsChange={setTrendInsights}
            onRunPipeline={runPipeline}
            isRunning={isRunning}
          />
        </PanelDrawer>
      </div>
      <DriveUploadModal
        banners={currentRunBanners}
        open={showDriveModal}
        onClose={() => setShowDriveModal(false)}
      />
    </div>
  );
}
