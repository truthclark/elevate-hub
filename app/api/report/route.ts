import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { getAppData, dealGci, gciWaterfall, pipelineStats, isClosed, isPending, isActive } from "@/lib/derive";
import { auth, authConfigured } from "@/auth";
import { store } from "@/lib/store";
import { DEFAULT_BROKERAGE } from "@/lib/types";
import { parseDateSafe } from "@/lib/utils";
import { resolveRange, inRange } from "@/lib/report-range";

export const dynamic = "force-dynamic";

// ── PDF drawing helpers ──────────────────────────────────────────
const CYAN = rgb(0.02, 0.765, 0.976);
const INK = rgb(0.106, 0.106, 0.141);
const MUTED = rgb(0.42, 0.44, 0.48);
const LIGHT = rgb(0.94, 0.955, 0.97);
const GREEN = rgb(0.02, 0.55, 0.35);
const RED = rgb(0.8, 0.15, 0.25);

const PAGE_W = 792; // Letter landscape
const PAGE_H = 612;
const MARGIN = 44;

function money(v: number | null | undefined): string {
  if (v == null) return "-";
  return "$" + Math.round(v).toLocaleString("en-US");
}

class Doc {
  pdf!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  y = 0;
  title = "";
  subtitle = "";

  static async create(title: string, subtitle: string) {
    const d = new Doc();
    d.pdf = await PDFDocument.create();
    d.font = await d.pdf.embedFont(StandardFonts.Helvetica);
    d.bold = await d.pdf.embedFont(StandardFonts.HelveticaBold);
    d.title = title;
    d.subtitle = subtitle;
    d.addPage();
    return d;
  }

  addPage() {
    this.page = this.pdf.addPage([PAGE_W, PAGE_H]);
    // Brand header
    this.page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: CYAN });
    this.page.drawText("ELEVATE REALTY TEAM", {
      x: MARGIN, y: PAGE_H - 34, size: 9, font: this.bold, color: MUTED,
    });
    this.page.drawText(this.title, {
      x: MARGIN, y: PAGE_H - 56, size: 20, font: this.bold, color: INK,
    });
    this.page.drawText(this.subtitle, {
      x: MARGIN, y: PAGE_H - 72, size: 9.5, font: this.font, color: MUTED,
    });
    const stamp = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const w = this.font.widthOfTextAtSize(stamp, 9);
    this.page.drawText(stamp, { x: PAGE_W - MARGIN - w, y: PAGE_H - 34, size: 9, font: this.font, color: MUTED });
    this.y = PAGE_H - 96;
  }

  ensure(height: number) {
    if (this.y - height < MARGIN) this.addPage();
  }

  section(label: string) {
    this.ensure(30);
    this.y -= 8;
    this.page.drawText(label.toUpperCase(), {
      x: MARGIN, y: this.y, size: 8.5, font: this.bold, color: MUTED,
    });
    this.y -= 14;
  }

  // Row of stat boxes
  stats(items: { label: string; value: string; color?: ReturnType<typeof rgb> }[]) {
    this.ensure(56);
    const gap = 10;
    const w = (PAGE_W - MARGIN * 2 - gap * (items.length - 1)) / items.length;
    items.forEach((it, i) => {
      const x = MARGIN + i * (w + gap);
      this.page.drawRectangle({
        x, y: this.y - 44, width: w, height: 46,
        color: LIGHT, borderColor: rgb(0.88, 0.9, 0.92), borderWidth: 0.5,
      });
      this.page.drawText(it.label, { x: x + 10, y: this.y - 14, size: 7.5, font: this.font, color: MUTED });
      this.page.drawText(it.value, { x: x + 10, y: this.y - 34, size: 15, font: this.bold, color: it.color ?? INK });
    });
    this.y -= 58;
  }

  table(headers: string[], widths: number[], rows: (string | { t: string; c?: ReturnType<typeof rgb>; b?: boolean })[][]) {
    const rowH = 17;
    const drawHeader = () => {
      this.ensure(rowH * 2);
      let x = MARGIN;
      this.page.drawRectangle({ x: MARGIN, y: this.y - rowH + 4, width: PAGE_W - MARGIN * 2, height: rowH, color: LIGHT });
      headers.forEach((h, i) => {
        this.page.drawText(h, { x: x + 4, y: this.y - 8, size: 7.5, font: this.bold, color: MUTED });
        x += widths[i];
      });
      this.y -= rowH;
    };
    drawHeader();
    for (const row of rows) {
      if (this.y - rowH < MARGIN) { this.addPage(); drawHeader(); }
      let x = MARGIN;
      row.forEach((cell, i) => {
        const v = typeof cell === "string" ? { t: cell } : cell;
        const size = 8.5;
        const font = v.b ? this.bold : this.font;
        let text = v.t;
        while (font.widthOfTextAtSize(text, size) > widths[i] - 8 && text.length > 2) {
          text = text.slice(0, -2);
        }
        if (text !== v.t) text += "…" === text.slice(-1) ? "" : "...";
        this.page.drawText(text, { x: x + 4, y: this.y - 8, size, font, color: v.c ?? INK });
        x += widths[i];
      });
      this.page.drawLine({
        start: { x: MARGIN, y: this.y - rowH + 4.5 },
        end: { x: PAGE_W - MARGIN, y: this.y - rowH + 4.5 },
        thickness: 0.4, color: rgb(0.9, 0.92, 0.94),
      });
      this.y -= rowH;
    }
    this.y -= 6;
  }

  note(text: string) {
    this.ensure(16);
    this.page.drawText(text, { x: MARGIN, y: this.y - 8, size: 8, font: this.font, color: MUTED });
    this.y -= 20;
  }

  async bytes() {
    return this.pdf.save();
  }
}

