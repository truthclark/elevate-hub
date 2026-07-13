// ── Core data model (database is source of truth; sheet = import/export) ──

export type Side = "Buyer" | "Listing" | "Referral";
export type Role = "Admin" | "Agent" | "Ops";

export interface Deal {
  id: number;
  side: Side;
  name: string; // client name (buyer/referral) or seller name
  address: string; // property address (listings/pendings)
  agent: string;
  source: string;
  referredBy: string;
  lender: string;
  closeGoal: string; // target month
  // Workflow checklist (Highnote, Jotform, consult, BRA/LA, MLS, TC, etc.)
  checklist: Record<string, string>;
  // TC dates
  contractDate: string;
  optionDeadline: string;
  financingDeadline: string;
  appraisalDeadline: string;
  inspDate: string;
  closeDate: string;
  closedDate: string;
  // Money
  price: number | null;
  commPct: number | null; // e.g. 3 = 3%
  referralPct: number | null;
  gci: number | null;
  status: string; // Active, Showing, Option, Under Contract, Pending, Closed, On Hold, Lost
  notes: string;
  year: number;
  archived?: boolean; // soft-deleted; restorable from /archive
  shareToken?: string; // public client-timeline link token ("" = sharing off)
  // One-off money adjustments on this deal: buyer credits, one-time brokerage
  // fees, bonuses. Positive = cost (reduces team net); negative = income.
  adjustments?: { label: string; amount: number }[];
}

export interface Lead {
  id: number;
  date: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  type: string; // Buyer / Seller / Investor / VA
  timeline: string;
  budget: string;
  area: string;
  agent: string;
  followUpStatus: string;
  lastContact: string;
  notes: string;
  archived?: boolean; // soft-deleted; restorable from /archive
  checklist?: Record<string, string>; // qualification steps — carries into the deal on convert
}

// Qualification steps done BEFORE a lead converts. Keys match the deal
// checklists, so checkmarks carry over automatically on Convert.
export const LEAD_CHECKLIST: ChecklistItem[] = [
  { key: "highnote", label: "Highnote" },
  { key: "jotform", label: "Jotform" },
  { key: "consultBooked", label: "Consult Booked" },
  { key: "consult", label: "Consult Held" },
];

// Activity log — every conversation, appointment, and touch, in one stream.
export const ACTIVITY_KINDS = [
  "Call",
  "Text",
  "Email",
  "DM",
  "Conversation",
  "Appointment Set",
  "Appointment",
  "Consult",
  "Showing",
  "Open House",
  "Agreement Signed",
  "Offer Written",
  "Follow-up",
  "Other",
] as const;

// Kinds that count as a "contact" vs an "appointment" on the scorecard
export const CONTACT_KINDS = ["Call", "Text", "Email", "DM", "Conversation", "Follow-up"];
export const APPT_KINDS = ["Appointment", "Consult", "Showing", "Open House"];

// Timestamped notes on a deal. Pinned notes stay at the top.
export interface DealNote {
  id: number;
  dealId: number;
  body: string;
  author: string;
  pinned: boolean;
  createdAt: string; // ISO timestamp
}

export interface Activity {
  id: number;
  date: string; // YYYY-MM-DD
  kind: string;
  who: string; // team member name
  about: string; // client/lead/deal it relates to (free text)
  notes: string;
}

export interface TaskItem {
  id: number;
  task: string;
  dueDate: string;
  dueTime?: string; // optional "HH:MM" — blank = any time that day
  assignedTo: string;
  priority: string; // High / Medium / Low
  relatedClient: string;
  status: string; // Open / Done
  notes: string;
  dealId: number | null;
  sortOrder?: number; // manual drag order within a day (lower = higher)
  recur?: string; // "" | daily | weekdays | weekly | monthly — next occurrence spawns on complete
  // Template provenance — lets due dates re-flow when the deal's dates change
  anchor?: string; // "" | created | contract | close
  offsetDays?: number | null;
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string; // one or more of Admin/Agent/Ops, comma-separated (e.g. "Admin, Agent, Ops")
  focus: string;
  color: string;
  active: boolean;
  photo?: string; // small data-URL avatar (resized client-side)
  calendarUrl?: string; // secret iCal feed URL — read-only appointments in My Day
}

export const hasRole = (member: { role: string }, role: Role) =>
  member.role.toLowerCase().includes(role.toLowerCase());

export interface TemplateItem {
  title: string;
  offsetDays: number; // relative to anchor
  anchor: "created" | "contract" | "close";
  assignRole: Role | "";
}

export interface TaskTemplate {
  id: string;
  name: string;
  side: Side | "Pending"; // applied on new deal of side, or when deal goes pending
  items: TemplateItem[];
}

export interface Targets {
  annual: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
}

