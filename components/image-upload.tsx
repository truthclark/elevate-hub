"use client";

import { useRef, useState } from "react";
import { saveBranding } from "@/app/actions";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Resize an image file to fit maxSize px and return a compact data URL.
async function fileToDataUrl(file: File, maxSize: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  // PNG keeps logo transparency; photos compress better as JPEG
  const isPhoto = file.type === "image/jpeg";
  return canvas.toDataURL(isPhoto ? "image/jpeg" : "image/png", 0.85);
}

// ── Team member photo field (sits inside the member form) ───────
export function PhotoField({ current, name }: { current?: string; name: string }) {
  const [preview, setPreview] = useState(current ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-mist bg-chalk",
          !preview && "text-ink-faint"
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Photo preview" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus size={18} />
        )}
      </div>
      <input type="hidden" name={name} value={preview} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setPreview(await fileToDataUrl(f, 256));
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border border-mist px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink"
      >
        {preview ? "Change photo" : "Upload photo"}
      </button>
      {preview && (
        <button
          type="button"
          onClick={() => setPreview("")}
          className="rounded-lg p-1.5 text-ink-faint hover:text-rose-500"
          aria-label="Remove photo"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

// ── Property photo field (deal form) — wide, hero-sized ──────────
export function PropertyPhotoField({ current, name }: { current?: string; name: string }) {
  const [preview, setPreview] = useState(current ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div
        className={cn(
          "flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border border-mist bg-chalk",
          !preview && "text-ink-faint"
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Property preview" className="h-full w-full object-cover" />
        ) : (
          <span className="flex items-center gap-2 text-xs">
            <ImagePlus size={16} /> No photo yet — listing photos look great here
          </span>
        )}
      </div>
      <input type="hidden" name={name} value={preview} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) setPreview(await fileToDataUrl(f, 1200));
        }}
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-mist px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:text-ink"
        >
          {preview ? "Change photo" : "Upload photo"}
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => setPreview("")}
            className="rounded-lg p-1.5 text-ink-faint hover:text-rose-500"
            aria-label="Remove photo"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Logo uploader (Settings page) ────────────────────────────────
export function LogoUploader({ current }: { current?: string }) {
  const [preview, setPreview] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const save = async (logo: string) => {
    setBusy(true);
    const fd = new FormData();
    fd.set("logo", logo);
    await saveBranding(fd);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-mist bg-chalk">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Logo preview" className="h-full w-full object-contain" />
        ) : (
          <span className="font-display text-xl font-bold text-ink-faint">E</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const url = await fileToDataUrl(f, 512);
          setPreview(url);
          await save(url);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-xl bg-elevate-500 px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
        {saved ? "Saved ✓" : preview ? "Change logo" : "Upload logo"}
      </button>
      {preview && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setPreview("");
            await save("");
          }}
          className="flex items-center gap-1 rounded-xl border border-mist px-3 py-2 text-sm text-ink-muted hover:text-rose-600"
        >
          <Trash2 size={13} /> Remove
        </button>
      )}
      <p className="w-full text-xs text-ink-faint sm:w-auto sm:max-w-[240px]">
        Square works best. Shows in the sidebar and becomes the browser tab icon
        (tab icons can take a hard refresh to update).
      </p>
    </div>
  );
}
