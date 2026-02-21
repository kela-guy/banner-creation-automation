import { NextRequest, NextResponse } from "next/server";
import { validateTwitterToken } from "@/lib/trendSources/twitter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body.bearerToken === "string" ? body.bearerToken.trim() : "";
    if (!token) {
      return NextResponse.json({ valid: false, error: "No token provided" }, { status: 400 });
    }
    const result = await validateTwitterToken(token);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ valid: false, error: "Validation failed" }, { status: 500 });
  }
}
