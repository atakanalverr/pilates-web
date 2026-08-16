import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const ALLOWED_FIELDS = new Set(["name", "sessions", "price"]);

export async function PATCH(request, { params }) {
  const { id } = await params;
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }
  if (!payload) {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const fields = Object.entries(payload).filter(([k]) => ALLOWED_FIELDS.has(k));
  if (fields.length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const setClause = fields.map(([k]) => `${k} = ?`).join(", ");
  const values = fields.map(([, v]) => v);

  const db = getDb();
  db.prepare(`UPDATE packages SET ${setClause} WHERE id = ?`).run(...values, id);

  return NextResponse.json({ status: "ok" });
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM packages WHERE id = ?").run(id);
  return NextResponse.json({ status: "ok" });
}