// Per-transaction brokerage fee. Timing controls when it applies:
// always = every closed deal; beforeCap = only while capping; afterCap = only once capped.
// kind: flat $ per deal, or a % of that deal's net GCI (e.g. 5% equity contribution).
export interface FeeItem {
  label: string; // e.g. "CBR fee", "Equity contribution"
  amount: number; // $ (flat) or % (pct)
  timing: "always" | "beforeCap" | "afterCap";
  kind?: "flat" | "pct"; // default flat
}

export interface Brokerage {
  splitPct: number; // % of net GCI to brokerage (e.g. 15)
  annualCap: number; // brokerage split stops after this much paid in a cap year
  capResetMonth?: number; // 1-12; cap year starts on this date (default Jan 1)
  capResetDay?: number; // 1-31
  fees?: FeeItem[]; // per-transaction fees
}

export interface ChecklistItem {
  key: string; // stable storage key on deal.checklist
  label: string;
}

export type Checklists = Record<Side, ChecklistItem[]>;

// EOS scorecard measurable. auto rows are computed from hub data; manual rows
// are typed in on the Scorecard page. period sets the goal cadence: a weekly
// row is judged per week (13-week grid), a monthly row per month (e.g.
// "4 closings a month", not "1 closing a day").
export type AutoKind =
  | ""
  | "leadsAdded"
  | "dealsClosed"
  | "dealsPending"
  | "contactsLogged"
  | "apptsSet"
  | "apptsHeld"
  | "agreementsSigned"
  | "offersWritten";

export interface Measurable {
  id: string;
  name: string;
  owner: string; // team member name accountable for the number
  target: number; // goal per period
  direction: ">=" | "<="; // green when value >= target (or <= for "keep it under")
  auto: AutoKind; // "" = manual entry
  period?: "week" | "month"; // default week
  locked?: boolean; // core prospecting rows — always present, not deletable
}

export const DEFAULT_MEASURABLES: Measurable[] = [
  { id: "contacts", name: "Conversations (calls/texts/DMs)", owner: "", target: 50, direction: ">=", auto: "contactsLogged", locked: true },
  { id: "apptsSet", name: "Appointments set", owner: "", target: 5, direction: ">=", auto: "apptsSet", locked: true },
  { id: "consults", name: "Appointments & consults held", owner: "", target: 3, direction: ">=", auto: "apptsHeld", locked: true },
  { id: "agreements", name: "Agreements signed (BRA/LA)", owner: "", target: 2, direction: ">=", auto: "agreementsSigned", locked: true },
  { id: "offersWritten", name: "Offers written", owner: "", target: 2, direction: ">=", auto: "offersWritten", locked: true },
  { id: "leadsAdded", name: "New leads added", owner: "", target: 5, direction: ">=", auto: "leadsAdded" },
  { id: "dealsPending", name: "Deals in contract", owner: "", target: 3, direction: ">=", auto: "dealsPending" },
  { id: "dealsClosed", name: "Closings", owner: "", target: 4, direction: ">=", auto: "dealsClosed", period: "month" },
];

// Quick links page
export interface LinkItem {
  id: string;
  label: string;
  url: string;
  group: string; // section heading on the Links page
}

export const DEFAULT_LINKS: LinkItem[] = [
  { id: "lofty", label: "Lofty CRM", url: "https://app.lofty.com", group: "Daily Drivers" },
  { id: "rezen", label: "Rezen (Real Broker)", url: "https://bolt.therealbrokerage.com", group: "Daily Drivers" },
  { id: "zapier", label: "Zapier", url: "https://zapier.com/app/zaps", group: "Daily Drivers" },
  { id: "gdrive", label: "Google Drive", url: "https://drive.google.com", group: "Daily Drivers" },
  { id: "highnote", label: "Highnote Buyer Portal", url: "https://app.highnote.io", group: "Client Tools" },
  { id: "jotform", label: "Jotform", url: "https://www.jotform.com/myforms", group: "Client Tools" },
  { id: "calendly", label: "Calendly", url: "https://calendly.com", group: "Client Tools" },
];

export interface Settings {
  year: number;
  targets: Record<string, Targets>; // keyed by year
  templates: TaskTemplate[];
  brokerage?: Brokerage;
  branding?: {
    logo?: string; // small data-URL logo (sidebar + favicon)
    appName?: string; // e.g. "Elevate Hub"
    companyName?: string; // e.g. "Elevate Realty Team"
    brokerageName?: string; // e.g. "Real Broker LLC"
    city?: string; // e.g. "San Antonio, TX"
    tagline?: string; // e.g. "Higher purpose. Higher standards."
  };
  checklists?: Checklists; // side-specific workflow checklists
  measurables?: Measurable[]; // EOS scorecard rows
  scores?: Record<string, Record<string, number>>; // measurableId -> weekStart(YYYY-MM-DD) -> value
  onboarded?: boolean; // first-run wizard completed/dismissed
  links?: LinkItem[]; // quick links page
}

