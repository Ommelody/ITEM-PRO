# คู่มือเชื่อมต่อ Item Master Pro V2 ⇄ PR ORDER

ระบบเชื่อมกันผ่าน **Supabase REST API** (ฐานข้อมูลจริงของ Item Pro) — ไม่ต้องเปิดพอร์ตพิเศษ ใช้ HTTPS ปกติ

```
Base URL : https://szoxfjzkdwurxlvevkjs.supabase.co/rest/v1
Header   : apikey: <ANON_KEY>
           Authorization: Bearer <ANON_KEY>
           Content-Type: application/json
```
(ขอ ANON_KEY จริงจากทีม Item Pro — ค่าในไฟล์ config.js ของโปรเจกต์นี้)

---

## ขั้นตอนที่ 1 — สร้างตารางเชื่อมต่อใน Supabase (รันครั้งเดียว)

เปิด Supabase → SQL Editor → รันคำสั่งนี้:

```sql
create table if not exists pr_code_requests (
  id           bigint generated always as identity primary key,
  pr_ref       text,                              -- เลขที่เอกสาร PR/BR ฝั่ง PR ORDER
  item_name    text not null,                      -- ชื่อรายการที่ต้องการออกรหัส (ข้อมูลเดียวที่ส่งมา)
  requested_by text,                                -- ผู้ขอ (ชื่อ/หน่วยงาน)
  status       text not null default 'pending',    -- pending | issued | cancelled
  item_code    text,                                -- Item Pro กรอกให้หลังออกรหัสเสร็จ
  uom          text,                                -- หน่วยนับที่ออกจริง
  doc_num      text,                                -- เลขที่ใบงานของ Item Pro
  issued_at    timestamptz,
  created_at   timestamptz not null default now()
);

alter table items add column if not exists pr_request_id bigint references pr_code_requests(id);
alter table items add column if not exists u_ntt_remark text; -- [ใหม่] เก็บหมายเหตุ "รายการออกรหัสจาก PR ORDER"

-- เปิดสิทธิ์ให้ anon key อ่าน/เขียนได้ (ถ้า RLS เปิดอยู่ ปรับ policy ตามนโยบายจริงของหน่วยงาน)
alter table pr_code_requests enable row level security;
create policy "anon rw" on pr_code_requests for all using (true) with check (true);
```

---

## ขั้นตอนที่ 2 — ฝั่ง PR ORDER: ส่งคำขอออกรหัสเข้ามา (Direction 1)

เมื่อผู้ใช้ PR ORDER กดปุ่ม "ส่งขอออกรหัส" ให้ **POST** ชื่อรายการเข้า Item Pro:

```
POST {Base URL}/pr_code_requests
```
```json
{
  "pr_ref": "PR-256907-0031",
  "item_name": "เครื่องวัดความดันโลหิตแบบดิจิทัล",
  "requested_by": "ห้องผ่าตัด"
}
```
ระบบ Item Pro จะแสดงแจ้งเตือน (กระดิ่งแดง + ปุ่ม "ออกรหัสจาก PR ORDER") ที่เมนู "ออกรหัสพัสดุ" ทันทีที่มีแถวสถานะ `pending`

---

## ขั้นตอนที่ 3 — ฝั่ง PR ORDER: รับผลลัพธ์กลับ (Direction 2 — ออกรหัสเสร็จ + อนุมัติแล้ว)

เมื่อเจ้าหน้าที่ Item Pro กด **"อนุมัติ" (status = approved)** ในระบบ Item Pro ระบบจะ:

1. **อัปเดตแถวเดิม** ใน `pr_code_requests` ให้ `status = 'issued'` พร้อม `item_code`, `item_name`, `uom`, `doc_num`, `issued_at`
2. (ถ้าตั้งค่า `PR_ORDER_WEBAPP_URL` ไว้ใน Item Pro) จะยิง **POST ตรงไปที่ Apps Script ของ PR ORDER** ทันที:
   ```json
   { "action": "receiveItemCode", "itemName": "...", "itemCode": "8XXXX0012", "uom": "EA", "prRef": "PR-256907-0031" }
   ```
   ตรงกับฟังก์ชัน `receiveItemCode(itemName, itemCode, brId)` ที่ระบุไว้ใน README ของ PR ORDER อยู่แล้ว

**PR ORDER ควร poll หรือ subscribe** ตาราง `pr_code_requests` (filter `status=eq.issued`) เพื่อดึงรหัสที่ออกเสร็จแล้ว มาอัปเดตในระบบของตัวเอง เช่น:
```
GET {Base URL}/pr_code_requests?status=eq.issued&pr_ref=eq.PR-256907-0031
```

---

## ขั้นตอนที่ 4 — ฝั่ง PR ORDER: ค้นหารายการครุภัณฑ์ที่มีรหัสอยู่แล้ว

ใช้ REST endpoint อ่านตรงจากตาราง `items` ได้เลย (read-only ผ่าน anon key เดียวกัน) — ตรงกับที่ README ของ PR ORDER ระบุว่าต้องการ "endpoint ค้นรหัสที่ขึ้นต้นด้วย 8":

```
GET {Base URL}/items?item_name=ilike.*<คำค้น>*&u_ntt_asset_pur=like.8*&select=item_code,item_name,inventory_uom,sys_uom_name,default_warehouse,sys_price&is_inactive=eq.false&limit=20
```
ตัวอย่าง: ค้นหา "เครื่องวัดความดัน"
```
GET {Base URL}/items?item_name=ilike.*เครื่องวัดความดัน*&u_ntt_asset_pur=like.8*&select=item_code,item_name,inventory_uom&limit=20
```
คืนค่าเป็น JSON array — นำ `item_code` ไปแสดงในหน้า "ส่งออกรหัส (ค้นหาใน Item Pro)" ของ PR ORDER ได้ทันที (แทนการจำลองด้วยชีต DataBase ตามที่ README ระบุไว้)

---

## สรุป Field Contract

| ทิศทาง | Endpoint | ใคร→ใคร | ข้อมูลที่ส่ง |
|---|---|---|---|
| ขอออกรหัส | `POST /pr_code_requests` | PR ORDER → Item Pro | pr_ref, item_name, requested_by |
| แจ้งเตือน | (Item Pro อ่านเอง, ไม่มี webhook) | Item Pro polls ตาราง | — |
| ออกรหัสเสร็จ+อนุมัติแล้ว | `PATCH /pr_code_requests` (auto) + POST webhook (ถ้าตั้งค่า) | Item Pro → PR ORDER | item_code, item_name, uom, doc_num |
| ค้นรายการครุภัณฑ์ | `GET /items` | PR ORDER → Item Pro | item_code, item_name, inventory_uom, ... |

ไฟล์ config ที่เกี่ยวข้องฝั่ง Item Pro: `config.js` → ตัวแปร `PR_ORDER_WEBAPP_URL` (ใส่ URL Apps Script ของ PR ORDER เพื่อเปิดใช้ push แบบ real-time)
