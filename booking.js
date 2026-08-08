// "Yeni Kayıt Oluştur" formu — GurayFitCenter projesindeki iş kurallarının Supabase'e uyarlanmış hâli:
// paket başına haftalık gün sayısı, saat/kapasite çakışma kontrolü, hafta sonu ve mesai saati kısıtı.
// Gönderim hem `members` (Üyeler listesinde görünür) hem `bookings` (haftalık program/kapasite takibi) tablosuna yazar.

(function () {
  const form = document.getElementById("bookingForm");
  if (!form) return; // bu sayfada form yoksa hiçbir şey yapma

  const PACKAGE_RULES = {
    "pilates-2": { label: "Pilates (Haftada 2 Seans)", minDays: 2, maxDays: 2, sessions: 8 },
    "pilates-3": { label: "Pilates (Haftada 3 Seans)", minDays: 3, maxDays: 3, sessions: 12 },
    "power-3": { label: "Power Plate (Haftada 3 Seans)", minDays: 3, maxDays: 3, sessions: 12 },
    "mix-10": { label: "Mix 10 Seans", minDays: 2, maxDays: 3, sessions: 10 },
    "mix-12": { label: "Mix 12 Seans", minDays: 3, maxDays: 3, sessions: 12 },
  };

  const WEEK_DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma"];
  const DAY_INDEX_MAP = { Pazartesi: 0, Salı: 1, Çarşamba: 2, Perşembe: 3, Cuma: 4, Cumartesi: 5, Pazar: 6 };
  const HOURS = Array.from({ length: 13 }, (_, i) => {
    const h = 8 + i;
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(h)}:00-${pad(h + 1)}:00`;
  });

  const packageSelect = document.getElementById("bPackage");
  const coachSelect = document.getElementById("bCoach");
  const startDateInput = document.getElementById("bStartDate");
  const weeklyBlock = document.getElementById("weeklyBlock");
  const weeklyHint = document.getElementById("weeklyHint");
  const weeklyBadge = document.getElementById("weeklyBadge");
  const weeklyContainer = document.getElementById("weeklySlotsContainer");
  const addSlotBtn = document.getElementById("addWeeklySlotBtn");
  const msgEl = document.getElementById("bookingMsg");
  const submitBtn = document.getElementById("bookingSubmitBtn");

  let weeklySlots = [];

  // Türkçe, marka temasına uyumlu tarih seçici. Hafta sonları seçilemez.
  if (typeof flatpickr !== "undefined") {
    const fp = flatpickr(startDateInput, {
      locale: "tr",
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "j F Y, l",
      minDate: "today",
      disableMobile: true,
      disable: [(date) => date.getDay() === 0 || date.getDay() === 6],
    });
    if (fp.altInput) fp.altInput.placeholder = "Tarih seçiniz";
  }

  function packageMeta(key) {
    return PACKAGE_RULES[key] || null;
  }

  function rangeLabel(meta) {
    return meta.minDays === meta.maxDays ? `${meta.minDays} gün` : `${meta.minDays}-${meta.maxDays} gün`;
  }

  function updateWeeklyVisibility() {
    const meta = packageMeta(packageSelect.value);
    const coach = coachSelect.value;

    if (!meta || !coach) {
      weeklyBlock.hidden = true;
      weeklyHint.textContent = !meta
        ? ""
        : "Gün eklemeden önce lütfen antrenör seçin.";
      return;
    }

    weeklyBlock.hidden = false;
    if (weeklySlots.length === 0) {
      weeklySlots = Array.from({ length: meta.minDays }, () => ({ day: "", time: "" }));
    }
    weeklyHint.textContent = `${meta.label} için ${rangeLabel(meta)} seçmelisiniz.`;
    renderWeeklySlots();
  }

  function renderWeeklySlots() {
    const meta = packageMeta(packageSelect.value);
    if (!meta) return;

    weeklyContainer.innerHTML = weeklySlots
      .map((slot, index) => `
        <div class="weekly-slot-row">
          <select class="weekly-day-select" data-index="${index}">
            <option value="">Gün</option>
            ${WEEK_DAYS.map((d) => `<option value="${d}" ${slot.day === d ? "selected" : ""}>${d}</option>`).join("")}
          </select>
          <select class="weekly-time-select" data-index="${index}">
            <option value="">Saat</option>
            ${HOURS.map((t) => `<option value="${t}" ${slot.time === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
          ${weeklySlots.length > meta.minDays ? `<button type="button" class="icon-btn danger" data-remove-index="${index}">Kaldır</button>` : ""}
        </div>
      `)
      .join("");

    weeklyContainer.querySelectorAll(".weekly-day-select").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        weeklySlots[+e.target.dataset.index].day = e.target.value;
      });
    });
    weeklyContainer.querySelectorAll(".weekly-time-select").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        weeklySlots[+e.target.dataset.index].time = e.target.value;
      });
    });
    weeklyContainer.querySelectorAll("[data-remove-index]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        weeklySlots.splice(+e.target.dataset.removeIndex, 1);
        renderWeeklySlots();
      });
    });

    addSlotBtn.hidden = weeklySlots.length >= meta.maxDays;
    weeklyBadge.textContent = `${weeklySlots.filter((s) => s.day && s.time).length} / ${rangeLabel(meta)}`;
  }

  packageSelect.addEventListener("change", () => {
    weeklySlots = [];
    updateWeeklyVisibility();
  });

  coachSelect.addEventListener("change", updateWeeklyVisibility);

  addSlotBtn.addEventListener("click", () => {
    const meta = packageMeta(packageSelect.value);
    if (!meta || weeklySlots.length >= meta.maxDays) return;
    weeklySlots.push({ day: "", time: "" });
    renderWeeklySlots();
  });

  function isoWeekday(date) {
    const d = date.getDay();
    return d === 0 ? 6 : d - 1; // Pazartesi=0 ... Pazar=6
  }

  function nextDateForDay(baseIso, dayLabel) {
    const target = DAY_INDEX_MAP[dayLabel];
    if (target === undefined) return baseIso;
    const base = new Date(baseIso + "T00:00:00");
    const diff = (target - isoWeekday(base) + 7) % 7;
    base.setDate(base.getDate() + diff);
    return base.toISOString().slice(0, 10);
  }

  function showMsg(text, type) {
    msgEl.textContent = text;
    msgEl.className = "form-msg" + (type ? ` form-msg-${type}` : "");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showMsg("", "");

    const name = document.getElementById("bName").value.trim();
    const phone = document.getElementById("bPhone").value.trim();
    const coach = coachSelect.value;
    const packageKey = packageSelect.value;
    const startDate = startDateInput.value;
    const meta = packageMeta(packageKey);

    if (!name || !phone || !coach || !packageKey || !startDate) {
      showMsg("Lütfen zorunlu alanları doldurun.", "error");
      return;
    }

    const cleaned = weeklySlots.filter((s) => s.day && s.time);
    if (cleaned.length < meta.minDays || cleaned.length > meta.maxDays) {
      showMsg(`${meta.label} için ${rangeLabel(meta)} seçmelisiniz.`, "error");
      return;
    }
    const seen = new Set();
    for (const slot of cleaned) {
      const key = `${slot.day}|${slot.time}`;
      if (seen.has(key)) {
        showMsg("Aynı gün ve saati birden fazla kez seçemezsiniz.", "error");
        return;
      }
      seen.add(key);
    }

    submitBtn.disabled = true;
    showMsg("Kontrol ediliyor…", "");

    try {
      const slotRows = await db.slots.list(coach);
      const capacityFor = (time) => slotRows.find((s) => s.time === time)?.capacity ?? 1;

      const existing = await db.bookings.list(coach);

      const occurrences = cleaned.map((slot) => ({
        ...slot,
        date: nextDateForDay(startDate, slot.day),
      }));

      for (const occ of occurrences) {
        const count = existing.filter((b) => b.date === occ.date && b.time === occ.time).length;
        if (count >= capacityFor(occ.time)) {
          showMsg(`${occ.day} ${occ.time} saatinde müsaitlik bulunmuyor. Lütfen başka bir gün/saat seçin.`, "error");
          submitBtn.disabled = false;
          return;
        }
      }

      // Üye kaydı oluştur (Üyeler listesinde görünecek)
      await db.members.create({
        full_name: name,
        phone,
        package_type: meta.label,
        sessions_total: meta.sessions,
        sessions_remaining: meta.sessions,
        start_date: startDate,
        trainer: coach,
        payment_status: "Bekliyor",
      });

      // Haftalık programı rezervasyon olarak kaydet (kapasite/çakışma takibi için)
      const first = occurrences[0];
      await db.bookings.create({
        date: first.date,
        time: first.time,
        coach,
        name,
        phone,
        package: packageKey,
        weekly_slots: cleaned,
      });

      showMsg("Kayıt oluşturuldu! Ekibimiz en kısa sürede sizinle iletişime geçecek.", "success");
      form.reset();
      weeklyBlock.hidden = true;
      weeklySlots = [];
    } catch (err) {
      console.error(err);
      showMsg("Bir hata oluştu, lütfen tekrar deneyin: " + (err.message || ""), "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