// ── Route ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (authConfigured) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
  }

  const type = req.nextUrl.searchParams.get("type") ?? "production";
  const data = await getAppData();
  const year = data.settings.year;
  const range = resolveRange(req.nextUrl.searchParams.get("period") ?? undefined, year);
  const agentF = req.nextUrl.searchParams.get("agent") ?? "";
  // Agent filter applies to everything; period filter applies to closed business
  const deals = data.deals.filter(
    (d) =>
      d.year === year &&
      (!agentF || d.agent === agentF) &&
      (!isClosed(d) || inRange(d.closedDate || d.closeDate, range))
  );
  const scopeLabel = `${range.label}${agentF ? ` · ${agentF}` : ""}`;
  const targets = data.settings.targets[String(year)] ?? { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 };
  const brokerage = data.settings.brokerage ?? DEFAULT_BROKERAGE;

  let doc: Doc;
  let filename: string;

  if (type === "pipeline") {
    doc = await Doc.create("Pipeline Report", `Every active and pending deal right now${agentF ? ` · ${agentF}` : ""}, with projected commission.`);
    filename = `Elevate_Pipeline_Report`;
    const open = deals.filter((d) => !isClosed(d) && isActive(d));
    const pending = open.filter(isPending);
    const active = open.filter((d) => !isPending(d));
    const vol = (l: typeof open) => l.reduce((s, d) => s + (d.price ?? 0), 0);
    const gci = (l: typeof open) => l.reduce((s, d) => s + (dealGci(d) ?? 0), 0);

    doc.stats([
      { label: "ACTIVE (PRE-CONTRACT)", value: String(active.length) },
      { label: "PENDING / UNDER CONTRACT", value: String(pending.length) },
      { label: "PIPELINE VOLUME", value: money(vol(open)) },
      { label: "PROJECTED GCI", value: money(gci(open)), color: GREEN },
    ]);

    const cols = [200, 62, 110, 90, 80, 90, 72];
    const toRow = (d: (typeof open)[number]) => [
      { t: d.address || d.name, b: true },
      d.side,
      d.status || "-",
      d.agent || "-",
      d.closeDate ? d.closeDate : "-",
      money(d.price),
      { t: money(dealGci(d)), c: GREEN },
    ];
    doc.section(`Under contract (${pending.length})`);
    doc.table(["Client / Property", "Side", "Status", "Agent", "Close date", "Price", "Proj. GCI"], cols, pending.map(toRow));
    doc.section(`Working (${active.length})`);
    doc.table(["Client / Property", "Side", "Status", "Agent", "Close date", "Price", "Proj. GCI"], cols, active.map(toRow));
  } else if (type === "money") {
    doc = await Doc.create("Money Report", `GCI breakdown and profit summary · ${scopeLabel}. Split: ${brokerage.splitPct}% to brokerage, ${money(brokerage.annualCap)} cap.`);
    filename = `Elevate_Money_Report`;
    // Cap math uses every deal; display only the scoped ones
    const wfAll = gciWaterfall(data.deals, brokerage, year);
    const scopedIds = new Set(deals.filter(isClosed).map((d) => d.id));
    const wfRows = wfAll.rows.filter((r) => scopedIds.has(r.id));
    const wfSum = (f: (r: (typeof wfRows)[number]) => number) =>
      Math.round(wfRows.reduce((s, r) => s + f(r), 0) * 100) / 100;
    const wf = {
      ...wfAll,
      rows: wfRows,
      totals: {
        gross: wfSum((r) => r.gross),
        referralOut: wfSum((r) => r.referralOut),
        netGci: wfSum((r) => r.netGci),
        brokerSplit: wfSum((r) => r.brokerSplit),
        fees: wfSum((r) => r.fees),
        teamNet: wfSum((r) => r.teamNet),
      },
    };
    const pnl = await store.listPnl();
    const income = pnl.filter((e) => e.kind.toLowerCase() === "income").reduce((s, e) => s + Number(e.amount), 0);
    const expenses = pnl.filter((e) => e.kind.toLowerCase() !== "income").reduce((s, e) => s + Number(e.amount), 0);

    doc.stats([
      { label: "GROSS COMMISSION", value: money(wf.totals.gross) },
      { label: "REFERRAL FEES OUT", value: money(wf.totals.referralOut), color: RED },
      { label: "NET GCI", value: money(wf.totals.netGci) },
      { label: `BROKERAGE SPLIT`, value: money(wf.totals.brokerSplit), color: RED },
      { label: "FEES", value: money(wf.totals.fees), color: RED },
      { label: "TEAM NET", value: money(wf.totals.teamNet), color: GREEN },
    ]);
    doc.note(
      wf.capReached
        ? `Cap reached: ${money(brokerage.annualCap)} paid to brokerage this cap year (resets ${wf.capResetLabel}).`
        : `${money(wf.brokerPaid)} of the ${money(brokerage.annualCap)} cap paid so far (cap year resets ${wf.capResetLabel}).`
    );

    doc.section(`Closed deal breakdown (${wf.rows.length})`);
    doc.table(
      ["Deal", "Closed", "Gross", "Referral out", "Net GCI", "Split", "Fees", "Team net"],
      [180, 74, 84, 84, 84, 74, 60, 64],
      wf.rows.map((r) => [
        { t: r.name, b: true },
        r.closedDate || "-",
        money(r.gross),
        { t: r.referralOut ? `-${money(r.referralOut)}` : "-", c: r.referralOut ? RED : MUTED },
        money(r.netGci),
        { t: r.brokerSplit ? `-${money(r.brokerSplit)}` : "-", c: r.brokerSplit ? RED : MUTED },
        { t: r.fees ? `-${money(r.fees)}` : "-", c: r.fees ? RED : MUTED },
        { t: money(r.teamNet), c: GREEN, b: true },
      ])
    );

    doc.section("Profit & loss (logged in Money tab)");
    const catTotals: Record<string, number> = {};
    for (const e of pnl.filter((x) => x.kind.toLowerCase() !== "income")) {
      const c = e.category || "Uncategorized";
      catTotals[c] = (catTotals[c] ?? 0) + Number(e.amount);
    }
    doc.table(
      ["Line", "Amount"],
      [400, 120],
      [
        [{ t: "Other income logged", b: true }, { t: money(income), c: GREEN }],
        ...Object.entries(catTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([c, v]): [{ t: string; b?: boolean }, { t: string; c?: ReturnType<typeof rgb>; b?: boolean }] => [{ t: `Expenses: ${c}` }, { t: `-${money(v)}`, c: RED }]),
        [
          { t: "Net (team net + income - expenses)", b: true },
          { t: money(wf.totals.teamNet + income - expenses), c: GREEN, b: true },
        ],
      ]
    );
  } else if (type === "sources") {
    doc = await Doc.create("Leads & Sources Report", `Where business comes from (${scopeLabel}), and where every lead stands right now.`);
    filename = `Elevate_Leads_Sources_Report`;
    const leads = data.leads;
    const converted = deals.filter((d) => isClosed(d) || isPending(d)).length;
    const totalRecords = deals.length + leads.length;

    doc.stats([
      { label: "LEADS IN PLAY", value: String(leads.length) },
      { label: "DEALS THIS YEAR", value: String(deals.length) },
      { label: "IN CONTRACT / CLOSED", value: String(converted) },
      { label: "CONVERSION", value: totalRecords ? `${Math.round((converted / totalRecords) * 100)}%` : "0%", color: GREEN },
    ]);

    doc.section("Leads by follow-up status");
    const byStatus: Record<string, number> = {};
    for (const l of leads) byStatus[l.followUpStatus || "No status"] = (byStatus[l.followUpStatus || "No status"] ?? 0) + 1;
    doc.table(
      ["Follow-up status", "Leads"],
      [400, 100],
      Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, { t: String(v), b: true }])
    );

    doc.section("Deals by source");
    const bySource: Record<string, { total: number; closed: number; gci: number }> = {};
    for (const d of deals) {
      const s = d.source || "Unknown";
      bySource[s] = bySource[s] ?? { total: 0, closed: 0, gci: 0 };
      bySource[s].total += 1;
      if (isClosed(d)) { bySource[s].closed += 1; bySource[s].gci += dealGci(d) ?? 0; }
    }
    doc.table(
      ["Source", "Deals", "Closed", "Closed GCI"],
      [300, 90, 90, 120],
      Object.entries(bySource)
        .sort((a, b) => b[1].gci - a[1].gci)
        .map(([s, v]) => [{ t: s, b: true }, String(v.total), String(v.closed), { t: money(v.gci), c: GREEN }])
    );

    doc.section("Lead list");
    doc.table(
      ["Name", "Type", "Source", "Agent", "Follow-up", "Last contact"],
      [170, 60, 110, 90, 180, 90],
      leads.map((l) => [
        { t: l.name, b: true },
        l.type || "-",
        l.source || "-",
        l.agent || "-",
        l.followUpStatus || "-",
        l.lastContact || "Never",
      ])
    );
  } else {
    // production (default)
    doc = await Doc.create("Production Report", `Closed business · ${scopeLabel}: units, volume, and commission earned.`);
    filename = `Elevate_Production_Report`;
    const closed = deals
      .filter((d) => isClosed(d))
      .sort((a, b) => (parseDateSafe(a.closedDate || a.closeDate)?.getTime() ?? 0) - (parseDateSafe(b.closedDate || b.closeDate)?.getTime() ?? 0));
    const stats = pipelineStats(deals, targets);

    doc.stats([
      { label: `UNITS CLOSED (GOAL ${targets.annual})`, value: String(stats.unitsClosed) },
      { label: "CLOSED VOLUME", value: money(stats.volume.closed) },
      { label: "CLOSED GCI", value: money(stats.gci.closed), color: GREEN },
      { label: "PENDING UNITS", value: String(stats.unitsPending) },
      { label: "PENDING GCI", value: money(stats.gci.pending) },
    ]);

    const byAgent: Record<string, { units: number; volume: number; gci: number }> = {};
    for (const d of closed) {
      const a = d.agent || "Unassigned";
      byAgent[a] = byAgent[a] ?? { units: 0, volume: 0, gci: 0 };
      byAgent[a].units += 1;
      byAgent[a].volume += d.price ?? 0;
      byAgent[a].gci += dealGci(d) ?? 0;
    }
    doc.section("Production by agent");
    doc.table(
      ["Agent", "Units", "Volume", "GCI"],
      [250, 80, 140, 130],
      Object.entries(byAgent)
        .sort((a, b) => b[1].gci - a[1].gci)
        .map(([a, v]) => [{ t: a, b: true }, String(v.units), money(v.volume), { t: money(v.gci), c: GREEN }])
    );

    doc.section(`Closed deals (${closed.length})`);
    doc.table(
      ["Client / Property", "Side", "Agent", "Closed", "Price", "Comm %", "GCI"],
      [230, 62, 100, 80, 90, 62, 80],
      closed.map((d) => [
        { t: d.address || d.name, b: true },
        d.side,
        d.agent || "-",
        d.closedDate || d.closeDate || "-",
        money(d.price),
        d.commPct != null ? `${d.commPct}%` : "-",
        { t: money(dealGci(d)), c: GREEN },
      ])
    );
  }

  const bytes = await doc.bytes();
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}_${stamp}.pdf"`,
    },
  });
}
