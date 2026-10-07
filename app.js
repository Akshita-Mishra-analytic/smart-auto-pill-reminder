/* =========================================================
   SMART AUTO PILL REMINDER SYSTEM
   Main Application Logic
========================================================= */

const STORAGE_KEY = "smartPillMedicines";
const HISTORY_KEY = "smartPillHistory";
const SETTINGS_KEY = "smartPillSettings";

let medicines = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];

let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
  notifications: true,
  sound: true,
  emergencyName: "",
  emergencyPhone: ""
};

let selectedTimes = [];


// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

  setCurrentDate();

  setupNavigation();
  setupButtons();
  setupMedicineForm();
  setupSettings();

  loadSettings();
  renderAll();

  setInterval(checkReminders, 30000);

});


// =========================================================
// DATE / TIME
// =========================================================

function getToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function setCurrentDate() {

  const date = new Date();

  document.getElementById("currentDate").textContent =
    date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

  const hour = date.getHours();

  let greeting = "Good Morning 👋";

  if (hour >= 12 && hour < 17)
    greeting = "Good Afternoon 👋";

  if (hour >= 17)
    greeting = "Good Evening 👋";

  document.getElementById("pageHeading").textContent = greeting;
}


// =========================================================
// NAVIGATION
// =========================================================

function setupNavigation() {

  document.querySelectorAll(".nav-item").forEach(button => {

    button.addEventListener("click", () => {

      const section = button.dataset.section;

      showSection(section);

      document.querySelectorAll(".nav-item")
        .forEach(item => item.classList.remove("active"));

      button.classList.add("active");

      document.getElementById("sidebar").classList.remove("open");

    });

  });


  document.querySelectorAll("[data-section-link]").forEach(button => {

    button.addEventListener("click", () => {

      const section = button.dataset.sectionLink;

      showSection(section);

      document.querySelectorAll(".nav-item")
        .forEach(item => {

          item.classList.toggle(
            "active",
            item.dataset.section === section
          );

        });

    });

  });

}


