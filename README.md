# Elevate Hub

Private command center for **Elevate Realty Team** (brokered by Real Broker LLC) — clients, transactions, listings, leads, tasks, team, and reports, with a built-in TC deadline engine and SOP task templates.

**Architecture:** Postgres is the system of record. Your Google Sheet is an *import source*, and one click downloads a full **.xlsx backup** anytime. No credentials? The app runs in demo mode (in-memory sample data) so you can preview everything.

---

## Setup (three independent pieces — do them in any order)

### 1. Database — makes data permanent (~3 min, free)

1. Go to [neon.tech](https://neon.tech) → sign up → **Create project** (name it `elevate-hub`).
2. Copy the **connection string** it shows you.
3. Put it in `.env.local` as `DATABASE_URL` (and later in Vercel).

Tables create themselves on first run, and your team roster seeds automatically. Without this, the app works but resets on restart ("Demo mode" badge shows).

### 2. Google Sheet import (optional)

Only needed to pull your existing "Business Hub 2026" data in:

1. [console.cloud.google.com](https://console.cloud.google.com) → enable **Google Sheets API**.
2. **Credentials → Create → Service Account** → then **Keys → Add Key → JSON**.
3. Share the sheet with the service-account email (Viewer).
4. Fill `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID` in `.env.local`.
5. In the app: **Settings → Import from Google Sheet**. Idempotent — safe to run again.

### 3. Google sign-in

1. Same Google Cloud project → **OAuth consent screen** (External; add team emails as test users).
2. **Credentials → Create → OAuth Client ID → Web application** with redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://YOUR-APP.vercel.app/api/auth/callback/google`
3. Fill `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET` (`openssl rand -base64 32`), and `ALLOWED_EMAILS` (bootstrap fallback).

**Day-to-day access is managed in the app:** Team page → Add member with their Google email → they can sign in. Set Inactive or delete to revoke. Roles: **Admin** (everything incl. Settings/Team/deletes), **Agent**, **Ops**.

## Run locally

```bash
cp .env.local.example .env.local   # fill in what you have
npm install
npm run dev                        # http://localhost:3000
```

## Deploy to Vercel

```bash
npm i -g vercel && vercel
```

Add all env vars in Vercel → Settings → Environment Variables, then `vercel --prod`. Add the production callback URL to the OAuth client.

---

## How the pieces work

- **Deals** are the core record (Buyer / Listing / Referral side) with contract dates, money, and a workflow checklist. Clients, Transactions, and Listings are views of deals.
- **TC deadline engine:** enter contract/option/financing/appraisal/closing dates on a deal — the Transactions page shows a countdown timeline, and the alert bell flags anything inside its warning window (option 3d, financing/appraisal 5d, closing 7d, TC-not-set-up 10d) plus overdue tasks.
- **SOP task templates** (Settings): New Buyer Workflow, New Listing SOP, Pending Contract (TC). Pick one when adding/editing a deal and the whole SOP becomes dated, assigned tasks. Edit templates to match your process.
- **Year rollover:** every deal has a year. In Settings, change the active year and set new targets — dashboards/reports follow the active year, history stays.
- **SOP library** (`/sops`): Admin / Marketing / Sales / Operations how-tos, editable in-app, exported with backups.
- **Money** (`/money`): quick P&L — commission income auto-flows from closed deals (team net after splits); log expenses and other income manually or via the assistant ("log $450 marketing spend").
- **GCI waterfall** (Reports): gross → referral fees out → net GCI → brokerage split (capped, set in Settings) → team net.
- **Lead ⇄ client:** "Convert" on a lead creates the deal and auto-fires the SOP task template; "Nurture" on a closed client adds them back to Leads as a past-client follow-up.
- **Calendar** (`/calendar`): all tasks, contract deadlines, and closings on a month grid.
- **Backup:** Settings → Download backup (.xlsx) — Deals, Leads, Tasks, Team, P&L, SOPs tabs, ready for Google Sheets. Do this weekly (or before big changes).
- **Import** matches existing deals by side + name/address, so re-importing won't duplicate.

## Project structure

```
elevate-hub/
├── auth.ts                  # Google sign-in, team-based allowlist, roles
├── middleware.ts            # Route protection (demo mode if unconfigured)
├── app/
│   ├── actions.ts           # All server actions (CRUD, import, settings)
│   ├── api/export/          # .xlsx backup download
│   ├── login/               # Split-screen login
│   └── (dashboard)/         # 9 sections incl. settings
├── components/              # sidebar, topbar, alerts bell, forms, txn table, charts
└── lib/
    ├── store/               # repo interface + postgres + in-memory demo
    ├── derive.ts            # stats, alerts, timelines, template engine
    ├── import.ts            # Google Sheet import
    └── templates.ts         # default SOP templates
```

## Brand

Accent `#05c3f9` · Ink `#1B1B24` · Chalk `#f7f8fa` · Sora + DM Sans · *Real Estate with a Higher Purpose*
