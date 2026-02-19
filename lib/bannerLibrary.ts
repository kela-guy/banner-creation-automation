import type { GeneratedBanner } from "@/types/pipeline";

const LIBRARY_KEY = "banner-automation-library";
const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function isStale(createdAt: number): boolean {
  return Date.now() - createdAt > RETENTION_MS;
}

/** Load library from localStorage and return only banners from the last 30 days. */
export function loadLibrary(): GeneratedBanner[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GeneratedBanner[];
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(
      (b) => b && typeof b.id === "string" && typeof b.imageBase64 === "string" && typeof b.createdAt === "number"
    );
    const withinRetention = valid.filter((b) => !isStale(b.createdAt));
    return withinRetention;
  } catch {
    return [];
  }
}

/** Save banners to localStorage (only those within 30 days). */
function saveLibrary(items: GeneratedBanner[]): void {
  if (typeof window === "undefined") return;
  try {
    const withinRetention = items.filter((b) => !isStale(b.createdAt));
    window.localStorage.setItem(LIBRARY_KEY, JSON.stringify(withinRetention));
  } catch {
    // quota or disabled
  }
}

/** Append new banners to the library, drop any older than 30 days, save, and return the current list. */
export function addToLibrary(newBanners: GeneratedBanner[]): GeneratedBanner[] {
  const current = loadLibrary();
  const combined = [...current, ...newBanners];
  const withinRetention = combined.filter((b) => !isStale(b.createdAt));
  saveLibrary(withinRetention);
  return withinRetention;
}

/** Remove a single banner from the library by id. */
export function removeFromLibrary(id: string): GeneratedBanner[] {
  const current = loadLibrary().filter((b) => b.id !== id);
  saveLibrary(current);
  return current;
}
