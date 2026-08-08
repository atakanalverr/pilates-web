document.getElementById("year").textContent = new Date().getFullYear();

const form = document.getElementById("memberForm");
const submitBtn = document.getElementById("submitBtn");
const tableBody = document.getElementById("membersTableBody");
const searchInput = document.getElementById("searchInput");
const activeTrainerSelect = document.getElementById("activeTrainer");
const membersTitle = document.getElementById("membersTitle");
const clearTrainerFilter = document.getElementById("clearTrainerFilter");

const trainerFilter = new URLSearchParams(window.location.search).get("trainer");
if (trainerFilter) {
  membersTitle.textContent = `${trainerFilter}'ın Üyeleri`;
  clearTrainerFilter.hidden = false;
  if ([...activeTrainerSelect.options].some(o => o.value === trainerFilter)) {
    activeTrainerSelect.value = trainerFilter;
  }
}

let allMembers = [];

// ---- Yardımcılar ----
function paymentBadge(status) {
  const map = {
    "Ödendi": "badge-ok",
    "Bekliyor": "badge-pending",
    "Gecikti": "badge-late",
  };
  return `<span class="badge ${map[status] || "badge-pending"}">${status}</span>`;
}

function formatPhone(phone) {
  return phone || "—";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Üst bildirim (toast) ----
const toastEl = document.getElementById("toast");
let toastTimer;

function showToast(message, type) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.className = "toast is-visible" + (type ? ` toast-${type}` : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("is-visible");
  }, 3000);
}

// ---- Ders bilgisi modalı ----
const sessionInfoModal = document.getElementById("sessionInfoModal");
const sessionInfoText = document.getElementById("sessionInfoText");

function showSessionInfo(html) {
  if (!sessionInfoModal) return;
  sessionInfoText.innerHTML = html;
  sessionInfoModal.hidden = false;
}

document.getElementById("sessionInfoClose").addEventListener("click", () => {
  sessionInfoModal.hidden = true;
});
sessionInfoModal.addEventListener("click", (e) => {
  if (e.target === sessionInfoModal) sessionInfoModal.hidden = true;
});

