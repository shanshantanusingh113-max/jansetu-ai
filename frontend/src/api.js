const API_BASE = "/api";
export const submitComplaint = async (data) => {
  const res = await fetch(`${API_BASE}/complaints`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed"); return res.json();
};
export const getComplaint = async (id) => {
  const res = await fetch(`${API_BASE}/complaints/${id}`);
  if (!res.ok) throw new Error("Not found"); return res.json();
};
export const getTickets = async (filters={}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k,v])=>{if(v)params.set(k,v)});
  const res = await fetch(`${API_BASE}/tickets?${params}`);
  if (!res.ok) throw new Error("Failed"); return res.json();
};
export const getTicket = async (id) => {
  const res = await fetch(`${API_BASE}/tickets/${id}`);
  if (!res.ok) throw new Error("Not found"); return res.json();
};
export const updateTicket = async (id, data) => {
  const res = await fetch(`${API_BASE}/tickets/${id}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) });
  if (!res.ok) throw new Error("Failed"); return res.json();
};
export const getDashboardStats = async () => {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error("Failed"); return res.json();
};
