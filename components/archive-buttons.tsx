"use client";

import { restoreRecord, destroyRecord } from "@/app/actions";
import { ArchiveRestore, Trash2 } from "lucide-react";

export function RestoreBtn({ kind, id }: { kind: string; id: number }) {
  return (
    <form action={restoreRecord}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200">
        <ArchiveRestore size={13} /> Restore
      </button>
    </form>
  );
}

export function DestroyBtn({ kind, id, name }: { kind: string; id: number; name: string }) {
  return (
    <form
      action={destroyRecord}
      onSubmit={(e) => {
        if (!confirm(`Permanently delete ${name}? This cannot be undone — it will be gone from the archive too.`))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <button className="flex items-center gap-1 rounded-lg bg-rose-100 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-200">
        <Trash2 size={13} /> Delete forever
      </button>
    </form>
  );
}
