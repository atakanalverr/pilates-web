// SQLite veri katmanı — Node.js'in yerleşik node:sqlite modülüyle (DatabaseSync)
// senkron sorgular. Ekstra native bağımlılık gerekmez.
// Next.js API route'ları (Node.js runtime) tarafından kullanılır.

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import crypto from "node:crypto";

const DB_PATH = path.join(process.cwd(), "pilates.db");

let db;

function getDb() {
  if (db) return db;
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  init(db);
  return db;
}

function init(conn) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sessions INTEGER NOT NULL DEFAULT 1,
      price INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT,
      package_name TEXT NOT NULL DEFAULT '',
      sessions_total INTEGER NOT NULL DEFAULT 1,
      sessions_remaining INTEGER NOT NULL DEFAULT 1,
      start_date TEXT NOT NULL,
      trainer TEXT,
      payment_status TEXT NOT NULL DEFAULT 'Bekliyor',
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);
  seedIfEmpty(conn);
}

function nowIso() {
  return new Date().toISOString();
}

export function newId() {
  return crypto.randomUUID().replace(/-/g, "");
}

function seedIfEmpty(conn) {
  const packageCount = conn.prepare("SELECT COUNT(*) AS c FROM packages").get().c;
  if (packageCount === 0) seedPackages(conn);

  const memberCount = conn.prepare("SELECT COUNT(*) AS c FROM members").get().c;
  if (memberCount === 0) seedMembers(conn);
}

function seedPackages(conn) {
  const rows = [
    ["Pilates (Haftada 2 Seans)", 8, 6000],
    ["Pilates (Haftada 3 Seans)", 12, 8000],
    ["Power Plate (Haftada 3 Seans)", 12, 5000],
    ["Mix 10 Seans", 10, 5500],
    ["Mix 12 Seans", 12, 6500],
  ];
  const insert = conn.prepare(
    "INSERT INTO packages (id, name, sessions, price, created_at) VALUES (?,?,?,?,?)"
  );
  for (const [name, sessions, price] of rows) {
    insert.run(newId(), name, sessions, price, nowIso());
  }
}

function seedMembers(conn) {
  const rows = [
    ["Elif Yılmaz", "0532 111 22 33", "Mix 12 Seans", 12, 9, "2026-06-02", "Nuray", "Ödendi", "Bel fıtığı geçmişi var, ağır ekstansiyon hareketlerinden kaçınılıyor."],
    ["Derya Kaya", "0533 222 33 44", "Mix 10 Seans", 10, 3, "2026-07-10", "Güray", "Ödendi", "Sabah saatlerini tercih ediyor."],
    ["Nazlı Şahin", "0536 444 55 66", "Mix 12 Seans", 12, 12, "2026-08-05", "Güray", "Ödendi", "Reformer pilates deneyimli."],
    ["Ayşe Çelik", "0537 555 66 77", "Mix 10 Seans", 10, 1, "2026-05-15", "Nuray", "Gecikti", "Ödeme takibi gerekiyor."],
    ["Pınar Arslan", "0538 666 77 88", "Power Plate (Haftada 3 Seans)", 12, 12, "2026-07-20", "Güray", "Ödendi", null],
    ["Selin Öztürk", "0539 777 88 99", "Mix 12 Seans", 12, 4, "2026-06-25", "Nuray", "Ödendi", "Hamilelik sonrası toparlanma programında."],
    ["Elçin Yıldız", "0530 888 99 00", "Pilates (Haftada 2 Seans)", 8, 8, "2026-08-06", "Güray", "Bekliyor", null],
    ["Gizem Aksoy", "0541 111 22 33", "Pilates (Haftada 3 Seans)", 12, 12, "2026-07-28", "Güray", "Ödendi", null],
    ["İrem Polat", "0542 222 33 44", "Power Plate (Haftada 3 Seans)", 12, 8, "2026-07-15", "Güray", "Bekliyor", "Diz sorunu var, düşük darbeli hareketler tercih ediliyor."],
    ["Sevgi Uslu", "0543 333 44 55", "Mix 12 Seans", 12, 12, "2026-08-03", "Güray", "Ödendi", null],
  ];
  const insert = conn.prepare(
    `INSERT INTO members
     (id, full_name, phone, package_name, sessions_total, sessions_remaining,
      start_date, trainer, payment_status, notes, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  );
  for (const [full_name, phone, package_name, total, remaining, start_date, trainer, payment_status, notes] of rows) {
    insert.run(newId(), full_name, phone, package_name, total, remaining, start_date, trainer, payment_status, notes, nowIso());
  }
}

export { getDb, nowIso };
