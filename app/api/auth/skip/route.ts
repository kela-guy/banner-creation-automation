import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "skip-auth";

export async function POST() {
  const jar = await cookies();
  const current = jar.get(COOKIE_NAME)?.value === "true";

  if (current) {
    jar.delete(COOKIE_NAME);
  } else {
    jar.set(COOKIE_NAME, "true", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  return NextResponse.json({ skipped: !current });
}
