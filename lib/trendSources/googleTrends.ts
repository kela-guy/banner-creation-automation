import type { TrendResult } from "@/types/trends";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const googleTrends = require("google-trends-api");

const MAX_TOPICS = 5;
const PER_TOPIC_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Google Trends timeout")), ms)
    ),
  ]);
}

export async function fetchGoogleTrends(topics: string[]): Promise<TrendResult[]> {
  // #region agent log
  const _dl = (loc: string, msg: string, data: Record<string, unknown> = {}) => fetch('http://127.0.0.1:7775/ingest/578820cd-8cd2-4c01-9519-5301d6fbcc13',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7221af'},body:JSON.stringify({sessionId:'7221af',location:loc,message:msg,data,timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
  // #endregion
  const results: TrendResult[] = [];
  const capped = topics.slice(0, MAX_TOPICS);

  for (const topic of capped) {
    try {
      const raw: string = await withTimeout(
        googleTrends.relatedQueries({
          keyword: topic,
          hl: "he",
          geo: "IL",
        }),
        PER_TOPIC_TIMEOUT_MS
      );
      const parsed = JSON.parse(raw) as {
        default?: {
          rankedList?: Array<{
            rankedKeyword?: Array<{
              query?: string;
              value?: number;
              link?: string;
            }>;
          }>;
        };
      };

      const lists = parsed?.default?.rankedList ?? [];
      for (const list of lists) {
        for (const item of (list.rankedKeyword ?? []).slice(0, 5)) {
          if (item.query) {
            results.push({
              source: "google_trends",
              title: item.query,
              snippet: `Related to "${topic}" — popularity ${item.value ?? "N/A"}`,
              url: item.link ? `https://trends.google.com${item.link}` : undefined,
            });
          }
        }
      }
    } catch (e) {
      // #region agent log
      _dl('googleTrends.ts:fail',`Topic "${topic}" failed`,{error:e instanceof Error ? e.message : String(e)});
      // #endregion
    }
  }

  return results;
}
