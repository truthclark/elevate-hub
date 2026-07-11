import { Deal, Lead, TaskItem, TeamMember, Settings, Sop, PnlEntry, DEFAULT_BROKERAGE } from "./types";
import { DEFAULT_TEMPLATES } from "./templates";

// Demo seed — shown when no DATABASE_URL is configured.

// Demo people are fictional. First boot of a real database seeds this
// roster too — add your real team on the Team page, then remove these.
export const SEED_TEAM: Omit<TeamMember, "id">[] = [
  { name: "Avery Brooks", email: "", phone: "", role: "Admin", focus: "Vision, lead generation, key relationships, listings", color: "#05c3f9", active: true },
  { name: "Jordan Reyes", email: "", phone: "", role: "Admin", focus: "Operations strategy, systems, team management, buyers", color: "#0a678c", active: true },
  { name: "Morgan Ellis", email: "", phone: "", role: "Ops", focus: "Transaction coordination, compliance, process execution", color: "#34d399", active: true },
  { name: "Riley Santos", email: "", phone: "", role: "Ops", focus: "Admin support, scheduling, client care touches", color: "#fbbf24", active: true },
  { name: "Casey Tran", email: "", phone: "", role: "Agent", focus: "Buyer consults, showings, offers, buyer pipeline", color: "#a78bfa", active: true },
];

const D = (p: Partial<Deal>): Omit<Deal, "id"> => ({
  side: "Buyer", name: "", address: "", agent: "", source: "", referredBy: "",
  lender: "", closeGoal: "", checklist: {}, contractDate: "", optionDeadline: "",
  financingDeadline: "", appraisalDeadline: "", inspDate: "", closeDate: "",
  closedDate: "", price: null, commPct: null, referralPct: null, gci: null,
  status: "Active", notes: "", year: 2026, ...p,
});

export const SEED_DEALS: Omit<Deal, "id">[] = [
  D({ side: "Buyer", name: "The Hendersons", agent: "Casey Tran", lender: "Preferred Lender", closeGoal: "Aug", status: "Under Contract", price: 500000, commPct: 3, gci: 15000, source: "SOI", checklist: { highnote: "Y", jotform: "Y", consult: "Y", bra: "Y" } }),
  D({ side: "Buyer", name: "The Okafors", agent: "Casey Tran", lender: "Preferred Lender", closeGoal: "Mar", status: "Pending", price: 560000, commPct: 2.11, gci: 11800, source: "SOI", contractDate: "6/22/2026", optionDeadline: "6/29/2026", financingDeadline: "7/10/2026", closeDate: "7/20/2026", checklist: { highnote: "Y", jotform: "Y", consult: "Y", bra: "Y", tcSetup: "Y" } }),
  D({ side: "Buyer", name: "The Delgados", agent: "Casey Tran", lender: "Builder", closeGoal: "Jul", status: "Pending", price: 473000, commPct: 5, gci: 23650, source: "SOI", contractDate: "6/15/2026", closeDate: "7/13/2026", checklist: { highnote: "Y", jotform: "Y", consult: "Y", bra: "Y" } }),
  D({ side: "Buyer", name: "The Whitfields", agent: "Casey Tran", lender: "Preferred Lender", closeGoal: "Aug", status: "Showing", checklist: { highnote: "Y", jotform: "Y", consult: "Y", bra: "Y" } }),
  D({ side: "Buyer", name: "The Baileys", agent: "Casey Tran", closeGoal: "Oct", status: "Active", checklist: { jotform: "Y", consult: "Y" } }),
  D({ side: "Buyer", name: "Sam Porter", agent: "Casey Tran", lender: "Preferred Lender", status: "Closed", price: 288600, commPct: 3, gci: 8658, source: "Client Referral", referredBy: "Past client", closedDate: "3/12/2026", closeDate: "3/12/2026" }),
  D({ side: "Buyer", name: "Dana Fields", agent: "Casey Tran", lender: "Preferred Lender", status: "Closed", price: 200000, commPct: 3, gci: 6000, source: "Client Referral", referredBy: "Past client", closedDate: "6/2/2026", closeDate: "6/2/2026" }),
  D({ side: "Listing", name: "Maple Grove Sellers", address: "128 Maple Grove", agent: "Avery Brooks", status: "Option", price: 465000, commPct: 1.8, referralPct: 40, gci: 8370, source: "SOI", contractDate: "6/12/2026", optionDeadline: "6/20/2026", inspDate: "6/19/2026", closeDate: "7/13/2026", checklist: { highnote: "Y", jotform: "Y", consult: "Y", la: "Y", mls: "Y", tcSetup: "Y" } }),
  D({ side: "Listing", name: "Cedar Falls Sellers", address: "761 Cedar Falls", agent: "Avery Brooks", status: "Pending", price: 475000, commPct: 3, gci: 14250, contractDate: "6/28/2026", optionDeadline: "7/8/2026", financingDeadline: "7/24/2026", closeDate: "8/3/2026", checklist: { highnote: "Y", jotform: "Y", consult: "Y", la: "Y", mls: "Y", tcSetup: "Y" } }),
  D({ side: "Listing", name: "Juniper Way Sellers", address: "303 Juniper Way", agent: "Avery Brooks", status: "Active", price: 425000, commPct: 3, gci: 12750, checklist: { highnote: "Y", jotform: "Y", consult: "Y", la: "Y", mls: "Y", tcSetup: "Y" } }),
  D({ side: "Listing", name: "Birchwood Sellers", address: "1352 Birchwood", agent: "Avery Brooks", status: "Active", closeGoal: "Jul", checklist: { highnote: "Y", jotform: "Y", consult: "Y", la: "Y" } }),
  D({ side: "Listing", name: "Summit Ridge Sellers", address: "1307 Summit Ridge", agent: "Avery Brooks", status: "Active", source: "Social Media", closeGoal: "Apr", checklist: { highnote: "Y", jotform: "Y", consult: "Y", la: "Y" } }),
  D({ side: "Referral", name: "Chris Neuman", agent: "Pat Winslow", status: "Referred" }),
  D({ side: "Referral", name: "Shea Franklin", agent: "M. Alvarez", status: "Referred" }),
  D({ side: "Referral", name: "Ben Whitaker", agent: "R. Osborne", status: "Referred" }),
  D({ side: "Referral", name: "The Rojas Family", agent: "A. Irving", status: "Pending" }),
];

