export interface TrendTopic {
  keyword: string;
  source: "auto" | "manual";
}

export interface TrendSource {
  type: "google_trends" | "reddit" | "news" | "twitter" | "custom_url";
  enabled: boolean;
  config?: { urls?: string[]; bearerToken?: string };
}

export interface TrendResult {
  source: string;
  title: string;
  snippet: string;
  url?: string;
  relevanceScore?: number;
  timestamp?: string;
}

export interface TrendAngle {
  hook: string;
  sourceTrend: string;
  connection: string;
}

export interface TrendInsights {
  topics: TrendTopic[];
  results: TrendResult[];
  summary: string;
  trendingAngles: TrendAngle[];
  scoutedAt: string;
}

/** Extract the hook text from an angle, handling both old (plain string) and new (object) formats. */
export function getAngleHook(angle: string | TrendAngle): string {
  return typeof angle === "string" ? angle : angle.hook;
}

/** Normalize a mixed array (old string[] or new TrendAngle[]) into TrendAngle[]. */
export function normalizeAngles(angles: (string | TrendAngle)[]): TrendAngle[] {
  return angles.map((a) =>
    typeof a === "string"
      ? { hook: a, sourceTrend: "", connection: "" }
      : a
  );
}

export const DEFAULT_TREND_SOURCES: TrendSource[] = [
  { type: "google_trends", enabled: true },
  { type: "reddit", enabled: true },
  { type: "news", enabled: true },
  { type: "twitter", enabled: false, config: { bearerToken: "" } },
  { type: "custom_url", enabled: false, config: { urls: [] } },
];
