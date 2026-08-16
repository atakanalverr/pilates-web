import { NextResponse } from "next/server";
import { getDb, newId, nowIso } from "@/lib/db";

export async function GET() {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM packages ORDER BY created_at ASC").all();
  return NextResponse.json(rows);
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  if (!payload?.name) {
    return NextResponse.json({ error: "name zorunludur" }, { status: 400 });
  }

  const db = getDb();
  const id = newId();
  db.prepare(
    "INSERT INTO packages (id, name, sessions, price, created_at) VALUES (?,?,?,?,?)"
  ).run(id, payload.name, payload.sessions ?? 1, payload.price ?? 0, nowIso());

  return NextResponse.json({ status: "ok", id }, { status: 201 });
}
