"use client";

import { convertLeadToDeal, dealBackToLead, demoteDealToLead } from "@/app/actions";
import { ArrowRightCircle, RotateCcw, Undo2 } from "lucide-react";

// Lead → active client (creates deal + applies the matching SOP template)
export function ConvertLeadButton({ id, name }: { id: number; name: string }) {
  return (
    <form
      action={convertLeadToDeal}
      onSubmit={(e) => {
        if (!confirm(`Convert ${name} into an active client? This creates a deal and kicks off the SOP tasks.`))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
        title="Convert to client"
      >
        <ArrowRightCircle size={13} /> Convert
      </button>
    </form>
  );
}

// Active deal → back to Leads (the conversion fizzled)
export function DemoteToLeadButton({ id, name }: { id: number; name: string }) {
  return (
    <form
      action={demoteDealToLead}
      onSubmit={(e) => {
        if (
          !confirm(
            `Kick ${name} back to Leads? Their client record is archived (restorable), open auto-tasks are removed, and they reappear in Leads as Nurture.`
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        className="flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-200"
        title="Back to Leads"
      >
        <Undo2 size={13} /> To lead
      </button>
    </form>
  );
}

// Closed deal → nurture lead (past-client follow-up)
export function BackToLeadButton({ id, name }: { id: number; name: string }) {
  return (
    <form
      action={dealBackToLead}
      onSubmit={(e) => {
        if (!confirm(`Add ${name} back to Leads as a past-client nurture?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        className="flex items-center gap-1 rounded-lg bg-violet-100 px-2.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-200"
        title="Send back to Leads as nurture"
      >
        <RotateCcw size={13} /> Nurture
      </button>
    </form>
  );
}