function showSection(sectionId) {

  document.querySelectorAll(".section")
    .forEach(section => section.classList.remove("active"));

  const target = document.getElementById(sectionId);

  if (target)
    target.classList.add("active");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


// =========================================================
// BUTTONS
// =========================================================

function setupButtons() {

  document.getElementById("menuBtn")
    .addEventListener("click", () => {

      document.getElementById("sidebar")
        .classList.toggle("open");

    });


  document.getElementById("notificationBtn")
    .addEventListener("click", requestNotifications);


  document.getElementById("dashboardAddBtn")
    .addEventListener("click", openMedicineModal);


  document.getElementById("clearHistory")
    .addEventListener("click", () => {

      if (!history.length) {
        showToast("History is already empty", "ℹ");
        return;
      }

      if (confirm("Are you sure you want to clear medication history?")) {

        history = [];

        saveHistory();
        renderHistory();
        renderProgress();

        showToast("History cleared");

      }

    });

}


// =========================================================
// MEDICINE MODAL
// =========================================================

function openMedicineModal() {

  selectedTimes = [];

  document.getElementById("medicineForm").reset();

  document.getElementById("startDate").value = getToday();

  renderSelectedTimes();

  document.getElementById("medicineModal")
    .classList.add("show");

}


function closeMedicineModal() {

  document.getElementById("medicineModal")
    .classList.remove("show");

}


window.openMedicineModal = openMedicineModal;
window.closeMedicineModal = closeMedicineModal;


// =========================================================
// MEDICINE FORM
// =========================================================

function setupMedicineForm() {

  document.getElementById("addTimeBtn")
    .addEventListener("click", addMedicineTime);


  document.getElementById("medicineForm")
    .addEventListener("submit", event => {

      event.preventDefault();

      saveMedicine();

    });

}


function addMedicineTime() {

  const input = document.getElementById("medicineTime");

  if (!input.value) {

    showToast("Please select a time", "!");

    return;

  }

  if (selectedTimes.includes(input.value)) {

    showToast("This time is already added", "!");

    return;

  }

  selectedTimes.push(input.value);

  selectedTimes.sort();

  input.value = "";

  renderSelectedTimes();

}


function removeTime(time) {

  selectedTimes =
    selectedTimes.filter(item => item !== time);

  renderSelectedTimes();

}


function renderSelectedTimes() {

  const container =
    document.getElementById("selectedTimes");

  container.innerHTML = "";

  selectedTimes.forEach(time => {

    const div = document.createElement("div");

    div.className = "selected-time";

    div.innerHTML = `
      ${formatTime(time)}
      <button type="button" onclick="removeTime('${time}')">×</button>
    `;

    container.appendChild(div);

  });

}


window.removeTime = removeTime;


function saveMedicine() {

  const name =
    document.getElementById("medicineName").value.trim();

  const dosage =
    document.getElementById("dosage").value.trim();

  const type =
    document.getElementById("medicineType").value;

  const instructions =
    document.getElementById("instructions").value.trim();

  const startDate =
    document.getElementById("startDate").value;

  const endDate =
    document.getElementById("endDate").value;

  const color =
    document.querySelector(
      'input[name="color"]:checked'
    ).value;


  if (!name || !startDate) {

    showToast("Please fill required fields", "!");

    return;

  }


  if (!selectedTimes.length) {

    showToast("Please add at least one reminder time", "!");

    return;

  }


  const medicine = {

    id: Date.now(),

    name,
    dosage,
    type,
    instructions,
    startDate,
    endDate,
    times: [...selectedTimes],
    color,

    createdAt: new Date().toISOString()

  };


  medicines.push(medicine);

  saveMedicines();

  closeMedicineModal();

  renderAll();

  showToast(`${name} added successfully`);

}


// =========================================================
// MEDICINE DELETE
// =========================================================

function deleteMedicine(id) {

  const medicine =
    medicines.find(item => item.id === id);

  if (!medicine)
    return;


  if (
    !confirm(
      `Delete ${medicine.name} from your medicines?`
    )
  )
    return;


  medicines =
    medicines.filter(item => item.id !== id);

  saveMedicines();

  renderAll();

  showToast("Medicine deleted");

}


window.deleteMedicine = deleteMedicine;


// =========================================================
// RENDER MEDICINES
// =========================================================

function renderMedicines() {

  const grid =
    document.getElementById("medicineGrid");

  if (!medicines.length) {

    grid.innerHTML = `
      <div class="panel" style="grid-column:1/-1;text-align:center;padding:50px;">
        <div style="font-size:45px;">💊</div>
        <h3 style="margin:12px 0;">No medicines added</h3>
        <p style="font-size:12px;color:#7c8298;margin-bottom:15px;">
          Start by adding your first medicine reminder.
        </p>
        <button class="primary-btn" onclick="openMedicineModal()">
          + Add Medicine
        </button>
      </div>
    `;

    return;

  }


  grid.innerHTML = medicines.map(medicine => {

    return `

      <div class="medicine-card"
           style="--medicine-color:${medicine.color}">

        <div class="med-header">

          <div class="med-icon">
            💊
          </div>

          <div class="med-actions">

            <button
              onclick="deleteMedicine(${medicine.id})"
              title="Delete">
              🗑
            </button>

          </div>

        </div>

        <h3>${escapeHTML(medicine.name)}</h3>

        <div class="dose">
          ${escapeHTML(medicine.dosage || "Dosage not specified")}
        </div>

        <div class="med-meta">

          <span class="meta-pill">
            ${escapeHTML(medicine.type)}
          </span>

          ${
            medicine.instructions
            ? `<span class="meta-pill">
                ${escapeHTML(medicine.instructions)}
              </span>`
            : ""
          }

        </div>

        <div class="med-times">

          ${
            medicine.times.map(time => `
              <span class="time-chip">
                ⏰ ${formatTime(time)}
              </span>
            `).join("")
          }

        </div>

      </div>

    `;

  }).join("");

}


// =========================================================
// TODAY'S SCHEDULE
// =========================================================

function getTodayDoses() {

  const today = getToday();

  const doses = [];


  medicines.forEach(medicine => {

    if (medicine.startDate > today)
      return;

    if (medicine.endDate && medicine.endDate < today)
      return;


    medicine.times.forEach(time => {

      const doseId =
        createDoseId(medicine.id, today, time);

      const record =
        history.find(item => item.doseId === doseId);


      doses.push({

        doseId,

        medicineId: medicine.id,

        medicineName: medicine.name,

        dosage: medicine.dosage,

        time,

        color: medicine.color,

        status: record ? record.status : getDoseStatus(time)

      });

    });

  });


  doses.sort((a, b) =>
    a.time.localeCompare(b.time)
  );


  return doses;

}


function createDoseId(medicineId, date, time) {

  return `${medicineId}_${date}_${time}`;

}


function getDoseStatus(time) {

  const now = new Date();

  const [hour, minute] =
    time.split(":").map(Number);

  const doseTime =
    new Date();

  doseTime.setHours(hour, minute, 0, 0);


  if (now < doseTime)
    return "upcoming";

  if (
    now.getTime() - doseTime.getTime()
    <= 60 * 60 * 1000
  )
    return "due";

  return "missed";

}


// =========================================================
// DASHBOARD
// =========================================================

function renderDashboard() {

  const doses = getTodayDoses();

  const taken =
    doses.filter(d => d.status === "taken").length;

  const missed =
    doses.filter(d => d.status === "missed").length;

  const upcoming =
    doses.filter(
      d =>
        d.status === "upcoming" ||
        d.status === "due"
    ).length;


  document.getElementById("todayTotal")
    .textContent = doses.length;

  document.getElementById("todayTaken")
    .textContent = taken;

  document.getElementById("todayMissed")
    .textContent = missed;

  document.getElementById("todayUpcoming")
    .textContent = upcoming;


  renderNextMedicine(doses);
  renderTodaySchedule(doses);

}


function renderNextMedicine(doses) {

  const container =
    document.getElementById("nextMedicine");


  const next =
    doses.find(
      dose =>
        dose.status === "due" ||
        dose.status === "upcoming"
    );


  if (!next) {

    container.innerHTML = `
      <div class="empty-state">
        <div>🎉</div>
        <p>No upcoming medicines for today.</p>
      </div>
    `;

    return;

  }


  container.innerHTML = `

    <div style="
      background:#fafbfe;
      border-radius:14px;
      padding:18px;
      border-left:5px solid ${next.color};
    ">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">

        <div>

          <span class="panel-label">NEXT DOSE</span>

          <h2 style="
            font-size:20px;
            margin-top:6px;
          ">
            ${escapeHTML(next.medicineName)}
          </h2>

          <p style="
            color:#7c8298;
            font-size:11px;
            margin-top:3px;
          ">
            ${escapeHTML(next.dosage || "Dosage not specified")}
          </p>

        </div>

        <div style="
          font-size:25px;
        ">
          💊
        </div>

      </div>

      <div style="
        margin-top:16px;
        display:flex;
        align-items:center;
        justify-content:space-between;
      ">

        <strong style="font-size:18px;">
          ${formatTime(next.time)}
        </strong>

        <div style="display:flex;gap:6px;">

          <button
            class="small-btn take-btn"
            onclick="markDose('${next.doseId}','taken')">
            ✓ Take
          </button>

          <button
            class="small-btn snooze-btn"
            onclick="snoozeDose('${next.doseId}')">
            Snooze
          </button>

        </div>

      </div>

    </div>

  `;

}


function renderTodaySchedule(doses) {

  const container =
    document.getElementById("todaySchedule");


  if (!doses.length) {

    container.innerHTML = `
      <div class="empty-state">
        <div>💊</div>
        <p>No medicines scheduled today.</p>
      </div>
    `;

    return;

  }


  container.innerHTML =
    doses.slice(0, 5).map(dose => `

      <div class="schedule-item">

        <div
          class="medicine-dot"
          style="background:${dose.color}">
        </div>

        <div class="schedule-info">

          <strong>
            ${escapeHTML(dose.medicineName)}
          </strong>

          <span>
            ${escapeHTML(dose.dosage || "Dose")}
          </span>

        </div>

        <div class="schedule-time">
          ${formatTime(dose.time)}
        </div>

        ${
          dose.status === "taken"
          ? `<span style="color:#00b894;font-size:10px;font-weight:700;">✓ Taken</span>`
          : ""
        }

      </div>

    `).join("");

}


// =========================================================
// REMINDERS
// =========================================================

function renderReminders() {

  const container =
    document.getElementById("reminderList");

  const doses = getTodayDoses();


  if (!doses.length) {

    container.innerHTML = `
      <div class="empty-state">
        <div>⏰</div>
        <p>No reminders scheduled for today.</p>
      </div>
    `;

    return;

  }


  container.innerHTML =
    doses.map(dose => `

      <div class="reminder-item">

        <div
          class="reminder-icon"
          style="
            background:${hexToRGBA(dose.color,.1)}
          ">
          💊
        </div>

        <div class="reminder-main">

          <strong>
            ${escapeHTML(dose.medicineName)}
          </strong>

          <span>
            ${escapeHTML(dose.dosage || "Dosage not specified")}
          </span>

        </div>

        <div class="reminder-time">
          ${formatTime(dose.time)}
        </div>

        ${
          dose.status === "taken"
          ? `
            <span style="
              color:#00b894;
              font-size:10px;
              font-weight:800;
            ">
              ✓ TAKEN
            </span>
          `
          :
          dose.status === "missed"
          ?
          `
            <span style="
              color:#ff5b6e;
              font-size:10px;
              font-weight:800;
            ">
              MISSED
            </span>
          `
          :
          `
            <div class="reminder-buttons">

              <button
                class="small-btn take-btn"
                onclick="markDose('${dose.doseId}','taken')">
                ✓ Take
              </button>

              <button
                class="small-btn snooze-btn"
                onclick="snoozeDose('${dose.doseId}')">
                Snooze
              </button>

              <button
                class="small-btn skip-btn"
                onclick="markDose('${dose.doseId}','missed')">
                Skip
              </button>

            </div>
          `
        }

      </div>

    `).join("");

}


// =========================================================
// TAKE / SKIP
// =========================================================

function markDose(doseId, status) {

  const existingIndex =
    history.findIndex(
      item => item.doseId === doseId
    );


  const dose =
    getTodayDoses().find(
      item => item.doseId === doseId
    );


  if (!dose)
    return;


  const record = {

    doseId,

    medicineName: dose.medicineName,

    dosage: dose.dosage,

    time: dose.time,

    date: getToday(),

    status,

    timestamp: new Date().toISOString()

  };


  if (existingIndex >= 0) {

    history[existingIndex] = record;

  } else {

    history.unshift(record);

  }


  saveHistory();

  renderAll();


  if (status === "taken") {

    showToast(`${dose.medicineName} marked as taken`);

  } else {

    showToast(`${dose.medicineName} marked as missed`, "!");

  }

}


window.markDose = markDose;


// =========================================================
// SNOOZE
// =========================================================

function snoozeDose(doseId) {

  const dose =
    getTodayDoses().find(
      item => item.doseId === doseId
    );

  if (!dose)
    return;


  showToast(
    `${dose.medicineName} reminder snoozed for 10 minutes`,
    "⏰"
  );


  setTimeout(() => {

    showToast(
      `Reminder: ${dose.medicineName} is due now`,
      "💊"
    );

    notifyUser(
      `Medicine Reminder`,
      `${dose.medicineName} is due now.`
    );

  }, 10 * 60 * 1000);

}


// =========================================================
// HISTORY
// =========================================================

function renderHistory() {

  const container =
    document.getElementById("historyList");


  if (!history.length) {

    container.innerHTML = `
      <div class="empty-state">
        <div>📋</div>
        <p>No medication history yet.</p>
      </div>
    `;

    return;

  }


  const sorted =
    [...history].sort(
      (a,b) =>
        new Date(b.timestamp) -
        new Date(a.timestamp)
    );


  container.innerHTML =
    sorted.slice(0, 50).map(item => {

      const taken =
        item.status === "taken";


      return `

        <div class="history-item">

          <div class="
            history-status
            ${taken ? "status-taken" : "status-missed"}
          ">
            ${taken ? "✓" : "!"}
          </div>

          <div class="history-main">

            <strong>
              ${escapeHTML(item.medicineName)}
            </strong>

            <span>
              ${escapeHTML(item.dosage || "Dose")}
            </span>

          </div>

          <div class="history-right">

            <strong>
              ${taken ? "Taken" : "Missed"}
            </strong>

            <span>
              ${formatDate(item.date)} · ${formatTime(item.time)}
            </span>

          </div>

        </div>

      `;

    }).join("");

}


// =========================================================
// PROGRESS
// =========================================================

function renderProgress() {

  const total =
    history.length;

  const taken =
    history.filter(
      item => item.status === "taken"
    ).length;

  const missed =
    history.filter(
      item => item.status === "missed"
    ).length;


  const percent =
    total === 0
      ? 0
      : Math.round(
          (taken / total) * 100
        );


  document.getElementById("adherencePercent")
    .textContent = `${percent}%`;

  document.getElementById("progressTotal")
    .textContent = total;

  document.getElementById("progressTaken")
    .textContent = taken;

  document.getElementById("progressMissed")
    .textContent = missed;


  document.querySelector(".circle-progress")
    .style.background =
      `conic-gradient(
        var(--primary) ${percent * 3.6}deg,
        #eee ${percent * 3.6}deg
      )`;


  const text =
    document.getElementById("adherenceText");


  if (percent >= 90) {

    text.textContent =
      "Excellent! You are following your medication schedule very consistently.";

  } else if (percent >= 70) {

    text.textContent =
      "Good progress! Try to take every scheduled dose on time.";

  } else if (total > 0) {

    text.textContent =
      "Keep going. Consistency is important for maintaining your medication routine.";

  } else {

    text.textContent =
      "Start taking your medicines on time to build your adherence record.";

  }

}


// =========================================================
// SETTINGS
// =========================================================

function setupSettings() {

  document.getElementById("saveSettings")
    .addEventListener("click", () => {

      settings.notifications =
        document.getElementById(
          "notificationSetting"
        ).checked;

      settings.sound =
        document.getElementById(
          "soundSetting"
        ).checked;

      settings.emergencyName =
        document.getElementById(
          "emergencyName"
        ).value;

      settings.emergencyPhone =
        document.getElementById(
          "emergencyPhone"
        ).value;


      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
      );


      showToast("Settings saved successfully");

    });

}