// ---- Üyeleri yükle ----
async function loadMembers() {
  tableBody.innerHTML = `<tr><td colspan="7" class="loading-row">Yükleniyor…</td></tr>`;

  try {
    allMembers = await db.members.list();
    renderTable();
    renderStats();
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="7" class="empty-row">Bir hata oluştu: ${escapeHtml(err.message)}</td></tr>`;
    console.error(err);
  }
}

function renderStats() {
  const scoped = trainerFilter ? allMembers.filter(m => m.trainer === trainerFilter) : allMembers;
  document.getElementById("statTotal").textContent = scoped.length;
  document.getElementById("statActive").textContent = scoped.filter(m => m.sessions_remaining > 0).length;
  document.getElementById("statPending").textContent = scoped.filter(m => m.payment_status === "Bekliyor").length;
  document.getElementById("statLate").textContent = scoped.filter(m => m.payment_status === "Gecikti").length;
}

function renderTable() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = allMembers.filter(m =>
    (!trainerFilter || m.trainer === trainerFilter) &&
    (m.full_name.toLowerCase().includes(query) ||
    (m.phone || "").toLowerCase().includes(query))
  );

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="empty-row">Üye bulunamadı.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(m => `
    <tr data-id="${m.id}">
      <td><strong>${escapeHtml(m.full_name)}</strong></td>
      <td>${escapeHtml(formatPhone(m.phone))}</td>
      <td>${escapeHtml(m.package_type)}</td>
      <td>
        <div class="sessions-cell">
          <span class="sessions-num">${m.sessions_remaining}</span>
          <span class="sessions-num sessions-num-total">/ ${m.sessions_total}</span>
        </div>
      </td>
      <td>${escapeHtml(m.trainer || "—")}</td>
      <td>${paymentBadge(m.payment_status)}</td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" data-action="attend" ${m.sessions_remaining <= 0 ? "disabled" : ""}>1 Ders Yapıldı</button>
          <button class="icon-btn" data-action="history">Geçmiş</button>
          <button class="icon-btn" data-action="edit">Düzenle</button>
          <button class="icon-btn danger" data-action="delete">Sil</button>
        </div>
      </td>
    </tr>
  `).join("");
}

// ---- Yeni üye ekleme formu ----
// Haftalık paketler ayda 4 haftaya göre toplam ders sayısına çevrilir
// (Haftada 2 Seans -> ayda 8, Haftada 3 Seans -> ayda 12). Mix paketleri zaten toplam sayı.
const PACKAGE_SESSIONS = {
  "Pilates (Haftada 2 Seans)": 8,
  "Pilates (Haftada 3 Seans)": 12,
  "Power Plate (Haftada 3 Seans)": 12,
  "Mix 10 Seans": 10,
  "Mix 12 Seans": 12,
};

function readForm() {
  return {
    full_name: document.getElementById("fullName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    package_type: document.getElementById("packageType").value,
    start_date: document.getElementById("startDate").value || new Date().toISOString().slice(0, 10),
    trainer: document.getElementById("trainer").value,
    payment_status: document.getElementById("paymentStatus").value,
    notes: document.getElementById("notes").value.trim(),
  };
}

function resetForm() {
  form.reset();
  document.getElementById("packageType").value = "Pilates (Haftada 3 Seans)";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = readForm();
  if (!payload.full_name) return;

  submitBtn.disabled = true;

  try {
    // Yeni üyede kalan/toplam ders, seçilen pakete göre otomatik belirlenir
    const sessions = PACKAGE_SESSIONS[payload.package_type] ?? 1;
    await db.members.create({ ...payload, sessions_total: sessions, sessions_remaining: sessions });
    resetForm();
    loadMembers();
  } catch (err) {
    alert("Kaydedilemedi: " + err.message);
    console.error(err);
  } finally {
    submitBtn.disabled = false;
  }
});

// ---- Tablo aksiyonları ----
tableBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const row = btn.closest("tr");
  const id = row.dataset.id;
  const member = allMembers.find(m => m.id === id);
  if (!member) return;

  const action = btn.dataset.action;

  if (action === "edit") {
    startEdit(member);
  } else if (action === "delete") {
    if (!confirm(`${member.full_name} silinsin mi? Bu işlem geri alınamaz.`)) return;
    try {
      await db.members.remove(id);
      loadMembers();
    } catch (err) {
      alert("Silinemedi: " + err.message);
    }
  } else if (action === "attend") {
    await recordAttendance(member, btn);
  } else if (action === "history") {
    await showHistory(member);
  }
});

// ---- Üye Bilgilerini Düzenle modalı ----
const editMemberModal = document.getElementById("editMemberModal");
const editMemberForm = document.getElementById("editMemberForm");
const editMemberIdField = document.getElementById("editMemberId");
const editSubmitBtn = document.getElementById("editSubmitBtn");

function startEdit(member) {
  editMemberIdField.value = member.id;
  document.getElementById("editFullName").value = member.full_name;
  document.getElementById("editPhone").value = member.phone || "";
  document.getElementById("editPackageType").value = member.package_type;
  document.getElementById("editStartDate").value = member.start_date;
  document.getElementById("editTrainer").value = member.trainer || "Güray";
  document.getElementById("editPaymentStatus").value = member.payment_status;
  document.getElementById("editNotes").value = member.notes || "";

  editMemberModal.hidden = false;
}

function closeEditModal() {
  editMemberModal.hidden = true;
}

document.getElementById("editMemberClose").addEventListener("click", closeEditModal);
editMemberModal.addEventListener("click", (e) => {
  if (e.target === editMemberModal) closeEditModal();
});

editMemberForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = editMemberIdField.value;
  const payload = {
    full_name: document.getElementById("editFullName").value.trim(),
    phone: document.getElementById("editPhone").value.trim(),
    package_type: document.getElementById("editPackageType").value,
    start_date: document.getElementById("editStartDate").value,
    trainer: document.getElementById("editTrainer").value,
    payment_status: document.getElementById("editPaymentStatus").value,
    notes: document.getElementById("editNotes").value.trim(),
  };
  if (!payload.full_name) return;

  editSubmitBtn.disabled = true;
  try {
    await db.members.update(id, payload);
    closeEditModal();
    showToast("Değişiklikler başarıyla kaydedildi.", "success");
    loadMembers();
  } catch (err) {
    console.error(err);
    showToast("Değişiklikler kaydedilirken bir sorun yaşandı, lütfen tekrar deneyiniz.", "error");
  } finally {
    editSubmitBtn.disabled = false;
  }
});

// ---- Ders işleme ----
async function recordAttendance(member, btn) {
  if (member.sessions_remaining <= 0) return;
  const trainer = activeTrainerSelect.value;
  const newRemaining = member.sessions_remaining - 1;

  if (btn) {
    btn.classList.add("is-loading");
    btn.disabled = true;
  }

  try {
    await Promise.all([
      (async () => {
        await db.attendance.create({
          member_id: member.id,
          session_date: new Date().toISOString().slice(0, 10),
          trainer,
        });
        await db.members.update(member.id, { sessions_remaining: newRemaining });
      })(),
      sleep(1000),
    ]);
    showSessionInfo(
      `${escapeHtml(member.full_name)}'in ${member.sessions_total} derslik paketi üzerinden kalan ders sayısı: <strong>${newRemaining}</strong>.`
    );
    loadMembers();
  } catch (err) {
    alert("Ders işlenemedi: " + err.message);
  } finally {
    if (btn) {
      btn.classList.remove("is-loading");
      btn.disabled = false;
    }
  }
}

// ---- Geçmiş modalı ----
const historyModal = document.getElementById("historyModal");
const historyList = document.getElementById("historyList");
const historyModalTitle = document.getElementById("historyModalTitle");

async function showHistory(member) {
  historyModalTitle.textContent = `${member.full_name} — Katılım Geçmişi`;
  historyList.innerHTML = `<li>Yükleniyor…</li>`;
  historyModal.hidden = false;

  try {
    const data = await db.members.attendance(member.id);
    if (data.length === 0) {
      historyList.innerHTML = `<li>Henüz kayıtlı ders yok.</li>`;
      return;
    }
    historyList.innerHTML = data.map(a => `
      <li><span>${new Date(a.session_date).toLocaleDateString("tr-TR")}</span><span>${escapeHtml(a.trainer || "—")}</span></li>
    `).join("");
  } catch (err) {
    historyList.innerHTML = `<li>Bir hata oluştu.</li>`;
  }
}

document.getElementById("historyModalClose").addEventListener("click", () => {
  historyModal.hidden = true;
});
historyModal.addEventListener("click", (e) => {
  if (e.target === historyModal) historyModal.hidden = true;
});

// ---- Arama ----
searchInput.addEventListener("input", renderTable);

// ---- Başlat ----
document.getElementById("startDate").value = new Date().toISOString().slice(0, 10);
loadMembers();
