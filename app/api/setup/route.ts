import { NextRequest, NextResponse } from "next/server";
import { getSetupPublic, saveSetup } from "@/lib/setupStore";
import {
  encryptSetup,
  BANNER_SETUP_COOKIE,
  COOKIE_OPTIONS,
} from "@/lib/cookieSetup";

const ALLOWED_PROVIDERS = ["google", "openai"] as const;

export async function GET() {
  try {
    const publicData = await getSetupPublic();
    return NextResponse.json(publicData);
  } catch (err) {
    console.error("Setup GET error:", err);
    return NextResponse.json(
      { error: "Failed to load setup" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provider = body.provider as string | undefined;
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

    if (!provider || !ALLOWED_PROVIDERS.includes(provider as "google" | "openai")) {
      return NextResponse.json(
        { error: "Invalid or missing provider. Use google or openai." },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    if (provider === "openai") {
      return NextResponse.json(
        { error: "OpenAI is not supported yet. Use google (Gemini) for now." },
        { status: 501 }
      );
    }

    await saveSetup("google", apiKey);
    const payload = encryptSetup({
      provider: "google",
      apiKey: apiKey.trim(),
      completedAt: new Date().toISOString(),
    });
    if (!payload) {
      console.error("Setup POST: ENCRYPTION_SECRET is not set; cannot save API key securely.");
      return NextResponse.json(
        {
          error:
            "This server is not configured to save API keys. Please ask the site administrator to set ENCRYPTION_SECRET.",
        },
        { status: 503 }
      );
    }
    const completedAt = new Date().toISOString();
    const response = NextResponse.json({
      provider: "google",
      completedAt,
    });
    response.cookies.set(BANNER_SETUP_COOKIE, payload, COOKIE_OPTIONS);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Setup POST error:", err);
    // Always include the real reason so the user (and support) can see what went wrong
    const userMessage =
      process.env.NODE_ENV === "development"
        ? `Could not save: ${message}`
        : `We couldn’t save your API key. ${message}`;
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
