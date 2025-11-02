
const sess = JSON.parse(localStorage.getItem("session") || "null");
if (!sess?.email || sess.role !== "admin") location.replace("index.html");


const RX_MOD = /^[a-z0-9._+-]+-moderateur@laplateforme\.io$/i;
const RX_ADM = /^[a-z0-9._+-]+-admin@laplateforme\.io$/i;

function showAlert(msg, type = "info") {
  const box = document.getElementById("alerts");
  if (!box) return;
  box.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}
function getUsersSafe(){ try{ return getUsers(); }catch{ return []; } }
function saveUsersSafe(a){ try{ saveUsers(a); }catch{} }

function getSession() {
  try { return JSON.parse(localStorage.getItem("session") || "null"); }
  catch { return null; }
}


let users = [];

function renderUsers() {
  const body = document.getElementById("usersBody");
  const tpl = document.getElementById("rowTplUser");
  const q = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const f = document.getElementById("roleFilter")?.value || "";

  body.innerHTML = "";
  users
    .filter(u => ["admin","moderateur"].includes(u.role))
    .filter(u => !q || u.email.toLowerCase().includes(q))
    .filter(u => !f || u.role === f)
    .sort((a,b)=>a.role.localeCompare(b.role)||a.email.localeCompare(b.email))
    .forEach(u=>{
      const tr = tpl.content.firstElementChild.cloneNode(true);
      tr.querySelector(".col-email").textContent = u.email;
      tr.querySelector(".col-role").innerHTML =
        u.role === "admin"
          ? '<span class="badge text-bg-danger">admin</span>'
          : '<span class="badge text-bg-primary">moderateur</span>';

      const actions = document.createElement("div");

      const switchBtn = document.createElement("button");
      switchBtn.className = "btn btn-sm btn-outline-secondary me-2";
      switchBtn.textContent = u.role === "admin" ? "Rétrograder" : "Promouvoir";
      switchBtn.onclick = () => changeRole(u.email, u.role === "admin" ? "moderateur" : "admin");
      actions.appendChild(switchBtn);

      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-sm btn-outline-danger";
      delBtn.textContent = "Supprimer";
      delBtn.onclick = () => removeUser(u.email);
      actions.appendChild(delBtn);

      tr.querySelector(".col-actions").appendChild(actions);
      body.appendChild(tr);
    });

  const w = document.getElementById("welcome");
  const logoutBtn = document.getElementById("logoutBtn");
  if (w) w.textContent = `Connecté : ${sess.email} (admin)`;
  if (logoutBtn) logoutBtn.onclick = () => { localStorage.removeItem("session"); location.replace("index.html"); };
}
function atLeastOneAdminLeft(next){ return next.some(u=>u.role==="admin"); }

function changeRole(email, newRole){
  const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (idx < 0) return;

  if (newRole==="admin" && !RX_ADM.test(email)) return showAlert("Email incompatible avec rôle admin.", "warning");
  if (newRole==="moderateur" && !RX_MOD.test(email)) return showAlert("Email incompatible avec rôle modérateur.", "warning");

  const tmp = users.map(x=>({...x}));
  tmp[idx].role = newRole;
  if (!atLeastOneAdminLeft(tmp)) return showAlert("Au moins un administrateur doit rester.", "danger");

  users[idx].role = newRole;
  saveUsersSafe(users);
  renderUsers();
  showAlert("Rôle mis à jour.", "success");
}
function removeUser(email){
  if (email.toLowerCase() === sess.email.toLowerCase())
    return showAlert("Impossible de supprimer votre propre compte.", "warning");

  const next = users.filter(u => u.email.toLowerCase() !== email.toLowerCase());
  if (!atLeastOneAdminLeft(next)) return showAlert("Suppression refusée. Il faut un admin minimum.", "danger");

  if (!confirm(`Supprimer ${email} ?`)) return;
  users = next;
  saveUsersSafe(users);
  renderUsers();
  showAlert("Compte supprimé.", "success");
}
function addUser(email, role){
  if (!email) return showAlert("Email obligatoire.", "warning");
  if (users.some(u=>u.email.toLowerCase()===email.toLowerCase()))
    return showAlert("Email déjà existant.", "warning");
  if (role==="admin" && !RX_ADM.test(email))
    return showAlert("Format requis: xxx-admin@laplateforme.io", "warning");
  if (role==="moderateur" && !RX_MOD.test(email))
    return showAlert("Format requis: xxx-moderateur@laplateforme.io", "warning");

  users.push({ email, password: "placeholder", role });
  saveUsersSafe(users);
  renderUsers();
  showAlert("Compte ajouté.", "success");
}


