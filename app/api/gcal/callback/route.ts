import { NextRequest, NextResponse } from "next/server";
import { auth, authConfigured } from "@/auth";
import { store } from "@/lib/store";

// Step 2: Google sends the user back here with a code; we trade it for a
// refresh token and store it against the signed-in member's email.

export async function GET(req: NextRequest) {
  const back = (q: string) =>
    NextResponse.redirect(new URL(`/settings?calendar=${q}`, req.nextUrl.origin));

  if (!authConfigured) return back("noauth");
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return NextResponse.redirect(new URL("/login", req.nextUrl.origin));

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("gcal_state")?.value;
  if (!code || !state || state !== cookieState) return back("error");

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${req.nextUrl.origin}/api/gcal/callback`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error("gcal token exchange failed:", await res.text());
      return back("error");
    }
    const data = (await res.json()) as { refresh_token?: string };
    if (!data.refresh_token) return back("error");
    await store.setCalendarToken(email, data.refresh_token);
    const out = back("connected");
    out.cookies.delete("gcal_state");
    return out;
  } catch (err) {
    console.error("gcal callback failed:", err);
    return back("error");
  }
}
