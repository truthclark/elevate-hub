"use client";

import { useState } from "react";
import { Modal, Field, inputCls, PrimaryBtn, useModal } from "./modal";
import { saveSop, deleteSop } from "@/app/actions";
import { Sop } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, BookOpen, Megaphone, Handshake, Settings2, ClipboardList, Film } from "lucide-react";

// Paste a YouTube or Vimeo link anywhere in an SOP and it renders as an
// embedded player in the reader view.
function videoEmbeds(content: string): { src: string; kind: string }[] {
  const out: { src: string; kind: string }[] = [];
  const yt = Array.from(
    content.matchAll(
      /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/g
    )
  );
  for (const m of yt) out.push({ src: `https://www.youtube.com/embed/${m[1]}`, kind: "YouTube" });
  const vm = Array.from(content.matchAll(/https?:\/\/(?:www\.)?vimeo\.com\/(\d+)/g));
  for (const m of vm) out.push({ src: `https://player.vimeo.com/video/${m[1]}`, kind: "Vimeo" });
  // de-dupe, cap at 4 players per SOP
  return out.filter((v, i) => out.findIndex((x) => x.src === v.src) === i).slice(0, 4);
}

export const SOP_CATEGORIES = ["Operations", "Sales", "Marketing", "Admin"] as const;

const CAT_META: Record<string, { icon: typeof BookOpen; color: string; bg: string }> = {
  Operations: { icon: Settings2, color: "#0a678c", bg: "#eefbff" },
  Sales: { icon: Handshake, color: "#047857", bg: "#effdf4" },
  Marketing: { icon: Megaphone, color: "#b45309", bg: "#fffaee" },
  Admin: { icon: ClipboardList, color: "#6d28d9", bg: "#f7f4ff" },
};

function SopForm({ sop, isAdmin }: { sop?: Sop; isAdmin: boolean }) {
  const { close } = useModal();
  return (
    <>
      <form
        action={async (fd) => {
          await saveSop(fd);
          close();
        }}
        className="space-y-3"
      >
        {sop && <input type="hidden" name="id" value={sop.id} />}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Title" className="col-span-2">
            <input name="title" defaultValue={sop?.title} required className={inputCls} />
          </Field>
          <Field label="Category">
            <select name="category" defaultValue={sop?.category ?? "Operations"} className={inputCls}>
              {SOP_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="How-to (steps, standards, owners)">
          <textarea
            name="content"
            defaultValue={sop?.content}
            rows={14}
            className={cn(inputCls, "font-mono text-[13px] leading-relaxed")}
            placeholder={"Purpose: …\n\n1. First step\n2. Second step\n\nOwner: … · Standard: …\n\nVideo walkthrough: paste a YouTube or Vimeo link on its own line and it becomes a player."}
          />
        </Field>
        <PrimaryBtn>{sop ? "Save SOP" : "Add SOP"}</PrimaryBtn>
      </form>
      {sop && isAdmin && (
        <form
          action={async (fd) => {
            await deleteSop(fd);
            close();
          }}
          onSubmit={(e) => {
            if (!confirm(`Delete "${sop.title}"?`)) e.preventDefault();
          }}
          className="mt-3"
        >
          <input type="hidden" name="id" value={sop.id} />
          <button className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
            <Trash2 size={14} /> Delete SOP
          </button>
        </form>
      )}
    </>
  );
}

export function SopLibrary({ sops, isAdmin }: { sops: Sop[]; isAdmin: boolean }) {
  const [cat, setCat] = useState<string>("All");
  const [query, setQuery] = useState("");
  const cats = ["All", ...SOP_CATEGORIES];
  const q = query.trim().toLowerCase();
  const shown = sops.filter(
    (s) =>
      (cat === "All" || s.category === cat) &&
      (!q || s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q))
  );

  return (
    <div>
      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search SOPs — titles and content…"
          className="w-full max-w-md rounded-xl border border-mist bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-elevate-400"
        />
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
              cat === c ? "bg-ink text-white" : "border border-mist bg-white text-ink-muted hover:text-ink"
            )}
          >
            {c}
            <span className="ml-1.5 text-xs opacity-60">
              {c === "All" ? sops.length : sops.filter((s) => s.category === c).length}
            </span>
          </button>
        ))}
        <div className="ml-auto">
          <Modal
            title="New SOP"
            wide
            trigger={
              <button className="flex items-center gap-1.5 rounded-xl bg-elevate-500 px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400">
                <Plus size={15} /> New SOP
              </button>
            }
          >
            <SopForm isAdmin={isAdmin} />
          </Modal>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((sop) => {
          const meta = CAT_META[sop.category] ?? CAT_META.Operations;
          const Icon = meta.icon;
          const preview = sop.content.split("\n").filter(Boolean).slice(0, 3).join(" · ");
          const videos = videoEmbeds(sop.content);
          return (
            <Modal
              key={sop.id}
              title={sop.title}
              wide
              trigger={
                <button className="card card-hover w-full p-5 text-left">
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-xl"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      <Icon size={17} />
                    </span>
                    <span className="chip" style={{ background: meta.bg, color: meta.color }}>
                      {sop.category}
                    </span>
                  </div>
                  <h3 className="font-display text-[15px] font-bold leading-snug">{sop.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-muted">{preview}</p>
                  <p className="mt-3 flex items-center gap-3 text-[11px] text-ink-faint">
                    <span className="flex items-center gap-1.5">
                      <Pencil size={11} /> {sop.updatedBy} · {sop.updatedAt}
                    </span>
                    {videos.length > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-elevate-600">
                        <Film size={11} /> {videos.length === 1 ? "Video" : `${videos.length} videos`}
                      </span>
                    )}
                  </p>
                </button>
              }
            >
              {videos.length > 0 && (
                <div className={cn("mb-4 grid gap-3", videos.length > 1 && "sm:grid-cols-2")}>
                  {videos.map((v) => (
                    <div key={v.src} className="overflow-hidden rounded-xl border border-mist bg-ink">
                      <iframe
                        src={v.src}
                        title={`${v.kind} video — ${sop.title}`}
                        className="aspect-video w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="mb-4 whitespace-pre-wrap rounded-xl bg-chalk p-4 text-sm leading-relaxed">
                {sop.content}
              </div>
              <details>
                <summary className="mb-3 cursor-pointer text-sm font-semibold text-elevate-700">
                  Edit this SOP
                </summary>
                <SopForm sop={sop} isAdmin={isAdmin} />
              </details>
            </Modal>
          );
        })}
        {shown.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-ink-faint">
            No SOPs in this category yet — add the first one.
          </p>
        )}
      </div>
    </div>
  );
}
