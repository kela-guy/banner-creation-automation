import type { GeneratedBanner } from "@/types/pipeline";

const DB_NAME = "banner-automation";
const DB_VERSION = 1;
const STORE_NAME = "banners";
const LEGACY_LS_KEY = "banner-automation-library";
const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

function isStale(createdAt: number): boolean {
  return Date.now() - createdAt > RETENTION_MS;
}

function validate(b: unknown): b is GeneratedBanner {
  const obj = b as Record<string, unknown>;
  return (
    obj != null &&
    typeof obj.id === "string" &&
    typeof obj.imageBase64 === "string" &&
    typeof obj.createdAt === "number"
  );
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbAvailable(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

/** Migrate any banners stuck in localStorage (old storage) into IndexedDB, then clear localStorage. */
async function migrateLegacy(db: IDBDatabase): Promise<void> {
  try {
    const raw = window.localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    const valid = parsed.filter(validate).filter((b) => !isStale(b.createdAt));
    if (valid.length === 0) {
      window.localStorage.removeItem(LEGACY_LS_KEY);
      return;
    }
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const banner of valid) {
      store.put(banner);
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    window.localStorage.removeItem(LEGACY_LS_KEY);
  } catch {
    /* migration is best-effort */
  }
}

/** Load library from IndexedDB. Returns only banners from the last 30 days. */
export async function loadLibraryAsync(): Promise<GeneratedBanner[]> {
  if (!idbAvailable()) return [];
  try {
    const db = await openDB();
    await migrateLegacy(db);
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const all = await new Promise<GeneratedBanner[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as GeneratedBanner[]);
      req.onerror = () => reject(req.error);
    });
    return all.filter(validate).filter((b) => !isStale(b.createdAt));
  } catch {
    return [];
  }
}

/** Synchronous loader for initial render — returns empty, caller should hydrate with loadLibraryAsync. */
export function loadLibrary(): GeneratedBanner[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(validate).filter((b) => !isStale(b.createdAt));
  } catch {
    return [];
  }
}

/** Save banners to IndexedDB. */
async function saveLibraryAsync(items: GeneratedBanner[]): Promise<void> {
  if (!idbAvailable()) return;
  const db = await openDB();
  const withinRetention = items.filter((b) => !isStale(b.createdAt));
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  for (const banner of withinRetention) {
    store.put(banner);
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Append new banners, prune stale ones, save, and return the full current list. */
export async function addToLibrary(newBanners: GeneratedBanner[]): Promise<GeneratedBanner[]> {
  if (!idbAvailable()) return newBanners;
  try {
    const current = await loadLibraryAsync();
    const existingIds = new Set(current.map((b) => b.id));
    const deduped = newBanners.filter((b) => !existingIds.has(b.id));
    const combined = [...current, ...deduped].filter((b) => !isStale(b.createdAt));
    await saveLibraryAsync(combined);
    return combined;
  } catch {
    return newBanners;
  }
}

/** Remove a single banner by id. */
export async function removeFromLibrary(id: string): Promise<GeneratedBanner[]> {
  if (!idbAvailable()) return [];
  try {
    const current = await loadLibraryAsync();
    const filtered = current.filter((b) => b.id !== id);
    await saveLibraryAsync(filtered);
    return filtered;
  } catch {
    return [];
  }
}
