import { Deal, Lead, TaskItem, TeamMember, Settings, Sop, PnlEntry, Activity, DealNote, Funnel, FormSubmission } from "../types";

export interface ImportPayload {
  deals: Partial<Deal>[];
  leads: Partial<Lead>[];
  tasks: Partial<TaskItem>[];
}

export interface Repo {
  isDb: boolean;

  listDeals(): Promise<Deal[]>;
  createDeal(d: Omit<Deal, "id">): Promise<Deal>;
  updateDeal(id: number, d: Partial<Deal>): Promise<void>;
  deleteDeal(id: number): Promise<void>;

  listLeads(): Promise<Lead[]>;
  createLead(d: Omit<Lead, "id">): Promise<Lead>;
  updateLead(id: number, d: Partial<Lead>): Promise<void>;
  deleteLead(id: number): Promise<void>;

  listTasks(): Promise<TaskItem[]>;
  createTask(d: Omit<TaskItem, "id">): Promise<TaskItem>;
  createTasks(items: Omit<TaskItem, "id">[]): Promise<void>;
  updateTask(id: number, d: Partial<TaskItem>): Promise<void>;
  deleteTask(id: number): Promise<void>;

  listTeam(): Promise<TeamMember[]>;
  createMember(d: Omit<TeamMember, "id">): Promise<TeamMember>;
  updateMember(id: number, d: Partial<TeamMember>): Promise<void>;
  deleteMember(id: number): Promise<void>;

  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;

  listSops(): Promise<Sop[]>;
  createSop(d: Omit<Sop, "id">): Promise<Sop>;
  updateSop(id: number, d: Partial<Sop>): Promise<void>;
  deleteSop(id: number): Promise<void>;

  listActivities(): Promise<Activity[]>;
  createActivity(d: Omit<Activity, "id">): Promise<Activity>;
  deleteActivity(id: number): Promise<void>;

  listNotes(dealId: number): Promise<DealNote[]>;
  createNote(d: Omit<DealNote, "id">): Promise<DealNote>;
  updateNote(id: number, d: Partial<DealNote>): Promise<void>;
  deleteNote(id: number): Promise<void>;

  listFunnels(): Promise<Funnel[]>;
  createFunnel(d: Omit<Funnel, "id">): Promise<Funnel>;
  updateFunnel(id: number, d: Partial<Funnel>): Promise<void>;
  deleteFunnel(id: number): Promise<void>;
  bumpFunnel(id: number, stat: "views" | "submissions"): Promise<void>;

  listSubmissions(funnelId?: number): Promise<FormSubmission[]>;
  createSubmission(d: Omit<FormSubmission, "id">): Promise<FormSubmission>;
  updateSubmission(id: number, d: Partial<FormSubmission>): Promise<void>;
  deleteSubmission(id: number): Promise<void>;

  // Google Calendar OAuth (refresh tokens, keyed by member email)
  listCalendarConnections(): Promise<{ email: string; connectedAt: string }[]>;
  getCalendarToken(email: string): Promise<string | null>;
  setCalendarToken(email: string, refreshToken: string): Promise<void>;
  deleteCalendarToken(email: string): Promise<void>;

  listPnl(): Promise<PnlEntry[]>;
  createPnl(d: Omit<PnlEntry, "id">): Promise<PnlEntry>;
  updatePnl(id: number, d: Partial<PnlEntry>): Promise<void>;
  deletePnl(id: number): Promise<void>;

  bulkImport(data: ImportPayload): Promise<{ deals: number; leads: number; tasks: number }>;
}
