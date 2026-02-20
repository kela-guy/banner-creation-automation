/**
 * File-based and cookie-based setup store for onboarding (provider + API key).
 * Cookie is primary on serverless; file + env fallback for local dev.
 * Server-only; do not import from client.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { cookies } from "next/headers";
import { decryptSetup, BANNER_SETUP_COOKIE } from "./cookieSetup";

export type Provider = "google" | "openai";

export interface SetupData {
  provider: Provider;
  apiKey: string;
  completedAt: string; // ISO date
}

export interface SetupPublic {
  provider?: Provider;
  completedAt?: string;
}

const SETUP_DIR = ".data";
const SETUP_FILE = "setup.json";

function getSetupPath(): string {
  return join(process.cwd(), SETUP_DIR, SETUP_FILE);
}

export async function getSetup(): Promise<SetupData | null> {
  // 1. Cookie first (per-user on serverless)
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(BANNER_SETUP_COOKIE)?.value;
    if (value) {
      const data = decryptSetup(value);
      if (data) return data;
    }
  } catch {
    /* cookies() may throw outside request context */
  }
  // 2. File (local dev)
  try {
    const path = getSetupPath();
    const raw = await readFile(path, "utf-8");
    const data = JSON.parse(raw) as SetupData;
    if (
      data &&
      typeof data.provider === "string" &&
      typeof data.apiKey === "string" &&
      typeof data.completedAt === "string"
    ) {
      return data;
    }
  } catch {
    /* no file or invalid */
  }
  // 3. Env fallback (local dev without re-entering key)
  const envKey = process.env.GEMINI_API_KEY?.trim();
  if (envKey) {
    return {
      provider: "google",
      apiKey: envKey,
      completedAt: new Date().toISOString(),
    };
  }
  return null;
}

/** Returns public fields only (no apiKey). */
export async function getSetupPublic(): Promise<SetupPublic> {
  const data = await getSetup();
  if (!data) return {};
  return {
    provider: data.provider,
    completedAt: data.completedAt,
  };
}

/**
 * Saves setup to disk (local dev only). On serverless (e.g. Vercel) the filesystem
 * is read-only, so we skip file write there; the cookie is the source of truth in production.
 */
export async function saveSetup(provider: Provider, apiKey: string): Promise<void> {
  // Skip file write on Vercel/serverless (read-only fs); cookie is used instead
  if (process.env.VERCEL === "1") {
    return;
  }
  const data: SetupData = {
    provider,
    apiKey: apiKey.trim(),
    completedAt: new Date().toISOString(),
  };
  try {
    const dir = join(process.cwd(), SETUP_DIR);
    await mkdir(dir, { recursive: true });
    const path = getSetupPath();
    await writeFile(path, JSON.stringify(data, null, 0), "utf-8");
  } catch {
    /* Ignore: e.g. read-only fs; cookie is the source of truth in production */
  }
}

export async function isSetupComplete(): Promise<boolean> {
  const data = await getSetup();
  return data != null && Boolean(data.apiKey.trim() && data.completedAt);
}
