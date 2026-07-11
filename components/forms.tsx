"use client";

import { Modal, ControlledModal, Field, inputCls, PrimaryBtn, useModal } from "./modal";
import {
  saveDeal,
  deleteDeal,
  saveLead,
  deleteLead,
  saveTask,
  deleteTask,
  saveMember,
  deleteMember,
} from "@/app/actions";
import { Deal, Lead, TaskItem, TeamMember, TaskTemplate, Checklists, Side, CHECKLIST_TITLES, DEFAULT_CHECKLISTS, LEAD_CHECKLIST } from "@/lib/types";
import AddressInput from "./address-input";
import ContractUpload from "./contract-upload";
import { toInputDate } from "@/lib/utils";
import { PhotoField } from "./image-upload";
import { useState } from "react";
import { Plus, Pencil, Trash2, Archive } from "lucide-react";
import { fireConfetti } from "@/lib/confetti";

// Shared triggers
export function AddButton({ label }: { label: string }) {
  return (
    <button className="flex items-center gap-1.5 rounded-xl bg-elevate-500 px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-elevate-400">
      <Plus size={15} /> {label}
    </button>
  );
}
export function EditIcon() {
  return (
    <button className="rounded-lg p-1.5 text-ink-faint transition hover:bg-mist hover:text-ink" aria-label="Edit">
      <Pencil size={14} />
    </button>
  );
}

