"use client";

import { useState } from "react";
import { api } from "@/lib/api";

function formatPrice(price) {
  return `${Number(price || 0).toLocaleString("tr-TR")}₺`;
}

export default function PackagesSection({ packages, onReload, notify }) {
  const [name, setName] = useState("");
  const [sessions, setSessions] = useState(1);
  const [price, setPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      await api.packages.create({
        name: trimmed,
        sessions: Number(sessions) || 1,
        price: Number(price) || 0,
      });
      setName("");
      setSessions(1);
      setPrice(0);
      await onReload();
      notify("Paket eklendi.", "success");
    } catch (err) {
      notify("Paket eklenemedi: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(pkg) {
    setEditingId(pkg.id);
    setEditDraft({ name: pkg.name, sessions: pkg.sessions, price: pkg.price });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit(pkgId) {
    const trimmed = editDraft.name.trim();
    if (!trimmed) return;
    try {
      await api.packages.update(pkgId, {
        name: trimmed,
        sessions: Number(editDraft.sessions) || 1,
        price: Number(editDraft.price) || 0,
      });
      cancelEdit();
      await onReload();
      notify("Paket güncellendi.", "success");
    } catch (err) {
      notify("Güncellenemedi: " + err.message, "error");
    }
  }

  async function deletePackage(pkg) {
    if (!confirm(`"${pkg.name}" paketi silinsin mi?`)) return;
    try {
      await api.packages.remove(pkg.id);
      await onReload();
      notify("Paket silindi.", "success");
    } catch (err) {
      notify("Silinemedi: " + err.message, "error");
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white/60 p-6 shadow-sm">
      <h2 className="font-serif-display text-2xl italic text-ink">Paketler</h2>

      <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Paket Adı">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn. Mix 10 Seans"
            className="input"
          />
        </Field>
        <Field label="Seans Sayısı">
          <input
            type="number"
            min="1"
            required
            value={sessions}
            onChange={(e) => setSessions(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Fiyat (₺)">
          <input
            type="number"
            min="0"
            step="1"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input"
          />
        </Field>
        <div className="sm:col-span-3">
          <button type="submit" disabled={submitting} className="btn-primary">
            Paket Ekle
          </button>
        </div>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="py-2 pr-3">Paket Adı</th>
              <th className="py-2 pr-3">Seans</th>
              <th className="py-2 pr-3">Fiyat</th>
              <th className="py-2 pr-3">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {packages.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-ink-soft">
                  Henüz paket yok.
                </td>
              </tr>
            )}
            {packages.map((p) =>
              editingId === p.id ? (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3">
                    <input
                      className="input"
                      value={editDraft.name}
                      onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min="1"
                      className="input"
                      value={editDraft.sessions}
                      onChange={(e) => setEditDraft({ ...editDraft, sessions: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      min="0"
                      className="input"
                      value={editDraft.price}
                      onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-2">
                      <button className="icon-btn" onClick={() => saveEdit(p.id)}>
                        Kaydet
                      </button>
                      <button className="icon-btn" onClick={cancelEdit}>
                        İptal
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-3 font-medium">{p.name}</td>
                  <td className="py-2 pr-3">{p.sessions}</td>
                  <td className="py-2 pr-3">{formatPrice(p.price)}</td>
                  <td className="py-2 pr-3">
                    <div className="flex gap-2">
                      <button className="icon-btn" onClick={() => startEdit(p)}>
                        Düzenle
                      </button>
                      <button className="icon-btn-danger" onClick={() => deletePackage(p)}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</label>
      {children}
    </div>
  );
}
