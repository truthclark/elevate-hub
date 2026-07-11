"use client";

import { useState, useTransition } from "react";
import { enableShare, disableShare } from "@/app/actions";
import { Link2, Check, Loader2, Link2Off } from "lucide-react";

// Toggle + copy the public client timeline link for a deal.
export default function ShareButton({
  dealId,
  token,
}: {
  dealId: number;
  token?: string;
}) {
  const [current, setCurrent] = useState(token ?? "");
  const [copied, setCopied] = useState(false);
  const [busy, startTransition] = useTransition();

  const copy = async (t: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/t/${t}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // clipboard blocked — the link is still visible in the title attr
    }
  };

  if (!current) {
    return (
      <button
        disabled={busy}
        onClick={() =>
          startTransition(async () => {
            const t = await enableShare(dealId);
            setCurrent(t);
            if (t) await copy(t);
          })
        }
        className="flex items-center gap-1.5 rounded-lg border border-mist px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition hover:border-elevate-300 hover:text-elevate-700"
        title="Create a read-only timeline link for the client"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
        Client link
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <button
        onClick={() => copy(current)}
        className="flex items-center gap-1.5 rounded-lg bg-elevate-100 px-2.5 py-1.5 text-xs font-semibold text-elevate-800 transition hover:bg-elevate-200"
        title={`/t/${current}`}
      >
        {copied ? <Check size={12} /> : <Link2 size={12} />}
        {copied ? "Copied!" : "Copy client link"}
      </button>
      <button
        disabled={busy}
        onClick={() =>
          startTransition(async () => {
            await disableShare(dealId);
            setCurrent("");
          })
        }
        className="rounded-lg p-1.5 text-ink-faint transition hover:bg-mist hover:text-rose-500"
        title="Turn off the client link"
        aria-label="Disable client link"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Link2Off size={12} />}
      </button>
    </span>
  );
}
