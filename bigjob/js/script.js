
(async function initUsers() {
  try {
    const res = await fetch("assets/data/users.json", { cache: "no-store" });
    const users = await res.json();
    if (!localStorage.getItem("users")) {
      localStorage.setItem("users", JSON.stringify(Array.isArray(users) ? users : []));
    }
  } catch {
    if (!localStorage.getItem("users")) localStorage.setItem("users", "[]");
  }
})();


function getSession() {
  try { return JSON.parse(localStorage.getItem("session") || "null"); }
  catch { return null; }
}

function showAlert(msg, type = "info") {
  const box = document.getElementById("alerts");
  if (!box) return;
  box.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
    </div>`;
}

const todayStr = () => new Date().toISOString().split("T")[0];
const keyFor = (email) => `requests_${email}`;
const loadList = (email) => JSON.parse(localStorage.getItem(keyFor(email)) || "[]");
const saveList = (email, list) => localStorage.setItem(keyFor(email), JSON.stringify(list));


function loadRequests() {
  const s = getSession();
  const ul = document.getElementById("requestsList");
  if (!s?.email || !ul) return;

  const list = loadList(s.email);
  const today = todayStr();
  ul.innerHTML = "";

  list
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((r) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex justify-content-between align-items-center";
      li.textContent = `${r.date} - ${r.status}`;

      
      if (r.date >= today) {
        const btn = document.createElement("button");
        btn.textContent = r.status === "présent" ? "Annuler" : "Présent";
        btn.className = "btn btn-sm btn-outline-primary";
        btn.onclick = () => togglePresence(r.date);
        li.appendChild(btn);
      }

      ul.appendChild(li);
    });
}


function togglePresence(date) {
  const s = getSession();
  if (!s?.email) return;
  const list = loadList(s.email);
  const rec = list.find((x) => x.date === date);
  if (!rec) return;

  const today = todayStr();
  if (date < today) return showAlert("Impossible de modifier une date passée.", "warning");

  rec.status = rec.status === "présent" ? "absent" : "présent";
  saveList(s.email, list);
  loadRequests();
}


document.addEventListener("DOMContentLoaded", () => {
  const s = getSession();

  const requestBtn = document.getElementById("requestBtn");
  const dateInput = document.getElementById("presenceDate");
  const listEl = document.getElementById("requestsList");

  
  if (s?.email && requestBtn && dateInput && listEl) {
    requestBtn.addEventListener("click", () => {
      const date = dateInput.value;
      if (!date) return showAlert("Choisissez une date.", "warning");

      const today = todayStr();
      if (date < today) return showAlert("Date passée non modifiable.", "danger");

      const list = loadList(s.email);
      if (list.some((r) => r.date === date)) return showAlert("Date déjà demandée.", "warning");

      list.push({ date, status: "présent" });
      saveList(s.email, list);
      loadRequests();
    });

    loadRequests();
  }
});


window.loadRequests = loadRequests;
window.togglePresence = togglePresence;
