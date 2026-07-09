// ============================================================
// itempro-connect.js
// ตัวเชื่อม PR ORDER → Item Master Pro V2 (ส่งคำขอออกรหัส)
// วิธีใช้: วางไฟล์นี้ไว้โฟลเดอร์เดียวกับ index.html ของ PR ORDER
//         แล้วเพิ่มบรรทัดนี้ก่อน </body> :   <script src="itempro-connect.js"></script>
// ============================================================
(function () {
  // ---- ตั้งค่าให้ตรงกับ Supabase ของ Item Pro (ค่าเดียวกับ config.js ฝั่ง Item Pro) ----
  const ITEMPRO_SUPABASE_URL = "https://szoxfjzkdwurxlvevkjs.supabase.co";
  const ITEMPRO_ANON_KEY     = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6b3hmanprZHd1cnhsdmV2a2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NTI1NjIsImV4cCI6MjA5NDIyODU2Mn0.qxR9oWXKAiMkk9dWJMIHU1K6hBWtS51T_FL5TqDeLyQ";

  // ---- ฟังก์ชันหลัก: ส่งคำขอออกรหัสไป Item Pro (ส่งแค่ชื่อรายการ) ----
  // เรียกใช้: await sendCodeRequestToItemPro("ชื่อรายการ", "PR-256907-0031", "ห้องผ่าตัด")
  async function sendCodeRequestToItemPro(itemName, prRef, requestedBy) {
    if (!itemName || !String(itemName).trim()) {
      alert("กรุณาระบุชื่อรายการก่อนส่งขอออกรหัส");
      return false;
    }
    try {
      const res = await fetch(`${ITEMPRO_SUPABASE_URL}/rest/v1/pr_code_requests`, {
        method: "POST",
        headers: {
          "apikey": ITEMPRO_ANON_KEY,
          "Authorization": `Bearer ${ITEMPRO_ANON_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          item_name: String(itemName).trim(),
          pr_ref: prRef || null,
          requested_by: requestedBy || null
        })
      });
      if (!res.ok) throw new Error(await res.text());
      const row = (await res.json())[0];
      // แจ้งผล (ใช้ SweetAlert ถ้ามี ไม่งั้น alert ธรรมดา)
      const msg = `ส่งคำขอออกรหัสไปที่ Item Pro แล้ว\nรายการ: ${itemName}`;
      if (window.Swal) Swal.fire({ icon: "success", title: "ส่งขอออกรหัสสำเร็จ", text: msg, confirmButtonColor: "#047857" });
      else alert(msg);
      return row;
    } catch (e) {
      console.error("sendCodeRequestToItemPro failed:", e);
      if (window.Swal) Swal.fire({ icon: "error", title: "ส่งไม่สำเร็จ", text: e.message });
      else alert("ส่งขอออกรหัสไม่สำเร็จ: " + e.message);
      return false;
    }
  }

  // ---- ดึงผลรหัสที่ Item Pro ออกให้แล้ว (สถานะ issued) มาอัปเดตในระบบ ----
  // เรียกใช้: const done = await pollIssuedCodes("PR-256907-0031")   // ระบุ prRef เพื่อกรองเฉพาะใบนั้น (เว้นว่าง = ทั้งหมด)
  async function pollIssuedCodes(prRef) {
    let q = "status=eq.issued&select=pr_ref,item_name,item_code,uom,doc_num,issued_at&order=issued_at.desc";
    if (prRef) q += `&pr_ref=eq.${encodeURIComponent(prRef)}`;
    const res = await fetch(`${ITEMPRO_SUPABASE_URL}/rest/v1/pr_code_requests?${q}`, {
      headers: { "apikey": ITEMPRO_ANON_KEY, "Authorization": `Bearer ${ITEMPRO_ANON_KEY}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  // ---- ค้นหาครุภัณฑ์ที่มีรหัสอยู่แล้วใน Item Pro (รหัสขึ้นต้น 8) ----
  // เรียกใช้: const list = await searchItemPro("เครื่องวัดความดัน")
  async function searchItemPro(term) {
    const q = `item_name=ilike.*${encodeURIComponent(term)}*&u_ntt_asset_pur=like.8*` +
              `&select=item_code,item_name,inventory_uom,sys_uom_name,default_warehouse&is_inactive=eq.false&limit=20`;
    const res = await fetch(`${ITEMPRO_SUPABASE_URL}/rest/v1/items?${q}`, {
      headers: { "apikey": ITEMPRO_ANON_KEY, "Authorization": `Bearer ${ITEMPRO_ANON_KEY}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  // เปิดให้เรียกจากที่ไหนก็ได้ในหน้า PR ORDER
  window.sendCodeRequestToItemPro = sendCodeRequestToItemPro;
  window.pollIssuedCodes = pollIssuedCodes;
  window.searchItemPro = searchItemPro;

  // ---- ต่อสายอัตโนมัติ: ปุ่มใดก็ได้ที่ใส่ attribute data-send-itempro ----
  // ตัวอย่างปุ่มในหน้า PR ORDER:
  //   <button data-send-itempro
  //           data-item-name="เครื่องวัดความดันโลหิต"
  //           data-pr-ref="PR-256907-0031"
  //           data-requested-by="ห้องผ่าตัด">แจ้งขอออกรหัสใหม่ที่ Item Pro</button>
  document.addEventListener("click", function (e) {
    const btn = e.target.closest("[data-send-itempro]");
    if (!btn) return;
    e.preventDefault();
    sendCodeRequestToItemPro(
      btn.getAttribute("data-item-name") || (window.__prItemNameGetter && window.__prItemNameGetter()) || "",
      btn.getAttribute("data-pr-ref") || "",
      btn.getAttribute("data-requested-by") || ""
    );
  });

  console.log("[itempro-connect] พร้อมใช้งาน — window.sendCodeRequestToItemPro / searchItemPro / pollIssuedCodes");
})();