export const SEED_LEADS: Omit<Lead, "id">[] = [
  { date: "6/28/2026", name: "Jasmine Torres", phone: "(210) 555-0142", email: "jas.torres@email.com", source: "Social Media", type: "Buyer", timeline: "0-3 months", budget: "$350K", area: "Stone Oak", agent: "Casey Tran", followUpStatus: "Hot — consult booked", lastContact: "7/3/2026", notes: "PCS to Lackland in Sept" },
  { date: "6/30/2026", name: "Derrick Hall", phone: "(210) 555-0187", email: "dhall@email.com", source: "SOI", type: "Seller", timeline: "3-6 months", budget: "$425K", area: "Alamo Ranch", agent: "Avery Brooks", followUpStatus: "Warm — CMA sent", lastContact: "7/1/2026", notes: "Wants to upsize" },
  { date: "7/2/2026", name: "Priya Nair", phone: "(210) 555-0121", email: "priya.n@email.com", source: "Client Referral", type: "Buyer", timeline: "6-12 months", budget: "$500K", area: "Boerne", agent: "Jordan Reyes", followUpStatus: "Nurture", lastContact: "7/2/2026", notes: "Referred by the Okafors" },
  { date: "7/4/2026", name: "Marcus Lee", phone: "(210) 555-0165", email: "mlee@email.com", source: "Open House", type: "Investor", timeline: "0-3 months", budget: "$275K", area: "Converse", agent: "Casey Tran", followUpStatus: "New — needs first call", lastContact: "", notes: "Cash buyer, duplexes" },
];

