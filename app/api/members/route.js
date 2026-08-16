import { NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM members ORDER BY created_at DESC").all();
  return NextResponse.json(rows);
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  if (!payload?.full_name) {
    return NextResponse.json({ error: "full_name zorunludur" }, { status: 400 });
  }

  const db = getDb();
  const id = newId();
  db.prepare(
    `INSERT INTO members
     (id, full_name, phone, package_name, sessions_total, sessions_remaining,
      start_date, trainer, payment_status, notes, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    id,
    payload.full_name,
    payload.phone ?? null,
    payload.package_name ?? "",
    payload.sessions_total ?? 1,
    payload.sessions_remaining ?? 1,
    payload.start_date || new Date().toISOString().slice(0, 10),
    payload.trainer ?? null,
    payload.payment_status ?? "Bekliyor",
    payload.notes ?? null,
    nowIso()
  );

  return NextResponse.json({ status: "ok", id }, { status: 201 });
}