function DeleteBtn({
  action,
  id,
  label,
  verb = "Delete",
  note,
}: {
  action: (fd: FormData) => Promise<void>;
  id: number;
  label: string;
  verb?: string;
  note?: string;
}) {
  const { close } = useModal();
  return (
    <form
      action={async (fd) => {
        await action(fd);
        close();
      }}
      onSubmit={(e) => {
        if (!confirm(`${verb} ${label}?${note ? ` ${note}` : ""}`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
      >
        {verb === "Archive" ? <Archive size={14} /> : <Trash2 size={14} />} {verb}
      </button>
    </form>
  );
}

function SubmitForm({
  action,
  children,
}: {
  action: (fd: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  const { close } = useModal();
  return (
    <form
      action={async (fd) => {
        await action(fd);
        close();
      }}
      className="space-y-3"
    >
      {children}
    </form>
  );
}

const STATUSES = ["Active", "Showing", "Under Contract", "Option", "Pending", "Closed", "On Hold", "Lost", "Referred"];
export const DEAL_STATUSES = STATUSES;

// ── Deal form (shared by Modal + controlled Editor) ──────────────
// Saving a deal as Closed (when it wasn't before) deserves a moment.
function saveDealCelebrating(before?: Deal) {
  return async (fd: FormData) => {
    await saveDeal(fd);
    if (String(fd.get("status")) === "Closed" && before?.status !== "Closed") {
      fireConfetti();
    }
  };
}

// One-off money adjustments on a deal: buyer credits, one-time brokerage
// fees, bonuses. Positive = cost (reduces team net); negative = income.
function AdjustmentsEditor({ initial }: { initial?: { label: string; amount: number }[] }) {
  // Amounts stay as free text while typing ("-250", "1,500.50", "$40" all fine);
  // the server strips symbols and parses on save.
  const [adjs, setAdjs] = useState<{ label: string; amount: string }[]>(
    (initial ?? []).map((a) => ({ label: a.label, amount: String(a.amount) }))
  );
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">
          One-off fees & credits
        </p>
        <button
          type="button"
          onClick={() => setAdjs([...adjs, { label: "", amount: "" }])}
          className="flex items-center gap-1 text-xs font-semibold text-elevate-600 hover:underline"
        >
          <Plus size={12} /> Add line
        </button>
      </div>
      {adjs.length > 0 && (
        <div className="mt-2 space-y-2">
          {adjs.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                name="adjLabel"
                value={a.label}
                onChange={(e) => setAdjs(adjs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                placeholder="e.g. Buyer credit, brokerage fee"
                className={`${inputCls} min-w-0 flex-1`}
              />
              <input
                name="adjAmount"
                value={a.amount}
                onChange={(e) =>
                  setAdjs(adjs.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))
                }
                placeholder="$"
                inputMode="decimal"
                className={`${inputCls} w-28`}
              />
              <button
                type="button"
                onClick={() => setAdjs(adjs.filter((_, j) => j !== i))}
                className="shrink-0 rounded p-1.5 text-ink-faint hover:bg-mist hover:text-rose-500"
                aria-label="Remove line"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <p className="text-[11px] text-ink-faint">
            Positive $ = cost that reduces team net (credits, one-time fees). Use a negative
            number for one-off income. Shows in the GCI breakdown under Fees.
          </p>
        </div>
      )}
    </div>
  );
}

function DealFormBody({
  d,
  agents,
  templates,
  defaultSide,
  checklists = DEFAULT_CHECKLISTS,
}: {
  d?: Deal;
  agents: string[];
  templates: TaskTemplate[];
  defaultSide?: string;
  checklists?: Checklists;
}) {
  const [side, setSide] = useState<Side>((d?.side ?? defaultSide ?? "Buyer") as Side);
  const items = checklists[side] ?? [];
  return (
    <>
      {d && <input type="hidden" name="id" value={d.id} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Side">
          <select
            name="side"
            value={side}
            onChange={(e) => setSide(e.target.value as Side)}
            className={inputCls}
          >
            <option>Buyer</option><option>Listing</option><option>Referral</option>
          </select>
        </Field>
        <Field label="Client name">
          <input name="name" defaultValue={d?.name} required className={inputCls} />
        </Field>
        <Field label="Property address">
          <AddressInput name="address" defaultValue={d?.address} />
        </Field>
        <Field label="Agent">
          <input name="agent" defaultValue={d?.agent} list="agent-list" className={inputCls} />
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={d?.status ?? "Active"} className={inputCls}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Close goal (month)">
          <input name="closeGoal" defaultValue={d?.closeGoal} placeholder="Aug" className={inputCls} />
        </Field>
        <Field label="Source">
          <input name="source" defaultValue={d?.source} placeholder="SOI, Social…" className={inputCls} />
        </Field>
        <Field label="Referred by">
          <input name="referredBy" defaultValue={d?.referredBy} className={inputCls} />
        </Field>
        <Field label="Lender">
          <input name="lender" defaultValue={d?.lender} className={inputCls} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-faint">Contract dates</p>
        <ContractUpload />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {([
          ["contractDate", "Contract", d?.contractDate],
          ["optionDeadline", "Option ends", d?.optionDeadline],
          ["inspDate", "Inspection", d?.inspDate],
          ["financingDeadline", "Financing", d?.financingDeadline],
          ["appraisalDeadline", "Appraisal", d?.appraisalDeadline],
          ["closeDate", "Closing", d?.closeDate],
        ] as const).map(([name, label, val]) => (
          <Field key={name} label={label}>
            <input name={name} type="date" defaultValue={toInputDate(val ?? "")} className={inputCls} />
          </Field>
        ))}
      </div>

      <p className="pt-1 text-xs font-bold uppercase tracking-wide text-ink-faint">Money</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Sales price">
          <input name="price" defaultValue={d?.price ?? ""} className={inputCls} />
        </Field>
        <Field label="Comm %">
          <input name="commPct" defaultValue={d?.commPct ?? ""} placeholder="3" className={inputCls} />
        </Field>
        <Field label="Referral % out">
          <input name="referralPct" defaultValue={d?.referralPct ?? ""} className={inputCls} />
        </Field>
        <Field label="GCI (auto if blank)">
          <input name="gci" defaultValue={d?.gci ?? ""} className={inputCls} />
        </Field>
      </div>
      <AdjustmentsEditor initial={d?.adjustments} />

      <p className="pt-1 text-xs font-bold uppercase tracking-wide text-ink-faint">
        {CHECKLIST_TITLES[side]}
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {items.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 rounded-lg border border-mist px-2.5 py-1.5 text-sm">
            <input
              type="checkbox"
              name={`check_${key}`}
              defaultChecked={(d?.checklist?.[key] ?? "").toLowerCase().startsWith("y")}
              className="accent-[#05c3f9]"
            />
            {label}
          </label>
        ))}
        {items.length === 0 && (
          <p className="col-span-full text-xs text-ink-faint">
            No checklist items for this side yet — add them in Settings.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Closed date (when done)">
          <input name="closedDate" type="date" defaultValue={toInputDate(d?.closedDate ?? "")} className={inputCls} />
        </Field>
        <Field label="Year">
          <input name="year" defaultValue={d?.year ?? new Date().getFullYear()} className={inputCls} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea name="notes" defaultValue={d?.notes} rows={2} className={inputCls} />
      </Field>

      {templates.length > 0 && (
        <Field label={d ? "Apply task template now (e.g. just went under contract)" : "Apply task template (auto-creates SOP tasks)"}>
          <select name="applyTemplate" defaultValue="" className={inputCls}>
            <option value="">{d ? "Don't add tasks" : "None"}</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.items.length} tasks)</option>
            ))}
          </select>
        </Field>
      )}

      <datalist id="agent-list">
        {agents.map((a) => <option key={a} value={a} />)}
      </datalist>
      <PrimaryBtn>{d ? "Save changes" : "Add deal"}</PrimaryBtn>
    </>
  );
}

export function DealModal({
  deal,
  agents,
  templates,
  defaultSide,
  trigger,
  checklists,
}: {
  deal?: Deal;
  agents: string[];
  templates: TaskTemplate[];
  defaultSide?: string;
  trigger: React.ReactNode;
  checklists?: Checklists;
}) {
  return (
    <Modal trigger={trigger} title={deal ? `Edit — ${deal.address || deal.name}` : "New deal"} wide>
      <SubmitForm action={saveDealCelebrating(deal)}>
        <DealFormBody d={deal} agents={agents} templates={templates} defaultSide={defaultSide} checklists={checklists} />
      </SubmitForm>
      {deal && (
        <div className="mt-3">
          <DeleteBtn
            action={deleteDeal}
            id={deal.id}
            label={deal.address || deal.name}
            verb="Archive"
            note="You can restore it from the Archive page."
          />
        </div>
      )}
    </Modal>
  );
}

// Controlled editor for row-click tables
export function DealEditor({
  deal,
  agents,
  templates,
  onClose,
  checklists,
}: {
  deal: Deal | null;
  agents: string[];
  templates: TaskTemplate[];
  onClose: () => void;
  checklists?: Checklists;
}) {
  return (
    <ControlledModal
      open={deal != null}
      onClose={onClose}
      title={deal ? `Edit — ${deal.address || deal.name}` : ""}
      wide
    >
      {deal && (
        <>
          <SubmitForm action={saveDealCelebrating(deal)}>
            <DealFormBody d={deal} agents={agents} templates={templates} checklists={checklists} />
          </SubmitForm>
          <div className="mt-3">
            <DeleteBtn
              action={deleteDeal}
              id={deal.id}
              label={deal.address || deal.name}
              verb="Archive"
              note="You can restore it from the Archive page."
            />
          </div>
        </>
      )}
    </ControlledModal>
  );
}

// ── Lead form ────────────────────────────────────────────────────
function LeadFormBody({ l, agents }: { l?: Lead; agents: string[] }) {
  return (
    <>
      {l && <input type="hidden" name="id" value={l.id} />}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name"><input name="name" defaultValue={l?.name} required className={inputCls} /></Field>
        <Field label="Date"><input name="date" type="date" defaultValue={toInputDate(l?.date ?? "")} className={inputCls} /></Field>
        <Field label="Phone"><input name="phone" defaultValue={l?.phone} className={inputCls} /></Field>
        <Field label="Email"><input name="email" defaultValue={l?.email} className={inputCls} /></Field>
        <Field label="Source">
          <select name="source" defaultValue={l?.source ?? "SOI"} className={inputCls}>
            {["SOI", "Client Referral", "Agent Referral", "Social Media", "Open House", "Sign Call", "Zillow", "Past Client", "Other"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select name="type" defaultValue={l?.type ?? "Buyer"} className={inputCls}>
            {["Buyer", "Seller", "Investor", "VA"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Timeline">
          <select name="timeline" defaultValue={l?.timeline ?? "0-3 months"} className={inputCls}>
            {["0-3 months", "3-6 months", "6-12 months", "12+ months"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Budget"><input name="budget" defaultValue={l?.budget} placeholder="$400K" className={inputCls} /></Field>
        <Field label="Area of interest"><input name="area" defaultValue={l?.area} className={inputCls} /></Field>
        <Field label="Assigned agent">
          <input name="agent" defaultValue={l?.agent} list="agent-list2" className={inputCls} />
          <datalist id="agent-list2">{agents.map((a) => <option key={a} value={a} />)}</datalist>
        </Field>
        <Field label="Follow-up status">
          <select name="followUpStatus" defaultValue={l?.followUpStatus ?? "New — needs first call"} className={inputCls}>
            {["New — needs first call", "Hot — consult booked", "Warm — CMA sent", "Nurture", "Cold", "Converted", "Lost"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Last contact"><input name="lastContact" type="date" defaultValue={toInputDate(l?.lastContact ?? "")} className={inputCls} /></Field>
      </div>
      <p className="pt-1 text-xs font-bold uppercase tracking-wide text-ink-faint">
        Qualification — carries over when converted
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LEAD_CHECKLIST.map((it) => (
          <label key={it.key} className="flex items-center gap-2 rounded-lg border border-mist px-2.5 py-2 text-sm">
            <input
              type="checkbox"
              name={`check_${it.key}`}
              defaultChecked={Boolean(l?.checklist?.[it.key])}
              className="accent-[#05c3f9]"
            />
            {it.label}
          </label>
        ))}
      </div>
      <Field label="Notes"><textarea name="notes" defaultValue={l?.notes} rows={2} className={inputCls} /></Field>
      <PrimaryBtn>{l ? "Save changes" : "Add lead"}</PrimaryBtn>
    </>
  );
}

export function LeadModal({
  lead,
  agents,
  trigger,
}: {
  lead?: Lead;
  agents: string[];
  trigger: React.ReactNode;
}) {
  return (
    <Modal trigger={trigger} title={lead ? `Edit lead — ${lead.name}` : "New lead"} wide>
      <SubmitForm action={saveLead}>
        <LeadFormBody l={lead} agents={agents} />
      </SubmitForm>
      {lead && (
        <div className="mt-3">
          <DeleteBtn
            action={deleteLead}
            id={lead.id}
            label={lead.name}
            verb="Archive"
            note="You can restore it from the Archive page."
          />
        </div>
      )}
    </Modal>
  );
}

export function LeadEditor({
  lead,
  agents,
  onClose,
}: {
  lead: Lead | null;
  agents: string[];
  onClose: () => void;
}) {
  return (
    <ControlledModal open={lead != null} onClose={onClose} title={lead ? `Edit lead — ${lead.name}` : ""} wide>
      {lead && (
        <>
          <SubmitForm action={saveLead}>
            <LeadFormBody l={lead} agents={agents} />
          </SubmitForm>
          <div className="mt-3">
            <DeleteBtn
              action={deleteLead}
              id={lead.id}
              label={lead.name}
              verb="Archive"
              note="You can restore it from the Archive page."
            />
          </div>
        </>
      )}
    </ControlledModal>
  );
}

// ── Task form ────────────────────────────────────────────────────
export function TaskModal({
  task,
  team,
  trigger,
  defaults,
}: {
  task?: TaskItem;
  team: string[];
  trigger: React.ReactNode;
  defaults?: { dealId?: number; relatedClient?: string };
}) {
  const t = task;
  const dealId = t?.dealId ?? defaults?.dealId;
  return (
    <Modal trigger={trigger} title={t ? "Edit task" : "New task"}>
      <SubmitForm action={saveTask}>
        {t && <input type="hidden" name="id" value={t.id} />}
        {dealId != null && <input type="hidden" name="dealId" value={dealId} />}
        <Field label="Task"><input name="task" defaultValue={t?.task} required className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date"><input name="dueDate" type="date" defaultValue={toInputDate(t?.dueDate ?? "")} className={inputCls} /></Field>
          <Field label="Time (optional)"><input name="dueTime" type="time" defaultValue={t?.dueTime ?? ""} className={inputCls} /></Field>
          <Field label="Assigned to">
            <select name="assignedTo" defaultValue={t?.assignedTo ?? ""} className={inputCls}>
              <option value="">Unassigned</option>
              {team.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select name="priority" defaultValue={t?.priority ?? "Medium"} className={inputCls}>
              <option>High</option><option>Medium</option><option>Low</option>
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={t?.status ?? "Open"} className={inputCls}>
              <option>Open</option><option>Done</option>
            </select>
          </Field>
          <Field label="Repeats">
            <select name="recur" defaultValue={t?.recur ?? ""} className={inputCls}>
              <option value="">Never</option>
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays (Mon–Fri)</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
        </div>
        <Field label="Related client / property"><input name="relatedClient" defaultValue={t?.relatedClient ?? defaults?.relatedClient} className={inputCls} /></Field>
        <Field label="Notes"><input name="notes" defaultValue={t?.notes} className={inputCls} /></Field>
        <PrimaryBtn>{t ? "Save changes" : "Add task"}</PrimaryBtn>
      </SubmitForm>
      {t && <div className="mt-3"><DeleteBtn action={deleteTask} id={t.id} label="this task" /></div>}
    </Modal>
  );
}

// ── Team member form (admin) ─────────────────────────────────────
export function MemberModal({
  member,
  trigger,
}: {
  member?: TeamMember;
  trigger: React.ReactNode;
}) {
  const m = member;
  return (
    <Modal trigger={trigger} title={m ? `Edit — ${m.name}` : "Add team member"}>
      <SubmitForm action={saveMember}>
        {m && <input type="hidden" name="id" value={m.id} />}
        <Field label="Photo">
          <PhotoField current={m?.photo} name="photo" />
        </Field>
        <Field label="Name"><input name="name" defaultValue={m?.name} required className={inputCls} /></Field>
        <Field label="Roles (check all that apply)">
          <div className="grid grid-cols-3 gap-1.5">
            {(["Admin", "Agent", "Ops"] as const).map((r) => (
              <label key={r} className="flex items-center gap-2 rounded-lg border border-mist px-2.5 py-2 text-sm">
                <input
                  type="checkbox"
                  name={`role_${r}`}
                  defaultChecked={(m?.role ?? "Agent").includes(r)}
                  className="accent-[#05c3f9]"
                />
                {r}
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-ink-faint">
            Admin = full control · Agent = deal work · Ops = checklists & admin tasks
          </p>
        </Field>
        <Field label="Google email (grants sign-in access)">
          <input name="email" type="email" defaultValue={m?.email} placeholder="name@gmail.com" className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input name="phone" defaultValue={m?.phone} className={inputCls} /></Field>
          <Field label="Color">
            <input name="color" type="color" defaultValue={m?.color ?? "#05c3f9"} className="h-9 w-full cursor-pointer rounded-lg border border-mist" />
          </Field>
        </div>
        <Field label="Focus / accountabilities (EOS seat)">
          <textarea name="focus" defaultValue={m?.focus} rows={2} className={inputCls} />
        </Field>
        <Field label="Calendar feed URL (optional — shows appointments in My Day)">
          <input name="calendarUrl" defaultValue={m?.calendarUrl} placeholder="Google Calendar → Settings → Secret address in iCal format" className={inputCls} />
        </Field>
        <Field label="Access">
          <select name="active" defaultValue={String(m?.active ?? true)} className={inputCls}>
            <option value="true">Active — can sign in</option>
            <option value="false">Inactive — access revoked</option>
          </select>
        </Field>
        <PrimaryBtn>{m ? "Save changes" : "Add member"}</PrimaryBtn>
      </SubmitForm>
      {m && <div className="mt-3"><DeleteBtn action={deleteMember} id={m.id} label={m.name} /></div>}
    </Modal>
  );
}
