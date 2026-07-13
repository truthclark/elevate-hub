"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal, Field, inputCls, inputBase, PrimaryBtn, useModal } from "./modal";
import { saveFunnel, deleteFunnel } from "@/app/actions";
import { Funnel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, Link2, Check, Eye, Users, Percent, Pencil, Trash2, Rocket, Inbox, ClipboardList, GripVertical } from "lucide-react";

// ── Visual question builder (Google-Forms style) ─────────────────
const FIELD_TYPE_LABELS: [string, string][] = [
  ["text", "Short answer"],
  ["long", "Paragraph"],
  ["select", "Dropdown"],
  ["radio", "Multiple choice"],
  ["multi", "Checkboxes"],
  ["number", "Number"],
  ["address", "Address (autocomplete)"],
];
const HAS_OPTIONS = ["select", "radio", "multi"];

interface QDraft {
  label: string;
  type: string;
  optionsText: string;
  required: boolean;
}

function QuestionsEditor({ initial }: { initial: Funnel["fields"] }) {
  const [qs, setQs] = useState<QDraft[]>(
    (initial ?? []).map((f) => ({
      label: f.label,
      type: f.type,
      optionsText: (f.options ?? []).join("\n"),
      required: Boolean(f.required),
    }))
  );
  const [drag, setDrag] = useState<number | null>(null);

  const json = JSON.stringify(
    qs.map((q) => ({
      label: q.label,
      type: q.type,
      options: q.optionsText.split("\n").map((o) => o.trim()).filter(Boolean),
      required: q.required,
    }))
  );

  const update = (i: number, patch: Partial<QDraft>) =>
    setQs(qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const onDragOverRow = (i: number) => {
    if (drag == null || drag === i) return;
    const next = [...qs];
    const [moved] = next.splice(drag, 1);
    next.splice(i, 0, moved);
    setQs(next);
    setDrag(i);
  };

  return (
    <div>
      <input type="hidden" name="fieldsJson" value={json} />
      <p className="mb-2 text-xs font-semibold text-ink-muted">
        Questions <span className="font-normal text-ink-faint">(name, email, and phone are always asked first)</span>
      </p>
      <div className="space-y-2.5">
        {qs.map((q, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => setDrag(i)}
            onDragOver={(e) => { e.preventDefault(); onDragOverRow(i); }}
            onDragEnd={() => setDrag(null)}
            className={cn(
              "rounded-xl border border-mist bg-chalk/50 p-3",
              drag === i && "opacity-50 ring-2 ring-elevate-300"
            )}
          >
            {/* line 1: the question itself gets the full width */}
            <div className="flex items-center gap-2">
              <GripVertical size={14} className="shrink-0 cursor-grab text-ink-faint/50" />
              <input
                value={q.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder={`Question ${i + 1}`}
                className={cn(inputCls, "min-w-0 flex-1")}
              />
              <button
                type="button"
                onClick={() => setQs(qs.filter((_, j) => j !== i))}
                className="shrink-0 rounded p-1.5 text-ink-faint hover:bg-rose-50 hover:text-rose-500"
                aria-label="Remove question"
              >
                <Trash2 size={13} />
              </button>
            </div>
            {/* line 2: type + required */}
            <div className="mt-2 flex items-center gap-3 pl-6">
              <select
                value={q.type}
                onChange={(e) => update(i, { type: e.target.value })}
                className={cn(inputBase, "w-48")}
              >
                {FIELD_TYPE_LABELS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <label className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-ink-muted">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) => update(i, { required: e.target.checked })}
                  className="accent-[#05c3f9]"
                />
                Required
              </label>
            </div>
            {HAS_OPTIONS.includes(q.type) && (
              <div className="mt-2 pl-6">
                <p className="mb-1 text-[11px] font-semibold text-ink-faint">Options — one per line</p>
                <textarea
                  value={q.optionsText}
                  onChange={(e) => update(i, { optionsText: e.target.value })}
                  rows={Math.min(6, Math.max(2, q.optionsText.split("\n").length))}
                  placeholder={"Yes\nNo"}
                  className={cn(inputCls, "font-mono text-[12.5px]")}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setQs([...qs, { label: "", type: "text", optionsText: "", required: false }])}
        className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-elevate-600 hover:underline"
      >
        <Plus size={13} /> Add question
      </button>
    </div>
  );
}

// ── Starters ─────────────────────────────────────────────────────
const PCS_STARTER: Partial<Funnel> = {
  slug: "pcs-checklist",
  name: "PCS Checklist",
  kind: "funnel",
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
    { key: "q0", label: "When do you PCS?", type: "select", options: ["0-3 months", "3-6 months", "6-12 months", "12+ months"], required: true },
    { key: "q1", label: "Which base?", type: "text" },
  ],
};

// Buyer intake — field-for-field from the team's Jotform blueprint
const BUYER_INTAKE: Partial<Funnel> = {
  slug: "buyer-intake",
  name: "Buyer Questionnaire",
  kind: "form",
  template: "magnet",
  headline: "Let's find your San Antonio home.",
  subhead:
    "Five minutes now saves hours later — your answers shape everything we send you. There are no wrong answers.",
  ctaLabel: "Submit my answers",
  calendlyUrl: "https://calendly.com/truthclark/buying-strategy-call",
  thanksNote:
    "Your answers are locked in. We'll review everything before we talk so we don't waste a minute of your time.",
  fields: [
    { key: "q0", label: "Are you active military or a veteran?", type: "select", options: ["Yes — Active Duty", "Yes — Veteran", "No"], required: true },
    { key: "q1", label: "What is your current pre-approval status?", type: "select", options: ["I'm pre-approved and ready", "I'm working on it", "I haven't started yet"], required: true },
    { key: "q2", label: "What's your price range?", type: "select", options: ["Under $200K", "$200K–$250K", "$250K–$300K", "$300K–$350K", "$350K–$400K", "$400K–$450K", "$450K–$500K", "$500K–$600K", "$600K–$750K", "$750K+"], required: true },
    { key: "q3", label: "When are you looking to purchase?", type: "select", options: ["Under 30 days", "1–3 months", "3–6 months", "6–12 months", "Just exploring"], required: true },
    { key: "q4", label: "What type of home are you interested in?", type: "select", options: ["New Construction", "Pre-Owned (Resale)", "Open to Both"], required: true },
    { key: "q5", label: "Top 3 neighborhoods or areas of interest", type: "long" },
    { key: "q6", label: "What is your current living situation?", type: "select", options: ["Renting (lease ending soon)", "Renting (flexible timeline)", "Own a home and need to sell", "Living on base or barracks", "Other"], required: true },
    { key: "q7", label: "If renting, when does your lease end?", type: "text" },
    { key: "q8", label: "What's most important to you in your next home?", type: "long" },
  ],
};

const SELLER_INTAKE: Partial<Funnel> = {
  slug: "seller-intake",
  name: "Seller Questionnaire",
  kind: "form",
  template: "magnet",
  headline: "Let's get your home sold right.",
  subhead:
    "A few questions so your listing consultation is about strategy, not paperwork.",
  ctaLabel: "Submit my answers",
  calendlyUrl: "https://calendly.com/truthclark/listing-consultation-clone",
  thanksNote:
    "Got it — we'll pull comps and market data for your home before we meet.",
  fields: [
    { key: "q0", label: "Property address", type: "text", required: true },
    { key: "q1", label: "Why are you selling?", type: "select", options: ["Upsizing", "Downsizing", "PCS or relocating", "Investment change", "Other"], required: true },
    { key: "q2", label: "When do you want to be sold?", type: "select", options: ["ASAP", "1–3 months", "3–6 months", "6+ months", "Just exploring"], required: true },
    { key: "q3", label: "The home is currently…", type: "select", options: ["Owner-occupied", "Tenant-occupied", "Vacant"], required: true },
    { key: "q4", label: "Do you have a price in mind?", type: "text" },
    { key: "q5", label: "Recent updates or repairs we should know about?", type: "long" },
    { key: "q6", label: "Are you buying another home after selling?", type: "select", options: ["Yes — locally", "Yes — out of town", "No", "Not sure"] },
    { key: "q7", label: "Anything else we should know?", type: "long" },
  ],
};

const GET_TO_KNOW: Partial<Funnel> = {
  slug: "get-to-know-you",
  name: "Get To Know You",
  kind: "form",
  template: "magnet",
  headline: "Help us get to know you.",
  subhead:
    "The little things make the difference between an agent and YOUR agent.",
  ctaLabel: "Send it in",
  thanksNote: "Thanks! This is exactly how we make this feel less like a transaction and more like a team.",
  fields: [
    { key: "q0", label: "How do you prefer to communicate?", type: "select", options: ["Text", "Call", "Email"], required: true },
    { key: "q1", label: "Best time to reach you?", type: "select", options: ["Morning", "Midday", "Evening"] },
    { key: "q2", label: "Tell us about your household — kids, pets, who's moving with you?", type: "long" },
    { key: "q3", label: "What does the perfect home feel like when you walk in?", type: "long" },
    { key: "q4", label: "Coffee order or favorite treat?", type: "text" },
    { key: "q5", label: "Anything you want us to know?", type: "long" },
  ],
};

function FunnelForm({ funnel, starter }: { funnel?: Funnel; starter?: Partial<Funnel> }) {
  const { close } = useModal();
  const f = funnel ?? (starter as Funnel | undefined);
  const [kind, setKind] = useState<"funnel" | "form">(f?.kind === "form" ? "form" : "funnel");
  const isForm = kind === "form";
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
      <input type="hidden" name="coverNameKeep" value={funnel?.coverName ?? ""} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="What is this?">
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value as "funnel" | "form")} className={inputCls}>
            <option value="funnel">Funnel — submissions become leads</option>
            <option value="form">Intake form — responses go to an inbox</option>
          </select>
        </Field>
        <Field label="URL slug (yoursite/f/…)">
          <input name="slug" defaultValue={f?.slug} required className={inputCls} placeholder="buyer-intake" />
        </Field>
        <Field label={isForm ? "Form name" : "Internal name (becomes lead source)"}>
          <input name="name" defaultValue={f?.name} required className={inputCls} />
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

      {!isForm && (
        <>
          <Field label="Type">
            <select name="template" defaultValue={f?.template ?? "magnet"} className={inputCls}>
              <option value="magnet">Free resource (lead magnet)</option>
              <option value="call">Book a call</option>
            </select>
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
        </>
      )}

      <QuestionsEditor initial={f?.fields ?? []} />
      {isForm && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cover photo (JPG/PNG, ≤2.5MB)">
            <input name="coverFile" type="file" accept="image/*" className={cn(inputCls, "py-2")} />
            {funnel?.coverName && (
              <p className="mt-1 text-[11px] text-ink-faint">Current: {funnel.coverName}</p>
            )}
          </Field>
          <Field label="…or photo URL">
            <input name="coverUrl" defaultValue={f?.coverUrl} className={inputCls} placeholder="https://… (a listing photo works great)" />
          </Field>
        </div>
      )}
      <Field label="Thank-you message (shown after they submit)">
        <input name="thanksNote" defaultValue={f?.thanksNote} className={inputCls} placeholder="Got it — we'll be in touch shortly." />
      </Field>
      <Field label="Calendly link (embedded after submit — optional)">
        <input name="calendlyUrl" defaultValue={f?.calendlyUrl} className={inputCls} placeholder="https://calendly.com/…" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" value="true" defaultChecked={f?.active !== false} className="accent-[#05c3f9]" />
        Live (unchecked = page shows &ldquo;not available&rdquo;)
      </label>
      <PrimaryBtn>{funnel ? "Save changes" : isForm ? "Create form" : "Create funnel"}</PrimaryBtn>
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

function StarterButton({ label, starter, note }: { label: string; starter: Partial<Funnel>; note: string }) {
  return (
    <Modal
      title={`${label} — starter`}
      wide
      trigger={
        <button className="flex items-center gap-1.5 rounded-xl border border-elevate-200 bg-elevate-50 px-3.5 py-2 text-sm font-semibold text-elevate-800 transition hover:bg-elevate-100">
          <Rocket size={15} /> {label}
        </button>
      }
    >
      <p className="mb-3 rounded-xl bg-chalk px-4 py-3 text-xs text-ink-muted">{note}</p>
      <FunnelForm starter={starter} />
    </Modal>
  );
}

export function FunnelList({ funnels, isAdmin }: { funnels: Funnel[]; isAdmin: boolean }) {
  const [tab, setTab] = useState<"funnel" | "form">("funnel");
  const list = funnels.filter((f) => (f.kind === "form" ? "form" : "funnel") === tab);
  const count = (k: string) => funnels.filter((f) => (f.kind === "form" ? "form" : "funnel") === k).length;
  const usedSlugs = new Set(funnels.map((f) => f.slug));

  return (
    <div>
      {/* kind tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {([
          ["funnel", "Funnels", Rocket],
          ["form", "Intake forms", ClipboardList],
        ] as const).map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition",
              tab === k ? "bg-ink text-white" : "border border-mist bg-white text-ink-muted hover:text-ink"
            )}
          >
            <Icon size={12} /> {label}
            <span className={cn("rounded-full px-1.5 text-[10px] font-bold", tab === k ? "bg-white/20" : "bg-mist text-ink-muted")}>
              {count(k)}
            </span>
          </button>
        ))}
      </div>

      {isAdmin && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Modal
            title={tab === "form" ? "New intake form" : "New funnel"}
            wide
            trigger={
              <button className="flex items-center gap-1.5 rounded-xl bg-elevate-500 px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400">
                <Plus size={15} /> {tab === "form" ? "New form" : "New funnel"}
              </button>
            }
          >
            <FunnelForm starter={tab === "form" ? { kind: "form", template: "magnet" } : undefined} />
          </Modal>
          {tab === "funnel" && !usedSlugs.has("pcs-checklist") && (
            <StarterButton
              label="Start with the PCS checklist"
              starter={PCS_STARTER}
              note="Pre-filled for your military niche. Upload your PCS Compass PDF, tweak the copy, and it's live."
            />
          )}
          {tab === "form" && !usedSlugs.has("buyer-intake") && (
            <StarterButton
              label="Buyer Questionnaire"
              starter={BUYER_INTAKE}
              note="Field-for-field from your Jotform buyer intake blueprint — every question, option, and required flag."
            />
          )}
          {tab === "form" && !usedSlugs.has("seller-intake") && (
            <StarterButton
              label="Seller Questionnaire"
              starter={SELLER_INTAKE}
              note="A starting point for listing intake — edit the questions to match your consult flow."
            />
          )}
          {tab === "form" && !usedSlugs.has("get-to-know-you") && (
            <StarterButton
              label="Get To Know You"
              starter={GET_TO_KNOW}
              note="The personal-touch form: communication style, household, and closing-gift intel."
            />
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((f) => {
          const isForm = f.kind === "form";
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
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{isForm ? "Responses" : "Leads"}</p>
                </div>
                <div className="rounded-xl bg-chalk/80 py-2">
                  <p className="flex items-center justify-center gap-1 font-display text-lg font-bold"><Percent size={13} className="text-ink-faint" />{conv}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Conversion</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <CopyLink slug={f.slug} />
                {isForm && (
                  <Link
                    href={`/funnels/${f.id}`}
                    className="flex items-center gap-1.5 rounded-lg border border-mist px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-elevate-300 hover:text-elevate-700"
                  >
                    <Inbox size={12} /> Responses
                  </Link>
                )}
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
                        if (!confirm(`Delete "${f.name}"? The page goes offline immediately.`)) e.preventDefault();
                      }}
                      className="ml-auto"
                    >
                      <input type="hidden" name="id" value={f.id} />
                      <button className="rounded-lg p-1.5 text-ink-faint transition hover:bg-rose-50 hover:text-rose-600" aria-label="Delete">
                        <Trash2 size={13} />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {list.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-ink-faint">
            {tab === "form"
              ? "No intake forms yet — start with the Buyer Questionnaire."
              : "No funnels yet — start with the PCS checklist."}
          </p>
        )}
      </div>
    </div>
  );
}
