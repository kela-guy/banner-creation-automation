import type { TrendResult } from "@/types/trends";

const TIMEOUT_MS = 8000;
const MAX_POSTS = 15;
const USER_AGENT = "Mozilla/5.0 (compatible; BannerTrendScout/1.0)";

interface RedditPost {
  data: {
    title?: string;
    selftext?: string;
    permalink?: string;
    score?: number;
    created_utc?: number;
    subreddit?: string;
  };
}

/**
 * Searches Reddit's global search (all subreddits) for the given topics,
 * sorted by top/relevance from the past week. No user-supplied subreddit list needed.
 */
export async function fetchRedditTrends(topics: string[]): Promise<TrendResult[]> {
  const results: TrendResult[] = [];

  for (const topic of topics.slice(0, 5)) {
    try {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=relevance&t=week&limit=${MAX_POSTS}`;

      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!res.ok) continue;

      const json = (await res.json()) as {
        data?: { children?: RedditPost[] };
      };

      for (const child of json.data?.children ?? []) {
        const d = child.data;
        if (!d?.title) continue;
        results.push({
          source: "reddit",
          title: d.title,
          snippet: (d.selftext ?? "").slice(0, 200),
          url: d.permalink ? `https://reddit.com${d.permalink}` : undefined,
          relevanceScore: d.score,
          timestamp: d.created_utc
            ? new Date(d.created_utc * 1000).toISOString()
            : undefined,
        });
      }
    } catch {
      // Individual topic failure — continue
    }
  }

  return results;
}
