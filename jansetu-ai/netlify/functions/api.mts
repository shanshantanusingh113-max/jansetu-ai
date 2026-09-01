import type { Config } from "@netlify/functions";
import { processComplaint } from "../../core/pipeline.js";
import { getDb } from "../../core/db.js";

// ---- ID helpers (mirror backend/routes/complaints.py) ----
function uid(): string {
  const c = globalThis.crypto;
  const hex = c.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return hex;
}

function generateTicketId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `TKT-${dateStr}-${uid()}`;
}

// ---- Status timeline helpers (mirror backend/timeline.py) ----
function nowIso(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function initHistory(status: string, note = "Complaint received", by = "system"): string {
  return JSON.stringify([{ status, note, by, at: nowIso() }]);
}

function pushEvent(history: string | null | undefined, status: string, note?: string, by = "system"): string {
  let events: Array<Record<string, unknown>> = [];
  try { events = history ? JSON.parse(history) : []; } catch { events = []; }
  events.push({ status, note: note ?? `Status changed to ${status}`, by, at: nowIso() });
  return JSON.stringify(events);
}

function parseHistory(history: string | null | undefined): Array<Record<string, unknown>> {
  if (!history) return [];
  try { return JSON.parse(history); } catch { return []; }
}

// ---- JSON helpers ----
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function csv(body: string, filename: string): Response {
  return new Response("\ufeff" + body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=${filename}`,
    },
  });
}

function notFound(detail = "Not found"): Response {
  return json({ detail }, 404);
}

interface TicketRow {
  id: string;
  complaint_id: string;
  category: string;
  department: string;
  urgency_level: string;
  confidence_score: number;
  summary: string | null;
  is_duplicate: boolean;
  duplicate_of: string | null;
  similarity_score: number | null;
  status: string;
  officer_notes: string | null;
  status_history: string;
  feedback_rating: number | null;
  feedback_comment: string | null;
  feedback_at: string | null;
  created_at: string;
  updated_at: string | null;
}

interface ComplaintRow {
  id: string;
  raw_text: string;
  translated_text: string | null;
  language: string;
  location: string | null;
  citizen_name: string | null;
  citizen_contact: string | null;
  photo_url: string | null;
  created_at: string;
}

const URGENCY_RANK = `CASE WHEN urgency_level='critical' THEN 0 WHEN urgency_level='high' THEN 1 WHEN urgency_level='medium' THEN 2 ELSE 3 END`;

function buildWhere(params: (string | number)[], conditions: string[], search?: string | null): string {
  if (search) {
    const like = `%${search}%`;
    params.push(like);
    conditions.push(`(
      t.id ILIKE $${params.length} OR t.category ILIKE $${params.length} OR t.department ILIKE $${params.length}
      OR c.raw_text ILIKE $${params.length} OR c.translated_text ILIKE $${params.length}
      OR c.citizen_name ILIKE $${params.length} OR c.location ILIKE $${params.length}
    )`);
  }
  return conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
}

function orderBy(sort: string | null, order: string | null): string {
  const dir = order?.toLowerCase() === "asc" ? "ASC" : "DESC";
  if (sort === "urgency_level") return `ORDER BY ${URGENCY_RANK} ${dir}`;
  if (sort === "confidence_score") return `ORDER BY t.confidence_score ${dir}`;
  return `ORDER BY t.created_at ${dir}`;
}

// ---- Routes ----

async function postComplaints(req: Request): Promise<Response> {
  let rawText = "";
  let language: string | undefined;
  let location: string | undefined;
  let citizenName: string | undefined;
  let citizenContact: string | undefined;
  let photoUrl: string | null = null;

  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart")) {
    const fd = await req.formData();
    rawText = String(fd.get("raw_text") ?? "").trim();
    language = fd.get("language")?.toString() || undefined;
    location = fd.get("location")?.toString() || undefined;
    citizenName = fd.get("citizen_name")?.toString() || undefined;
    citizenContact = fd.get("citizen_contact")?.toString() || undefined;
    const file = fd.get("photo");
    if (typeof File !== "undefined" && file instanceof File && file.name) {
      // Serverless functions have no durable disk; photo is not persisted on the
      // live demo (local FastAPI backend serves uploads). Keep complaint flowing.
      photoUrl = null;
    }
  } else {
    const body = (await req.json()) as Record<string, string | undefined>;
    rawText = (body.raw_text ?? "").trim();
    language = body.language || undefined;
    location = body.location || undefined;
    citizenName = body.citizen_name || undefined;
    citizenContact = body.citizen_contact || undefined;
  }

  if (!rawText) return json({ detail: "raw_text is required" }, 422);

  const complaintId = globalThis.crypto.randomUUID();
  const ai = processComplaint(rawText, language, location);
  const ticketId = generateTicketId();

  const db = getDb();
  await db.sql`
    INSERT INTO complaints (id, raw_text, translated_text, language, location, citizen_name, citizen_contact, photo_url)
    VALUES (${complaintId}, ${rawText}, ${ai.translated_text}, ${ai.language}, ${location ?? null}, ${citizenName ?? null}, ${citizenContact ?? null}, ${photoUrl})
  `;

  // Auto-escalate critical complaints straight to the working queue.
  const escalated = ai.urgency_level === "critical";
  const status = escalated ? "in_progress" : "new";
  const history = escalated
    ? pushEvent(initHistory("new"), "in_progress", "Auto-escalated: critical urgency detected by AI")
    : initHistory(status);

  await db.sql`
    INSERT INTO tickets (id, complaint_id, category, department, urgency_level, confidence_score, summary, status, status_history, updated_at)
    VALUES (${ticketId}, ${complaintId}, ${ai.category}, ${ai.department}, ${ai.urgency_level}, ${ai.confidence_score}, ${ai.summary}, ${status}, ${history}, ${new Date().toISOString()})
  `;

  // Best-effort duplicate detection + link in the same category.
  await linkDuplicates(ticketId, ai.translated_text ?? rawText, ai.category);

  return json(await complaintResponse(complaintId), 201);
}

async function getComplaint(id: string): Promise<Response> {
  const rows = await getDb().sql<ComplaintRow>`
    SELECT * FROM complaints WHERE id = ${id}
  `;
  if (rows.length === 0) return notFound("Complaint not found");
  return json(await complaintResponse(id));
}

async function findSimilar(id: string): Promise<Response> {
  const db = getDb();
  const complaints = await db.sql<ComplaintRow>`SELECT * FROM complaints WHERE id = ${id}`;
  if (complaints.length === 0) return notFound("Complaint not found");
  const complaint = complaints[0];
  const tickets = await db.sql<TicketRow>`SELECT * FROM tickets WHERE complaint_id = ${id}`;
  if (tickets.length === 0) return notFound("Ticket not found");
  const ticket = tickets[0];

  const otherTickets = await db.sql<TicketRow>`SELECT * FROM tickets WHERE id != ${ticket.id}`;
  const similarTickets: Array<{ ticket_id: string; similarity: number; text_preview: string }> = [];
  for (const t of otherTickets) {
    if (t.category !== ticket.category) continue;
    const otherComplaints = await db.sql<ComplaintRow>`SELECT * FROM complaints WHERE id = ${t.complaint_id}`;
    if (otherComplaints.length === 0) continue;
    const oc = otherComplaints[0];
    const score = similarityScore(
      complaint.translated_text ?? complaint.raw_text,
      oc.translated_text ?? oc.raw_text
    );
    if (score >= 0.65) {
      similarTickets.push({
        ticket_id: t.id,
        similarity: Math.round(score * 1000) / 1000,
        text_preview: oc.raw_text.slice(0, 80),
      });
    }
  }
  similarTickets.sort((a, b) => b.similarity - a.similarity);
  return json({
    is_duplicate: similarTickets.length > 0,
    similar_tickets: similarTickets.slice(0, 5),
  });
}

async function linkDuplicates(ticketId: string, complaintText: string, category: string): Promise<void> {
  try {
    const db = getDb();
    const others = await db.sql.unsafe<TicketRow>(
      `SELECT * FROM tickets WHERE category = $1 AND id != $2 LIMIT 100`,
      [category, ticketId]
    );
    let best: { id: string; score: number } | null = null;
    for (const t of others) {
      const rows = await db.sql<ComplaintRow>`SELECT * FROM complaints WHERE id = ${t.complaint_id}`;
      if (!rows[0]) continue;
      const s = similarityScore(
        complaintText,
        rows[0].translated_text ?? rows[0].raw_text
      );
      if (s >= 0.65 && (!best || s > best.score)) best = { id: t.id, score: Math.round(s * 1000) / 1000 };
    }
    if (best) {
      await db.sql.unsafe(
        `UPDATE tickets SET is_duplicate = TRUE, duplicate_of = $1, similarity_score = $2 WHERE id = $3`,
        [best.id, best.score, ticketId]
      );
    }
  } catch { /* duplicate linking is best-effort */ }
}

async function listTickets(url: URL): Promise<Response> {
  const category = url.searchParams.get("category");
  const urgency = url.searchParams.get("urgency");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");
  const sort = url.searchParams.get("sort");
  const order = url.searchParams.get("order");
  const limitRaw = url.searchParams.get("limit");

  const params: (string | number)[] = [];
  const conditions: string[] = [];
  if (category) { params.push(category); conditions.push(`t.category = $${params.length}`); }
  if (urgency) { params.push(urgency); conditions.push(`t.urgency_level = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`t.status = $${params.length}`); }
  const where = buildWhere(params, conditions, search);
  const limit = limitRaw && !isNaN(Number(limitRaw)) ? ` LIMIT ${Number(limitRaw)}` : "";

  const tickets = await getDb().sql.unsafe<TicketRow>(
    `SELECT t.* FROM tickets t JOIN complaints c ON t.complaint_id = c.id ${where} ${orderBy(sort, order)}${limit}`,
    params
  );

  const result = [];
  for (const t of tickets) {
    const complaints = await getDb().sql<ComplaintRow>`SELECT * FROM complaints WHERE id = ${t.complaint_id}`;
    const complaintText = complaints.length ? complaints[0].raw_text.slice(0, 100) : "";
    result.push({
      id: t.id,
      complaint_text: complaintText,
      category: t.category,
      department: t.department,
      urgency_level: t.urgency_level,
      confidence_score: t.confidence_score,
      status: t.status,
      is_duplicate: t.is_duplicate,
      created_at: t.created_at ?? "",
    });
  }
  return json(result);
}

