import { NextRequest } from "next/server";
import { getGenAI, TEXT_MODEL } from "@/lib/genai";
import { getSetup } from "@/lib/setupStore";
import { sanitizeJsonForParse } from "@/lib/sanitizeJson";
import { fetchGoogleTrends } from "@/lib/trendSources/googleTrends";
import { fetchRedditTrends } from "@/lib/trendSources/reddit";
import { fetchNewsTrends } from "@/lib/trendSources/news";
import { fetchTwitterTrends } from "@/lib/trendSources/twitter";
import { fetchCustomUrlTrends } from "@/lib/trendSources/customUrl";
import type { TrendSource, TrendResult, TrendInsights, TrendTopic, TrendAngle } from "@/types/trends";

export const maxDuration = 60;

const MAX_RAW_RESULTS = 80;
const MAX_CONTEXT_CHARS = 30_000;
const MAX_AVATAR_CHARS = 5_000;
const MAX_SALES_CHARS = 3_000;

interface SourceFetchJob {
  label: string;
  type: string;
  fetcher: () => Promise<TrendResult[]>;
}

function getAnalysisSystem(locale: string): string {
  const langNote = locale === "he"
    ? " Write ALL output text (summary, hook, sourceTrend, connection) in Hebrew."
    : "";
  return `You are an expert marketing strategist who hijacks the news cycle for advertising. You scan the ENTIRE cultural landscape — breaking news, celebrity scandals, viral moments, political events, sports highlights, social media drama, memes, anything people are talking about RIGHT NOW — and find clever ways to connect those conversations to a brand's product. Think "newsjacking" — riding the wave of attention on a hot topic and redirecting it toward the product. The connection can be direct OR creative/metaphorical — as long as it feels timely and captures attention.${langNote}`;
}

function getAnalysisPrompt(
  topics: string[],
  rawResults: TrendResult[],
  locale: string,
  documentText?: string,
  salesPageText?: string
): string {
  const resultText = rawResults
    .slice(0, MAX_RAW_RESULTS)
    .map((r, i) => `[${i + 1}] Source: ${r.source} | Title: ${r.title} | Snippet: ${r.snippet?.slice(0, 150) ?? ""}`)
    .join("\n")
    .slice(0, MAX_CONTEXT_CHARS);

  const avatarSection = documentText?.trim()
    ? `\nProduct/audience context (Avatar document):\n---\n${documentText.slice(0, MAX_AVATAR_CHARS)}\n---\n`
    : "";

  const salesSection = salesPageText?.trim()
    ? `\nSales page copy:\n---\n${salesPageText.slice(0, MAX_SALES_CHARS)}\n---\n`
    : "";

  return `Niche-specific search topics: ${topics.join(", ")}
${avatarSection}${salesSection}
Raw trend data (mix of niche-specific AND general/breaking news):
---
${resultText}
---

Your task: Scan ALL the trend data — not just the niche-related items. Look for the BIGGEST stories people are talking about right now (scandals, viral moments, breaking news, cultural events, memes, celebrity drama, political events, sports, etc.) and find creative ways to connect them to this product.

The best advertising hooks ride the wave of what EVERYONE is talking about, not just what the niche is talking about. A nutrition coach can reference a celebrity's public weight journey. A fitness brand can riff on a political scandal with "the only transformation you can trust." Be creative.

Return a JSON object with:
- "summary": A 3-5 sentence brief of the hottest stories/conversations happening RIGHT NOW and how a smart marketer could leverage them for this product.
- "trendingAngles": An array of 5-10 objects. Each object has exactly these 3 keys:
  - "hook": A SHORT, punchy ad-ready sentence or phrase. This will be used directly as ad headline / banner copy.
  - "sourceTrend": 1-2 sentences describing the specific trending story, event, or conversation that inspired this hook. Reference the actual source (e.g. "Instagram reel about X going viral", "Reddit thread discussing Y", "Google Trends spike for Z"). Be specific — name names, events, platforms.
  - "connection": 1 sentence explaining HOW you connected this trending story to the product. What's the creative bridge? (e.g. "Both are about transformation — the celebrity transformed their image, the product transforms the body.")

  Mix two types:
  1. NEWSJACKING hooks — take a hot general topic and cleverly connect it to the product
  2. NICHE-TIMELY hooks — trending conversations within the niche that are especially hot right now

Example of a GOOD trendingAngles entry:
{
  "hook": "Everyone's talking about [celebrity]'s transformation — here's yours in 30 days",
  "sourceTrend": "[Celebrity] posted a dramatic before/after on Instagram that went viral with 2M likes, sparking conversation about rapid body transformations.",
  "connection": "Both are about visible transformation — ride the wave of transformation curiosity and redirect it to the product's 30-day program."
}

Example of BAD output:
- Generic hooks: "Healthy eating is trending" (not actionable, not timely)
- Missing sourceTrend or connection fields
- sourceTrend that is vague like "people are talking about health" — be SPECIFIC about what story/post/event
${locale === "he" ? "\nIMPORTANT: Write ALL text (summary, hook, sourceTrend, connection) in Hebrew.\n" : ""}
Return only valid JSON, no markdown.`;
}

