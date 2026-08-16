"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import EditMemberModal from "./EditMemberModal";
import ConfirmDialog from "./ConfirmDialog";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const PAYMENT_BADGE = {
  Ödendi: "badge-ok",
  "Bir Kısmı Ödendi": "badge-partial",
  Bekliyor: "badge-pending",
  Gecikti: "badge-late",
};

const EMPTY_FORM = {
  full_name: "",
  phone: "",
  package_name: "",
  start_date: todayIso(),
  trainer: "Güray",
  payment_status: "Bekliyor",
  paid_amount: "",
  notes: "",
};

export default function MembersSection({ members, packages, onReload, notify, selectedTrainer }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [editingMember, setEditingMember] = useState(null);
  const [attendingId, setAttendingId] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);

  const packageName = form.package_name || packages[0]?.name || "";

  const trainerMembers = useMemo(
    () => (selectedTrainer ? members.filter((m) => m.trainer === selectedTrainer) : members),
    [members, selectedTrainer]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return trainerMembers;
    return trainerMembers.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        (m.phone || "").toLowerCase().includes(q)
    );
  }, [trainerMembers, query]);

  const stats = useMemo(
    () => ({
      total: trainerMembers.length,
      pending: trainerMembers.filter(
        (m) => m.payment_status === "Bekliyor" || m.payment_status === "Bir Kısmı Ödendi"
      ).length,
      late: trainerMembers.filter((m) => m.payment_status === "Gecikti").length,
    }),
    [trainerMembers]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const fullName = form.full_name.trim();
    if (!fullName) return;

    const selectedPackage = packages.find((p) => p.name === packageName);
    const sessions = selectedPackage ? Number(selectedPackage.sessions) || 1 : 1;

    setSubmitting(true);
    try {
      await api.members.create({
        ...form,
        full_name: fullName,
        phone: form.phone.trim(),
        package_name: packageName,
        paid_amount: form.payment_status === "Bir Kısmı Ödendi" ? form.paid_amount.trim() : "",
        notes: form.notes.trim(),
        sessions_total: sessions,
        sessions_remaining: sessions,
      });
      setForm({ ...EMPTY_FORM, start_date: todayIso() });
      await onReload();
      notify("Üye eklendi.", "success");
    } catch (err) {
      notify("Kaydedilemedi: " + err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeleteMember() {
    const member = deletingMember;
    if (!member) return;
    setDeletingMember(null);
    try {
      await api.members.remove(member.id);
      await onReload();
      notify("Üye silindi.", "success");
    } catch (err) {
      notify("Silinemedi: " + err.message, "error");
    }
  }

  async function recordAttendance(member) {
    if (member.sessions_remaining <= 0) return;
    setAttendingId(member.id);
    try {
      const newRemaining = member.sessions_remaining - 1;
      await api.members.update(member.id, { sessions_remaining: newRemaining });
      notify(`${member.full_name} — kalan ders: ${newRemaining}`, "success");
      await onReload();
    } catch (err) {
      notify("Ders işlenemedi: " + err.message, "error");
    } finally {
      setAttendingId(null);
    }
  }

  async function saveMemberEdit(id, payload) {
    await api.members.update(id, payload);
    setEditingMember(null);
    await onReload();
    notify("Değişiklikler başarıyla kaydedildi.", "success");
  }

  return (
    <>
      <section className="rounded-2xl border border-line bg-white/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif-display text-2xl italic text-ink">
            {selectedTrainer ? `${selectedTrainer} - Üye Listesi` : "Tüm Üyeler"}
          </h2>
          <input
            type="search"
            placeholder="Üye ismine göre ara..."
            className="input max-w-xs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="py-2 pr-4 whitespace-nowrap">Ad Soyad</th>
                <th className="py-2 pr-4 whitespace-nowrap">Telefon</th>
                <th className="py-2 pr-4 whitespace-nowrap">Paket</th>
                <th className="py-2 pr-4 whitespace-nowrap">Kalan Ders</th>
                <th className="py-2 pr-4 whitespace-nowrap">Antrenör</th>
                <th className="py-2 pr-4 whitespace-nowrap">Ödeme</th>
                <th className="py-2 pr-4 whitespace-nowrap">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-ink-soft">
                    Üye bulunamadı.
                  </td>
                </tr>
              )}
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-4 font-medium whitespace-nowrap">{m.full_name}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{m.phone || "—"}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{m.package_name}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <span className="font-medium">{m.sessions_remaining}</span>
                    <span className="text-ink-soft"> / {m.sessions_total}</span>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">{m.trainer || "—"}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <span className={`badge ${PAYMENT_BADGE[m.payment_status] || "badge-pending"}`}>
                      {m.payment_status}
                    </span>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        className="icon-btn"
                        disabled={m.sessions_remaining <= 0 || attendingId === m.id}
                        onClick={() => recordAttendance(m)}
                      >
                        -1 Ders
                      </button>
                      <button className="icon-btn" onClick={() => setEditingMember(m)}>
                        Düzenle
                      </button>
                      <button className="icon-btn-danger" onClick={() => setDeletingMember(m)}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatBox
          label={selectedTrainer ? `${selectedTrainer}'ın Üyeleri` : "Toplam Üye"}
          value={stats.total}
        />
        <StatBox label="Ödeme Bekleyen" value={stats.pending} />
        <StatBox label="Ödemesi Gecikmiş" value={stats.late} />
      </div>

      <section className="mt-8 rounded-2xl border border-line bg-white/60 p-6 shadow-sm">
        <h2 className="font-serif-display text-2xl italic text-ink">Yeni Üye Ekle</h2>

        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Adı ve Soyadı">
            <input
              type="text"
              required
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </Field>
          <Field label="İletişim Bilgisi">
            <input
              type="tel"
              placeholder="05XX XXX XX XX"
              className="input"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Paket">
            <select
              required
              className="input"
              value={packageName}
              onChange={(e) => setForm({ ...form, package_name: e.target.value })}
            >
              {packages.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} — {p.sessions} seans
                </option>
              ))}
            </select>
          </Field>
          <Field label="Başlangıç Tarihi">
            <input
              type="date"
              className="input"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </Field>
          <Field label="Antrenör">
            <select
              className="input"
              value={form.trainer}
              onChange={(e) => setForm({ ...form, trainer: e.target.value })}
            >
              <option value="Güray">Güray</option>
              <option value="Nuray">Nuray</option>
            </select>
          </Field>
          <Field label="Ödeme Durumu">
            <select
              className="input"
              value={form.payment_status}
              onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
            >
              <option value="Ödendi">Ödendi</option>
              <option value="Bir Kısmı Ödendi">Bir Kısmı Ödendi</option>
              <option value="Bekliyor">Bekliyor</option>
              <option value="Gecikti">Gecikti</option>
            </select>
          </Field>
          {form.payment_status === "Bir Kısmı Ödendi" && (
            <Field label="Ne Kadar Ücret Ödendi?">
              <input
                type="text"
                className="input"
                placeholder="Örn. 3000₺ nakit ödendi, kalanı ay sonunda"
                value={form.paid_amount}
                onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
              />
            </Field>
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            <Field label="Notlar">
              <textarea
                rows={2}
                placeholder="Sağlık durumu, tercihler, vb."
                className="input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" disabled={submitting} className="btn-primary">
              Üye Ekle
            </button>
          </div>
        </form>
      </section>

      {editingMember && (
        <EditMemberModal
          member={editingMember}
          packages={packages}
          onClose={() => setEditingMember(null)}
          onSave={saveMemberEdit}
          notify={notify}
        />
      )}

      {deletingMember && (
        <ConfirmDialog
          title="Üyeyi Sil"
          message={`${deletingMember.full_name} silinsin mi? Bu işlem geri alınamaz.`}
          onConfirm={confirmDeleteMember}
          onCancel={() => setDeletingMember(null)}
        />
      )}
    </>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-line bg-white/60 p-5 text-center shadow-sm">
      <span className="font-serif-display block text-3xl italic text-clay">{value}</span>
      <span className="mt-1 block text-xs uppercase tracking-wide text-ink-soft">{label}</span>
    </div>
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