async function exportTickets(url: URL): Promise<Response> {
  const category = url.searchParams.get("category");
  const urgency = url.searchParams.get("urgency");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");
  const sort = url.searchParams.get("sort");
  const order = url.searchParams.get("order");

  const params: (string | number)[] = [];
  const conditions: string[] = [];
  if (category) { params.push(category); conditions.push(`t.category = $${params.length}`); }
  if (urgency) { params.push(urgency); conditions.push(`t.urgency_level = $${params.length}`); }
  if (status) { params.push(status); conditions.push(`t.status = $${params.length}`); }
  const where = buildWhere(params, conditions, search);

  const tickets = await getDb().sql.unsafe<TicketRow>(
    `SELECT t.* FROM tickets t JOIN complaints c ON t.complaint_id = c.id ${where} ${orderBy(sort, order)}`,
    params
  );

  const header = ["Ticket ID", "Complaint", "Category", "Department", "Urgency", "Confidence", "Status", "Location", "Citizen", "Created At", "Updated At"];
  const lines = [header.join(",")];
  for (const t of tickets) {
    const complaints = await getDb().sql<ComplaintRow>`SELECT * FROM complaints WHERE id = ${t.complaint_id}`;
    const c = complaints[0];
    const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    lines.push([
      t.id, esc(c?.raw_text ?? ""), esc(t.category), esc(t.department), t.urgency_level,
      t.confidence_score ?? 0, t.status, esc(c?.location ?? ""), esc(c?.citizen_name ?? ""),
      t.created_at ?? "", t.updated_at ?? "",
    ].join(","));
  }
  return csv(lines.join("\n"), `jansetu_tickets_${new Date().toISOString().slice(0, 10)}.csv`);
}

