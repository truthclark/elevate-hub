import { NextRequest, NextResponse } from "next/server";
import { auth, authConfigured } from "@/auth";

// Step 1 of "Connect Google Calendar": send the signed-in user to Google's
// consent screen asking for read-only calendar access. Reuses the app's
// existing Google OAuth client — the only setup is adding this route's
// callback URL to the OAuth client's redirect URIs.

export async function GET(req: NextRequest) {
  if (!authConfigured) {
    return NextResponse.redirect(new URL("/settings?calendar=noauth", req.nextUrl.origin));
  }
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID!,
    redirect_uri: `${req.nextUrl.origin}/api/gcal/callback`,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    access_type: "offline", // gives us a refresh token
    prompt: "consent", // always re-issue the refresh token
    login_hint: session.user.email,
    state,
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
  res.cookies.set("gcal_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/gcal",
  });
  return res;
}
