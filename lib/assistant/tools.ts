import { store } from "@/lib/store";
import { getAppData, pipelineStats, dealGci, isClosed, taskBuckets } from "@/lib/derive";
import { Deal, Lead, Side, TaskItem } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────
// Assistant tool layer. This is the ONLY surface the AI can touch:
// add/edit deals & leads, add/complete tasks, read-only queries.
// No deletes, no team changes, no settings changes — by design.
// ─────────────────────────────────────────────────────────────────

type Json = Record<string, unknown>;
const s = (v: unknown) => (v == null ? "" : String(v).trim());
const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/[$,%\s]/g, ""));
  return isNaN(n) ? null : n;
};

// Gemini function declarations
export const TOOL_DECLARATIONS = [
  {
    name: "search_records",
    description:
      "Search deals, leads, and tasks by name/address/keyword. ALWAYS use this to find the record id before updating anything.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Name, address, or keyword" },
      },
      required: ["query"],
    },
  },
  {
    name: "list_deals",
    description:
      "List deals with full details INCLUDING the workflow checklist (highnote, jotform, groupChat, consult, recap, bra, la, mls, tcSetup, staging — value 'Y' means done, missing means not done). Use for questions like 'who doesn't have a Highnote yet' or 'which listings aren't on the MLS'.",
    parameters: {
      type: "OBJECT",
      properties: {
        status: {
          type: "STRING",
          description: "Filter: 'active' (not closed/lost), 'pending', 'closed', or 'all'. Default active.",
        },
        side: { type: "STRING", description: "Optional: Buyer, Listing, or Referral" },
      },
    },
  },
  {
    name: "pipeline_summary",
    description:
      "Current pipeline stats: closed/pending units and money, goal progress, overdue tasks, upcoming closings.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "add_lead",
    description: "Create a new lead.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        phone: { type: "STRING" },
        email: { type: "STRING" },
        source: { type: "STRING", description: "SOI, Client Referral, Agent Referral, Social Media, Open House, Sign Call, Zillow, Other" },
        type: { type: "STRING", description: "Buyer, Seller, Investor, or VA" },
        timeline: { type: "STRING", description: "e.g. 0-3 months" },
        budget: { type: "STRING" },
        area: { type: "STRING" },
        agent: { type: "STRING", description: "Team member to assign" },
        followUpStatus: { type: "STRING" },
        notes: { type: "STRING" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_lead",
    description: "Update fields on an existing lead (find id with search_records first). Only provided fields change.",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "NUMBER" },
        name: { type: "STRING" }, phone: { type: "STRING" }, email: { type: "STRING" },
        source: { type: "STRING" }, type: { type: "STRING" }, timeline: { type: "STRING" },
        budget: { type: "STRING" }, area: { type: "STRING" }, agent: { type: "STRING" },
        followUpStatus: { type: "STRING" }, lastContact: { type: "STRING" }, notes: { type: "STRING" },
      },
      required: ["id"],
    },
  },
  {
    name: "add_deal",
    description: "Create a new deal (client). side is Buyer, Listing, or Referral.",
    parameters: {
      type: "OBJECT",
      properties: {
        side: { type: "STRING", description: "Buyer, Listing, or Referral" },
        name: { type: "STRING", description: "Client name" },
        address: { type: "STRING", description: "Property address (listings)" },
        agent: { type: "STRING" },
        status: { type: "STRING", description: "Active, Showing, Under Contract, Option, Pending, Closed" },
        closeGoal: { type: "STRING", description: "Target month e.g. Aug" },
        source: { type: "STRING" },
        referredBy: { type: "STRING" },
        lender: { type: "STRING" },
        contractDate: { type: "STRING", description: "M/D/YYYY" },
        optionDeadline: { type: "STRING" },
        inspDate: { type: "STRING" },
        financingDeadline: { type: "STRING" },
        appraisalDeadline: { type: "STRING" },
        closeDate: { type: "STRING" },
        closedDate: { type: "STRING" },
        price: { type: "NUMBER" },
        commPct: { type: "NUMBER", description: "e.g. 3 for 3%" },
        referralPct: { type: "NUMBER" },
        gci: { type: "NUMBER" },
        notes: { type: "STRING" },
      },
      required: ["side", "name"],
    },
  },
  {
    name: "update_deal",
    description: "Update fields on an existing deal (find id with search_records first). Only provided fields change.",
    parameters: {
      type: "OBJECT",
      properties: {
        id: { type: "NUMBER" },
        name: { type: "STRING" }, address: { type: "STRING" }, agent: { type: "STRING" },
        status: { type: "STRING" }, closeGoal: { type: "STRING" }, source: { type: "STRING" },
        referredBy: { type: "STRING" }, lender: { type: "STRING" },
        contractDate: { type: "STRING" }, optionDeadline: { type: "STRING" },
        inspDate: { type: "STRING" }, financingDeadline: { type: "STRING" },
        appraisalDeadline: { type: "STRING" }, closeDate: { type: "STRING" },
        closedDate: { type: "STRING" },
        price: { type: "NUMBER" }, commPct: { type: "NUMBER" },
        referralPct: { type: "NUMBER" }, gci: { type: "NUMBER" },
        notes: { type: "STRING" },
      },
      required: ["id"],
    },
  },
  {
    name: "add_task",
    description: "Create a task.",
    parameters: {
      type: "OBJECT",
      properties: {
        task: { type: "STRING" },
        dueDate: { type: "STRING", description: "M/D/YYYY" },
        assignedTo: { type: "STRING" },
        priority: { type: "STRING", description: "High, Medium, or Low" },
        relatedClient: { type: "STRING" },
        notes: { type: "STRING" },
      },
      required: ["task"],
    },
  },
  {
    name: "complete_task",
    description: "Mark a task Done (find id with search_records first).",
    parameters: {
      type: "OBJECT",
      properties: { id: { type: "NUMBER" } },
      required: ["id"],
    },
  },
  {
    name: "add_pnl_entry",
    description:
      "Log a P&L entry — a business expense or non-commission income (commission income is automatic). E.g. 'log $450 marketing spend for July'.",
    parameters: {
      type: "OBJECT",
      properties: {
        kind: { type: "STRING", description: "Expense or Income" },
        amount: { type: "NUMBER" },
        category: { type: "STRING", description: "Marketing, Software, Photography, Staging, Signage, Client gifts, Education, Dues & MLS, Office, Other" },
        description: { type: "STRING" },
        month: { type: "STRING", description: "YYYY-MM, defaults to current month" },
      },
      required: ["amount", "category"],
    },
  },
];

