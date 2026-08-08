"""Pilates Studio — yerel sunucu ve veritabanı.

Hesap/kayıt gerektirmez: sadece Python'un standart kütüphanesini kullanır
(http.server + sqlite3). Statik dosyaları servis eder ve /api/... uç
noktalarıyla members, attendance, slots, bookings tablolarını yönetir.

Çalıştırmak için:
    python3 server.py
Sonra tarayıcıda http://localhost:8000 adresine gidin.
"""

import json
import sqlite3
import uuid
from datetime import datetime, date
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

BASE_DIR = Path(__file__).parent
DB_FILE = BASE_DIR / "pilates.db"


# ---------------------------------------------------------------------------
# Veritabanı kurulumu
# ---------------------------------------------------------------------------

def get_conn():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_conn()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS members (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          phone TEXT,
          package_type TEXT NOT NULL DEFAULT 'Pilates (Haftada 3 Seans)',
          sessions_total INTEGER NOT NULL DEFAULT 1,
          sessions_remaining INTEGER NOT NULL DEFAULT 1,
          start_date TEXT NOT NULL,
          trainer TEXT,
          payment_status TEXT NOT NULL DEFAULT 'Bekliyor',
          payment_date TEXT,
          notes TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS attendance (
          id TEXT PRIMARY KEY,
          member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
          session_date TEXT NOT NULL,
          trainer TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS slots (
          id TEXT PRIMARY KEY,
          coach TEXT NOT NULL,
          time TEXT NOT NULL,
          capacity INTEGER NOT NULL DEFAULT 1,
          UNIQUE(coach, time)
        );

        CREATE TABLE IF NOT EXISTS bookings (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          time TEXT NOT NULL,
          coach TEXT NOT NULL,
          name TEXT NOT NULL,
          phone TEXT,
          package TEXT NOT NULL,
          weekly_slots TEXT NOT NULL DEFAULT '[]',
          end_date TEXT,
          created_at TEXT NOT NULL
        );
        """
    )
    conn.commit()
    seed_if_empty(conn)
    conn.close()


def now_iso():
    return datetime.utcnow().isoformat()


def new_id():
    return uuid.uuid4().hex


def seed_if_empty(conn):
    if conn.execute("SELECT COUNT(*) FROM members").fetchone()[0] == 0:
        seed_members(conn)
    if conn.execute("SELECT COUNT(*) FROM slots").fetchone()[0] == 0:
        seed_slots(conn)
    if conn.execute("SELECT COUNT(*) FROM bookings").fetchone()[0] == 0:
        seed_bookings(conn)
    conn.commit()


def seed_members(conn):
    # Haftalık paketlerde toplam ders sayısı aylık karşılığıdır
    # (Haftada 2 Seans -> ayda 8, Haftada 3 Seans -> ayda 12). Mix paketleri zaten toplam sayı.
    rows = [
        ("Elif Yılmaz", "0532 111 22 33", "Mix 12 Seans", 12, 9, "2026-06-02", "Nuray", "Ödendi", "2026-06-01", "Bel fıtığı geçmişi var, ağır ekstansiyon hareketlerinden kaçınılıyor."),
        ("Derya Kaya", "0533 222 33 44", "Mix 10 Seans", 10, 3, "2026-07-10", "Güray", "Ödendi", "2026-07-09", "Sabah saatlerini tercih ediyor."),
        ("Nazlı Şahin", "0536 444 55 66", "Mix 12 Seans", 12, 12, "2026-08-05", "Güray", "Ödendi", "2026-08-04", "Reformer pilates deneyimli."),
        ("Ayşe Çelik", "0537 555 66 77", "Mix 10 Seans", 10, 1, "2026-05-15", "Nuray", "Gecikti", "2026-06-15", "Ödeme takibi gerekiyor."),
        ("Pınar Arslan", "0538 666 77 88", "Power Plate (Haftada 3 Seans)", 12, 12, "2026-07-20", "Güray", "Ödendi", "2026-07-19", None),
        ("Selin Öztürk", "0539 777 88 99", "Mix 12 Seans", 12, 4, "2026-06-25", "Nuray", "Ödendi", "2026-06-24", "Hamilelik sonrası toparlanma programında."),
        ("Elçin Yıldız", "0530 888 99 00", "Pilates (Haftada 2 Seans)", 8, 8, "2026-08-06", "Güray", "Bekliyor", None, None),
        ("Gizem Aksoy", "0541 111 22 33", "Pilates (Haftada 3 Seans)", 12, 12, "2026-07-28", "Güray", "Ödendi", "2026-07-27", None),
        ("İrem Polat", "0542 222 33 44", "Power Plate (Haftada 3 Seans)", 12, 8, "2026-07-15", "Güray", "Bekliyor", None, "Diz sorunu var, düşük darbeli hareketler tercih ediliyor."),
        ("Sevgi Uslu", "0543 333 44 55", "Mix 12 Seans", 12, 12, "2026-08-03", "Güray", "Ödendi", "2026-08-02", None),
        ("Yasemin Demirtaş", "0544 444 55 66", "Pilates (Haftada 2 Seans)", 8, 4, "2026-06-20", "Güray", "Ödendi", "2026-06-19", None),
        ("Aslı Türk", "0545 555 66 77", "Pilates (Haftada 2 Seans)", 8, 4, "2026-07-05", "Nuray", "Ödendi", "2026-07-04", None),
        ("Melis Sönmez", "0546 666 77 88", "Mix 10 Seans", 10, 4, "2026-05-22", "Nuray", "Gecikti", "2026-06-22", "Ödeme takibi gerekiyor."),
        ("Buse Yalçın", "0547 777 88 99", "Power Plate (Haftada 3 Seans)", 12, 12, "2026-08-01", "Nuray", "Bekliyor", None, None),
        ("Ceyda Arık", "0548 888 99 00", "Pilates (Haftada 3 Seans)", 12, 8, "2026-07-11", "Nuray", "Ödendi", "2026-07-10", "Hamilelik sonrası toparlanma programında, doktor onayı mevcut."),
        ("Merve Öz", "0549 111 22 33", "Pilates (Haftada 3 Seans)", 12, 12, "2026-07-25", "Güray", "Ödendi", "2026-07-24", None),
        ("Sude Kılıç", "0550 222 33 44", "Power Plate (Haftada 3 Seans)", 12, 4, "2026-06-14", "Güray", "Gecikti", "2026-07-14", "Ödeme takibi gerekiyor."),
        ("Hazal Er", "0551 333 44 55", "Mix 10 Seans", 10, 7, "2026-07-01", "Güray", "Ödendi", "2026-06-30", None),
        ("Nilüfer Aydemir", "0552 444 55 66", "Pilates (Haftada 2 Seans)", 8, 8, "2026-08-07", "Güray", "Bekliyor", None, "İlk deneme dersini aldı, pakete geçmeyi düşünüyor."),
    ]
    ids = {}
    for r in rows:
        mid = new_id()
        ids[r[0]] = mid
        conn.execute(
            """INSERT INTO members
               (id, full_name, phone, package_type, sessions_total, sessions_remaining,
                start_date, trainer, payment_status, payment_date, notes, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (mid, *r, now_iso()),
        )

    attendance_rows = [
        ("Elif Yılmaz", "2026-06-03", "Nuray"),
        ("Elif Yılmaz", "2026-06-10", "Nuray"),
        ("Elif Yılmaz", "2026-06-17", "Nuray"),
        ("Derya Kaya", "2026-07-12", "Güray"),
        ("Derya Kaya", "2026-07-19", "Güray"),
        ("Nazlı Şahin", "2026-08-06", "Güray"),
        ("Pınar Arslan", "2026-07-22", "Güray"),
        ("Selin Öztürk", "2026-06-27", "Nuray"),
        ("Gizem Aksoy", "2026-07-29", "Güray"),
        ("Sevgi Uslu", "2026-08-04", "Güray"),
        ("Aslı Türk", "2026-07-06", "Nuray"),
        ("Ceyda Arık", "2026-07-13", "Nuray"),
        ("Ceyda Arık", "2026-07-20", "Nuray"),
        ("Merve Öz", "2026-07-26", "Güray"),
        ("Hazal Er", "2026-07-08", "Güray"),
        ("Hazal Er", "2026-07-15", "Güray"),
    ]
    for full_name, session_date, trainer in attendance_rows:
        conn.execute(
            "INSERT INTO attendance (id, member_id, session_date, trainer, created_at) VALUES (?,?,?,?,?)",
            (new_id(), ids[full_name], session_date, trainer, now_iso()),
        )


def seed_slots(conn):
    for coach in ("Güray", "Nuray"):
        for h in range(8, 21):
            time_str = f"{h:02d}:00-{h + 1:02d}:00"
            conn.execute(
                "INSERT OR IGNORE INTO slots (id, coach, time, capacity) VALUES (?,?,?,1)",
                (new_id(), coach, time_str),
            )


def seed_bookings(conn):
    demo = [
        ("2026-08-10", "09:00-10:00", "Güray", "İpek Aydın", "0541 222 33 44", "pilates-3",
         json.dumps([{"day": "Pazartesi", "time": "09:00-10:00"}, {"day": "Çarşamba", "time": "09:00-10:00"}, {"day": "Cuma", "time": "09:00-10:00"}], ensure_ascii=False)),
        ("2026-08-11", "18:00-19:00", "Nuray", "Ece Korkmaz", "0542 333 44 55", "power-3",
         json.dumps([{"day": "Salı", "time": "18:00-19:00"}, {"day": "Perşembe", "time": "18:00-19:00"}, {"day": "Cuma", "time": "18:00-19:00"}], ensure_ascii=False)),
    ]
    for d, t, coach, name, phone, package, weekly in demo:
        conn.execute(
            """INSERT INTO bookings (id, date, time, coach, name, phone, package, weekly_slots, end_date, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (new_id(), d, t, coach, name, phone, package, weekly, None, now_iso()),
        )


# ---------------------------------------------------------------------------
# HTTP sunucu
# ---------------------------------------------------------------------------

class ApiHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def log_message(self, fmt, *args):
        pass  # sessiz sunucu

    def _send_json(self, data, status=200):
        payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _send_error_json(self, message, status=400):
        self._send_json({"error": message}, status=status)

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length or 0)
        try:
            return json.loads(raw.decode("utf-8")) if raw else {}
        except json.JSONDecodeError:
            return None

    # --- routing ---

    def do_GET(self):
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.split("/") if p]
        query = parse_qs(parsed.query)

        if parts[:2] == ["api", "members"] and len(parts) == 4 and parts[3] == "attendance":
            return self.get_member_attendance(parts[2])
        if parts == ["api", "members"]:
            return self.get_members()
        if parts == ["api", "slots"]:
            return self.get_slots(query.get("coach", [None])[0])
        if parts == ["api", "bookings"]:
            return self.get_bookings(query.get("coach", [None])[0])

        super().do_GET()

    def do_POST(self):
        parts = [p for p in urlparse(self.path).path.split("/") if p]
        if parts == ["api", "members"]:
            return self.create_member()
        if parts == ["api", "attendance"]:
            return self.create_attendance()
        if parts == ["api", "bookings"]:
            return self.create_booking()
        self.send_error(404, "Endpoint not found")

    def do_PATCH(self):
        parts = [p for p in urlparse(self.path).path.split("/") if p]
        if parts[:2] == ["api", "members"] and len(parts) == 3:
            return self.update_member(parts[2])
        self.send_error(404, "Endpoint not found")

    def do_DELETE(self):
        parts = [p for p in urlparse(self.path).path.split("/") if p]
        if parts[:2] == ["api", "members"] and len(parts) == 3:
            return self.delete_member(parts[2])
        self.send_error(404, "Endpoint not found")

    # --- members ---

    def get_members(self):
        conn = get_conn()
        rows = conn.execute("SELECT * FROM members ORDER BY created_at DESC").fetchall()
        conn.close()
        self._send_json([dict(r) for r in rows])

    def create_member(self):
        payload = self._read_json_body()
        if payload is None or not payload.get("full_name"):
            return self._send_error_json("full_name zorunludur")

        mid = new_id()
        conn = get_conn()
        conn.execute(
            """INSERT INTO members
               (id, full_name, phone, package_type, sessions_total, sessions_remaining,
                start_date, trainer, payment_status, payment_date, notes, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                mid,
                payload.get("full_name", ""),
                payload.get("phone"),
                payload.get("package_type", "Pilates (Haftada 3 Seans)"),
                payload.get("sessions_total", 1),
                payload.get("sessions_remaining", 1),
                payload.get("start_date") or date.today().isoformat(),
                payload.get("trainer"),
                payload.get("payment_status", "Bekliyor"),
                payload.get("payment_date"),
                payload.get("notes"),
                now_iso(),
            ),
        )
        conn.commit()
        conn.close()
        self._send_json({"status": "ok", "id": mid}, status=201)

    def update_member(self, member_id):
        payload = self._read_json_body()
        if payload is None:
            return self._send_error_json("Geçersiz JSON")

        allowed = {
            "full_name", "phone", "package_type", "sessions_total",
            "sessions_remaining", "start_date", "trainer", "payment_status",
            "payment_date", "notes",
        }
        fields = {k: v for k, v in payload.items() if k in allowed}
        if not fields:
            return self._send_error_json("Güncellenecek alan yok")

        set_clause = ", ".join(f"{k} = ?" for k in fields)
        conn = get_conn()
        conn.execute(f"UPDATE members SET {set_clause} WHERE id = ?", (*fields.values(), member_id))
        conn.commit()
        conn.close()
        self._send_json({"status": "ok"})

    def delete_member(self, member_id):
        conn = get_conn()
        conn.execute("DELETE FROM members WHERE id = ?", (member_id,))
        conn.commit()
        conn.close()
        self._send_json({"status": "ok"})

    # --- attendance ---

    def get_member_attendance(self, member_id):
        conn = get_conn()
        rows = conn.execute(
            "SELECT * FROM attendance WHERE member_id = ? ORDER BY session_date DESC", (member_id,)
        ).fetchall()
        conn.close()
        self._send_json([dict(r) for r in rows])

    def create_attendance(self):
        payload = self._read_json_body()
        if payload is None or not payload.get("member_id"):
            return self._send_error_json("member_id zorunludur")

        conn = get_conn()
        conn.execute(
            "INSERT INTO attendance (id, member_id, session_date, trainer, created_at) VALUES (?,?,?,?,?)",
            (
                new_id(),
                payload["member_id"],
                payload.get("session_date") or date.today().isoformat(),
                payload.get("trainer"),
                now_iso(),
            ),
        )
        conn.commit()
        conn.close()
        self._send_json({"status": "ok"}, status=201)

    # --- slots ---

    def get_slots(self, coach):
        conn = get_conn()
        if coach:
            rows = conn.execute("SELECT * FROM slots WHERE coach = ?", (coach,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM slots").fetchall()
        conn.close()
        self._send_json([dict(r) for r in rows])

    # --- bookings ---

    def get_bookings(self, coach):
        conn = get_conn()
        if coach:
            rows = conn.execute("SELECT * FROM bookings WHERE coach = ?", (coach,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM bookings").fetchall()
        conn.close()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["weekly_slots"] = json.loads(d.get("weekly_slots") or "[]")
            except json.JSONDecodeError:
                d["weekly_slots"] = []
            result.append(d)
        self._send_json(result)

    def create_booking(self):
        payload = self._read_json_body()
        if payload is None:
            return self._send_error_json("Geçersiz JSON")
        required = ["date", "time", "coach", "name", "package"]
        if not all(payload.get(f) for f in required):
            return self._send_error_json("date, time, coach, name, package alanları zorunludur")

        conn = get_conn()
        conn.execute(
            """INSERT INTO bookings (id, date, time, coach, name, phone, package, weekly_slots, end_date, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                new_id(),
                payload["date"],
                payload["time"],
                payload["coach"],
                payload["name"],
                payload.get("phone"),
                payload["package"],
                json.dumps(payload.get("weekly_slots", []), ensure_ascii=False),
                payload.get("end_date"),
                now_iso(),
            ),
        )
        conn.commit()
        conn.close()
        self._send_json({"status": "ok"}, status=201)


def run(port=8000):
    init_db()
    server = ThreadingHTTPServer(("", port), ApiHandler)
    print(f"Pilates Studio sunucusu http://localhost:{port} adresinde çalışıyor. (Ctrl+C ile durdur)")
    print(f"Veritabanı dosyası: {DB_FILE}")
    server.serve_forever()


if __name__ == "__main__":
    run()
