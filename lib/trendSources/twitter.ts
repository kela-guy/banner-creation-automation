import type { TrendResult } from "@/types/trends";

const TIMEOUT_MS = 10_000;
const MAX_RESULTS_PER_TOPIC = 15;
const API_BASE = "https://api.twitter.com/2";

interface TweetData {
  id: string;
  text: string;
  created_at?: string;
  public_metrics?: {
    retweet_count?: number;
    like_count?: number;
    reply_count?: number;
  };
  author_id?: string;
}

interface TwitterSearchResponse {
  data?: TweetData[];
  meta?: { result_count?: number };
}

/**
 * Validates a Twitter/X Bearer Token by making a lightweight API call.
 * Returns { valid: true } or { valid: false, error: "..." }.
 */
export async function validateTwitterToken(
  bearerToken: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/tweets/search/recent?query=test&max_results=10`, {
      headers: {
        Authorization: `Bearer ${bearerToken.trim()}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok || res.status === 200) return { valid: true };
    if (res.status === 401) return { valid: false, error: "Invalid or unauthorized token" };
    if (res.status === 429) return { valid: true };
    const body = await res.json().catch(() => ({})) as { detail?: string; title?: string; reason?: string };
    const detail = body.detail ?? body.title ?? "";
    if (res.status === 403 || detail.includes("credits") || detail.includes("not authorized")) {
      return { valid: false, error: "Search requires X API Basic plan ($100/mo). Free tier only supports posting." };
    }
    return { valid: false, error: detail || `Error ${res.status}` };
  } catch {
    return { valid: false, error: "Could not reach Twitter API" };
  }
}

/**
 * Fetches recent tweets matching the given topics using Twitter API v2.
 * Requires a Bearer Token from a Twitter/X developer account (Basic plan, $100/mo).
 */
export async function fetchTwitterTrends(
  topics: string[],
  bearerToken?: string
): Promise<TrendResult[]> {
  if (!bearerToken?.trim()) return [];

  const results: TrendResult[] = [];

  for (const topic of topics.slice(0, 5)) {
    try {
      const query = `${topic} -is:retweet lang:en`;
      const params = new URLSearchParams({
        query,
        max_results: String(Math.min(MAX_RESULTS_PER_TOPIC, 100)),
        "tweet.fields": "created_at,public_metrics,author_id",
        sort_order: "relevancy",
      });

      const res = await fetch(`${API_BASE}/tweets/search/recent?${params}`, {
        headers: {
          Authorization: `Bearer ${bearerToken.trim()}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!res.ok) {
        if (res.status === 429) break;
        continue;
      }

      const json = (await res.json()) as TwitterSearchResponse;

      for (const tweet of json.data ?? []) {
        const engagement =
          (tweet.public_metrics?.like_count ?? 0) +
          (tweet.public_metrics?.retweet_count ?? 0) +
          (tweet.public_metrics?.reply_count ?? 0);

        results.push({
          source: "twitter",
          title: tweet.text.slice(0, 120),
          snippet: tweet.text.slice(0, 280),
          url: `https://x.com/i/status/${tweet.id}`,
          relevanceScore: engagement,
          timestamp: tweet.created_at,
        });
      }
    } catch {
      // Individual topic failure — continue
    }
  }

  return results;
}
