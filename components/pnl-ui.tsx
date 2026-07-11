"use client";

import { Modal, Field, inputCls, PrimaryBtn, useModal } from "./modal";
import { savePnl, deletePnl, stopRecurringPnl } from "@/app/actions";
import { PnlEntry } from "@/lib/types";
import { fmtMoney, cn } from "@/lib/utils";
import { Plus, Trash2, Bot, Repeat, CircleStop } from "lucide-react";

const EXPENSE_CATS = ["Marketing", "Software", "Photography", "Staging", "Signage", "Client gifts", "Education", "Dues & MLS", "Office", "Other"];
const INCOME_CATS = ["Other income", "Referral fee received", "Bonus", "Adjustment"];

export function AddEntryButton({ defaultMonth }: { defaultMonth: string }) {
  return (
    <Modal
      title="Add P&L entry"
      trigger={
        <button className="flex items-center gap-1.5 rounded-xl bg-elevate-500 px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400">
          <Plus size={15} /> Add entry
        </button>
      }
    >
      <EntryForm defaultMonth={defaultMonth} />
    </Modal>
  );
}

function EntryForm({ defaultMonth }: { defaultMonth: string }) {
  const { close } = useModal();
  return (
    <form
      action={async (fd) => {
        await savePnl(fd);
        close();
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <select name="kind" defaultValue="Expense" className={inputCls}>
            <option>Expense</option>
            <option>Income</option>
          </select>
        </Field>
        <Field label="Month">
          <input name="month" type="month" defaultValue={defaultMonth} className={inputCls} />
        </Field>
      </div>
      <Field label="Category">
        <input name="category" list="pnl-cats" placeholder="Marketing, Software…" className={inputCls} />
        <datalist id="pnl-cats">
          {[...EXPENSE_CATS, ...INCOME_CATS].map((c) => <option key={c} value={c} />)}
        </datalist>
      </Field>
      <Field label="Description">
        <input name="description" placeholder="What was it for?" className={inputCls} />
      </Field>
      <Field label="Amount ($)">
        <input name="amount" required placeholder="450" className={inputCls} />
      </Field>
      <label className="flex items-start gap-2 rounded-xl border border-mist px-3 py-2.5 text-sm">
        <input type="checkbox" name="recurring" className="mt-0.5 accent-[#05c3f9]" />
        <span>
          <span className="font-medium">Repeats monthly</span>
          <span className="block text-xs text-ink-faint">
            Starts this month and adds itself each new month until you stop it.
            Nothing is created into the future.
          </span>
        </span>
      </label>
      <PrimaryBtn>Add entry</PrimaryBtn>
    </form>
  );
}

export function EntryRow({ e }: { e: PnlEntry }) {
  const isTemplate = Boolean(e.recurring) && e.recurOf == null;
  const stopped = isTemplate && Boolean(e.endMonth);
  return (
    <li className="flex items-center gap-3 rounded-xl border border-mist/70 bg-white px-3.5 py-2.5">
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          e.kind === "Income" ? "bg-emerald-500" : "bg-rose-400"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {e.description || e.category}
          {(isTemplate || e.recurOf != null) && (
            <Repeat size={12} className={stopped ? "text-ink-faint" : "text-elevate-600"} />
          )}
        </p>
        <p className="text-xs text-ink-faint">
          {e.category} · {e.month}
          {isTemplate && !stopped && " · repeats monthly"}
          {stopped && ` · stopped after ${e.endMonth}`}
        </p>
      </div>
      <span className={cn("text-sm font-bold", e.kind === "Income" ? "text-emerald-700" : "text-ink")}>
        {e.kind === "Income" ? "+" : "−"}{fmtMoney(e.amount)}
      </span>
      {isTemplate && !stopped && (
        <form
          action={stopRecurringPnl}
          onSubmit={(ev) => {
            if (!confirm("Stop this recurring entry? Months already logged stay.")) ev.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={e.id} />
          <button
            className="rounded-lg p-1.5 text-ink-faint transition hover:bg-amber-50 hover:text-amber-600"
            aria-label="Stop recurring"
            title="Stop repeating (keeps months already logged)"
          >
            <CircleStop size={13} />
          </button>
        </form>
      )}
      <form
        action={deletePnl}
        onSubmit={(ev) => {
          const msg = isTemplate
            ? "Remove this recurring entry AND all months it created?"
            : "Remove this entry?";
          if (!confirm(msg)) ev.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={e.id} />
        <button className="rounded-lg p-1.5 text-ink-faint transition hover:bg-mist hover:text-rose-500" aria-label="Delete entry">
          <Trash2 size={13} />
        </button>
      </form>
    </li>
  );
}

export function AutoIncomeRow({ label, amount }: { label: string; amount: number }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-3.5 py-2.5">
      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {label}
          <Bot size={13} className="text-emerald-600" />
        </p>
        <p className="text-xs text-ink-faint">Auto-calculated from closed deals (team net after splits)</p>
      </div>
      <span className="text-sm font-bold text-emerald-700">+{fmtMoney(amount)}</span>
    </li>
  );
}