export const CHECKLIST_TITLES: Record<Side, string> = {
  Buyer: "Buyer Readiness Checklist",
  Listing: "Pre-Listing Checklist",
  Referral: "Referral Preparation Checklist",
};

// Keys match historical data so existing checkmarks keep working
export const DEFAULT_CHECKLISTS: Checklists = {
  Buyer: [
    { key: "highnote", label: "Highnote" },
    { key: "jotform", label: "Jotform" },
    { key: "groupChat", label: "Group Chat" },
    { key: "consult", label: "Consult" },
    { key: "recap", label: "Recap" },
    { key: "bra", label: "BRA Signed" },
    { key: "preApproval", label: "Pre-Approval" },
    { key: "mls", label: "MLS Search" },
    { key: "tcSetup", label: "TC Setup" },
  ],
  Listing: [
    { key: "highnote", label: "Highnote" },
    { key: "jotform", label: "Jotform" },
    { key: "groupChat", label: "Group Chat" },
    { key: "consult", label: "Consult" },
    { key: "la", label: "Listing Agreement" },
    { key: "disclosure", label: "Seller's Disclosure" },
    { key: "photos", label: "Photos/Media" },
    { key: "staging", label: "Staging" },
    { key: "mls", label: "MLS Live" },
    { key: "tcSetup", label: "TC Setup" },
  ],
  Referral: [
    { key: "refAgreement", label: "Referral Agreement" },
    { key: "warmIntro", label: "Warm Intro Made" },
    { key: "agentConfirmed", label: "Receiving Agent Confirmed" },
    { key: "cma", label: "CMA / Info Sent" },
    { key: "followUp", label: "Follow-Up Scheduled" },
  ],
};

export interface Sop {
  id: number;
  title: string;
  category: string; // Admin | Marketing | Sales | Operations
  content: string;
  updatedBy: string;
  updatedAt: string;
}

export interface PnlEntry {
  id: number;
  month: string; // YYYY-MM
  kind: "Income" | "Expense";
  category: string;
  description: string;
  amount: number;
  // Recurring: the original entry is the template (recurring = true, month =
  // start month). Copies are materialized one month at a time as months
  // arrive — never into the future — and point back via recurOf.
  recurring?: boolean;
  endMonth?: string; // last month it applies ("" = still active)
  recurOf?: number | null; // id of the template this copy came from
}

// ── Funnels & forms: public pages that capture people ────────────
// kind "funnel" = marketing page, submissions become Leads automatically.
// kind "form" = intake questionnaire (buyer/seller/get-to-know-you) —
// responses are stored in an inbox; you create a lead from one or attach
// it to an existing lead/client yourself.
export interface FunnelField {
  key: string;
  label: string;
  type: "text" | "select" | "long"; // long = paragraph answer
  options?: string[];
  required?: boolean;
}

export interface Funnel {
  id: number;
  slug: string; // public URL: /f/[slug]
  kind?: "funnel" | "form"; // default funnel
  name: string; // internal name — becomes the lead's source
  template: "magnet" | "call"; // free resource vs straight to booking
  headline: string;
  subhead: string;
  bullets: string[]; // benefit bullets
  testimonial: string; // optional quote
  ctaLabel: string; // button text, e.g. "Get the checklist"
  resourceUrl: string; // external link to the freebie (Drive, site…)
  resourceName: string; // filename when a file is uploaded instead
  resourceData: string; // base64 of the uploaded file ("" = none)
  calendlyUrl: string; // embedded on the thank-you step
  thanksNote: string; // custom thank-you message (forms especially)
  fields: FunnelField[]; // custom questions beyond name/phone/email
  active: boolean;
  views: number;
  submissions: number;
}

// A stored response (every funnel/form submission is kept)
export interface FormSubmission {
  id: number;
  funnelId: number;
  name: string;
  email: string;
  phone: string;
  answers: { label: string; value: string }[];
  leadId: number | null; // linked lead (created-from or attached)
  dealId: number | null; // linked deal/client
  createdAt: string; // ISO
}

export interface AppData {
  deals: Deal[];
  leads: Lead[];
  tasks: TaskItem[];
  team: TeamMember[];
  settings: Settings;
  demoMode: boolean; // true when no DATABASE_URL (in-memory, resets on restart)
}

export const DEFAULT_BROKERAGE: Brokerage = { splitPct: 15, annualCap: 12000 };

export interface Alert {
  severity: "red" | "amber";
  label: string;
  detail: string;
  href: string;
}
