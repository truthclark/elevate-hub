import { store } from "@/lib/store";
import { brandOf, DEFAULT_BRAND } from "@/lib/brand";
import { submitFunnel } from "@/app/actions";
import { Funnel } from "@/lib/types";
import { Check, Download, CalendarCheck } from "lucide-react";

export const dynamic = "force-dynamic";

// Public funnel landing page: hook → form → instant delivery → book a call.
// No auth, no nav — a prospect page, not an app page.

export default async function FunnelPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { thanks?: string };
}) {
  let funnel: Funnel | undefined;
  let brand = DEFAULT_BRAND;
  let logo: string | undefined;
  try {
    const [funnels, settings] = await Promise.all([store.listFunnels(), store.getSettings()]);
    funnel = funnels.find((f) => f.slug === params.slug && f.active);
    brand = brandOf(settings);
    logo = settings.branding?.logo;
  } catch {
    // fall through to not-found card
  }

  if (!funnel) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-chalk p-6">
        <div className="card max-w-md p-8 text-center">
          <h1 className="font-display text-lg font-bold">This page isn&apos;t available</h1>
          <p className="mt-2 text-sm text-ink-muted">
            The link may have changed — reach out to {brand.companyName} directly.
          </p>
        </div>
      </main>
    );
  }

  const thanks = searchParams?.thanks === "1";
  if (!thanks) {
    // fire-and-forget view count (form submits don't double-count)
    store.bumpFunnel(funnel.id, "views").catch(() => {});
  }
  const isForm = funnel.kind === "form";
  const hasResource = !isForm && Boolean(funnel.resourceData || funnel.resourceUrl);
  const downloadHref = funnel.resourceData ? `/f/${funnel.slug}/resource` : funnel.resourceUrl;

  return (
    <main className="min-h-screen bg-chalk pb-16">
      {/* Brand header */}
      <div className="bg-ink px-5 pb-20 pt-8 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={brand.companyName} className="h-10 w-10 rounded-xl bg-white object-contain p-1" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-elevate-500 font-display text-lg font-bold text-ink">
                {brand.companyName.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-display text-sm font-bold">{brand.companyName}</p>
              <p className="text-[11px] text-white/50">Brokered by {brand.brokerageName} · {brand.city}</p>
            </div>
          </div>
          {!thanks && (
            <>
              <h1 className="mt-8 font-display text-3xl font-bold leading-tight sm:text-4xl">
                {funnel.headline}
              </h1>
              {funnel.subhead && (
                <p className="mt-3 max-w-xl text-white/70">{funnel.subhead}</p>
              )}
            </>
          )}
          {thanks && (
            <h1 className="mt-8 font-display text-3xl font-bold leading-tight">
              {isForm
                ? "Got it — thank you!"
                : `You're all set${funnel.template === "magnet" ? " — it's on the way" : ""}.`}
            </h1>
          )}
        </div>
      </div>

      <div className="mx-auto -mt-10 max-w-2xl px-5">
        {thanks ? (
          /* ── Thank-you: instant download + book a call ── */
          <div className="space-y-4">
            {isForm && (
              <div className="card p-6 text-center">
                <p className="text-sm text-ink-muted">
                  {funnel.thanksNote ||
                    "Your answers are in. We'll review them before we talk so we don't waste a minute of your time."}
                </p>
              </div>
            )}
            {!isForm && funnel.template === "magnet" && hasResource && (
              <div className="card p-6 text-center">
                <p className="text-sm text-ink-muted">
                  Check your email — and grab it right now if you can&apos;t wait:
                </p>
                <a
                  href={downloadHref}
                  target="_blank"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-elevate-500 px-5 py-3 font-semibold text-ink transition hover:bg-elevate-400"
                >
                  <Download size={16} /> Open your {funnel.name}
                </a>
              </div>
            )}
            {funnel.calendlyUrl && (
              <div className="card overflow-hidden">
                <div className="border-b border-mist px-5 py-4">
                  <p className="flex items-center gap-2 font-display text-sm font-bold">
                    <CalendarCheck size={15} className="text-elevate-600" />
                    Want to talk it through? Grab a time — no pressure, no cost.
                  </p>
                </div>
                <iframe
                  src={funnel.calendlyUrl}
                  title="Schedule a call"
                  className="h-[680px] w-full"
                />
              </div>
            )}
          </div>
        ) : (
          /* ── Landing: benefits + form ── */
          <div className="card p-6 sm:p-8">
            {funnel.bullets.length > 0 && (
              <ul className="mb-6 space-y-2.5">
                {funnel.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-elevate-100 text-elevate-700">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            )}

            <form action={submitFunnel} className="space-y-3">
              <input type="hidden" name="funnelId" value={funnel.id} />
              {/* honeypot — humans never see it */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-muted">Name</span>
                  <input name="name" required className="w-full rounded-xl border border-mist bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-elevate-400" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-muted">Phone</span>
                  <input name="phone" type="tel" className="w-full rounded-xl border border-mist bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-elevate-400" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-muted">Email</span>
                <input name="email" type="email" required className="w-full rounded-xl border border-mist bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-elevate-400" />
              </label>
              {funnel.fields.map((f) => (
                <label key={f.key} className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink-muted">
                    {f.label}
                    {f.required && <span className="text-rose-500"> *</span>}
                  </span>
                  {f.type === "select" ? (
                    <select
                      name={f.key}
                      required={f.required}
                      className="w-full rounded-xl border border-mist bg-white px-3.5 py-2.5 text-sm outline-none"
                    >
                      <option value="">Choose…</option>
                      {(f.options ?? []).map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === "long" ? (
                    <textarea
                      name={f.key}
                      required={f.required}
                      rows={3}
                      className="w-full rounded-xl border border-mist bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-elevate-400"
                    />
                  ) : (
                    <input
                      name={f.key}
                      required={f.required}
                      className="w-full rounded-xl border border-mist bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-elevate-400"
                    />
                  )}
                </label>
              ))}
              <button
                type="submit"
                className="w-full rounded-xl bg-elevate-500 px-5 py-3.5 font-display font-bold text-ink transition hover:bg-elevate-400"
              >
                {funnel.ctaLabel}
              </button>
              <p className="text-center text-[11px] text-ink-faint">
                {isForm
                  ? "Your answers stay private — they go straight to your agent, nowhere else."
                  : "No spam, ever. We'll send your resource and one helpful follow-up."}
              </p>
            </form>

            {funnel.testimonial && (
              <blockquote className="mt-6 border-l-2 border-elevate-300 pl-4 text-sm italic text-ink-muted">
                &ldquo;{funnel.testimonial}&rdquo;
              </blockquote>
            )}
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-ink-faint">
          {brand.companyName} · {brand.city}
        </p>
      </div>
    </main>
  );
}
