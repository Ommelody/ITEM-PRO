# คู่มือเชื่อมต่อ Item Master Pro V2 ⇄ BRPR (ERP ธรรมศาสตร์)

BRPR ใช้ Supabase คนละโปรเจกต์กับ Item Pro — จึงเชื่อมกันแบบ **cross-Supabase**
Item Pro จะอ่าน/เขียนตาราง `item_code_requests` ที่อยู่บน **Supabase ของ BRPR** โดยตรง

```
BRPR project ref : hkqyeeonfyzlbnimztuz
Base URL         : https://hkqyeeonfyzlbnimztuz.supabase.co/rest/v1
```

---

## ขั้นตอนที่ 1 — ตาราง item_code_requests (ฝั่ง BRPR มีอยู่แล้ว)

BRPR สร้างตารางนี้ไว้แล้วใน `supabase-schema.sql`:

```sql
create table if not exists public.item_code_requests (
  id           bigint generated always as identity primary key,
  br_id        text,
  item_name    text,
  requested_by text,
  code         text default '',
  status       text default 'requested',   -- requested | issued
  created_at   timestamptz default now()
);
-- RLS: อนุญาต anon อ่าน/เขียน (มีอยู่แล้วในสคีมา BRPR)
```
ไม่ต้องแก้อะไรฝั่ง BRPR เพิ่ม

---

## ขั้นตอนที่ 2 — ฝั่ง Item Pro: เพิ่มคอลัมน์อ้างอิง (รันครั้งเดียว)

รันบน **Supabase ของ Item Pro** (szoxfjzkdwurxlvevkjs):

```sql
alter table items add column if not exists br_request_id text;
```
(ใช้เก็บ id ของคำขอ BRPR เพื่อส่งรหัสกลับไปถูกแถวเมื่ออนุมัติ)

---

## ขั้นตอนที่ 3 — ฝั่ง Item Pro: ใส่ anon key ของ BRPR

เปิด `config.js` แล้ววาง anon **public** key ของ BRPR:

```js
const BRPR_SUPABASE_URL = "https://hkqyeeonfyzlbnimztuz.supabase.co";
const BRPR_ANON = "eyJhbGci...";   // <-- anon public key ของ BRPR
```
ถ้าเว้นว่าง ระบบ BRPR จะถูกปิดไว้ (ไม่กระทบ PR ORDER หรือฟังก์ชันอื่น)

---

## Flow การทำงาน

**ทิศทาง 1 — BRPR ส่งคำขอออกรหัส**
BRPR (หน้า "งบประมาณจัดสรร → ส่งออกรหัส Item Master Pro") POST เข้า:
```
POST {BRPR Base URL}/item_code_requests
{ "br_id": "BR-2569-0042", "item_name": "เครื่องวัดความดันดิจิทัล", "requested_by": "ห้องผ่าตัด" }
```
→ Item Pro แสดงแถบแจ้งเตือนสีน้ำเงิน + badge ที่เมนู "ออกรหัสพัสดุ" (เช็คทุก 45 วิ)

**ทิศทาง 2 — Item Pro ส่งรหัสกลับหลังอนุมัติ**
เจ้าหน้าที่ Item Pro เลือกคำขอ → ออกรหัส → **กดอนุมัติ (approved)**
Item Pro จะ PATCH กลับไปที่แถวเดิมบน Supabase ของ BRPR อัตโนมัติ:
```
PATCH {BRPR Base URL}/item_code_requests?id=eq.<id>
{ "status": "issued", "code": "8XXXX0042" }
```
BRPR poll/subscribe แถวที่ `status=eq.issued` เพื่อดึงรหัสไปใช้ต่อได้ทันที

**ค้นหาครุภัณฑ์ที่มีรหัสแล้ว** (BRPR เรียกอ่านตรงจาก Item Pro Supabase):
```
GET https://szoxfjzkdwurxlvevkjs.supabase.co/rest/v1/items?item_name=ilike.*<คำค้น>*&u_ntt_asset_pur=like.8*&select=item_code,item_name,inventory_uom&is_inactive=eq.false&limit=20
```

---

## สรุป Field Contract (ตาราง item_code_requests)

| ทิศทาง | ผู้ทำ | field ที่เขียน |
|---|---|---|
| ขอออกรหัส | BRPR → | br_id, item_name, requested_by, status='requested' |
| ส่งรหัสกลับ | Item Pro → (auto หลังอนุมัติ) | code, status='issued' |

> หมายเหตุ: ตาราง BRPR ไม่มีคอลัมน์หน่วยนับ (uom) — ถ้าต้องการรับหน่วยนับกลับด้วย ให้เพิ่ม `alter table item_code_requests add column if not exists uom text;` ฝั่ง BRPR แล้วแจ้งมา จะปรับให้ Item Pro ส่ง uom กลับไปด้วย
