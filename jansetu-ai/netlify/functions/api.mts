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

// ---- JSON helpers ----
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
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
  created_at: string;
}

// ---- Routes ----

async function postComplaints(req: Request): Promise<Response> {
  const body = (await req.json()) as {
    raw_text?: string;
    language?: string;
    location?: string;
    citizen_name?: string;
    citizen_contact?: string;
  };
  const rawText = (body.raw_text ?? "").trim();
  if (!rawText) return json({ detail: "raw_text is required" }, 422);

  const complaintId = globalThis.crypto.randomUUID();
  const ai = processComplaint(rawText, body.language, body.location);
  const ticketId = generateTicketId();

  const db = getDb();
  await db.sql`
    INSERT INTO complaints (id, raw_text, translated_text, language, location, citizen_name, citizen_contact)
    VALUES (${complaintId}, ${rawText}, ${ai.translated_text}, ${ai.language}, ${body.location ?? null}, ${body.citizen_name ?? null}, ${body.citizen_contact ?? null})
  `;
  await db.sql`
    INSERT INTO tickets (id, complaint_id, category, department, urgency_level, confidence_score, summary, status)
    VALUES (${ticketId}, ${complaintId}, ${ai.category}, ${ai.department}, ${ai.urgency_level}, ${ai.confidence_score}, ${ai.summary}, 'new')
  `;

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

async function listTickets(url: URL): Promise<Response> {
  const category = url.searchParams.get("category");
  const urgency = url.searchParams.get("urgency");
  const status = url.searchParams.get("status");

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }
  if (urgency) {
    params.push(urgency);
    conditions.push(`urgency_level = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const tickets = await getDb().sql.unsafe<TicketRow>(
    `SELECT * FROM tickets ${where} ORDER BY created_at DESC`,
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
      created_at: t.created_at ?? "",
    });
  }
  return json(result);
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
          created_at: c.created_at ?? "",
        }
      : null,
  });
}

async function updateTicket(id: string, req: Request): Promise<Response> {
  const body = (await req.json()) as { status?: string; officer_notes?: string };
  const db = getDb();
  const tickets = await db.sql<TicketRow>`SELECT * FROM tickets WHERE id = ${id}`;
  if (tickets.length === 0) return notFound("Ticket not found");

  const sets: string[] = [];
  const params: (string | number)[] = [];
  if (body.status !== undefined) {
    params.push(body.status);
    sets.push(`status = $${params.length}`);
  }
  if (body.officer_notes !== undefined) {
    params.push(body.officer_notes);
    sets.push(`officer_notes = $${params.length}`);
  }
  if (sets.length === 0) return json({ message: "No changes" });

  params.push(new Date().toISOString());
  sets.push(`updated_at = $${params.length}`);
  params.push(id);
  await db.sql.unsafe(`UPDATE tickets SET ${sets.join(", ")} WHERE id = $${params.length}`, params);

  return json({ message: "Ticket updated", ticket_id: id, status: body.status ?? tickets[0].status });
}

async function dashboardStats(): Promise<Response> {
  const db = getDb();

  const totalRows = await db.sql.unsafe<{ n: string }>(`SELECT COUNT(*) AS n FROM tickets`);
  const total = Number(totalRows[0]?.n ?? 0);

  const countBy = async (column: string): Promise<Record<string, number>> => {
    const rows = await db.sql.unsafe<{ k: string; n: string }>(
      `SELECT ${column} AS k, COUNT(*) AS n FROM tickets GROUP BY ${column}`
    );
    const out: Record<string, number> = {};
    for (const r of rows) out[r.k] = Number(r.n);
    return out;
  };

  const [byCategory, byStatus, byUrgency] = await Promise.all([
    countBy("category"),
    countBy("status"),
    countBy("urgency_level"),
  ]);

  const avgRows = await db.sql.unsafe<{ a: string | null }>(
    `SELECT AVG(confidence_score) AS a FROM tickets`
  );
  const avgConf = avgRows[0]?.a ? Number(Number(avgRows[0].a).toFixed(2)) : 0;

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
    total_tickets: total,
    by_category: byCategory,
    by_status: byStatus,
    by_urgency: byUrgency,
    avg_confidence: avgConf,
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
    if (segments.length === 3) {
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
