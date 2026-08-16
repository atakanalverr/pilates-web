"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import PackagesSection from "./PackagesSection";
import MembersSection from "./MembersSection";
import Toast from "./Toast";

const TRAINERS = ["Güray", "Nuray"];

export default function AdminPanel() {
  const [packages, setPackages] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);

  const notify = useCallback((message, type) => {
    setToast({ message, type, key: Date.now() });
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setToast(null), 3000);
  }, []);

  const reloadPackages = useCallback(async () => {
    setPackages(await api.packages.list());
  }, []);

  const reloadMembers = useCallback(async () => {
    setMembers(await api.members.list());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([reloadPackages(), reloadMembers()]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadPackages, reloadMembers]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-col items-center gap-10 text-center">
        <span className="font-serif-display px-6 py-4 text-3xl italic text-ink">
          Güray <span className="text-clay">Fit Center</span>
        </span>

        <div className="flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-ink-soft">
            Antrenör Seçimi
          </span>
          <div className="flex gap-2">
            {TRAINERS.map((trainer) => (
              <button
                key={trainer}
                type="button"
                onClick={() =>
                  setSelectedTrainer((current) => (current === trainer ? null : trainer))
                }
                className={
                  selectedTrainer === trainer
                    ? "rounded-full bg-clay px-5 py-2 text-sm font-medium text-white transition"
                    : "rounded-full border border-line px-5 py-2 text-sm font-medium text-ink transition hover:border-clay hover:text-clay"
                }
              >
                {trainer}
              </button>
            ))}
          </div>
        </div>
      </header>

      {loading && <p className="text-center text-ink-soft">Yükleniyor…</p>}
      {error && <p className="text-center text-late">Bir hata oluştu: {error}</p>}

      {!loading && !error && (
        <div className="flex flex-col gap-8">
          <MembersSection
            members={members}
            packages={packages}
            onReload={reloadMembers}
            notify={notify}
            selectedTrainer={selectedTrainer}
          />
          <PackagesSection packages={packages} onReload={reloadPackages} notify={notify} />
        </div>
      )}

      <footer className="mt-16 text-center text-xs text-ink-soft">
        &copy; {new Date().getFullYear()} Pilates Studio.
      </footer>

      <Toast toast={toast} />
    </main>
  );
}
