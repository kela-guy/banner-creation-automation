/**
 * Encrypted cookie storage for setup (provider + API key).
 * Server-only; do not import from client.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import type { SetupData } from "./setupStore";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;
export const BANNER_SETUP_COOKIE = "banner_setup";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: ONE_YEAR_SECONDS,
  path: "/",
};

function getKey(): Buffer | null {
  const secret = process.env.ENCRYPTION_SECRET?.trim();
  if (!secret) return null;
  return createHash("sha256").update(secret).digest();
}

export function encryptSetup(data: SetupData): string | null {
  const key = getKey();
  if (!key) return null;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const plain = JSON.stringify(data);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, enc]);
  return combined.toString("base64url");
}

export function decryptSetup(payload: string): SetupData | null {
  const key = getKey();
  if (!key) return null;
  let combined: Buffer;
  try {
    combined = Buffer.from(payload, "base64url");
  } catch {
    return null;
  }
  if (combined.length < IV_LEN + AUTH_TAG_LEN) return null;
  const iv = combined.subarray(0, IV_LEN);
  const tag = combined.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const enc = combined.subarray(IV_LEN + AUTH_TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  let plain: string;
  try {
    plain = decipher.update(enc) + decipher.final("utf8");
  } catch {
    return null;
  }
  const data = JSON.parse(plain) as unknown;
  if (
    data &&
    typeof data === "object" &&
    typeof (data as SetupData).provider === "string" &&
    typeof (data as SetupData).apiKey === "string" &&
    typeof (data as SetupData).completedAt === "string"
  ) {
    return data as SetupData;
  }
  return null;
}
