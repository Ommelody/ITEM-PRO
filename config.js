// ============================================================
// config.js — Supabase Connection Config
// แก้ไข SUPABASE_URL และ SUPABASE_ANON_KEY ให้ตรงกับโปรเจกต์ของคุณ
// ============================================================

const SUPABASE_URL  = "https://szoxfjzkdwurxlvevkjs.supabase.co";   // <-- แก้ตรงนี้
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6b3hmanprZHd1cnhsdmV2a2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTI1NjIsImV4cCI6MjA5NDIyODU2Mn0.qxR9oWXKAiMkk9dWJMIHU1K6hBWtS51T_FL5TqDeLyQ";                   // <-- แก้ตรงนี้

// ---- internal: do not edit below ----
const _headers = () => ({
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON,
  "Authorization": `Bearer ${SUPABASE_ANON}`,
  "Prefer": "return=representation"
});

const DB = {
  // GET — select rows
  async get(table, params = "") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: _headers()
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // POST — insert rows
  async post(table, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: _headers(),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // PATCH — update rows
  async patch(table, filter, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: "PATCH",
      headers: { ..._headers(), "Prefer": "return=representation" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // DELETE — delete rows
  async delete(table, filter) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: "DELETE",
      headers: _headers()
    });
    if (!res.ok) throw new Error(await res.text());
    return true;
  },

  // RPC — call stored procedure
  async rpc(fn, params = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: _headers(),
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};