async function bulkUpdate(req: Request): Promise<Response> {
  const body = (await req.json()) as { ids?: string[]; status?: string; note?: string };
  if (!body.ids || !body.status) return json({ detail: "ids and status are required" }, 422);
  const db = getDb();
  let updated = 0;
  for (const id of body.ids) {
    const rows = await db.sql<TicketRow>`SELECT * FROM tickets WHERE id = ${id}`;
    if (!rows[0]) continue;
    const next = pushEvent(rows[0].status_history, body.status, body.note ?? `Bulk update to ${body.status}`, "officer");
    await db.sql.unsafe(
      `UPDATE tickets SET status = $1, status_history = $2, updated_at = $3 WHERE id = $4`,
      [body.status, next, new Date().toISOString(), id]
    );
    updated++;
  }
  return json({ updated, status: body.status });
}

async function getTicket(id: string): Promise<Response> {
  const tickets = await getDb().sql<TicketRow>`SELECT * FROM tickets WHERE id = ${id}`;
  if (tickets.length === 0) return notFound("Ticket not found");
  const t = tickets[0];
  const complaints = await getDb().sql<ComplaintRow>`SELECT * FROM complaints WHERE id = ${t.complaint_id}`;
  const c = complaints[0];
  return json({
    id: t.id,
    category: t.category,
    department: t.department,
    urgency_level: t.urgency_level,
    confidence_score: t.confidence_score,
    summary: t.summary,
    is_duplicate: t.is_duplicate,
    duplicate_of: t.duplicate_of,
    similarity_score: t.similarity_score,
    status: t.status,
    officer_notes: t.officer_notes,
    status_history: parseHistory(t.status_history),
    feedback_rating: t.feedback_rating,
    feedback_comment: t.feedback_comment,
    feedback_at: t.feedback_at ?? "",
    created_at: t.created_at ?? "",
    updated_at: t.updated_at ?? "",
    complaint: c
      ? {
          id: c.id,
          raw_text: c.raw_text,
          translated_text: c.translated_text,
          language: c.language,
          location: c.location,
          citizen_name: c.citizen_name,
          photo_url: c.photo_url,
          created_at: c.created_at ?? "",
        }
      : null,
  });
}