export interface ToolResult {
  result: Json;
  action?: string; // human-readable change description for the UI
}

export async function executeTool(
  name: string,
  args: Json,
  actor: string
): Promise<ToolResult> {
  const tag = (note: string) =>
    note ? `${note} (via assistant · ${actor})` : `via assistant · ${actor}`;

  switch (name) {
    case "search_records": {
      const q = s(args.query).toLowerCase();
      const data = await getAppData();
      const dealHits = data.deals
        .filter((d) => `${d.name} ${d.address} ${d.agent} ${d.source}`.toLowerCase().includes(q))
        .slice(0, 8)
        .map((d) => ({ id: d.id, kind: "deal", side: d.side, name: d.name, address: d.address, status: d.status, price: d.price, closeDate: d.closeDate, agent: d.agent, checklist: d.checklist }));
      const leadHits = data.leads
        .filter((l) => `${l.name} ${l.phone} ${l.email} ${l.area}`.toLowerCase().includes(q))
        .slice(0, 8)
        .map((l) => ({ id: l.id, kind: "lead", name: l.name, type: l.type, followUpStatus: l.followUpStatus, agent: l.agent }));
      const taskHits = data.tasks
        .filter((t) => `${t.task} ${t.relatedClient} ${t.assignedTo}`.toLowerCase().includes(q))
        .slice(0, 8)
        .map((t) => ({ id: t.id, kind: "task", task: t.task, dueDate: t.dueDate, status: t.status, assignedTo: t.assignedTo }));
      return { result: { deals: dealHits, leads: leadHits, tasks: taskHits } };
    }

    case "list_deals": {
      const data = await getAppData();
      const status = s(args.status).toLowerCase() || "active";
      const side = s(args.side);
      let deals = data.deals;
      if (side) deals = deals.filter((d) => d.side.toLowerCase() === side.toLowerCase());
      if (status === "active")
        deals = deals.filter((d) => !isClosed(d) && !["lost", "on hold"].includes(d.status.toLowerCase()));
      else if (status === "closed") deals = deals.filter(isClosed);
      else if (status === "pending")
        deals = deals.filter((d) => !isClosed(d) && ["pending", "option", "under contract"].some((x) => d.status.toLowerCase().includes(x)));
      return {
        result: {
          count: deals.length,
          deals: deals.map((d) => ({
            id: d.id, side: d.side, name: d.name, address: d.address, status: d.status,
            agent: d.agent, price: d.price, closeDate: d.closeDate, closeGoal: d.closeGoal,
            checklist: d.checklist,
          })),
        },
      };
    }

    case "pipeline_summary": {
      const data = await getAppData();
      const year = data.settings.year;
      const targets = data.settings.targets[String(year)] ?? { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 };
      const stats = pipelineStats(data.deals.filter((d) => d.year === year), targets);
      const { overdue, dueToday } = taskBuckets(data.tasks);
      const upcoming = data.deals
        .filter((d) => !isClosed(d) && d.closeDate)
        .map((d) => ({ name: d.address || d.name, closeDate: d.closeDate, price: d.price, gci: dealGci(d), status: d.status }));
      return { result: { year, ...stats, overdueTasks: overdue.length, tasksDueToday: dueToday.length, upcomingClosings: upcoming } };
    }

    case "add_lead": {
      const lead: Omit<Lead, "id"> = {
        date: new Date().toLocaleDateString("en-US"),
        name: s(args.name), phone: s(args.phone), email: s(args.email),
        source: s(args.source), type: s(args.type) || "Buyer",
        timeline: s(args.timeline), budget: s(args.budget), area: s(args.area),
        agent: s(args.agent), followUpStatus: s(args.followUpStatus) || "New — needs first call",
        lastContact: "", notes: tag(s(args.notes)),
      };
      const created = await store.createLead(lead);
      return { result: { ok: true, id: created.id }, action: `Added lead: ${lead.name}` };
    }

    case "update_lead": {
      const id = num(args.id);
      if (id == null) return { result: { ok: false, error: "id required" } };
      const patch: Partial<Lead> = {};
      for (const k of ["name", "phone", "email", "source", "type", "timeline", "budget", "area", "agent", "followUpStatus", "lastContact", "notes"] as const) {
        if (args[k] != null && s(args[k]) !== "") (patch as Json)[k] = s(args[k]);
      }
      await store.updateLead(id, patch);
      return { result: { ok: true }, action: `Updated lead #${id} (${Object.keys(patch).join(", ")})` };
    }

    case "add_deal": {
      const side = (["Buyer", "Listing", "Referral"].includes(s(args.side)) ? s(args.side) : "Buyer") as Side;
      const deal: Omit<Deal, "id"> = {
        side, name: s(args.name), address: s(args.address), agent: s(args.agent),
        source: s(args.source), referredBy: s(args.referredBy), lender: s(args.lender),
        closeGoal: s(args.closeGoal), checklist: {},
        contractDate: s(args.contractDate), optionDeadline: s(args.optionDeadline),
        financingDeadline: s(args.financingDeadline), appraisalDeadline: s(args.appraisalDeadline),
        inspDate: s(args.inspDate), closeDate: s(args.closeDate), closedDate: s(args.closedDate),
        price: num(args.price), commPct: num(args.commPct), referralPct: num(args.referralPct),
        gci: num(args.gci), status: s(args.status) || "Active",
        notes: tag(s(args.notes)), year: new Date().getFullYear(),
      };
      const created = await store.createDeal(deal);
      return { result: { ok: true, id: created.id }, action: `Added ${side.toLowerCase()}: ${deal.address || deal.name}` };
    }

    case "update_deal": {
      const id = num(args.id);
      if (id == null) return { result: { ok: false, error: "id required" } };
      const patch: Partial<Deal> = {};
      const strKeys = ["name", "address", "agent", "status", "closeGoal", "source", "referredBy", "lender", "contractDate", "optionDeadline", "inspDate", "financingDeadline", "appraisalDeadline", "closeDate", "closedDate", "notes"] as const;
      for (const k of strKeys) if (args[k] != null && s(args[k]) !== "") (patch as Json)[k] = s(args[k]);
      for (const k of ["price", "commPct", "referralPct", "gci"] as const)
        if (args[k] != null) (patch as Json)[k] = num(args[k]);
      await store.updateDeal(id, patch);
      return { result: { ok: true }, action: `Updated deal #${id} (${Object.keys(patch).join(", ")})` };
    }

    case "add_task": {
      const task: Omit<TaskItem, "id"> = {
        task: s(args.task), dueDate: s(args.dueDate), assignedTo: s(args.assignedTo),
        priority: s(args.priority) || "Medium", relatedClient: s(args.relatedClient),
        status: "Open", notes: tag(s(args.notes)), dealId: null,
      };
      const created = await store.createTask(task);
      return { result: { ok: true, id: created.id }, action: `Added task: ${task.task}` };
    }

    case "complete_task": {
      const id = num(args.id);
      if (id == null) return { result: { ok: false, error: "id required" } };
      await store.updateTask(id, { status: "Done" });
      return { result: { ok: true }, action: `Completed task #${id}` };
    }

    case "add_pnl_entry": {
      const amount = Math.abs(num(args.amount) ?? 0);
      if (!amount) return { result: { ok: false, error: "amount required" } };
      const entry = {
        month: s(args.month) || new Date().toISOString().slice(0, 7),
        kind: (s(args.kind) === "Income" ? "Income" : "Expense") as "Income" | "Expense",
        category: s(args.category) || "Other",
        description: tag(s(args.description)),
        amount,
      };
      const created = await store.createPnl(entry);
      return {
        result: { ok: true, id: created.id },
        action: `Logged ${entry.kind.toLowerCase()}: ${entry.category} $${amount.toLocaleString()} (${entry.month})`,
      };
    }

    default:
      return { result: { ok: false, error: `Unknown tool: ${name}` } };
  }
}
