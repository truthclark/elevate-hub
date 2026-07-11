import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Optimistic auth gate (edge-safe): checks for the session cookie.
// Full session validation happens server-side. If Google OAuth isn't
// configured, the app runs in open demo mode.

const authConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export function middleware(req: NextRequest) {
  if (!authConfigured) return NextResponse.next();

  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");
  const isLogin = req.nextUrl.pathname.startsWith("/login");

  if (!hasSession && !isLogin) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (hasSession && isLogin) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

// API routes are excluded — they do their own session checks and must be
// able to return proper 401s instead of login-page redirects.
// /t/ is the public client timeline; /f/ is public funnel landing pages.
export const config = {
  matcher: ["/((?!api/|t/|f/|_next/static|_next/image|favicon.ico|icon|apple-icon|logo|manifest|icon-192|icon-512).*)"],
};
