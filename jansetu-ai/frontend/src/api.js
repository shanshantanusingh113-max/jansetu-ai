const API_BASE = "/api";

const headers = { "Content-Type": "application/json" };

async function jfetch(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

export const submitComplaint = async (data) => {
  // Photo attached => multipart; otherwise plain JSON (fast, backward compatible).
  if (data.photo) {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
    const res = await fetch(`${API_BASE}/complaints`, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Failed");
    return res.json();
  }
  const { photo, ...rest } = data;
  return jfetch(`${API_BASE}/complaints`, { method: "POST", headers, body: JSON.stringify(rest) });
};

export const getComplaint = async (id) => {
  const res = await fetch(`${API_BASE}/complaints/${id}`);
  if (!res.ok) throw new Error("Not found");
  return res.json();
};

export const getTickets = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  const res = await fetch(`${API_BASE}/tickets?${params}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
};

export const getTicket = async (id) => {
  const res = await fetch(`${API_BASE}/tickets/${id}`);
  if (!res.ok) throw new Error("Not found");
  return res.json();
};

export const updateTicket = async (id, data) => {
  return jfetch(`${API_BASE}/tickets/${id}`, { method: "PATCH", headers, body: JSON.stringify(data) });
};

export const bulkUpdateTickets = async (ids, status, note) => {
  return jfetch(`${API_BASE}/tickets/bulk`, { method: "POST", headers, body: JSON.stringify({ ids, status, note }) });
};

export const addFeedback = async (id, rating, comment) => {
  return jfetch(`${API_BASE}/tickets/${id}/feedback`, { method: "POST", headers, body: JSON.stringify({ rating, comment }) });
};

export const getDashboardStats = async () => {
  return jfetch(`${API_BASE}/dashboard/stats`);
};

export const exportTickets = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
  return `${API_BASE}/tickets/export?${params}`;
};