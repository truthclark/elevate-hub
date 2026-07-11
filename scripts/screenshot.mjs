// Dev utility: captures preview screenshots of every page.
// Usage: node scripts/screenshot.mjs [baseUrl] [outDir]
import puppeteer from "puppeteer";

const base = process.argv[2] ?? "http://localhost:3000";
const out = process.argv[3] ?? "./screenshots";
const routes = [
  ["login", "/login"],
  ["dashboard", "/"],
  ["clients", "/clients"],
  ["transactions", "/transactions"],
  ["listings", "/listings"],
  ["leads", "/leads"],
  ["tasks", "/tasks"],
  ["team", "/team"],
  ["reports", "/reports"],
];

const browser = await puppeteer.launch({
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

import { mkdirSync } from "fs";
mkdirSync(out, { recursive: true });

for (const [name, route] of routes) {
  await page.goto(base + route, { waitUntil: "networkidle0", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 700)); // let charts animate in
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  console.log("captured", name);
}

// Mobile view of the dashboard
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto(base + "/", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 700));
await page.screenshot({ path: `${out}/mobile-dashboard.png`, fullPage: true });
console.log("captured mobile");

await browser.close();
