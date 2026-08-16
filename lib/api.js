// Tarayıcı tarafı API istemcisi — Next.js route handler'larına (/api/...) bağlanır.

async function toJson(res) {
  if (!res.ok) {
    let message = `İstek başarısız (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // yut
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  members: {
    list: () => fetch("/api/members").then(toJson),
    create: (payload) =>
      fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(toJson),
    update: (id, payload) =>
      fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(toJson),
    remove: (id) => fetch(`/api/members/${id}`, { method: "DELETE" }).then(toJson),
  },

  packages: {
    list: () => fetch("/api/packages").then(toJson),
    create: (payload) =>
      fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(toJson),
    update: (id, payload) =>
      fetch(`/api/packages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(toJson),
    remove: (id) => fetch(`/api/packages/${id}`, { method: "DELETE" }).then(toJson),
  },
};
