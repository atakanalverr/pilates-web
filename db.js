// Yerel API istemcisi — server.py'nin sunduğu /api/... uçlarına bağlanır.
// Hesap/anahtar gerekmez; sadece "python3 server.py" çalışıyor olmalı.

const db = {
  async _json(res) {
    if (!res.ok) {
      let message = `İstek başarısız (${res.status})`;
      try {
        const body = await res.json();
        if (body.error) message = body.error;
      } catch (_) {}
      throw new Error(message);
    }
    if (res.status === 204) return null;
    return res.json();
  },

  members: {
    list: () => fetch("/api/members").then(db._json),
    create: (payload) =>
      fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(db._json),
    update: (id, payload) =>
      fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(db._json),
    remove: (id) => fetch(`/api/members/${id}`, { method: "DELETE" }).then(db._json),
    attendance: (id) => fetch(`/api/members/${id}/attendance`).then(db._json),
  },

  attendance: {
    create: (payload) =>
      fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(db._json),
  },

  slots: {
    list: (coach) => fetch(`/api/slots${coach ? `?coach=${encodeURIComponent(coach)}` : ""}`).then(db._json),
  },

  bookings: {
    list: (coach) => fetch(`/api/bookings${coach ? `?coach=${encodeURIComponent(coach)}` : ""}`).then(db._json),
    create: (payload) =>
      fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(db._json),
  },
};
