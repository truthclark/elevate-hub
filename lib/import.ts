import { google } from "googleapis";
import { Deal, Lead, TaskItem } from "./types";
import { parseNumber } from "./utils";
import { store } from "./store";

// One-click import from the "Business Hub 2026" Google Sheet.
// Idempotent: matches existing deals by side + name/address and updates them.

export const sheetConfigured = () =>
  Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY &&
      process.env.GOOGLE_SHEET_ID
  );

const RANGES = {
  buyers: "Buyers!A4:Z60",
  listings: "'Listings 26'!A4:Z60",
  referrals: "Referrals!A4:N32",
  leads: "Leads!A2:M200",
  tasks: "Tasks!A2:G200",
};

const cell = (row: unknown[], i: number): string =>
  row[i] == null ? "" : String(row[i]).trim();
const Y = (v: string) => (v.toLowerCase().startsWith("y") ? "Y" : "");

function buyerToDeal(row: unknown[]): Partial<Deal> {
  return {
    side: "Buyer",
    name: cell(row, 1),
    agent: "",
    checklist: {
      highnote: Y(cell(row, 2)), jotform: Y(cell(row, 3)), groupChat: Y(cell(row, 4)),
      consult: Y(cell(row, 5)), recap: Y(cell(row, 6)), bra: Y(cell(row, 7)),
      mls: Y(cell(row, 11)), tcSetup: Y(cell(row, 15)),
    },
    closeGoal: cell(row, 9),
    lender: cell(row, 10),
    inspDate: cleanDate(cell(row, 16)),
    closeDate: cleanDate(cell(row, 17)),
    status: cell(row, 24) ? "Closed" : cell(row, 18) || (cell(row, 14) ? "Under Contract" : "Active"),
    price: parseNumber(row[19]),
    gci: parseNumber(row[20]),
    commPct: parseNumber(row[21]),
    referralPct: parseNumber(row[22]),
    source: cell(row, 23),
    closedDate: cleanDate(cell(row, 24)),
    referredBy: cell(row, 25),
    year: yearOf(cell(row, 24)) ?? yearOf(cell(row, 17)) ?? new Date().getFullYear(),
  };
}

function listingToDeal(row: unknown[]): Partial<Deal> {
  return {
    side: "Listing",
    name: cell(row, 1),
    address: cell(row, 1),
    agent: "",
    checklist: {
      highnote: Y(cell(row, 2)), jotform: Y(cell(row, 3)), groupChat: Y(cell(row, 4)),
      consult: Y(cell(row, 5)), recap: Y(cell(row, 6)), la: Y(cell(row, 7)),
      mls: Y(cell(row, 12)), tcSetup: Y(cell(row, 9)),
    },
    closeGoal: cell(row, 10),
    inspDate: cleanDate(cell(row, 16)),
    closeDate: cleanDate(cell(row, 17)),
    status: cell(row, 24) ? "Closed" : cell(row, 18) || cell(row, 15) || "Active",
    price: parseNumber(row[19]),
    gci: parseNumber(row[20]),
    commPct: parseNumber(row[21]),
    referralPct: parseNumber(row[22]),
    source: cell(row, 23),
    closedDate: cleanDate(cell(row, 24)),
    referredBy: cell(row, 25),
    year: yearOf(cell(row, 24)) ?? yearOf(cell(row, 17)) ?? new Date().getFullYear(),
  };
}

function referralToDeal(row: unknown[]): Partial<Deal> {
  return {
    side: "Referral",
    name: cell(row, 1),
    agent: cell(row, 5),
    closeGoal: cell(row, 3),
    status: cell(row, 12) ? "Closed" : cell(row, 8) || "Referred",
    closedDate: cleanDate(cell(row, 12)),
    year: yearOf(cell(row, 12)) ?? new Date().getFullYear(),
  };
}

function rowToLead(row: unknown[]): Partial<Lead> {
  return {
    date: cell(row, 0), name: cell(row, 1), phone: cell(row, 2), email: cell(row, 3),
    source: cell(row, 4), type: cell(row, 5), timeline: cell(row, 6), budget: cell(row, 7),
    area: cell(row, 8), agent: cell(row, 9), followUpStatus: cell(row, 10),
    lastContact: cell(row, 11), notes: cell(row, 12),
  };
}

function rowToTask(row: unknown[]): Partial<TaskItem> {
  return {
    task: cell(row, 0), dueDate: cell(row, 1), assignedTo: cell(row, 2),
    priority: cell(row, 3) || "Medium", relatedClient: cell(row, 4),
    status: cell(row, 5) || "Open", notes: cell(row, 6), dealId: null,
  };
}

function cleanDate(v: string): string {
  return v === "select date" ? "" : v;
}
function yearOf(v: string): number | null {
  const d = new Date(cleanDate(v));
  return isNaN(d.getTime()) ? null : d.getFullYear();
}

export async function importSheet() {
  if (!sheetConfigured())
    return { ok: false as const, message: "Google Sheets credentials not configured (see README)." };

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  try {
    // Only request tabs that actually exist in the spreadsheet
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
    });
    const tabs = new Set(
      (meta.data.sheets ?? []).map((s) => s.properties?.title ?? "")
    );
    const tabOf = (range: string) =>
      range.split("!")[0].replace(/^'|'$/g, "");
    const wanted = Object.values(RANGES).filter((r) => tabs.has(tabOf(r)));

    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      ranges: wanted,
    });
    const byTab: Record<string, { values?: unknown[][] | null }> = {};
    (res.data.valueRanges ?? []).forEach((vr, i) => {
      byTab[tabOf(wanted[i])] = vr as { values?: unknown[][] | null };
    });
    const buyersR = byTab["Buyers"];
    const listingsR = byTab["Listings 26"];
    const referralsR = byTab["Referrals"];
    const leadsR = byTab["Leads"];
    const tasksR = byTab["Tasks"];
    const rows = (r?: { values?: unknown[][] | null }, nameCol = 1) =>
      ((r?.values as unknown[][]) ?? []).filter((row) => cell(row, nameCol) !== "");

    const payload = {
      deals: [
        ...rows(buyersR).map(buyerToDeal),
        ...rows(listingsR).map(listingToDeal),
        ...rows(referralsR).map(referralToDeal),
      ],
      leads: rows(leadsR).map(rowToLead),
      tasks: rows(tasksR, 0).map(rowToTask),
    };
    const counts = await store.bulkImport(payload);
    return {
      ok: true as const,
      message: `Imported ${counts.deals} deals, ${counts.leads} leads, ${counts.tasks} new tasks.`,
    };
  } catch (err) {
    console.error("Sheet import failed:", err);
    return { ok: false as const, message: `Import failed: ${(err as Error).message}` };
  }
}
