# คู่มือระบบ Activity Log (บันทึก transaction ย้อนหลัง)

Item Master Pro V2 บันทึกทุกการทำรายการสำคัญลงตาราง `activity_logs` เพื่อตรวจสอบย้อนหลัง

## ขั้นตอนที่ 1 — สร้างตาราง (รันครั้งเดียวบน Supabase ของ Item Pro)

SQL Editor → New query → วางแล้ว Run:

```sql
create table if not exists public.activity_logs (
  id             bigint generated always as identity primary key,
  action         text not null,          -- ประเภทการกระทำ เช่น login, create_job, edit_item, approve, delete_item ...
  detail         text,                    -- รายละเอียด (ข้อความ หรือ JSON)
  target_type    text,                    -- ชนิดเป้าหมาย เช่น item, job, user, master, pr, br
  target_id      text,                    -- id/รหัสของเป้าหมาย
  actor_name     text,                    -- ชื่อผู้ทำรายการ
  actor_username text,                    -- username ผู้ทำรายการ
  actor_role     text,                    -- role ผู้ทำรายการ
  created_at     timestamptz not null default now()
);
create index if not exists idx_activity_logs_created on public.activity_logs (created_at desc);
create index if not exists idx_activity_logs_action  on public.activity_logs (action);

-- เปิดสิทธิ์ให้ anon key เขียน/อ่านได้ (ปรับ policy ตามนโยบายจริงได้)
alter table public.activity_logs enable row level security;
create policy "anon rw logs" on public.activity_logs for all using (true) with check (true);
```

## ประเภท action ที่ระบบบันทึก (แผน)

| action | เมื่อไหร่ | detail |
|---|---|---|
| login / logout | เข้า/ออกระบบ | username |
| create_job | ออกรหัส + บันทึกใบงาน | เลขที่ใบงาน, จำนวนรายการ |
| edit_item | แก้ไขข้อมูลไอเทม | รหัส + ฟิลด์ที่เปลี่ยน |
| approve_item | เปลี่ยนสถานะเป็นอนุมัติ | รหัส |
| delete_item | ลบไอเทม | รหัส |
| delete_job | ลบใบงาน | เลขที่ใบงาน |
| master_add / master_delete | เพิ่ม/ลบข้อมูลหลัก | ประเภท + ค่า |
| export | Export ข้อมูล | โหมด + จำนวนแถว |
| pr_issue / br_issue | ส่งรหัสกลับ PR ORDER / BRPR | รหัส + เลขที่ PR/BR |

## หน้าดู Log
เมนู "บันทึกการใช้งาน (Log)" (เฉพาะ admin) — กรองตามช่วงวันที่/ประเภท/ผู้ใช้ และ Export ได้

> สถานะปัจจุบัน: วาง `logAction()` helper ไว้ใน config.js แล้ว (พร้อมเรียกใช้) — ขั้นถัดไปคือต่อ hook เข้าจุด transaction และเพิ่มหน้าแสดง Log
