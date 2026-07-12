// ============================================================
// config.js — Supabase Connection Config
// แก้ไข SUPABASE_URL และ SUPABASE_ANON_KEY ให้ตรงกับโปรเจกต์ของคุณ
// ============================================================

const SUPABASE_URL  = "https://szoxfjzkdwurxlvevkjs.supabase.co";   // <-- แก้ตรงนี้
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6b3hmanprZHd1cnhsdmV2a2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTI1NjIsImV4cCI6MjA5NDIyODU2Mn0.qxR9oWXKAiMkk9dWJMIHU1K6hBWtS51T_FL5TqDeLyQ";                   // <-- แก้ตรงนี้

// [PR ORDER Integration] วาง Apps Script Web App URL ของระบบ PR ORDER ตรงนี้ (ลงท้าย /exec)
// ใช้สำหรับ "push" แจ้งกลับแบบ real-time ทันทีที่ออกรหัสเสร็จ (ทางเลือกเสริม — เว้นว่างได้ ระบบยังทำงานผ่านตาราง pr_code_requests ตามปกติ)
const PR_ORDER_WEBAPP_URL = ""; // เช่น "https://script.google.com/macros/s/XXXX/exec"

// [BRPR / ERP ธรรมศาสตร์ Integration] ระบบ BRPR ใช้ Supabase คนละโปรเจกต์
// ตาราง "item_code_requests" อยู่บน Supabase ของ BRPR — วาง URL + anon key ของ BRPR ตรงนี้
// (โปรเจกต์ ref: hkqyeeonfyzlbnimztuz — ขอ anon public key จากทีม BRPR)
const BRPR_SUPABASE_URL = "https://hkqyeeonfyzlbnimztuz.supabase.co";
const BRPR_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcXllZW9uZnl6bGJuaW16dHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2ODU4NDMsImV4cCI6MjA5OTI2MTg0M30.Od-n8yNuIWu6Kx1Y_mW6Aemg3TRCxZG5ooTESpOgZBE"; // <-- วาง anon public key ของ BRPR ตรงนี้ (ว่าง = ปิดการเชื่อม BRPR ไว้ก่อน)

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

// ---- Activity Log (บันทึกทุก transaction เพื่อตรวจสอบย้อนหลัง) ----
// best-effort: ถ้าตาราง activity_logs ยังไม่ถูกสร้าง หรือเขียนไม่สำเร็จ จะไม่รบกวนการทำงานหลัก
async function logAction(action, detail, targetType, targetId){
  try{
    const u = (typeof CU!=='undefined' && CU) ? CU : {};
    await fetch(`${SUPABASE_URL}/rest/v1/activity_logs`, {
      method:"POST",
      headers:{ ..._headers(), "Prefer":"return=minimal" },
      body: JSON.stringify({
        action: action || '',
        detail: (detail==null) ? null : (typeof detail==='string' ? detail : JSON.stringify(detail)),
        target_type: targetType || null,
        target_id: targetId!=null ? String(targetId) : null,
        actor_name: u.name || null,
        actor_username: u.username || null,
        actor_role: u.role || null
      })
    });
  }catch(e){ /* เงียบไว้ */ }
}
const _brHeaders = () => ({
  "Content-Type": "application/json",
  "apikey": BRPR_ANON,
  "Authorization": `Bearer ${BRPR_ANON}`,
  "Prefer": "return=representation"
});
const BRDB = {
  enabled(){ return !!(BRPR_SUPABASE_URL && BRPR_ANON); },
  async get(table, params = "") {
    const res = await fetch(`${BRPR_SUPABASE_URL}/rest/v1/${table}?${params}`, { headers: _brHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async patch(table, filter, body) {
    const res = await fetch(`${BRPR_SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: "PATCH", headers: _brHeaders(), body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};
