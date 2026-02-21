import type { GenerationStyle } from "@/types/pipeline";
import type { TrendTopic, TrendSource, TrendInsights } from "@/types/trends";
import { DEFAULT_TREND_SOURCES } from "@/types/trends";

/** LocalStorage key for the persistent brand/context vault. */
export const VAULT_KEY = "banner-automation-vault";

export interface VaultData {
  documentText: string;
  salesPageUrl: string;
  salesPageText: string;
  brandLogo: string | null;
  brandColors: string[];
  referenceBanners: string[];
  generationStyle: GenerationStyle;
  trendTopics: TrendTopic[];
  trendSources: TrendSource[];
  trendInsights: TrendInsights | null;
}

const defaults: VaultData = {
  documentText: "",
  salesPageUrl: "",
  salesPageText: "",
  brandLogo: null,
  brandColors: ["", ""],
  referenceBanners: [],
  generationStyle: "typography",
  trendTopics: [],
  trendSources: DEFAULT_TREND_SOURCES,
  trendInsights: null,
};

/** Merge saved sources with defaults so newly added source types are always present. */
function mergeTrendSources(saved: TrendSource[]): TrendSource[] {
  const savedTypes = new Set(saved.map((s) => s.type));
  const missing = DEFAULT_TREND_SOURCES.filter((d) => !savedTypes.has(d.type));
  return [...saved, ...missing];
}

/** Load vault from localStorage. Safe to call in browser; returns defaults on SSR or parse error. */
export function loadVault(): VaultData {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(VAULT_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<VaultData>;
    const style = parsed.generationStyle === "infographic" ? "infographic" : "typography";
    return {
      documentText: typeof parsed.documentText === "string" ? parsed.documentText : defaults.documentText,
      salesPageUrl: typeof parsed.salesPageUrl === "string" ? parsed.salesPageUrl : defaults.salesPageUrl,
      salesPageText: typeof parsed.salesPageText === "string" ? parsed.salesPageText : defaults.salesPageText,
      brandLogo: parsed.brandLogo === null || (typeof parsed.brandLogo === "string" && parsed.brandLogo) ? parsed.brandLogo : defaults.brandLogo,
      brandColors: Array.isArray(parsed.brandColors) ? parsed.brandColors.filter((c): c is string => typeof c === "string") : defaults.brandColors,
      referenceBanners: Array.isArray(parsed.referenceBanners) ? parsed.referenceBanners.filter((s): s is string => typeof s === "string") : defaults.referenceBanners,
      generationStyle: style,
      trendTopics: Array.isArray(parsed.trendTopics) ? parsed.trendTopics as TrendTopic[] : defaults.trendTopics,
      trendSources: Array.isArray(parsed.trendSources) ? mergeTrendSources(parsed.trendSources as TrendSource[]) : defaults.trendSources,
      trendInsights: parsed.trendInsights && typeof parsed.trendInsights === "object" ? parsed.trendInsights as TrendInsights : defaults.trendInsights,
    };
  } catch {
    return defaults;
  }
}

/** Persist vault to localStorage. No-op on SSR. */
export function saveVault(data: VaultData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VAULT_KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded or disabled; ignore
  }
}