const LSK_PREFIX = "requests_";
const todayStr = () => new Date().toISOString().split("T")[0];

function loadList(email){ try{ return JSON.parse(localStorage.getItem(LSK_PREFIX+email) || "[]"); }catch{ return []; } }
function saveList(email, list){ localStorage.setItem(LSK_PREFIX+email, JSON.stringify(list)); }


function migrate(list){
  let changed = false;
  const out = list.map(r=>{
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

function listAllRequestKeys(){
  const keys = [];
  for (let i=0;i<localStorage.length;i++){
    const k = localStorage.key(i);
    if (k && k.startsWith(LSK_PREFIX)) keys.push(k);
  }
  return keys;
}
function collectAllRequests(){
  const rows = [];
  const keys = listAllRequestKeys();

  keys.forEach(k=>{
    const email = k.substring(LSK_PREFIX.length);
    let list = loadList(email);
    const mig = migrate(list);
    if (mig.changed){ list = mig.list; saveList(email, list); }
    list.forEach(r=>{
      rows.push({
        email, date: r.date,
        wish: r.wish || "present",
        decision: r.decision || "en_attente",
        reason: r.reason || ""
      });
    });
  });

  rows.sort((a,b)=> a.date.localeCompare(b.date) || a.email.localeCompare(b.email));
  return rows;
}

function wishLabel(wish){ return wish === "absent" ? "Souhaite être ABSENT" : "Souhaite venir"; }
function decisionBadge(decision){
  if (decision==="accepte") return `<span class="badge text-bg-success">Accepté</span>`;
  if (decision==="refuse")  return `<span class="badge text-bg-danger">Refusé</span>`;
  return `<span class="badge text-bg-secondary">En attente</span>`;
}

function setDecision(email, date, decision, reason=""){
  const list = loadList(email);
  const idx = list.findIndex(x=>x.date===date);
  if (idx<0) return showAlert("Demande introuvable.", "warning");

  if (list[idx].decision && list[idx].decision !== "en_attente")
    return showAlert("Décision déjà prise pour cette demande.", "secondary");

  list[idx].decision = decision;          // "accepte" | "refuse"
  list[idx].reason   = decision === "refuse" ? (reason || "") : "";
  saveList(email, list);
  renderModerationTables();
}

function makeRowModeration(tpl, r, isPending){
  const tr = tpl.content.firstElementChild.cloneNode(true);
  tr.querySelector(".col-date").textContent = r.date;
  tr.querySelector(".col-email").textContent = r.email;
  tr.querySelector(".col-wish").textContent = wishLabel(r.wish);

  const actions = tr.querySelector(".col-actions");
  const reasonCell = tr.querySelector(".col-reason");

  if (isPending){
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

function renderModerationTables(){
  const all = collectAllRequests();
  const pending = all.filter(r=>r.decision==="en_attente");
  const others  = all.filter(r=>r.decision!=="en_attente");

  const tpl = document.getElementById("rowTplReq");
  const tbodyPending = document.getElementById("pendingBody");
  const tbodyAll = document.getElementById("allBody");

  if (!tpl || !tbodyPending || !tbodyAll) return;

  tbodyPending.innerHTML = "";
  tbodyAll.innerHTML = "";

  pending.forEach(r=> tbodyPending.appendChild(makeRowModeration(tpl, r, true)));
  others.forEach(r => tbodyAll.appendChild(makeRowModeration(tpl, r, false)));
}


document.addEventListener("DOMContentLoaded", () => {
  
  users = getUsersSafe();
  renderUsers();

  const modal = new bootstrap.Modal(document.getElementById("userModal"));
  document.getElementById("openAddModalBtn").onclick = ()=>modal.show();
  document.getElementById("userForm").addEventListener("submit",(e)=>{
    e.preventDefault();
    const email = document.getElementById("userEmail").value.trim();
    const role  = document.getElementById("userRole").value;
    addUser(email, role);
    modal.hide();
    e.target.reset();
  });
  document.getElementById("searchInput").addEventListener("input", renderUsers);
  document.getElementById("roleFilter").addEventListener("change", renderUsers);

  
  renderModerationTables();
});

