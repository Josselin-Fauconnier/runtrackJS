const ALLOWED_DOMAINS = ["laplateforme.io"];

function showAlert(msg, type = "info") {
  const box = document.getElementById("alerts");
  box.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${msg}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fermer"></button>
    </div>`;
}


const getDomain = (email) => (email.split("@")[1] || "").toLowerCase();
const isAllowed = (email) => ALLOWED_DOMAINS.includes(getDomain(email));


function Password(value) {
  if (!value) return "Mot de passe obligatoire";

  const manque = [];

  if (value.length < 12) {
    manque.push(`${12 - value.length} caractère(s) supplémentaire(s)`);
  }
  if (!/[A-Z]/.test(value)) {
    manque.push("une majuscule");
  }
  if (!/[a-z]/.test(value)) {
    manque.push("une minuscule");
  }
  if (!/[0-9]/.test(value)) {
    manque.push("un chiffre");
  }
  if (!/[!@#$%^&_+\-=\[\].<>?]/.test(value)) {
    manque.push("un caractère spécial (!@#$%^&_+...)");
  }

  if (manque.length === 0) return null;

  if (manque.length === 1) {
    return `Il manque : ${manque[0]}`;
  } else {
    const dernier = manque.pop();
    return `Il manque : ${manque.join(", ")} et ${dernier}`;
  }
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}


const loadUsers = () => JSON.parse(localStorage.getItem("users") || "[]");
const saveUsers = (u) => localStorage.setItem("users", JSON.stringify(u));
const setSession = (email) => localStorage.setItem("session", JSON.stringify({ email, ts: Date.now() }));
const getSession = () => JSON.parse(localStorage.getItem("session") || "null");
const clearSession = () => localStorage.removeItem("session");


function render() {
  const s = getSession();
  const area = document.getElementById("memberArea");
  const welcome = document.getElementById("welcome");
  if (s?.email) {
    area.classList.remove("d-none");
    welcome.textContent = `Connecté : ${s.email}`;
  } else {
    area.classList.add("d-none");
    welcome.textContent = "";
  }
}


async function Signup(e) {
  e.preventDefault();
  const email = document.getElementById("signupEmail").value.trim().toLowerCase();
  const pw = document.getElementById("signupPassword").value;
  const pw2 = document.getElementById("signupPassword2").value;

  if (!isAllowed(email)) {
    return showAlert("Email non autorisé. Seuls les comptes @laplateforme.io sont valides.", "danger");
  }

  const pwError = Password(pw);
  if (pwError) return showAlert(pwError, "warning");

  if (pw !== pw2) return showAlert("Les mots de passe ne correspondent pas.", "warning");

  const users = loadUsers();
  if (users.some(u => u.email === email)) return showAlert("Ce compte existe déjà.", "warning");

  const passHash = await sha256(pw);
  users.push({ email, passHash, createdAt: new Date().toISOString() });
  saveUsers(users);
  setSession(email);
  showAlert("Compte créé et connecté.", "success");
  render();
}


async function Login(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const pw = document.getElementById("loginPassword").value;

  if (!isAllowed(email)) return showAlert("Email non autorisé.", "danger");

  const users = loadUsers();
  const user = users.find(u => u.email === email);
  if (!user) return showAlert("Compte introuvable.", "warning");

  const passHash = await sha256(pw);
  if (passHash !== user.passHash) return showAlert("Mot de passe incorrect.", "danger");

  setSession(email);
  showAlert("Connexion réussie.", "success");
  render();
}


function Logout() {
  clearSession();
  showAlert("Déconnecté.");
  render();
}


document.getElementById("signupForm").addEventListener("submit", Signup);
document.getElementById("loginForm").addEventListener("submit", Login);
document.getElementById("logoutBtn").addEventListener("click", Logout);
document.addEventListener("DOMContentLoaded", render);
render();
