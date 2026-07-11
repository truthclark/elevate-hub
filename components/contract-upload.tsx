"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, Check, AlertTriangle } from "lucide-react";

// "Upload the contract, the dates fill themselves."
// Sits inside the deal form; writes straight into the sibling inputs.

export default function ContractUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const form = e.target.form;
    if (!file || !form) return;
    setState("busy");
    setMsg("");
    try {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunk)));
      }
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf: btoa(bin), mime: file.type || "application/pdf" }),
      });
      const data = (await res.json()) as Record<string, string | number | null> & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error || "Extraction failed");

      const set = (name: string, v: string | number | null | undefined) => {
        if (v == null || v === "") return false;
        const el = form.elements.namedItem(name);
        if (el instanceof HTMLInputElement && !el.value) {
          el.value = String(v);
          return true;
        }
        return false;
      };
      let filled = 0;
      for (const f of ["contractDate", "optionDeadline", "financingDeadline", "closeDate"]) {
        if (set(f, data[f] as string)) filled++;
      }
      if (set("price", data.price)) filled++;
      if (set("address", data.address as string)) filled++;
      setState("done");
      setMsg(filled > 0 ? `Filled ${filled} field${filled === 1 ? "" : "s"} — double-check before saving` : "Nothing new found in the contract");
    } catch (err) {
      setState("error");
      setMsg((err as Error).message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <span className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        onChange={onFile}
        className="hidden"
        id="contract-upload"
      />
      <button
        type="button"
        disabled={state === "busy"}
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-1.5 rounded-lg border border-dashed border-elevate-300 px-2.5 py-1.5 text-xs font-semibold text-elevate-700 transition hover:bg-elevate-50"
      >
        {state === "busy" ? <Loader2 size={12} className="animate-spin" /> : <FileUp size={12} />}
        {state === "busy" ? "Reading contract…" : "Upload contract to auto-fill"}
      </button>
      {msg && (
        <span className={`flex items-center gap-1 text-[11px] ${state === "error" ? "text-rose-600" : "text-emerald-700"}`}>
          {state === "error" ? <AlertTriangle size={11} /> : <Check size={11} />}
          {msg}
        </span>
      )}
    </span>
  );
}
