import postgres from "postgres";
import { Deal, Lead, TaskItem, TeamMember, Settings, Sop, PnlEntry, DealNote, Funnel, FormSubmission, DEFAULT_BROKERAGE, DEFAULT_CHECKLISTS, DEFAULT_MEASURABLES, DEFAULT_LINKS } from "../types";
import { SEED_SETTINGS, SEED_TEAM, SEED_SOPS } from "../seed";
import type { Repo, ImportPayload } from "./repo";

// Postgres repo (Neon / Vercel Postgres). Schema bootstraps on first use.

const g = globalThis as unknown as {
  __elevateSql?: ReturnType<typeof postgres>;
  __elevateInit?: Promise<void>;
};

function sql() {
  if (!g.__elevateSql) {
    g.__elevateSql = postgres(process.env.DATABASE_URL!, {
      ssl: "require",
      max: 5,
    });
  }
  return g.__elevateSql;
}

async function init() {
  if (!g.__elevateInit) {
    g.__elevateInit = (async () => {
      const s = sql();
      await s`CREATE TABLE IF NOT EXISTS deals (
        id serial PRIMARY KEY,
        side text NOT NULL DEFAULT 'Buyer',
        name text NOT NULL DEFAULT '',
        address text NOT NULL DEFAULT '',
        agent text NOT NULL DEFAULT '',
        source text NOT NULL DEFAULT '',
        referred_by text NOT NULL DEFAULT '',
        lender text NOT NULL DEFAULT '',
        close_goal text NOT NULL DEFAULT '',
        checklist jsonb NOT NULL DEFAULT '{}',
        contract_date text NOT NULL DEFAULT '',
        option_deadline text NOT NULL DEFAULT '',
        financing_deadline text NOT NULL DEFAULT '',
        appraisal_deadline text NOT NULL DEFAULT '',
        insp_date text NOT NULL DEFAULT '',
        close_date text NOT NULL DEFAULT '',
        closed_date text NOT NULL DEFAULT '',
        price numeric,
        comm_pct numeric,
        referral_pct numeric,
        gci numeric,
        status text NOT NULL DEFAULT 'Active',
        notes text NOT NULL DEFAULT '',
        year int NOT NULL DEFAULT extract(year from now()),
        archived boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`;
      await s`ALTER TABLE deals ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false`;
      await s`ALTER TABLE deals ADD COLUMN IF NOT EXISTS share_token text NOT NULL DEFAULT ''`;
      await s`ALTER TABLE deals ADD COLUMN IF NOT EXISTS adjustments jsonb NOT NULL DEFAULT '[]'`;
      await s`ALTER TABLE deals ADD COLUMN IF NOT EXISTS photo text NOT NULL DEFAULT ''`;
      await s`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz`;
      await s`ALTER TABLE pnl_entries ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false`;
      await s`ALTER TABLE pnl_entries ADD COLUMN IF NOT EXISTS end_month text NOT NULL DEFAULT ''`;
      await s`ALTER TABLE pnl_entries ADD COLUMN IF NOT EXISTS recur_of int`;
      await s`CREATE TABLE IF NOT EXISTS leads (
        id serial PRIMARY KEY,
        date text NOT NULL DEFAULT '', name text NOT NULL DEFAULT '',
        phone text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '',
        source text NOT NULL DEFAULT '', type text NOT NULL DEFAULT '',
        timeline text NOT NULL DEFAULT '', budget text NOT NULL DEFAULT '',
        area text NOT NULL DEFAULT '', agent text NOT NULL DEFAULT '',
        follow_up_status text NOT NULL DEFAULT '', last_contact text NOT NULL DEFAULT '',
        notes text NOT NULL DEFAULT '',
        archived boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await s`ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false`;
      await s`ALTER TABLE leads ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '{}'`;
      await s`CREATE TABLE IF NOT EXISTS tasks (
        id serial PRIMARY KEY,
        task text NOT NULL DEFAULT '', due_date text NOT NULL DEFAULT '',
        assigned_to text NOT NULL DEFAULT '', priority text NOT NULL DEFAULT 'Medium',
        related_client text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'Open',
        notes text NOT NULL DEFAULT '', deal_id int,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await s`CREATE TABLE IF NOT EXISTS team_members (
        id serial PRIMARY KEY,
        name text NOT NULL, email text NOT NULL DEFAULT '',
        phone text NOT NULL DEFAULT '', role text NOT NULL DEFAULT 'Agent',
        focus text NOT NULL DEFAULT '', color text NOT NULL DEFAULT '#05c3f9',
        active boolean NOT NULL DEFAULT true,
        photo text NOT NULL DEFAULT ''
      )`;
      await s`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS photo text NOT NULL DEFAULT ''`;
      await s`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS calendar_url text NOT NULL DEFAULT ''`;
      await s`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0`;
      await s`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recur text NOT NULL DEFAULT ''`;
      await s`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_time text NOT NULL DEFAULT ''`;
      await s`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS anchor text NOT NULL DEFAULT ''`;
      await s`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS offset_days int`;
      await s`CREATE TABLE IF NOT EXISTS app_settings (
        id int PRIMARY KEY DEFAULT 1,
        data jsonb NOT NULL
      )`;
      await s`CREATE TABLE IF NOT EXISTS sops (
        id serial PRIMARY KEY,
        title text NOT NULL,
        category text NOT NULL DEFAULT 'Operations',
        content text NOT NULL DEFAULT '',
        updated_by text NOT NULL DEFAULT '',
        updated_at text NOT NULL DEFAULT ''
      )`;
      await s`CREATE TABLE IF NOT EXISTS activities (
        id serial PRIMARY KEY,
        date text NOT NULL DEFAULT '',
        kind text NOT NULL DEFAULT 'Call',
        who text NOT NULL DEFAULT '',
        about text NOT NULL DEFAULT '',
        notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await s`CREATE TABLE IF NOT EXISTS funnels (
        id serial PRIMARY KEY,
        slug text UNIQUE NOT NULL,
        name text NOT NULL DEFAULT '',
        template text NOT NULL DEFAULT 'magnet',
        headline text NOT NULL DEFAULT '',
        subhead text NOT NULL DEFAULT '',
        bullets jsonb NOT NULL DEFAULT '[]',
        testimonial text NOT NULL DEFAULT '',
        cta_label text NOT NULL DEFAULT '',
        resource_url text NOT NULL DEFAULT '',
        resource_name text NOT NULL DEFAULT '',
        resource_data text NOT NULL DEFAULT '',
        calendly_url text NOT NULL DEFAULT '',
        fields jsonb NOT NULL DEFAULT '[]',
        active boolean NOT NULL DEFAULT true,
        views int NOT NULL DEFAULT 0,
        submissions int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await s`ALTER TABLE funnels ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'funnel'`;
      await s`ALTER TABLE funnels ADD COLUMN IF NOT EXISTS thanks_note text NOT NULL DEFAULT ''`;
      await s`ALTER TABLE funnels ADD COLUMN IF NOT EXISTS cover_url text NOT NULL DEFAULT ''`;
      await s`ALTER TABLE funnels ADD COLUMN IF NOT EXISTS cover_data text NOT NULL DEFAULT ''`;
      await s`ALTER TABLE funnels ADD COLUMN IF NOT EXISTS cover_name text NOT NULL DEFAULT ''`;
      await s`CREATE TABLE IF NOT EXISTS form_submissions (
        id serial PRIMARY KEY,
        funnel_id int NOT NULL,
        name text NOT NULL DEFAULT '',
        email text NOT NULL DEFAULT '',
        phone text NOT NULL DEFAULT '',
        answers jsonb NOT NULL DEFAULT '[]',
        lead_id int,
        deal_id int,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await s`CREATE TABLE IF NOT EXISTS google_calendar_tokens (
        email text PRIMARY KEY,
        refresh_token text NOT NULL,
        connected_at timestamptz NOT NULL DEFAULT now()
      )`;
      await s`CREATE TABLE IF NOT EXISTS deal_notes (
        id serial PRIMARY KEY,
        deal_id int NOT NULL,
        body text NOT NULL DEFAULT '',
        author text NOT NULL DEFAULT '',
        pinned boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`;
      await s`CREATE TABLE IF NOT EXISTS pnl_entries (
        id serial PRIMARY KEY,
        month text NOT NULL,
        kind text NOT NULL DEFAULT 'Expense',
        category text NOT NULL DEFAULT '',
        description text NOT NULL DEFAULT '',
        amount numeric NOT NULL DEFAULT 0
      )`;
      // Seed starter SOPs on first boot
      const [{ count: sopCount }] = await s`SELECT count(*)::int AS count FROM sops`;
      if (sopCount === 0) {
        for (const sop of SEED_SOPS) {
          await s`INSERT INTO sops (title, category, content, updated_by, updated_at)
                  VALUES (${sop.title}, ${sop.category}, ${sop.content}, ${sop.updatedBy}, ${sop.updatedAt})`;
        }
      }
      // Seed team + settings on first boot
      const [{ count: teamCount }] = await s`SELECT count(*)::int AS count FROM team_members`;
      if (teamCount === 0) {
        for (const m of SEED_TEAM) {
          await s`INSERT INTO team_members (name, email, phone, role, focus, color, active)
                  VALUES (${m.name}, ${m.email}, ${m.phone}, ${m.role}, ${m.focus}, ${m.color}, ${m.active})`;
        }
      }
      await s`INSERT INTO app_settings (id, data) VALUES (1, ${s.json(SEED_SETTINGS as never)})
              ON CONFLICT (id) DO NOTHING`;
    })();
  }
  return g.__elevateInit;
}

// ── row mappers ──────────────────────────────────────────────────
const num = (v: unknown) => (v == null ? null : Number(v));

function rowToDeal(r: Record<string, unknown>): Deal {
  return {
    id: r.id as number, side: r.side as Deal["side"], name: r.name as string,
    address: r.address as string, agent: r.agent as string, source: r.source as string,
    referredBy: r.referred_by as string, lender: r.lender as string,
    closeGoal: r.close_goal as string, checklist: (r.checklist as Record<string, string>) ?? {},
    contractDate: r.contract_date as string, optionDeadline: r.option_deadline as string,
    financingDeadline: r.financing_deadline as string, appraisalDeadline: r.appraisal_deadline as string,
    inspDate: r.insp_date as string, closeDate: r.close_date as string,
    closedDate: r.closed_date as string, price: num(r.price), commPct: num(r.comm_pct),
    referralPct: num(r.referral_pct), gci: num(r.gci), status: r.status as string,
    notes: r.notes as string, year: r.year as number,
    archived: Boolean(r.archived),
    shareToken: (r.share_token as string) ?? "",
    photo: (r.photo as string) ?? "",
    adjustments: (r.adjustments as { label: string; amount: number }[]) ?? [],
  };
}

function rowToLead(r: Record<string, unknown>): Lead {
  return {
    id: r.id as number, date: r.date as string, name: r.name as string,
    phone: r.phone as string, email: r.email as string, source: r.source as string,
    type: r.type as string, timeline: r.timeline as string, budget: r.budget as string,
    area: r.area as string, agent: r.agent as string,
    followUpStatus: r.follow_up_status as string, lastContact: r.last_contact as string,
    notes: r.notes as string, archived: Boolean(r.archived),
    checklist: (r.checklist as Record<string, string>) ?? {},
  };
}

function rowToTask(r: Record<string, unknown>): TaskItem {
  return {
    id: r.id as number, task: r.task as string, dueDate: r.due_date as string,
    dueTime: (r.due_time as string) ?? "",
    assignedTo: r.assigned_to as string, priority: r.priority as string,
    relatedClient: r.related_client as string, status: r.status as string,
    notes: r.notes as string, dealId: (r.deal_id as number) ?? null,
    sortOrder: (r.sort_order as number) ?? 0, recur: (r.recur as string) ?? "",
    anchor: (r.anchor as string) ?? "",
    offsetDays: (r.offset_days as number) ?? null,
    completedAt: r.completed_at ? (r.completed_at as Date).toISOString() : "",
  };
}

function rowToMember(r: Record<string, unknown>): TeamMember {
  return {
    id: r.id as number, name: r.name as string, email: r.email as string,
    phone: r.phone as string, role: r.role as string,
    focus: r.focus as string, color: r.color as string, active: r.active as boolean,
    photo: (r.photo as string) ?? "",
    calendarUrl: (r.calendar_url as string) ?? "",
  };
}

const DEAL_DEFAULTS: Omit<Deal, "id"> = {
  side: "Buyer", name: "", address: "", agent: "", source: "", referredBy: "",
  lender: "", closeGoal: "", checklist: {}, contractDate: "", optionDeadline: "",
  financingDeadline: "", appraisalDeadline: "", inspDate: "", closeDate: "",
  closedDate: "", price: null, commPct: null, referralPct: null, gci: null,
  status: "Active", notes: "", year: new Date().getFullYear(), shareToken: "",
  photo: "", adjustments: [],
};

async function upsertDeal(d: Omit<Deal, "id">, id?: number): Promise<number> {
  const s = sql();
  const v = { ...DEAL_DEFAULTS, ...d };
  if (id != null) {
    await s`UPDATE deals SET
      side=${v.side}, name=${v.name}, address=${v.address}, agent=${v.agent},
      source=${v.source}, referred_by=${v.referredBy}, lender=${v.lender},
      close_goal=${v.closeGoal}, checklist=${s.json(v.checklist as never)},
      contract_date=${v.contractDate}, option_deadline=${v.optionDeadline},
      financing_deadline=${v.financingDeadline}, appraisal_deadline=${v.appraisalDeadline},
      insp_date=${v.inspDate}, close_date=${v.closeDate}, closed_date=${v.closedDate},
      price=${v.price}, comm_pct=${v.commPct}, referral_pct=${v.referralPct},
      gci=${v.gci}, status=${v.status}, notes=${v.notes}, year=${v.year},
      archived=${v.archived ?? false},
      share_token=${v.shareToken ?? ""},
      photo=${v.photo ?? ""},
      adjustments=${s.json((v.adjustments ?? []) as never)},
      updated_at=now()
      WHERE id=${id}`;
    return id;
  }
  const [row] = await s`INSERT INTO deals
    (side, name, address, agent, source, referred_by, lender, close_goal, checklist,
     contract_date, option_deadline, financing_deadline, appraisal_deadline, insp_date,
     close_date, closed_date, price, comm_pct, referral_pct, gci, status, notes, year, adjustments, photo)
    VALUES (${v.side}, ${v.name}, ${v.address}, ${v.agent}, ${v.source}, ${v.referredBy},
     ${v.lender}, ${v.closeGoal}, ${s.json(v.checklist as never)}, ${v.contractDate},
     ${v.optionDeadline}, ${v.financingDeadline}, ${v.appraisalDeadline}, ${v.inspDate},
     ${v.closeDate}, ${v.closedDate}, ${v.price}, ${v.commPct}, ${v.referralPct},
     ${v.gci}, ${v.status}, ${v.notes}, ${v.year}, ${s.json((v.adjustments ?? []) as never)}, ${v.photo ?? ""})
    RETURNING id`;
  return row.id as number;
}

export const pgRepo: Repo = {
  isDb: true,

  async listDeals() {
    await init();
    const rows = await sql()`SELECT * FROM deals ORDER BY id`;
    return rows.map(rowToDeal);
  },
  async createDeal(d) {
    await init();
    const id = await upsertDeal(d);
    return { ...DEAL_DEFAULTS, ...d, id };
  },
  async updateDeal(id, d) {
    await init();
    const rows = await sql()`SELECT * FROM deals WHERE id=${id}`;
    if (rows.length === 0) return;
    const current = rowToDeal(rows[0]);
    await upsertDeal({ ...current, ...d }, id);
  },
  async deleteDeal(id) {
    await init();
    await sql()`DELETE FROM tasks WHERE deal_id=${id}`;
    await sql()`DELETE FROM deals WHERE id=${id}`;
  },

  async listLeads() {
    await init();
    return (await sql()`SELECT * FROM leads ORDER BY id`).map(rowToLead);
  },
  async createLead(d) {
    await init();
    const [row] = await sql()`INSERT INTO leads
      (date, name, phone, email, source, type, timeline, budget, area, agent, follow_up_status, last_contact, notes, checklist)
      VALUES (${d.date}, ${d.name}, ${d.phone}, ${d.email}, ${d.source}, ${d.type},
       ${d.timeline}, ${d.budget}, ${d.area}, ${d.agent}, ${d.followUpStatus}, ${d.lastContact}, ${d.notes},
       ${sql().json((d.checklist ?? {}) as never)})
      RETURNING id`;
    return { ...d, id: row.id as number };
  },
  async updateLead(id, d) {
    await init();
    const rows = await sql()`SELECT * FROM leads WHERE id=${id}`;
    if (rows.length === 0) return;
    const v = { ...rowToLead(rows[0]), ...d };
    await sql()`UPDATE leads SET date=${v.date}, name=${v.name}, phone=${v.phone},
      email=${v.email}, source=${v.source}, type=${v.type}, timeline=${v.timeline},
      budget=${v.budget}, area=${v.area}, agent=${v.agent},
      follow_up_status=${v.followUpStatus}, last_contact=${v.lastContact}, notes=${v.notes},
      archived=${v.archived ?? false},
      checklist=${sql().json((v.checklist ?? {}) as never)}
      WHERE id=${id}`;
  },
  async deleteLead(id) {
    await init();
    await sql()`DELETE FROM leads WHERE id=${id}`;
  },

  async listTasks() {
    await init();
    return (await sql()`SELECT * FROM tasks ORDER BY id`).map(rowToTask);
  },
  async createTask(d) {
    await init();
    const [row] = await sql()`INSERT INTO tasks
      (task, due_date, due_time, assigned_to, priority, related_client, status, notes, deal_id, sort_order, recur, anchor, offset_days)
      VALUES (${d.task}, ${d.dueDate}, ${d.dueTime ?? ""}, ${d.assignedTo}, ${d.priority},
       ${d.relatedClient}, ${d.status}, ${d.notes}, ${d.dealId}, ${d.sortOrder ?? 0}, ${d.recur ?? ""},
       ${d.anchor ?? ""}, ${d.offsetDays ?? null})
      RETURNING id`;
    return { ...d, id: row.id as number };
  },
  async createTasks(items) {
    for (const it of items) await this.createTask(it);
  },
  async updateTask(id, d) {
    await init();
    const rows = await sql()`SELECT * FROM tasks WHERE id=${id}`;
    if (rows.length === 0) return;
    const v = { ...rowToTask(rows[0]), ...d };
    await sql()`UPDATE tasks SET task=${v.task}, due_date=${v.dueDate}, due_time=${v.dueTime ?? ""},
      assigned_to=${v.assignedTo}, priority=${v.priority}, related_client=${v.relatedClient},
      status=${v.status}, notes=${v.notes}, deal_id=${v.dealId},
      sort_order=${v.sortOrder ?? 0}, recur=${v.recur ?? ""},
      anchor=${v.anchor ?? ""}, offset_days=${v.offsetDays ?? null},
      completed_at=${v.completedAt ? new Date(v.completedAt) : null} WHERE id=${id}`;
  },
  async deleteTask(id) {
    await init();
    await sql()`DELETE FROM tasks WHERE id=${id}`;
  },

  async listTeam() {
    await init();
    return (await sql()`SELECT * FROM team_members ORDER BY id`).map(rowToMember);
  },
  async createMember(d) {
    await init();
    const [row] = await sql()`INSERT INTO team_members (name, email, phone, role, focus, color, active, photo, calendar_url)
      VALUES (${d.name}, ${d.email}, ${d.phone}, ${d.role}, ${d.focus}, ${d.color}, ${d.active}, ${d.photo ?? ""}, ${d.calendarUrl ?? ""})
      RETURNING id`;
    return { ...d, id: row.id as number };
  },
  async updateMember(id, d) {
    await init();
    const rows = await sql()`SELECT * FROM team_members WHERE id=${id}`;
    if (rows.length === 0) return;
    const v = { ...rowToMember(rows[0]), ...d };
    await sql()`UPDATE team_members SET name=${v.name}, email=${v.email}, phone=${v.phone},
      role=${v.role}, focus=${v.focus}, color=${v.color}, active=${v.active},
      photo=${v.photo ?? ""}, calendar_url=${v.calendarUrl ?? ""} WHERE id=${id}`;
  },
  async deleteMember(id) {
    await init();
    await sql()`DELETE FROM team_members WHERE id=${id}`;
  },

  async getSettings() {
    await init();
    const [row] = await sql()`SELECT data FROM app_settings WHERE id=1`;
    const s = row.data as Settings;
    if (!s.brokerage) s.brokerage = { ...DEFAULT_BROKERAGE };
    if (!s.checklists) s.checklists = JSON.parse(JSON.stringify(DEFAULT_CHECKLISTS));
    if (!s.measurables) s.measurables = JSON.parse(JSON.stringify(DEFAULT_MEASURABLES));
    if (!s.scores) s.scores = {};
    if (!s.links) s.links = JSON.parse(JSON.stringify(DEFAULT_LINKS));
    return s;
  },
  async saveSettings(sVal) {
    await init();
    await sql()`UPDATE app_settings SET data=${sql().json(sVal as never)} WHERE id=1`;
  },

  async listSops() {
    await init();
    const rows = await sql()`SELECT * FROM sops ORDER BY category, title`;
    return rows.map((r) => ({
      id: r.id as number, title: r.title as string, category: r.category as string,
      content: r.content as string, updatedBy: r.updated_by as string, updatedAt: r.updated_at as string,
    })) as Sop[];
  },
  async createSop(d) {
    await init();
    const [row] = await sql()`INSERT INTO sops (title, category, content, updated_by, updated_at)
      VALUES (${d.title}, ${d.category}, ${d.content}, ${d.updatedBy}, ${d.updatedAt}) RETURNING id`;
    return { ...d, id: row.id as number };
  },
  async updateSop(id, d) {
    await init();
    const rows = await sql()`SELECT * FROM sops WHERE id=${id}`;
    if (rows.length === 0) return;
    const v = {
      title: d.title ?? (rows[0].title as string),
      category: d.category ?? (rows[0].category as string),
      content: d.content ?? (rows[0].content as string),
      updatedBy: d.updatedBy ?? (rows[0].updated_by as string),
      updatedAt: d.updatedAt ?? (rows[0].updated_at as string),
    };
    await sql()`UPDATE sops SET title=${v.title}, category=${v.category}, content=${v.content},
      updated_by=${v.updatedBy}, updated_at=${v.updatedAt} WHERE id=${id}`;
  },
  async deleteSop(id) {
    await init();
    await sql()`DELETE FROM sops WHERE id=${id}`;
  },

  async listActivities() {
    await init();
    const rows = await sql()`SELECT * FROM activities ORDER BY date DESC, id DESC`;
    return rows.map((r) => ({
      id: r.id as number, date: r.date as string, kind: r.kind as string,
      who: r.who as string, about: r.about as string, notes: r.notes as string,
    }));
  },
  async createActivity(d) {
    await init();
    const [row] = await sql()`INSERT INTO activities (date, kind, who, about, notes)
      VALUES (${d.date}, ${d.kind}, ${d.who}, ${d.about}, ${d.notes}) RETURNING id`;
    return { ...d, id: row.id as number };
  },
  async deleteActivity(id) {
    await init();
    await sql()`DELETE FROM activities WHERE id=${id}`;
  },

  async listNotes(dealId) {
    await init();
    const rows = await sql()`SELECT * FROM deal_notes WHERE deal_id=${dealId} ORDER BY created_at DESC, id DESC`;
    return rows.map((r) => ({
      id: r.id as number,
      dealId: r.deal_id as number,
      body: r.body as string,
      author: r.author as string,
      pinned: Boolean(r.pinned),
      createdAt: (r.created_at as Date).toISOString(),
    })) as DealNote[];
  },
  async createNote(d) {
    await init();
    const [row] = await sql()`INSERT INTO deal_notes (deal_id, body, author, pinned)
      VALUES (${d.dealId}, ${d.body}, ${d.author}, ${d.pinned}) RETURNING id, created_at`;
    return { ...d, id: row.id as number, createdAt: (row.created_at as Date).toISOString() };
  },
  async updateNote(id, d) {
    await init();
    const rows = await sql()`SELECT * FROM deal_notes WHERE id=${id}`;
    if (rows.length === 0) return;
    const v = {
      body: d.body ?? (rows[0].body as string),
      pinned: d.pinned ?? Boolean(rows[0].pinned),
    };
    await sql()`UPDATE deal_notes SET body=${v.body}, pinned=${v.pinned} WHERE id=${id}`;
  },
  async deleteNote(id) {
    await init();
    await sql()`DELETE FROM deal_notes WHERE id=${id}`;
  },

  async listFunnels() {
    await init();
    const rows = await sql()`SELECT * FROM funnels ORDER BY id`;
    return rows.map((r) => ({
      id: r.id as number,
      slug: r.slug as string,
      kind: ((r.kind as string) === "form" ? "form" : "funnel") as Funnel["kind"],
      name: r.name as string,
      template: r.template as Funnel["template"],
      headline: r.headline as string,
      subhead: r.subhead as string,
      bullets: (r.bullets as string[]) ?? [],
      testimonial: r.testimonial as string,
      ctaLabel: r.cta_label as string,
      resourceUrl: r.resource_url as string,
      resourceName: r.resource_name as string,
      resourceData: r.resource_data as string,
      calendlyUrl: r.calendly_url as string,
      thanksNote: (r.thanks_note as string) ?? "",
      coverUrl: (r.cover_url as string) ?? "",
      coverData: (r.cover_data as string) ?? "",
      coverName: (r.cover_name as string) ?? "",
      fields: (r.fields as Funnel["fields"]) ?? [],
      active: Boolean(r.active),
      views: r.views as number,
      submissions: r.submissions as number,
    })) as Funnel[];
  },
  async createFunnel(d) {
    await init();
    const [row] = await sql()`INSERT INTO funnels
      (slug, kind, name, template, headline, subhead, bullets, testimonial, cta_label,
       resource_url, resource_name, resource_data, calendly_url, thanks_note,
       cover_url, cover_data, cover_name, fields, active, views, submissions)
      VALUES (${d.slug}, ${d.kind ?? "funnel"}, ${d.name}, ${d.template}, ${d.headline}, ${d.subhead},
       ${sql().json(d.bullets as never)}, ${d.testimonial}, ${d.ctaLabel},
       ${d.resourceUrl}, ${d.resourceName}, ${d.resourceData}, ${d.calendlyUrl}, ${d.thanksNote ?? ""},
       ${d.coverUrl ?? ""}, ${d.coverData ?? ""}, ${d.coverName ?? ""},
       ${sql().json(d.fields as never)}, ${d.active}, ${d.views ?? 0}, ${d.submissions ?? 0})
      RETURNING id`;
    return { ...d, id: row.id as number };
  },
  async updateFunnel(id, d) {
    await init();
    const all = await this.listFunnels();
    const cur = all.find((f) => f.id === id);
    if (!cur) return;
    const v = { ...cur, ...d };
    await sql()`UPDATE funnels SET slug=${v.slug}, kind=${v.kind ?? "funnel"}, name=${v.name}, template=${v.template},
      headline=${v.headline}, subhead=${v.subhead}, bullets=${sql().json(v.bullets as never)},
      testimonial=${v.testimonial}, cta_label=${v.ctaLabel}, resource_url=${v.resourceUrl},
      resource_name=${v.resourceName}, resource_data=${v.resourceData},
      calendly_url=${v.calendlyUrl}, thanks_note=${v.thanksNote ?? ""},
      cover_url=${v.coverUrl ?? ""}, cover_data=${v.coverData ?? ""}, cover_name=${v.coverName ?? ""},
      fields=${sql().json(v.fields as never)},
      active=${v.active} WHERE id=${id}`;
  },
  async deleteFunnel(id) {
    await init();
    await sql()`DELETE FROM funnels WHERE id=${id}`;
  },
  async bumpFunnel(id, stat) {
    await init();
    if (stat === "views") await sql()`UPDATE funnels SET views = views + 1 WHERE id=${id}`;
    else await sql()`UPDATE funnels SET submissions = submissions + 1 WHERE id=${id}`;
  },

  async listSubmissions(funnelId) {
    await init();
    const rows =
      funnelId == null
        ? await sql()`SELECT * FROM form_submissions ORDER BY created_at DESC, id DESC`
        : await sql()`SELECT * FROM form_submissions WHERE funnel_id=${funnelId} ORDER BY created_at DESC, id DESC`;
    return rows.map((r) => ({
      id: r.id as number,
      funnelId: r.funnel_id as number,
      name: r.name as string,
      email: r.email as string,
      phone: r.phone as string,
      answers: (r.answers as FormSubmission["answers"]) ?? [],
      leadId: (r.lead_id as number) ?? null,
      dealId: (r.deal_id as number) ?? null,
      createdAt: (r.created_at as Date).toISOString(),
    })) as FormSubmission[];
  },
  async createSubmission(d) {
    await init();
    const [row] = await sql()`INSERT INTO form_submissions (funnel_id, name, email, phone, answers, lead_id, deal_id)
      VALUES (${d.funnelId}, ${d.name}, ${d.email}, ${d.phone}, ${sql().json(d.answers as never)},
       ${d.leadId ?? null}, ${d.dealId ?? null}) RETURNING id, created_at`;
    return { ...d, id: row.id as number, createdAt: (row.created_at as Date).toISOString() };
  },
  async updateSubmission(id, d) {
    await init();
    const rows = await sql()`SELECT lead_id, deal_id FROM form_submissions WHERE id=${id}`;
    if (rows.length === 0) return;
    const leadId = d.leadId !== undefined ? d.leadId : ((rows[0].lead_id as number) ?? null);
    const dealId = d.dealId !== undefined ? d.dealId : ((rows[0].deal_id as number) ?? null);
    await sql()`UPDATE form_submissions SET lead_id=${leadId}, deal_id=${dealId} WHERE id=${id}`;
  },
  async deleteSubmission(id) {
    await init();
    await sql()`DELETE FROM form_submissions WHERE id=${id}`;
  },

  async listCalendarConnections() {
    await init();
    const rows = await sql()`SELECT email, connected_at FROM google_calendar_tokens`;
    return rows.map((r) => ({
      email: r.email as string,
      connectedAt: (r.connected_at as Date).toISOString(),
    }));
  },
  async getCalendarToken(email) {
    await init();
    const rows = await sql()`SELECT refresh_token FROM google_calendar_tokens WHERE email=${email.toLowerCase()}`;
    return rows.length ? (rows[0].refresh_token as string) : null;
  },
  async setCalendarToken(email, refreshToken) {
    await init();
    await sql()`INSERT INTO google_calendar_tokens (email, refresh_token)
      VALUES (${email.toLowerCase()}, ${refreshToken})
      ON CONFLICT (email) DO UPDATE SET refresh_token=${refreshToken}, connected_at=now()`;
  },
  async deleteCalendarToken(email) {
    await init();
    await sql()`DELETE FROM google_calendar_tokens WHERE email=${email.toLowerCase()}`;
  },

  async listPnl() {
    await init();
    const rows = await sql()`SELECT * FROM pnl_entries ORDER BY month, id`;
    return rows.map((r) => ({
      id: r.id as number, month: r.month as string, kind: r.kind as PnlEntry["kind"],
      category: r.category as string, description: r.description as string,
      amount: Number(r.amount),
      recurring: Boolean(r.recurring),
      endMonth: (r.end_month as string) ?? "",
      recurOf: (r.recur_of as number) ?? null,
    })) as PnlEntry[];
  },
  async createPnl(d) {
    await init();
    const [row] = await sql()`INSERT INTO pnl_entries (month, kind, category, description, amount, recurring, end_month, recur_of)
      VALUES (${d.month}, ${d.kind}, ${d.category}, ${d.description}, ${d.amount},
       ${d.recurring ?? false}, ${d.endMonth ?? ""}, ${d.recurOf ?? null}) RETURNING id`;
    return { ...d, id: row.id as number };
  },
  async updatePnl(id, d) {
    await init();
    const rows = await sql()`SELECT * FROM pnl_entries WHERE id=${id}`;
    if (rows.length === 0) return;
    const cur = rows[0];
    await sql()`UPDATE pnl_entries SET
      month=${d.month ?? (cur.month as string)},
      kind=${d.kind ?? (cur.kind as string)},
      category=${d.category ?? (cur.category as string)},
      description=${d.description ?? (cur.description as string)},
      amount=${d.amount ?? Number(cur.amount)},
      recurring=${d.recurring ?? Boolean(cur.recurring)},
      end_month=${d.endMonth ?? ((cur.end_month as string) ?? "")},
      recur_of=${d.recurOf !== undefined ? d.recurOf : ((cur.recur_of as number) ?? null)}
      WHERE id=${id}`;
  },
  async deletePnl(id) {
    await init();
    // Deleting a recurring template also removes its materialized copies
    await sql()`DELETE FROM pnl_entries WHERE recur_of=${id}`;
    await sql()`DELETE FROM pnl_entries WHERE id=${id}`;
  },

  async bulkImport(data: ImportPayload) {
    await init();
    const s = sql();
    let deals = 0, leads = 0, tasks = 0;
    const existing = (await s`SELECT * FROM deals`).map(rowToDeal);
    const key = (x: Partial<Deal>) => `${x.side}|${(x.address || x.name || "").toLowerCase()}`;
    for (const d of data.deals) {
      const match = existing.find((x) => key(x) === key(d));
      if (match) await this.updateDeal(match.id, d);
      else await upsertDeal({ ...DEAL_DEFAULTS, ...d });
      deals++;
    }
    const existingLeads = (await s`SELECT * FROM leads`).map(rowToLead);
    for (const l of data.leads) {
      const match = existingLeads.find((x) => x.name.toLowerCase() === (l.name || "").toLowerCase());
      if (match) await this.updateLead(match.id, l);
      else await this.createLead(l as Omit<Lead, "id">);
      leads++;
    }
    const existingTasks = (await s`SELECT * FROM tasks`).map(rowToTask);
    for (const t of data.tasks) {
      const match = existingTasks.find((x) => x.task.toLowerCase() === (t.task || "").toLowerCase());
      if (!match) { await this.createTask(t as Omit<TaskItem, "id">); tasks++; }
    }
    return { deals, leads, tasks };
  },
};
