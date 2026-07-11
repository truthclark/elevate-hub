"use client";

import { useState } from "react";
import { Modal, Field, inputCls, PrimaryBtn, useModal } from "./modal";
import { saveFunnel, deleteFunnel } from "@/app/actions";
import { Funnel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, Link2, Check, Eye, Users, Percent, Pencil, Trash2, Rocket } from "lucide-react";

// Reconstruct the "one question per line" text from stored fields
const fieldsToRaw = (f: Funnel["fields"]) =>
  f.map((x) => (x.type === "select" ? `${x.label}: ${(x.options ?? []).join(" / ")}` : x.label)).join("\n");

// Pre-filled starter for the military niche — edit everything before launch.
const PCS_STARTER: Partial<Funnel> = {
  slug: "pcs-checklist",
  name: "PCS Checklist",
  template: "magnet",
  headline: "PCS orders to San Antonio? Here's your 12-month game plan.",
  subhead:
    "The exact month-by-month checklist military families use to handle housing, BAH decisions, schools, and TMO without the last-minute scramble.",
  bullets: [
    "The full 12-month timeline, month by month",
    "What to do the day your orders drop",
    "BAH, VA loan, and rent-vs-buy decision points",
    "School transfers and TMO scheduling reminders",
  ],
  ctaLabel: "Send me the checklist",
  calendlyUrl: "https://calendly.com/truthclark/buying-strategy-call",
  fields: [
    { key: "q0", label: "When do you PCS?", type: "select", options: ["0-3 months", "3-6 months", "6-12 months", "12+ months"] },
    { key: "q1", label: "Which base?", type: "text" },
  ],
};

