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
    } catch {
      // Individual topic failure (timeout or blocked) — continue with others
    }
  }

  return results;
}
