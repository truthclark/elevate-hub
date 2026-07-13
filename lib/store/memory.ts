import { Deal, Lead, TaskItem, TeamMember, Settings, Sop, PnlEntry, Activity, DealNote, Funnel, FormSubmission, DEFAULT_BROKERAGE, DEFAULT_CHECKLISTS, DEFAULT_MEASURABLES, DEFAULT_LINKS } from "../types";
import { SEED_DEALS, SEED_LEADS, SEED_TASKS, SEED_TEAM, SEED_SETTINGS, SEED_SOPS, SEED_PNL } from "../seed";
import type { Repo } from "./repo";

// In-memory store for demo mode (no DATABASE_URL). Resets on restart.

interface Mem {
  deals: Deal[];
  leads: Lead[];
  tasks: TaskItem[];
  team: TeamMember[];
  sops: Sop[];
  pnl: PnlEntry[];
  activities: Activity[];
  notes: DealNote[];
  funnels: Funnel[];
  submissions: FormSubmission[];
  calTokens: Record<string, { token: string; at: string }>;
  settings: Settings;
  nextId: number;
}

const g = globalThis as unknown as { __elevateMem?: Mem };

function mem(): Mem {
  if (!g.__elevateMem) {
    let id = 1;
    g.__elevateMem = {
      deals: SEED_DEALS.map((d) => ({ ...d, id: id++ })),
      leads: SEED_LEADS.map((d) => ({ ...d, id: id++ })),
      tasks: SEED_TASKS.map((d) => ({ ...d, id: id++ })),
      team: SEED_TEAM.map((d) => ({ ...d, id: id++ })),
      sops: SEED_SOPS.map((d) => ({ ...d, id: id++ })),
      pnl: SEED_PNL.map((d) => ({ ...d, id: id++ })),
      activities: [],
      notes: [],
      funnels: [],
      submissions: [],
      calTokens: {},
      settings: JSON.parse(JSON.stringify(SEED_SETTINGS)),
      nextId: id,
    };
  }
  return g.__elevateMem;
}

