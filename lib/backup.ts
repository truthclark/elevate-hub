import ExcelJS from "exceljs";
import { getAppData, dealGci } from "./derive";
import { store } from "./store";
import { brandOf } from "./brand";

// Builds the full-hub .xlsx workbook. Used by the Settings download button
// and the nightly backup email — one format, always in sync.

export async function buildBackupWorkbook(): Promise<{ buffer: Buffer; filename: string; appName: string }> {
  const data = await getAppData();
  const [sops, pnl] = await Promise.all([store.listSops(), store.listPnl()]);
  const brand = brandOf(data.settings);
  const wb = new ExcelJS.Workbook();
  wb.creator = brand.appName;

  const header = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD8F5FE" },
    };
  };

  const dealsWs = wb.addWorksheet("Deals");
  dealsWs.columns = [
    { header: "Side", key: "side", width: 10 },
    { header: "Client", key: "name", width: 22 },
    { header: "Address", key: "address", width: 24 },
    { header: "Agent", key: "agent", width: 14 },
    { header: "Status", key: "status", width: 16 },
    { header: "Contract", key: "contractDate", width: 12 },
    { header: "Option Ends", key: "optionDeadline", width: 12 },
    { header: "Inspection", key: "inspDate", width: 12 },
    { header: "Financing", key: "financingDeadline", width: 12 },
    { header: "Appraisal", key: "appraisalDeadline", width: 12 },
    { header: "Closing", key: "closeDate", width: 12 },
    { header: "Closed", key: "closedDate", width: 12 },
    { header: "Price", key: "price", width: 14 },
    { header: "Comm %", key: "commPct", width: 10 },
    { header: "Referral %", key: "referralPct", width: 10 },
    { header: "GCI", key: "gci", width: 12 },
    { header: "Source", key: "source", width: 14 },
    { header: "Referred By", key: "referredBy", width: 14 },
    { header: "Lender", key: "lender", width: 12 },
    { header: "Checklist", key: "checklist", width: 30 },
    { header: "Adjustments", key: "adjustments", width: 26 },
    { header: "Notes", key: "notes", width: 30 },
    { header: "Year", key: "year", width: 8 },
  ];
  for (const d of data.deals) {
    dealsWs.addRow({
      ...d,
      gci: dealGci(d),
      checklist: Object.entries(d.checklist)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", "),
      adjustments: (d.adjustments ?? [])
        .map((a) => `${a.label}: $${a.amount}`)
        .join("; "),
    });
  }
  dealsWs.getColumn("price").numFmt = "$#,##0";
  dealsWs.getColumn("gci").numFmt = "$#,##0.00";
  header(dealsWs);

  const leadsWs = wb.addWorksheet("Leads");
  leadsWs.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Name", key: "name", width: 20 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Email", key: "email", width: 24 },
    { header: "Source", key: "source", width: 14 },
    { header: "Type", key: "type", width: 10 },
    { header: "Timeline", key: "timeline", width: 12 },
    { header: "Budget", key: "budget", width: 10 },
    { header: "Area", key: "area", width: 14 },
    { header: "Agent", key: "agent", width: 12 },
    { header: "Follow-Up", key: "followUpStatus", width: 22 },
    { header: "Last Contact", key: "lastContact", width: 12 },
    { header: "Notes", key: "notes", width: 30 },
  ];
  data.leads.forEach((l) => leadsWs.addRow(l));
  header(leadsWs);

  const tasksWs = wb.addWorksheet("Tasks");
  tasksWs.columns = [
    { header: "Task", key: "task", width: 36 },
    { header: "Due Date", key: "dueDate", width: 12 },
    { header: "Time", key: "dueTime", width: 8 },
    { header: "Assigned To", key: "assignedTo", width: 14 },
    { header: "Priority", key: "priority", width: 10 },
    { header: "Related Client", key: "relatedClient", width: 20 },
    { header: "Status", key: "status", width: 10 },
    { header: "Notes", key: "notes", width: 28 },
  ];
  data.tasks.forEach((t) => tasksWs.addRow(t));
  header(tasksWs);

  const teamWs = wb.addWorksheet("Team");
  teamWs.columns = [
    { header: "Name", key: "name", width: 16 },
    { header: "Role", key: "role", width: 10 },
    { header: "Email", key: "email", width: 28 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Focus", key: "focus", width: 40 },
    { header: "Active", key: "active", width: 8 },
  ];
  data.team.forEach((m) => teamWs.addRow(m));
  header(teamWs);

  const pnlWs = wb.addWorksheet("P&L");
  pnlWs.columns = [
    { header: "Month", key: "month", width: 10 },
    { header: "Type", key: "kind", width: 10 },
    { header: "Category", key: "category", width: 16 },
    { header: "Description", key: "description", width: 32 },
    { header: "Amount", key: "amount", width: 12 },
  ];
  pnl.forEach((e) => pnlWs.addRow(e));
  pnlWs.getColumn("amount").numFmt = "$#,##0.00";
  header(pnlWs);

  const sopsWs = wb.addWorksheet("SOPs");
  sopsWs.columns = [
    { header: "Title", key: "title", width: 30 },
    { header: "Category", key: "category", width: 14 },
    { header: "Content", key: "content", width: 90 },
    { header: "Updated By", key: "updatedBy", width: 12 },
    { header: "Updated", key: "updatedAt", width: 12 },
  ];
  sops.forEach((sop) => {
    const row = sopsWs.addRow(sop);
    row.getCell("content").alignment = { wrapText: true, vertical: "top" };
  });
  header(sopsWs);

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  const stamp = new Date().toISOString().slice(0, 10);
  const safe = brand.appName.replace(/[^A-Za-z0-9]+/g, "_");
  return { buffer: buf, filename: `${safe}_Backup_${stamp}.xlsx`, appName: brand.appName };
}
