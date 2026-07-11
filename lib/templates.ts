import { TaskTemplate } from "./types";

// Elevate SOP task templates — built from the April 2026 Listing SOP and
// Buyer Workflow docs, sized for a 2-person + VA team. Editable in Settings.
// Anchors: "created" = deal added, "contract" = contract date,
// "close" = closing date (negative offsets = days before).
// assignRole "" = the deal's agent; "Ops" = VA (or whoever holds Ops).
export const DEFAULT_TEMPLATES: TaskTemplate[] = [
  {
    id: "new-buyer",
    name: "New Buyer",
    side: "Buyer",
    items: [
      { title: "Send pre-consult email (Jotform intake + Highnote portal)", offsetDays: 0, anchor: "created", assignRole: "Ops" },
      { title: "Confirm Lofty updated from intake; tag military / new-build", offsetDays: 1, anchor: "created", assignRole: "Ops" },
      { title: "Buyer consult — review intake, timeline, explain process", offsetDays: 2, anchor: "created", assignRole: "" },
      { title: "Send consult recap + Buyer Rep Agreement (no showings without it)", offsetDays: 3, anchor: "created", assignRole: "" },
      { title: "Warm lender intro (VA-approved lender if military)", offsetDays: 3, anchor: "created", assignRole: "" },
      { title: "Build MLS/IDX search + alerts (register with builders if new-build)", offsetDays: 4, anchor: "created", assignRole: "Ops" },
      { title: "Create group chat with client", offsetDays: 4, anchor: "created", assignRole: "Ops" },
      { title: "Chase pre-approval — weekly until letter in hand, no touring without it", offsetDays: 10, anchor: "created", assignRole: "" },
      { title: "Send 'pre-approval is in — let's find your home' guide", offsetDays: 12, anchor: "created", assignRole: "Ops" },
    ],
  },
  {
    id: "new-listing",
    name: "New Listing",
    side: "Listing",
    items: [
      { title: "Send seller intake + Highnote pre-list packet", offsetDays: 0, anchor: "created", assignRole: "Ops" },
      { title: "Prep CMA, net sheet & listing presentation", offsetDays: 1, anchor: "created", assignRole: "" },
      { title: "Listing appointment — walkthrough, pricing, sign agreement", offsetDays: 2, anchor: "created", assignRole: "" },
      { title: "Send zipForm doc package + Seller's Shield disclosure + survey request", offsetDays: 3, anchor: "created", assignRole: "Ops" },
      { title: "Confirm ALL docs signed — nothing goes active without them", offsetDays: 5, anchor: "created", assignRole: "Ops" },
      { title: "Schedule vendors: cleaning → staging → photos", offsetDays: 5, anchor: "created", assignRole: "Ops" },
      { title: "Install lockbox + yard sign; QR code → Coming Soon page", offsetDays: 7, anchor: "created", assignRole: "" },
      { title: "Build MLS entry, upload photos, draft remarks", offsetDays: 10, anchor: "created", assignRole: "Ops" },
      { title: "Confirm go-live date + open house with seller", offsetDays: 11, anchor: "created", assignRole: "" },
      { title: "Coming Soon social post", offsetDays: 12, anchor: "created", assignRole: "Ops" },
      { title: "GO LIVE: MLS active, ShowingTime set up, QR → live page, Just Listed posts", offsetDays: 14, anchor: "created", assignRole: "Ops" },
      { title: "First weekly seller recap email (repeat every Friday)", offsetDays: 18, anchor: "created", assignRole: "" },
    ],
  },
  {
    id: "uc-buyer",
    name: "Under Contract — Buyer Side",
    side: "Pending",
    items: [
      { title: "Send executed contract packet to Sara (TC) + brief her", offsetDays: 0, anchor: "contract", assignRole: "" },
      { title: "Group text: client + Sara intro", offsetDays: 0, anchor: "contract", assignRole: "" },
      { title: "Schedule inspection", offsetDays: 1, anchor: "contract", assignRole: "" },
      { title: "Confirm earnest money + option fee receipted", offsetDays: 2, anchor: "contract", assignRole: "Ops" },
      { title: "Review inspection + negotiate repairs BEFORE option ends", offsetDays: 6, anchor: "contract", assignRole: "" },
      { title: "Confirm appraisal ordered", offsetDays: 8, anchor: "contract", assignRole: "Ops" },
      { title: "Weekly lender check-in until Clear to Close", offsetDays: 10, anchor: "contract", assignRole: "Ops" },
      { title: "Confirm CD released (must be 3 days before close)", offsetDays: -4, anchor: "close", assignRole: "Ops" },
      { title: "Confirm Clear to Close issued", offsetDays: -3, anchor: "close", assignRole: "" },
      { title: "Schedule final walkthrough", offsetDays: -2, anchor: "close", assignRole: "" },
      { title: "Closing gift ready + review request queued", offsetDays: -1, anchor: "close", assignRole: "Ops" },
      { title: "Post-close: back to Leads as nurture + Lofty past-client plan", offsetDays: 1, anchor: "close", assignRole: "Ops" },
    ],
  },
  {
    id: "uc-listing",
    name: "Under Contract — Listing Side",
    side: "Pending",
    items: [
      { title: "Group text: sellers + Sara (TC) intro", offsetDays: 0, anchor: "contract", assignRole: "" },
      { title: "Walk sellers through option period, EM/option fee, inspection access", offsetDays: 1, anchor: "contract", assignRole: "" },
      { title: "Review repair request — lender-required first; concessions vs repairs", offsetDays: 6, anchor: "contract", assignRole: "" },
      { title: "Submit amendment; update Sara on agreed repairs", offsetDays: 7, anchor: "contract", assignRole: "" },
      { title: "Send seller payoff sheet via title", offsetDays: 9, anchor: "contract", assignRole: "Ops" },
      { title: "Confirm appraisal outcome; walk seller through it", offsetDays: 14, anchor: "contract", assignRole: "" },
      { title: "Coordinate repairs; receipts to buyer's agent 3 days before close", offsetDays: -5, anchor: "close", assignRole: "Ops" },
      { title: "Confirm CD released + Clear to Close", offsetDays: -3, anchor: "close", assignRole: "Ops" },
      { title: "Confirm closing format; remind sellers on disbursement (we never handle wiring)", offsetDays: -3, anchor: "close", assignRole: "" },
      { title: "Closing gift ready; queue Just Sold post", offsetDays: -1, anchor: "close", assignRole: "Ops" },
      { title: "MLS → Closed; retrieve sign + lockbox; thank buyer's agent", offsetDays: 1, anchor: "close", assignRole: "Ops" },
      { title: "Post-close: Lofty past-client plan + 1-year campaign start", offsetDays: 1, anchor: "close", assignRole: "Ops" },
    ],
  },
];
