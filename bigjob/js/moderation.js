const sess = JSON.parse(localStorage.getItem("session") || "null");
if (!sess?.email || sess.role !== "moderateur") {
  location.replace("index.html");
}


const LSK_PREFIX = "requests_";
const todayStr = () => new Date().toISOString().split("T")[0];

function showAlert(msg, type = "info") {
  const box = document.getElementById("alerts");
  if (!box) return;
  box.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
    </div>`;
}

function getSession() {
  try { return JSON.parse(localStorage.getItem("session") || "null"); }
  catch { return null; }
}

function loadList(email) {
  try { return JSON.parse(localStorage.getItem(LSK_PREFIX + email) || "[]"); }
  catch { return []; }
}

function saveList(email, list) {
  localStorage.setItem(LSK_PREFIX + email, JSON.stringify(list));
}


function migrate(list) {
  let changed = false;
  const out = list.map(r => {
    const nr = { ...r };
    if (!("wish" in nr) && "status" in nr) {
      nr.wish = nr.status === "présent" ? "present" : "absent";
      delete nr.status;
      if (!("decision" in nr)) nr.decision = "en_attente";
      if (!("reason" in nr))   nr.reason = "";
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


function listAllRequestKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(LSK_PREFIX)) keys.push(k);
  }
  return keys;
}

function collectAllRequests() {
  const rows = [];
  const keys = listAllRequestKeys();

  keys.forEach(k => {
    const email = k.substring(LSK_PREFIX.length);
    let list = loadList(email);

    
    const mig = migrate(list);
    if (mig.changed) {
      list = mig.list;
      saveList(email, list);
    }

    list.forEach(r => {
      rows.push({
        email,
        date: r.date,
        wish: r.wish || "present",
        decision: r.decision || "en_attente",
        reason: r.reason || ""
      });
    });
  });

  rows.sort((a, b) => a.date.localeCompare(b.date) || a.email.localeCompare(b.email));
  return rows;
}


function setDecision(email, date, decision, reason = "") {
  const key = LSK_PREFIX + email;
  const list = loadList(email);
  const idx = list.findIndex(x => x.date === date);
  if (idx < 0) {
    showAlert("Demande introuvable.", "warning");
    return;
  }

 
  if (list[idx].decision && list[idx].decision !== "en_attente") {
    showAlert("Décision déjà prise pour cette demande.", "secondary");
    return;
  }

  list[idx].decision = decision;          
  list[idx].reason   = decision === "refuse" ? (reason || "") : "";
  saveList(email, list);
  renderTables();
}


function wishLabel(wish) {
  return wish === "absent" ? "Souhaite être ABSENT" : "Souhaite venir";
}

function decisionBadge(decision) {
  if (decision === "accepte") return `<span class="badge text-bg-success">Accepté</span>`;
  if (decision === "refuse")  return `<span class="badge text-bg-danger">Refusé</span>`;
  return `<span class="badge text-bg-secondary">En attente</span>`;
}

function makeRow(tpl, r, isPending) {
  const tr = tpl.content.firstElementChild.cloneNode(true);
  tr.querySelector(".col-date").textContent = r.date;
  tr.querySelector(".col-email").textContent = r.email;
  tr.querySelector(".col-wish").textContent = wishLabel(r.wish);

  const actions = tr.querySelector(".col-actions");
  const reasonCell = tr.querySelector(".col-reason");

  if (isPending) {
    const acceptBtn = document.createElement("button");
    acceptBtn.className = "btn btn-sm btn-success";
    acceptBtn.textContent = "Accepter";
    acceptBtn.onclick = () => setDecision(r.email, r.date, "accepte");

    const refuseBtn = document.createElement("button");
    refuseBtn.className = "btn btn-sm btn-outline-danger ms-2";
    refuseBtn.textContent = "Refuser";
    refuseBtn.onclick = () => {
      const reason = prompt("Raison du refus (facultatif) :") || "";
      setDecision(r.email, r.date, "refuse", reason);
    };

    actions.appendChild(acceptBtn);
    actions.appendChild(refuseBtn);
  } else {
    actions.innerHTML = decisionBadge(r.decision);
    reasonCell.classList.remove("d-none");
    reasonCell.textContent = r.reason || "";
  }

  return tr;
}

function renderTables() {
  const all = collectAllRequests(); 
  const pending = all.filter(r => r.decision === "en_attente");
  const others  = all.filter(r => r.decision !== "en_attente");

  const tpl = document.getElementById("rowTpl");
  const tbodyPending = document.getElementById("pendingBody");
  const tbodyAll = document.getElementById("allBody");

  tbodyPending.innerHTML = "";
  tbodyAll.innerHTML = "";

  pending.forEach(r => tbodyPending.appendChild(makeRow(tpl, r, true)));
  others.forEach(r  => tbodyAll.appendChild(makeRow(tpl, r, false)));

  const s = getSession();
  const welcome = document.getElementById("welcome");
  const logoutBtn = document.getElementById("logoutBtn");
  if (s?.email && welcome) welcome.textContent = `Connecté : ${s.email}`;
  if (logoutBtn) logoutBtn.onclick = () => { localStorage.removeItem("session"); location.replace("index.html"); };
}


document.addEventListener("DOMContentLoaded", renderTables);