async function updateTicket(id: string, req: Request): Promise<Response> {
  const body = (await req.json()) as { status?: string; officer_notes?: string; department?: string };
  const db = getDb();
  const tickets = await db.sql<TicketRow>`SELECT * FROM tickets WHERE id = ${id}`;
  if (tickets.length === 0) return notFound("Ticket not found");
  const t = tickets[0];

  let history = t.status_history ?? "[]";
  const changes: string[] = [];
  const sets: string[] = [];
  const params: (string | number)[] = [];

  if (body.status !== undefined && body.status !== t.status) {
    params.push(body.status);
    sets.push(`status = $${params.length}`);
    history = pushEvent(history, body.status, `Status changed to ${body.status}`, "officer");
    changes.push(`status=${body.status}`);
  }
  if (body.department !== undefined && body.department !== t.department) {
    params.push(body.department);
    sets.push(`department = $${params.length}`);
    history = pushEvent(history, t.status ?? body.status, `Reassigned to ${body.department}`, "officer");
    changes.push(`department=${body.department}`);
  }
  if (body.officer_notes !== undefined) {
    params.push(body.officer_notes);
    sets.push(`officer_notes = $${params.length}`);
    changes.push("notes updated");
  }
  if (changes.length === 0) return json({ message: "No changes" });

  params.push(history);
  sets.push(`status_history = $${params.length}`);
  params.push(new Date().toISOString());
  sets.push(`updated_at = $${params.length}`);
  params.push(id);
  await db.sql.unsafe(
    `UPDATE tickets SET ${sets.join(", ")} WHERE id = $${params.length}`,
    params
  );

  return json({ message: "Ticket updated", ticket_id: id, status: body.status ?? t.status, department: body.department ?? t.department });
}

async function addFeedback(id: string, req: Request): Promise<Response> {
  const body = (await req.json()) as { rating?: number; comment?: string };
  const db = getDb();
  const tickets = await db.sql<TicketRow>`SELECT * FROM tickets WHERE id = ${id}`;
  if (tickets.length === 0) return notFound("Ticket not found");
  if (!body.rating || body.rating < 1 || body.rating > 5) return json({ detail: "Rating must be 1-5" }, 422);
  await db.sql.unsafe(
    `UPDATE tickets SET feedback_rating = $1, feedback_comment = $2, feedback_at = $3 WHERE id = $4`,
    [body.rating, body.comment ?? null, new Date().toISOString(), id]
  );
  return json({ message: "Feedback recorded", ticket_id: id, rating: body.rating });
}