function loadSettings() {

  document.getElementById(
    "notificationSetting"
  ).checked = settings.notifications;

  document.getElementById(
    "soundSetting"
  ).checked = settings.sound;

  document.getElementById(
    "emergencyName"
  ).value = settings.emergencyName;

  document.getElementById(
    "emergencyPhone"
  ).value = settings.emergencyPhone;

}


// =========================================================
// NOTIFICATIONS
// =========================================================

async function requestNotifications() {

  if (!("Notification" in window)) {

    showToast(
      "Browser notifications are not supported",
      "!"
    );

    return;

  }


  const permission =
    await Notification.requestPermission();


  if (permission === "granted") {

    showToast("Notifications enabled");

    notifyUser(
      "Smart Auto Pill Reminder System",
      "Notifications are now enabled."
    );

  } else {

    showToast(
      "Notification permission was not granted",
      "!"
    );

  }

}


function notifyUser(title, body) {

  if (
    settings.notifications &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {

    new Notification(title, {
      body,
      icon: "💊"
    });

  }

}


// =========================================================
// AUTOMATIC REMINDER CHECK
// =========================================================

let lastNotificationKey = "";


function checkReminders() {

  const now = new Date();

  const currentTime =
    `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  const doses =
    getTodayDoses();


  doses.forEach(dose => {

    if (
      dose.time === currentTime &&
      dose.status !== "taken"
    ) {

      const key =
        `${getToday()}_${dose.doseId}`;

      if (lastNotificationKey === key)
        return;

      lastNotificationKey = key;


      notifyUser(
        "💊 Medicine Reminder",
        `${dose.medicineName} is due now.`
      );


      showToast(
        `Reminder: ${dose.medicineName} is due now`,
        "💊"
      );


      if (settings.sound)
        playReminderSound();

    }

  });

}


function playReminderSound() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;

    const ctx =
      new AudioContext();

    const oscillator =
      ctx.createOscillator();

    const gain =
      ctx.createGain();


    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.frequency.value = 800;

    gain.gain.setValueAtTime(
      .15,
      ctx.currentTime
    );

    oscillator.start();

    oscillator.stop(
      ctx.currentTime + .25
    );

  } catch (error) {

    console.log("Sound unavailable");

  }

}


// =========================================================
// UTILITY
// =========================================================

function formatTime(time) {

  if (!time)
    return "--:--";


  const [hours, minutes] =
    time.split(":").map(Number);

  const suffix =
    hours >= 12 ? "PM" : "AM";

  const hour =
    hours % 12 || 12;

  return `${hour}:${String(minutes).padStart(2,"0")} ${suffix}`;

}


function formatDate(dateString) {

  if (!dateString)
    return "";

  return new Date(
    dateString + "T00:00:00"
  ).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );

}


function hexToRGBA(hex, alpha) {

  hex = hex.replace("#","");

  const r =
    parseInt(hex.substring(0,2),16);

  const g =
    parseInt(hex.substring(2,4),16);

  const b =
    parseInt(hex.substring(4,6),16);

  return `rgba(${r},${g},${b},${alpha})`;

}


function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// =========================================================
// STORAGE
// =========================================================

function saveMedicines() {

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(medicines)
  );

}


function saveHistory() {

  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(history)
  );

}


// =========================================================
// TOAST
// =========================================================

function showToast(message, icon = "✓") {

  const toast =
    document.getElementById("toast");

  document.getElementById("toastMessage")
    .textContent = message;

  document.getElementById("toastIcon")
    .textContent = icon;


  toast.classList.add("show");


  clearTimeout(window.toastTimer);


  window.toastTimer =
    setTimeout(() => {

      toast.classList.remove("show");

    }, 3000);

}


// =========================================================
// RENDER EVERYTHING
// =========================================================

function renderAll() {

  renderDashboard();

  renderMedicines();

  renderReminders();

  renderHistory();

  renderProgress();

}
