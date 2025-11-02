// js/calendar.js

// ---------- util ----------
const todayStr = () => new Date().toISOString().split("T")[0];
const keyFor = (email) => `requests_${email}`;
const loadList = (email) => JSON.parse(localStorage.getItem(keyFor(email)) || "[]");
const saveList = (email, list) => localStorage.setItem(keyFor(email), JSON.stringify(list));

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

// ---------- migration des anciennes données ----------
// Ancien format: { date, status: "présent"|"absent" }
// Nouveau format: { date, wish: "present"|"absent", decision: "en_attente"|"accepte"|"refuse", reason: "" }
function migrate(list) {
  let changed = false;
  const out = list.map(r => {
    const nr = { ...r };
    if (!("wish" in nr) && "status" in nr) {
      nr.wish = nr.status === "présent" ? "present" : "absent";
      delete nr.status;
      if (!("decision" in nr)) nr.decision = "en_attente";
      if (!("reason" in nr)) nr.reason = "";
      changed = true;
    } else {
      if (!("decision" in nr)) { nr.decision = "en_attente"; changed = true; }
      if (!("reason" in nr))   { nr.reason = ""; changed = true; }
      if (!("wish" in nr))     { nr.wish = "present"; changed = true; }
    }
    return nr;
  });
  return { list: out, changed };
}

// ---------- rendu ----------
function badgeFor(decision) {
  if (decision === "accepte") return ["Accepté", "success"];
  if (decision === "refuse")  return ["Refusé", "danger"];
  return ["En attente", "secondary"];
}

function renderRequests() {
  const s = getSession();
  const ul = document.getElementById("requestsList");
  if (!s?.email || !ul) return;

  // charger + migrer
  let list = loadList(s.email);
  const mig = migrate(list);
  if (mig.changed) {
    list = mig.list;
    saveList(s.email, list);
  }

  const today = todayStr();
  ul.innerHTML = "";

  list
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((r) => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex flex-column flex-md-row justify-content-between align-items-start gap-2";

      // gauche: date + badge décision
      const left = document.createElement("div");
      left.className = "d-flex align-items-center gap-2";

      const dateEl = document.createElement("span");
      dateEl.textContent = r.date;

      const [label, color] = badgeFor(r.decision);
      const badge = document.createElement("span");
      badge.className = `badge text-bg-${color}`;
      badge.textContent = label;

      left.appendChild(dateEl);
      left.appendChild(badge);

      // raison si refusé
      const reasonWrap = document.createElement("div");
      if (r.decision === "refuse" && r.reason) {
        reasonWrap.className = "text-muted small";
        reasonWrap.textContent = `Raison: ${r.reason}`;
      }

      // droite: actions étudiant avant la date, seulement si en attente
      const right = document.createElement("div");
      right.className = "ms-md-auto d-flex gap-2";

      if (r.date >= today && r.decision === "en_attente") {
        
        // annuler la demande
        const cancelBtn = document.createElement("button");
        cancelBtn.className = "btn btn-sm btn-outline-secondary";
        cancelBtn.textContent = "Annuler la demande";
        cancelBtn.onclick = () => cancelRequest(r.date);

        
        right.appendChild(cancelBtn);
      }

      li.appendChild(left);
      if (reasonWrap.textContent) li.appendChild(reasonWrap);
      li.appendChild(right);
      ul.appendChild(li);
    });
}

// ---------- actions étudiant ----------
function createRequest(date, email) {
  const list = loadList(email);
  const today = todayStr();

  if (!date)            return showAlert("Choisissez une date.", "warning");
  if (date < today)     return showAlert("Date passée non modifiable.", "danger");
  if (list.some(r => r.date === date)) return showAlert("Date déjà demandée.", "warning");

  list.push({ date, wish: "present", decision: "en_attente", reason: "" });
  saveList(email, list);
  renderRequests();
}



function cancelRequest(date) {
  const s = getSession();
  if (!s?.email) return;

  const list = loadList(s.email);
  const idx = list.findIndex(x => x.date === date);
  if (idx < 0) return;

  const today = todayStr();
  if (date < today) return showAlert("Impossible d'annuler une date passée.", "warning");

  if (list[idx].decision !== "en_attente") {
    return showAlert("Décision déjà prise. Annulation impossible.", "warning");
  }

  list.splice(idx, 1);
  saveList(s.email, list);
  renderRequests();
}

// ---------- bootstrap page ----------
document.addEventListener("DOMContentLoaded", () => {
  const s = getSession();
  const welcome = document.getElementById("welcome");
  const logoutBtn = document.getElementById("logoutBtn");
  const requestBtn = document.getElementById("requestBtn");
  const dateInput = document.getElementById("presenceDate");

  if (!s?.email) { window.location.href = "index.html"; return; }
  if (welcome) welcome.textContent = `Connecté : ${s.email}`;
  if (logoutBtn) logoutBtn.onclick = () => { localStorage.removeItem("session"); location.replace("index.html"); };

  if (requestBtn && dateInput) {
    requestBtn.addEventListener("click", () => createRequest(dateInput.value, s.email));
  }

  renderRequests();
});