async function dashboardStats(): Promise<Response> {
  const db = getDb();

  const countBy = async (column: string): Promise<Record<string, number>> => {
    const rows = await db.sql.unsafe<{ k: string; n: string }>(
      `SELECT ${column} AS k, COUNT(*) AS n FROM tickets GROUP BY ${column}`
    );
    const out: Record<string, number> = {};
    for (const r of rows) out[r.k] = Number(r.n);
    return out;
  };

  const [byCategory, byStatus, byUrgency, byDepartment, totalRows] = await Promise.all([
    countBy("category"),
    countBy("status"),
    countBy("urgency_level"),
    countBy("department"),
    db.sql.unsafe<{ n: string }>(`SELECT COUNT(*) AS n FROM tickets`),
  ]);

  const avgRows = await db.sql.unsafe<{ a: string | null }>(`SELECT AVG(confidence_score) AS a FROM tickets`);
  const avgConf = avgRows[0]?.a ? Number(Number(avgRows[0].a).toFixed(2)) : 0;

  const avgSla = await db.sql.unsafe<{ a: string | null }>(
    `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600.0) AS a
     FROM tickets WHERE status IN ('resolved','closed') AND updated_at IS NOT NULL`
  );
  const avgResolutionHours = avgSla[0]?.a ? Number(Number(avgSla[0].a).toFixed(1)) : null;

  const backlogRows = await db.sql.unsafe<{ department: string; n: string }>(
    `SELECT department, COUNT(*) AS n FROM tickets WHERE status IN ('new','in_progress') GROUP BY department`
  );
  const openBacklog: Record<string, number> = {};
  let totalOpen = 0;
  for (const r of backlogRows) { openBacklog[r.department] = Number(r.n); totalOpen += Number(r.n); }

  const overdueRows = await db.sql.unsafe<{ n: string }>(
    `SELECT COUNT(*) AS n FROM tickets
     WHERE status IN ('new','in_progress')
       AND urgency_level IN ('critical','high')
       AND updated_at IS NOT NULL AND updated_at < NOW() - INTERVAL '48 hours'`
  );
  const overdue = Number(overdueRows[0]?.n ?? 0);

  const trendRows = await db.sql.unsafe<{ day: string; n: string }>(
    `SELECT TO_CHAR(created_at, 'YYYY-MM-DD') AS day, COUNT(*) AS n FROM tickets
     WHERE created_at >= NOW() - INTERVAL '13 days'
     GROUP BY day
     ORDER BY day`
  );
  const trendByDay: Record<string, number> = {};
  for (const r of trendRows) trendByDay[r.day] = Number(r.n);
  const dailyTrend = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dailyTrend.push({ date: key, count: trendByDay[key] ?? 0 });
  }

  const criticalOpenRows = await db.sql.unsafe<{ id: string; category: string; department: string; status: string; raw_text: string; created_at: string }>(
    `SELECT t.id, t.category, t.department, t.status, c.raw_text, t.created_at
     FROM tickets t JOIN complaints c ON t.complaint_id = c.id
     WHERE t.status IN ('new','in_progress') AND t.urgency_level = 'critical'
     ORDER BY t.created_at DESC LIMIT 5`
  );
  const criticalOpen = criticalOpenRows.map((t) => ({
    id: t.id, category: t.category, department: t.department,
    status: t.status, complaint_text: t.raw_text.slice(0, 80), created_at: t.created_at ?? "",
  }));

  const recent = await db.sql<TicketRow>`SELECT * FROM tickets ORDER BY created_at DESC LIMIT 5`;
  const recentList = [];
  for (const t of recent) {
    const complaints = await db.sql<ComplaintRow>`SELECT * FROM complaints WHERE id = ${t.complaint_id}`;
    recentList.push({
      id: t.id,
      category: t.category,
      status: t.status,
      urgency_level: t.urgency_level,
      complaint_text: complaints.length ? complaints[0].raw_text.slice(0, 80) : "",
      created_at: t.created_at ?? "",
    });
  }

  return json({
    total_tickets: Number(totalRows[0]?.n ?? 0),
    by_category: byCategory,
    by_status: byStatus,
    by_urgency: byUrgency,
    by_department: byDepartment,
    open_backlog: openBacklog,
    total_open: totalOpen,
    avg_confidence: avgConf,
    avg_resolution_hours: avgResolutionHours,
    overdue,
    daily_trend: dailyTrend,
    critical_open: criticalOpen,
    recent_tickets: recentList,
  });
}