function sendEvent(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  event: string,
  data: unknown
) {
  try {
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
  } catch {
    // Controller already closed (client disconnected)
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const setup = await getSetup();
        if (!setup?.apiKey || setup.provider !== "google") {
          const setupMsg =
            process.env.VERCEL === "1"
              ? "Setup required. Complete onboarding and set ENCRYPTION_SECRET (or GEMINI_API_KEY) in Vercel → Project → Settings → Environment Variables → Production, then redeploy."
              : "Setup required. Please complete onboarding and add your API key.";
          sendEvent(controller, encoder, "error", { error: setupMsg });
          controller.close();
          return;
        }

        const body = await request.json();
        const topics: string[] = Array.isArray(body.topics) ? body.topics.map(String) : [];
        const sources: TrendSource[] = Array.isArray(body.sources) ? body.sources : [];
        const locale: string = typeof body.locale === "string" ? body.locale : "en";
        const documentText: string | undefined = typeof body.documentText === "string" ? body.documentText : undefined;
        const salesPageText: string | undefined = typeof body.salesPageText === "string" ? body.salesPageText : undefined;

        if (topics.length === 0) {
          sendEvent(controller, encoder, "error", { error: "No topics provided" });
          controller.close();
          return;
        }

        const enabledSources = sources.filter((s) => s.enabled);
        if (enabledSources.length === 0) {
          sendEvent(controller, encoder, "error", { error: "No sources enabled" });
          controller.close();
          return;
        }

        const jobs: SourceFetchJob[] = [];
        for (const src of enabledSources) {
          switch (src.type) {
            case "google_trends":
              jobs.push({ label: "Google Trends", type: "google_trends", fetcher: () => fetchGoogleTrends(topics) });
              break;
            case "reddit":
              jobs.push({ label: "Reddit", type: "reddit", fetcher: () => fetchRedditTrends(topics) });
              break;
            case "news":
              jobs.push({ label: "Google News", type: "news", fetcher: () => fetchNewsTrends(topics) });
              break;
            case "twitter":
              if (src.config?.bearerToken?.trim()) {
                jobs.push({ label: "Twitter / X", type: "twitter", fetcher: () => fetchTwitterTrends(topics, src.config!.bearerToken!) });
              }
              break;
            case "custom_url":
              if (src.config?.urls?.length) {
                jobs.push({ label: "Custom URLs", type: "custom_url", fetcher: () => fetchCustomUrlTrends(src.config!.urls!) });
              }
              break;
          }
        }

        sendEvent(controller, encoder, "phase", { phase: "fetching", totalSources: jobs.length });

        jobs.forEach((job, i) => {
          sendEvent(controller, encoder, "source_start", {
            index: i,
            label: job.label,
            type: job.type,
          });
        });

        const settled = await Promise.allSettled(
          jobs.map(async (job, i) => {
            try {
              const results = await job.fetcher();
              sendEvent(controller, encoder, "source_done", {
                index: i,
                label: job.label,
                type: job.type,
                count: results.length,
              });
              return results;
            } catch {
              sendEvent(controller, encoder, "source_done", {
                index: i,
                label: job.label,
                type: job.type,
                count: 0,
                failed: true,
              });
              return [] as TrendResult[];
            }
          })
        );

        const rawResults = settled.flatMap((r) =>
          r.status === "fulfilled" ? r.value : []
        );

        sendEvent(controller, encoder, "phase", {
          phase: "fetched",
          totalResults: rawResults.length,
        });

        if (rawResults.length === 0) {
          const emptyInsights: TrendInsights = {
            topics: topics.map((keyword) => ({ keyword, source: "auto" as const })),
            results: [],
            summary: "No trend data could be fetched from the enabled sources. Try different keywords or enable more sources.",
            trendingAngles: [],
            scoutedAt: new Date().toISOString(),
          };
          sendEvent(controller, encoder, "done", { insights: emptyInsights });
          controller.close();
          return;
        }

        sendEvent(controller, encoder, "phase", { phase: "analyzing" });

        const keepaliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(": keepalive\n\n"));
          } catch {
            clearInterval(keepaliveInterval);
          }
        }, 15000);
        let response;
        try {
          response = await getGenAI(setup.apiKey).models.generateContent({
            model: TEXT_MODEL,
            contents: getAnalysisPrompt(topics, rawResults, locale, documentText, salesPageText),
            config: {
              systemInstruction: getAnalysisSystem(locale),
              responseMimeType: "application/json",
            },
          });
        } finally {
          clearInterval(keepaliveInterval);
        }

        const output = response.text ?? "";
        let summary = "";
        let trendingAngles: TrendAngle[] = [];

        if (output) {
          try {
            const sanitized = sanitizeJsonForParse(output);
            const parsed = JSON.parse(sanitized) as {
              summary?: string;
              trendingAngles?: unknown[];
            };
            summary = typeof parsed.summary === "string" ? parsed.summary : "";
            trendingAngles = Array.isArray(parsed.trendingAngles)
              ? parsed.trendingAngles.map((a): TrendAngle => {
                  if (typeof a === "string") {
                    return { hook: a, sourceTrend: "", connection: "" };
                  }
                  if (typeof a === "object" && a !== null) {
                    const obj = a as Record<string, unknown>;
                    const hook = String(obj.hook ?? obj.angle ?? obj.text ?? "");
                    const sourceTrend = String(obj.sourceTrend ?? obj.source_trend ?? obj.source ?? "");
                    const connection = String(obj.connection ?? obj.reasoning ?? obj.bridge ?? "");
                    return { hook, sourceTrend, connection };
                  }
                  return { hook: String(a), sourceTrend: "", connection: "" };
                }).filter((a) => a.hook.trim() !== "")
              : [];
          } catch {
            summary = output.slice(0, 500);
          }
        }

        const topicObjects: TrendTopic[] = topics.map((keyword) => ({
          keyword,
          source: "auto" as const,
        }));

        const insights: TrendInsights = {
          topics: topicObjects,
          results: rawResults,
          summary,
          trendingAngles,
          scoutedAt: new Date().toISOString(),
        };

        sendEvent(controller, encoder, "done", { insights });
        controller.close();
      } catch (err) {
        console.error("Scout error:", err);
        const errObj = err as { message?: string; error?: { code?: number; message?: string } };
        const message = errObj?.error?.message ?? (err instanceof Error ? err.message : "Trend scouting failed");
        sendEvent(controller, encoder, "error", { error: message });
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
