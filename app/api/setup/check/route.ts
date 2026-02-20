import { NextResponse } from "next/server";
import { encryptSetup } from "@/lib/cookieSetup";

/**
 * GET /api/setup/check - Returns whether the server can save API keys (ENCRYPTION_SECRET set).
 * Safe to call from onboarding to show a clear message before the user enters a key.
 */
export async function GET() {
  const canEncrypt = encryptSetup({
    provider: "google",
    apiKey: "check",
    completedAt: new Date().toISOString(),
  });
  if (canEncrypt) {
    return NextResponse.json({ configured: true });
  }
  return NextResponse.json(
    {
      configured: false,
      error:
        "ENCRYPTION_SECRET is not set. On Vercel: Project → Settings → Environment Variables → add ENCRYPTION_SECRET for Production → Redeploy.",
    },
    { status: 503 }
  );
}
