import { signIn } from "@/auth";
import { store } from "@/lib/store";
import { brandOf, DEFAULT_BRAND } from "@/lib/brand";
import { TrendingUp, Users, ShieldCheck } from "lucide-react";

const authConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

// Branding comes from the database — render per request, not at build time
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  let brand = DEFAULT_BRAND;
  try {
    brand = brandOf(await store.getSettings());
  } catch {
    // defaults
  }
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-ink p-12 text-white">
        <div className="dot-grid absolute inset-0" />
        <div
          className="absolute -top-40 -right-40 h-[480px] w-[480px] rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, #05c3f9 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-48 -left-24 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, #34d399 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-elevate-500 font-display text-xl font-bold text-ink">
            {brand.appName.charAt(0)}
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-tight">
              {brand.companyName}
            </p>
            <p className="text-xs text-white/50">Brokered by {brand.brokerageName}</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Real estate with a{" "}
            <span className="text-elevate-400">higher purpose.</span>
          </h1>
          <p className="mt-4 text-white/60">
            Your team command center — pipeline, clients, transactions, and
            production, live from the Business Hub.
          </p>
          <div className="mt-10 flex gap-6 text-sm text-white/70">
            <span className="flex items-center gap-2">
              <TrendingUp size={16} className="text-elevate-400" /> Live
              pipeline
            </span>
            <span className="flex items-center gap-2">
              <Users size={16} className="text-elevate-400" /> Team-wide view
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-elevate-400" /> Private
            </span>
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          {brand.appName} · {brand.city}
        </p>
      </section>

      {/* Sign-in panel */}
      <section className="flex items-center justify-center bg-chalk p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-elevate-500 font-display text-lg font-bold text-ink">
              {brand.appName.charAt(0)}
            </div>
            <p className="font-display font-semibold">{brand.companyName}</p>
          </div>

          <h2 className="font-display text-2xl font-bold">Welcome back</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Sign in with your team Google account.
          </p>

          {authConfigured ? (
            <form
              className="mt-8"
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-ink px-4 py-3.5 font-semibold text-white transition hover:bg-ink-soft focus:outline-none focus:shadow-glow"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                  />
                </svg>
                Continue with Google
              </button>
            </form>
          ) : (
            <div className="mt-8 space-y-4">
              <div className="card p-4 text-sm text-ink-muted">
                <span className="font-semibold text-ink">Demo mode.</span>{" "}
                Google sign-in isn&apos;t configured yet — add{" "}
                <code className="rounded bg-mist px-1">AUTH_GOOGLE_ID</code>{" "}
                and{" "}
                <code className="rounded bg-mist px-1">
                  AUTH_GOOGLE_SECRET
                </code>{" "}
                to enable it (see README).
              </div>
              <a
                href="/"
                className="flex w-full items-center justify-center rounded-xl bg-elevate-500 px-4 py-3.5 font-semibold text-ink transition hover:bg-elevate-400"
              >
                Enter {brand.appName} →
              </a>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-ink-faint">
            Access limited to {brand.companyName} members.
          </p>
        </div>
      </section>
    </main>
  );
}
