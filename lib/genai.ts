import { GoogleGenAI } from "@google/genai";

const clientCache = new Map<string, GoogleGenAI>();

/**
 * Returns a Gemini client. Prefer passing the API key from setup (onboarding).
 * If no key is passed, falls back to process.env.GEMINI_API_KEY for development.
 */
export function getGenAI(apiKey?: string): GoogleGenAI {
  const key = apiKey?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("No API key. Complete onboarding or set GEMINI_API_KEY in .env.local.");
  }
  let client = clientCache.get(key);
  if (!client) {
    client = new GoogleGenAI({ apiKey: key });
    clientCache.set(key, client);
  }
  return client;
}

/** Text/reasoning: extract, copy, concepts, describe. Replaced deprecated gemini-2.0-flash. */
export const TEXT_MODEL = "gemini-2.5-flash";
/** Image generation (Nano Banana Pro / Gemini 3 Pro Image). */
export const IMAGE_MODEL = "gemini-3-pro-image-preview";