export const SEED_TASKS: Omit<TaskItem, "id">[] = [
  { task: "Order survey for Delgado closing", dueDate: "7/7/2026", assignedTo: "Morgan Ellis", priority: "High", relatedClient: "The Delgados", status: "Open", notes: "Closes 7/13", dealId: null },
  { task: "Confirm repairs complete — Maple Grove", dueDate: "7/8/2026", assignedTo: "Morgan Ellis", priority: "High", relatedClient: "128 Maple Grove", status: "Open", notes: "", dealId: null },
  { task: "First call to Marcus Lee (new lead)", dueDate: "7/6/2026", assignedTo: "Casey Tran", priority: "High", relatedClient: "Marcus Lee", status: "Open", notes: "Cash investor", dealId: null },
  { task: "Send listing recap to Cedar Falls sellers", dueDate: "7/9/2026", assignedTo: "Avery Brooks", priority: "Medium", relatedClient: "761 Cedar Falls", status: "Open", notes: "", dealId: null },
  { task: "Set up the Whitfields in Highnote", dueDate: "7/5/2026", assignedTo: "Riley Santos", priority: "Medium", relatedClient: "The Whitfields", status: "Open", notes: "", dealId: null },
  { task: "Weekly pipeline review (L10)", dueDate: "7/10/2026", assignedTo: "Jordan Reyes", priority: "Medium", relatedClient: "", status: "Open", notes: "EOS L10 agenda", dealId: null },
];

export const SEED_SETTINGS: Settings = {
  year: 2026,
  targets: { "2026": { annual: 51, q1: 10, q2: 16, q3: 15, q4: 10 } },
  templates: DEFAULT_TEMPLATES,
  brokerage: { ...DEFAULT_BROKERAGE },
};

export const SEED_SOPS: Omit<Sop, "id">[] = [
  {
    title: "New Listing Launch",
    category: "Operations",
    updatedBy: "Jordan Reyes",
    updatedAt: "7/7/2026",
    content: `Purpose: every listing goes live the same way, every time.

1. Seller intake via Jotform and create the Highnote pre-list packet.
2. Listing consult — pricing strategy, staging plan, timeline.
3. Signed listing agreement into compliance same day.
4. Order photos/media. Staging consult if needed.
5. MLS input + syndication check (Zillow, Realtor.com render correctly).
6. Launch: social posts, open house scheduled, sign + lockbox placed.
7. Weekly seller recap email every Friday until contract.

Owner: Ops. Timeline: intake to live in 14 days or less.`,
  },
  {
    title: "Buyer Consult to Contract",
    category: "Sales",
    updatedBy: "Jordan Reyes",
    updatedAt: "7/7/2026",
    content: `1. Lead responds → book consult within 48 hours.
2. Jotform buyer intake before the consult.
3. Consult: needs analysis, BRA explanation, lender intro (team default lender).
4. Signed BRA + consult recap email same day.
5. MLS search set up, group chat created with client.
6. Showings → offer strategy → executed contract.

Standard: first call within 5 minutes of lead arrival when possible.`,
  },
  {
    title: "Social Media Weekly Rhythm",
    category: "Marketing",
    updatedBy: "Avery Brooks",
    updatedAt: "7/7/2026",
    content: `Monday: market stat or myth-buster.
Wednesday: listing feature or client story.
Friday: team culture / behind the scenes.

Every closed deal: closing photo + review request within 3 days.
Every new listing: launch reel within 48 hours of going live.`,
  },
  {
    title: "New Team Member Onboarding",
    category: "Admin",
    updatedBy: "Jordan Reyes",
    updatedAt: "7/7/2026",
    content: `Day 1: Google account, add to the Hub (Team page), Lofty seat, Slack/group chats.
Week 1: shadow one consult, read all SOPs in this library, EOS seat + accountabilities review.
Week 2: own first workflow with oversight.
30 days: L10 check-in on seat fit.`,
  },
];

const thisYear = new Date().getFullYear();
const M = (m: number) => `${thisYear}-${String(m).padStart(2, "0")}`;

export const SEED_PNL: Omit<PnlEntry, "id">[] = [
  { month: M(6), kind: "Expense", category: "Marketing", description: "Social ads", amount: 450 },
  { month: M(6), kind: "Expense", category: "Software", description: "Lofty + tools", amount: 380 },
  { month: M(7), kind: "Expense", category: "Marketing", description: "Photography — Cedar Falls", amount: 275 },
  { month: M(7), kind: "Income", category: "Other income", description: "Staging referral fee", amount: 300 },
];