// ---- helpers ----

async function complaintResponse(complaintId: string) {
  const db = getDb();
  const complaints = await db.sql<ComplaintRow>`SELECT * FROM complaints WHERE id = ${complaintId}`;
  if (complaints.length === 0) throw new Error("complaint not found");
  const c = complaints[0];
  const tickets = await db.sql<TicketRow>`SELECT * FROM tickets WHERE complaint_id = ${complaintId}`;
  const t = tickets[0];
  return {
    id: c.id,
    raw_text: c.raw_text,
    translated_text: c.translated_text,
    language: c.language,
    location: c.location,
    photo_url: c.photo_url,
    created_at: c.created_at ?? "",
    ticket: t
      ? {
          id: t.id,
          complaint_id: t.complaint_id,
          category: t.category,
          department: t.department,
          urgency_level: t.urgency_level,
          confidence_score: t.confidence_score,
          summary: t.summary,
          is_duplicate: t.is_duplicate,
          duplicate_of: t.duplicate_of,
          similarity_score: t.similarity_score,
          status: t.status,
          officer_notes: t.officer_notes,
          status_history: parseHistory(t.status_history),
          feedback_rating: t.feedback_rating,
          feedback_comment: t.feedback_comment,
          feedback_at: t.feedback_at ?? "",
          created_at: t.created_at ?? "",
          updated_at: t.updated_at ?? "",
        }
      : null,
  };
}

// Lightweight token-overlap similarity (replaces cosine sim on TF-IDF).
function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function similarityScore(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = tokenize(b);
  if (ta.size === 0 || tb.length === 0) return 0;
  let overlap = 0;
  for (const tok of tb) if (ta.has(tok)) overlap++;
  // Jaccard-inspired overlap vs geometric-mean length.
  return overlap / Math.sqrt((ta.size + overlap) * tb.length) || 0;
}

// ---- Handler ----

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const path = url.pathname; // e.g. /api/complaints/xyz
  const segments = path.split("/").filter(Boolean); // ['api','complaints','xyz']
  const method = req.method;

  // /api/complaints
  if (segments[0] === "api" && segments[1] === "complaints") {
    if (method === "POST" && segments.length === 2) return await postComplaints(req);
    if (method === "GET" && segments.length === 3 && segments[2] !== "similar") return await getComplaint(segments[2]);
    if (method === "GET" && segments.length === 4 && segments[2] === "similar") return await findSimilar(segments[3]);
  }

  // /api/tickets
  if (segments[0] === "api" && segments[1] === "tickets") {
    if (method === "GET" && segments.length === 2) return await listTickets(url);
    if (method === "GET" && segments.length === 3 && segments[2] === "export") return await exportTickets(url);
    if (method === "POST" && segments.length === 3 && segments[2] === "bulk") return await bulkUpdate(req);
    if (segments.length === 4 && segments[2] && method === "POST" && segments[3] === "feedback") return await addFeedback(segments[2], req);
    if (segments.length === 3) {
      if (segments[2] === "export" || segments[2] === "bulk") return json({ detail: "Invalid route" }, 400);
      if (method === "GET") return await getTicket(segments[2]);
      if (method === "PATCH") return await updateTicket(segments[2], req);
    }
  }

  // /api/dashboard/stats
  if (segments[0] === "api" && segments[1] === "dashboard" && segments[2] === "stats" && method === "GET") {
    return await dashboardStats();
  }

  return json({ detail: "Not found" }, 404);
};

export const config: Config = {
  path: "/api/*",
  method: ["GET", "POST", "PATCH"],
};

export { linkDuplicates };