export const memoryRepo: Repo = {
  isDb: false,

  async listDeals() { return [...mem().deals]; },
  async createDeal(d) {
    const m = mem();
    const deal = { ...d, id: m.nextId++ } as Deal;
    m.deals.push(deal);
    return deal;
  },
  async updateDeal(id, d) {
    const m = mem();
    const i = m.deals.findIndex((x) => x.id === id);
    if (i >= 0) m.deals[i] = { ...m.deals[i], ...d, id };
  },
  async deleteDeal(id) {
    const m = mem();
    m.deals = m.deals.filter((x) => x.id !== id);
    m.tasks = m.tasks.filter((t) => t.dealId !== id);
  },

  async listLeads() { return [...mem().leads]; },
  async createLead(d) {
    const m = mem();
    const lead = { ...d, id: m.nextId++ } as Lead;
    m.leads.push(lead);
    return lead;
  },
  async updateLead(id, d) {
    const m = mem();
    const i = m.leads.findIndex((x) => x.id === id);
    if (i >= 0) m.leads[i] = { ...m.leads[i], ...d, id };
  },
  async deleteLead(id) {
    mem().leads = mem().leads.filter((x) => x.id !== id);
  },

  async listTasks() { return [...mem().tasks]; },
  async createTask(d) {
    const m = mem();
    const t = { ...d, id: m.nextId++ } as TaskItem;
    m.tasks.push(t);
    return t;
  },
  async createTasks(items) {
    for (const it of items) await this.createTask(it);
  },
  async updateTask(id, d) {
    const m = mem();
    const i = m.tasks.findIndex((x) => x.id === id);
    if (i >= 0) m.tasks[i] = { ...m.tasks[i], ...d, id };
  },
  async deleteTask(id) {
    mem().tasks = mem().tasks.filter((x) => x.id !== id);
  },

  async listTeam() { return [...mem().team]; },
  async createMember(d) {
    const m = mem();
    const t = { ...d, id: m.nextId++ } as TeamMember;
    m.team.push(t);
    return t;
  },
  async updateMember(id, d) {
    const m = mem();
    const i = m.team.findIndex((x) => x.id === id);
    if (i >= 0) m.team[i] = { ...m.team[i], ...d, id };
  },
  async deleteMember(id) {
    mem().team = mem().team.filter((x) => x.id !== id);
  },

  async getSettings() {
    const s = JSON.parse(JSON.stringify(mem().settings)) as Settings;
    if (!s.brokerage) s.brokerage = { ...DEFAULT_BROKERAGE };
    if (!s.checklists) s.checklists = JSON.parse(JSON.stringify(DEFAULT_CHECKLISTS));
    if (!s.measurables) s.measurables = JSON.parse(JSON.stringify(DEFAULT_MEASURABLES));
    if (!s.scores) s.scores = {};
    if (!s.links) s.links = JSON.parse(JSON.stringify(DEFAULT_LINKS));
    return s;
  },
  async saveSettings(s) { mem().settings = JSON.parse(JSON.stringify(s)); },

  async listSops() { return [...mem().sops]; },
  async createSop(d) {
    const m = mem();
    const sop = { ...d, id: m.nextId++ } as Sop;
    m.sops.push(sop);
    return sop;
  },
  async updateSop(id, d) {
    const m = mem();
    const i = m.sops.findIndex((x) => x.id === id);
    if (i >= 0) m.sops[i] = { ...m.sops[i], ...d, id };
  },
  async deleteSop(id) {
    mem().sops = mem().sops.filter((x) => x.id !== id);
  },

  async listActivities() {
    return [...mem().activities].sort((a, b) => (a.date < b.date ? 1 : -1));
  },
  async createActivity(d) {
    const m = mem();
    const a = { ...d, id: m.nextId++ } as Activity;
    m.activities.push(a);
    return a;
  },
  async deleteActivity(id) {
    mem().activities = mem().activities.filter((x) => x.id !== id);
  },

  async listNotes(dealId) {
    return mem().notes
      .filter((n) => n.dealId === dealId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  async createNote(d) {
    const m = mem();
    const note = { ...d, id: m.nextId++ } as DealNote;
    m.notes.push(note);
    return note;
  },
  async updateNote(id, d) {
    const m = mem();
    const i = m.notes.findIndex((x) => x.id === id);
    if (i >= 0) m.notes[i] = { ...m.notes[i], ...d, id };
  },
  async deleteNote(id) {
    mem().notes = mem().notes.filter((x) => x.id !== id);
  },

  async listFunnels() { return [...mem().funnels]; },
  async createFunnel(d) {
    const m = mem();
    const f = { ...d, id: m.nextId++ } as Funnel;
    m.funnels.push(f);
    return f;
  },
  async updateFunnel(id, d) {
    const m = mem();
    const i = m.funnels.findIndex((x) => x.id === id);
    if (i >= 0) m.funnels[i] = { ...m.funnels[i], ...d, id };
  },
  async deleteFunnel(id) {
    mem().funnels = mem().funnels.filter((x) => x.id !== id);
  },
  async bumpFunnel(id, stat) {
    const m = mem();
    const f = m.funnels.find((x) => x.id === id);
    if (f) f[stat] += 1;
  },

  async listSubmissions(funnelId) {
    return mem().submissions
      .filter((s) => funnelId == null || s.funnelId === funnelId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
  async createSubmission(d) {
    const m = mem();
    const s = { ...d, id: m.nextId++ } as FormSubmission;
    m.submissions.push(s);
    return s;
  },
  async updateSubmission(id, d) {
    const m = mem();
    const i = m.submissions.findIndex((x) => x.id === id);
    if (i >= 0) m.submissions[i] = { ...m.submissions[i], ...d, id };
  },
  async deleteSubmission(id) {
    mem().submissions = mem().submissions.filter((x) => x.id !== id);
  },

  async listCalendarConnections() {
    return Object.entries(mem().calTokens).map(([email, v]) => ({
      email,
      connectedAt: v.at,
    }));
  },
  async getCalendarToken(email) {
    return mem().calTokens[email.toLowerCase()]?.token ?? null;
  },
  async setCalendarToken(email, refreshToken) {
    mem().calTokens[email.toLowerCase()] = { token: refreshToken, at: new Date().toISOString() };
  },
  async deleteCalendarToken(email) {
    delete mem().calTokens[email.toLowerCase()];
  },

  async listPnl() { return [...mem().pnl]; },
  async createPnl(d) {
    const m = mem();
    const e = { ...d, id: m.nextId++ } as PnlEntry;
    m.pnl.push(e);
    return e;
  },
  async updatePnl(id, d) {
    const m = mem();
    const i = m.pnl.findIndex((x) => x.id === id);
    if (i >= 0) m.pnl[i] = { ...m.pnl[i], ...d, id };
  },
  async deletePnl(id) {
    // Deleting a recurring template also removes its materialized copies
    mem().pnl = mem().pnl.filter((x) => x.id !== id && x.recurOf !== id);
  },

  async bulkImport(data) {
    const m = mem();
    let deals = 0, leads = 0, tasks = 0;
    for (const d of data.deals) {
      const key = (x: Partial<Deal>) => `${x.side}|${(x.address || x.name || "").toLowerCase()}`;
      const existing = m.deals.find((x) => key(x) === key(d));
      if (existing) await this.updateDeal(existing.id, d);
      else await this.createDeal(d as Deal);
      deals++;
    }
    for (const l of data.leads) {
      const existing = m.leads.find((x) => x.name.toLowerCase() === (l.name || "").toLowerCase());
      if (existing) await this.updateLead(existing.id, l);
      else await this.createLead(l as Lead);
      leads++;
    }
    for (const t of data.tasks) {
      const existing = m.tasks.find((x) => x.task.toLowerCase() === (t.task || "").toLowerCase());
      if (!existing) { await this.createTask(t as TaskItem); tasks++; }
    }
    return { deals, leads, tasks };
  },
};