function FunnelForm({ funnel, starter }: { funnel?: Funnel; starter?: Partial<Funnel> }) {
  const { close } = useModal();
  const f = funnel ?? (starter as Funnel | undefined);
  return (
    <form
      action={async (fd) => {
        await saveFunnel(fd);
        close();
      }}
      className="space-y-3"
    >
      {funnel && <input type="hidden" name="id" value={funnel.id} />}
      <input type="hidden" name="resourceNameKeep" value={funnel?.resourceName ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Internal name (becomes lead source)">
          <input name="name" defaultValue={f?.name} required className={inputCls} />
        </Field>
        <Field label="URL slug (yoursite/f/…)">
          <input name="slug" defaultValue={f?.slug} required className={inputCls} placeholder="pcs-checklist" />
        </Field>
        <Field label="Type">
          <select name="template" defaultValue={f?.template ?? "magnet"} className={inputCls}>
            <option value="magnet">Free resource (lead magnet)</option>
            <option value="call">Book a call</option>
          </select>
        </Field>
        <Field label="Button text">
          <input name="ctaLabel" defaultValue={f?.ctaLabel} className={inputCls} />
        </Field>
      </div>
      <Field label="Headline">
        <input name="headline" defaultValue={f?.headline} required className={inputCls} />
      </Field>
      <Field label="Subhead">
        <textarea name="subhead" defaultValue={f?.subhead} rows={2} className={inputCls} />
      </Field>
      <Field label="Benefit bullets (one per line)">
        <textarea name="bullets" defaultValue={f?.bullets?.join("\n")} rows={4} className={inputCls} />
      </Field>
      <Field label="Testimonial (optional)">
        <input name="testimonial" defaultValue={f?.testimonial} className={inputCls} placeholder="A real client quote — leave blank until you have one" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Upload the freebie (PDF, ≤4MB)">
          <input name="resourceFile" type="file" accept=".pdf" className={cn(inputCls, "py-2")} />
          {funnel?.resourceName && (
            <p className="mt-1 text-[11px] text-ink-faint">Current: {funnel.resourceName}</p>
          )}
        </Field>
        <Field label="…or link to it (Drive, site)">
          <input name="resourceUrl" defaultValue={f?.resourceUrl} className={inputCls} placeholder="https://…" />
        </Field>
      </div>
      <Field label="Calendly link (embedded after signup)">
        <input name="calendlyUrl" defaultValue={f?.calendlyUrl} className={inputCls} placeholder="https://calendly.com/…" />
      </Field>
      <Field label='Extra questions — one per line. Add ":" + options split by "/" for a dropdown'>
        <textarea
          name="fieldsRaw"
          defaultValue={f ? fieldsToRaw(f.fields ?? []) : ""}
          rows={3}
          className={cn(inputCls, "font-mono text-[13px]")}
          placeholder={"When do you PCS?: 0-3 months / 3-6 months / 6-12 months\nWhich base?"}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" value="true" defaultChecked={f?.active !== false} className="accent-[#05c3f9]" />
        Live (unchecked = page shows &ldquo;not available&rdquo;)
      </label>
      <PrimaryBtn>{funnel ? "Save funnel" : "Create funnel"}</PrimaryBtn>
    </form>
  );
}

function CopyLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(`${window.location.origin}/f/${slug}`);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // clipboard blocked
        }
      }}
      className="flex items-center gap-1.5 rounded-lg border border-mist px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-elevate-300 hover:text-elevate-700"
    >
      {copied ? <Check size={12} className="text-emerald-600" /> : <Link2 size={12} />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

export function FunnelList({ funnels, isAdmin }: { funnels: Funnel[]; isAdmin: boolean }) {
  return (
    <div>
      {isAdmin && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Modal
            title="New funnel"
            wide
            trigger={
              <button className="flex items-center gap-1.5 rounded-xl bg-elevate-500 px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400">
                <Plus size={15} /> New funnel
              </button>
            }
          >
            <FunnelForm />
          </Modal>
          {funnels.length === 0 && (
            <Modal
              title="PCS Checklist funnel — starter"
              wide
              trigger={
                <button className="flex items-center gap-1.5 rounded-xl border border-elevate-200 bg-elevate-50 px-3.5 py-2 text-sm font-semibold text-elevate-800 transition hover:bg-elevate-100">
                  <Rocket size={15} /> Start with the PCS checklist
                </button>
              }
            >
              <p className="mb-3 rounded-xl bg-chalk px-4 py-3 text-xs text-ink-muted">
                Pre-filled for your military niche. Upload your PCS checklist PDF, tweak the
                copy, and it&apos;s live.
              </p>
              <FunnelForm starter={PCS_STARTER} />
            </Modal>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {funnels.map((f) => {
          const conv = f.views > 0 ? Math.round((f.submissions / f.views) * 100) : 0;
          return (
            <div key={f.id} className={cn("card p-5", !f.active && "opacity-60")}>
              <div className="mb-1 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-display text-[15px] font-bold">{f.name}</h3>
                  <a
                    href={`/f/${f.slug}`}
                    target="_blank"
                    className="text-xs font-semibold text-elevate-600 hover:underline"
                  >
                    /f/{f.slug} ↗
                  </a>
                </div>
                {!f.active && <span className="chip bg-mist text-ink-muted">Paused</span>}
              </div>
              <p className="line-clamp-2 text-xs text-ink-muted">{f.headline}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-chalk/80 py-2">
                  <p className="flex items-center justify-center gap-1 font-display text-lg font-bold"><Eye size={13} className="text-ink-faint" />{f.views}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Views</p>
                </div>
                <div className="rounded-xl bg-chalk/80 py-2">
                  <p className="flex items-center justify-center gap-1 font-display text-lg font-bold"><Users size={13} className="text-ink-faint" />{f.submissions}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Leads</p>
                </div>
                <div className="rounded-xl bg-chalk/80 py-2">
                  <p className="flex items-center justify-center gap-1 font-display text-lg font-bold"><Percent size={13} className="text-ink-faint" />{conv}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Conversion</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <CopyLink slug={f.slug} />
                {isAdmin && (
                  <>
                    <Modal
                      title={`Edit — ${f.name}`}
                      wide
                      trigger={
                        <button className="flex items-center gap-1.5 rounded-lg border border-mist px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink">
                          <Pencil size={12} /> Edit
                        </button>
                      }
                    >
                      <FunnelForm funnel={f} />
                    </Modal>
                    <form
                      action={deleteFunnel}
                      onSubmit={(e) => {
                        if (!confirm(`Delete the "${f.name}" funnel? The page goes offline immediately.`)) e.preventDefault();
                      }}
                      className="ml-auto"
                    >
                      <input type="hidden" name="id" value={f.id} />
                      <button className="rounded-lg p-1.5 text-ink-faint transition hover:bg-rose-50 hover:text-rose-600" aria-label="Delete funnel">
                        <Trash2 size={13} />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
