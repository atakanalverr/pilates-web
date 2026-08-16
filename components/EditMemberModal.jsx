"use client";

import { useState } from "react";

export default function EditMemberModal({ member, packages, onClose, onSave, notify }) {
  const [form, setForm] = useState({
    full_name: member.full_name,
    phone: member.phone || "",
    package_name: member.package_name,
    sessions_remaining: member.sessions_remaining,
    start_date: member.start_date,
    trainer: member.trainer || "Güray",
    payment_status: member.payment_status,
    paid_amount: member.paid_amount || "",
    notes: member.notes || "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const fullName = form.full_name.trim();
    if (!fullName) return;

    setSubmitting(true);
    try {
      await onSave(member.id, {
        ...form,
        full_name: fullName,
        phone: form.phone.trim(),
        sessions_remaining: Number(form.sessions_remaining) || 0,
        paid_amount: form.payment_status === "Bir Kısmı Ödendi" ? form.paid_amount.trim() : "",
        notes: form.notes.trim(),
      });
    } catch (err) {
      notify("Değişiklikler kaydedilirken bir sorun yaşandı, lütfen tekrar deneyiniz.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-cream p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-serif-display text-xl italic text-ink">Üye Bilgilerini Düzenle</h3>
          <button
            aria-label="Kapat"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xl leading-none text-ink-soft hover:text-ink"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              className="input"
              value={form.package_name}
              onChange={(e) => setForm({ ...form, package_name: e.target.value })}
            >
              {packages.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kalan Ders">
            <input
              type="number"
              min="0"
              className="input"
              value={form.sessions_remaining}
              onChange={(e) => setForm({ ...form, sessions_remaining: e.target.value })}
            />
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
          <div className="sm:col-span-2">
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
          <div className="sm:col-span-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              Kaydet
            </button>
          </div>
        </form>
      </div>
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
