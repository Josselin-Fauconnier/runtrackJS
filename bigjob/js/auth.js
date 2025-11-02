// js/auth.js

// ---------- helpers UI ----------
function ensureErrorNode(input) {
  let box = input.nextElementSibling;
  if (!box || !box.classList.contains("error-message")) {
    box = document.createElement("div");
    box.className = "error-message text-danger small mt-1";
    input.after(box);
  }
  return box;
}
function setError(input, msg) { ensureErrorNode(input).textContent = msg || ""; }
function clearError(input) { ensureErrorNode(input).textContent = ""; }

function getUsers() {
  try { return JSON.parse(localStorage.getItem("users") || "[]"); }
  catch { return []; }
}
function saveUsers(arr) { localStorage.setItem("users", JSON.stringify(arr)); }

function setSession(email, role) {
  localStorage.setItem("session", JSON.stringify({ email, role }));
}

const RX_ETU = /^[a-z0-9._+-]+-etudiant@laplateforme\.io$/i;
const RX_MOD = /^[a-z0-9._+-]+-moderateur@laplateforme\.io$/i;
const RX_ADM = /^[a-z0-9._+-]+-admin@laplateforme\.io$/i;

// ---------- LOGIN ----------
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      clearError(loginEmail); clearError(loginPassword);

      const email = loginEmail.value.trim();
      const pwd = loginPassword.value;

      if (!email) { setError(loginEmail, "Email obligatoire"); return; }
      if (!pwd) { setError(loginPassword, "Mot de passe obligatoire"); return; }

      const users = getUsers();
      const u = users.find(x => x.email.toLowerCase() === email.toLowerCase());

      // Étudiants: si non trouvé, demander création de compte
      if (!u) {
        if (RX_ETU.test(email)) {
          setError(loginEmail, "Compte inexistant. Créez un compte.");
        } else if (RX_MOD.test(email) || RX_ADM.test(email)) {
          setError(loginEmail, "Accès réservé. Le compte doit exister dans users.json.");
        } else {
          setError(loginEmail, "Domaine non autorisé.");
        }
        return;
      }

      if (u.password !== pwd) { setError(loginPassword, "Mot de passe incorrect"); return; }

      // OK → session + redirection par rôle
      setSession(u.email, u.role);
      if (u.role === "moderateur") {
        location.replace("moderation.html");        // page backoffice modérateur
      } else if (u.role === "admin") {
        location.replace("admistration.html");      // nom de fichier déjà présent
      } else {
        location.replace("calendar.html");
      }
    });
  }

  // ---------- SIGNUP ----------
  const signupForm = document.getElementById("signupForm");
  const signupEmail = document.getElementById("signupEmail");
  const signupPassword = document.getElementById("signupPassword");
  const signupPassword2 = document.getElementById("signupPassword2");

  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();
      clearError(signupEmail); clearError(signupPassword); clearError(signupPassword2);

      const email = signupEmail.value.trim();
      const pwd = signupPassword.value;
      const pwd2 = signupPassword2.value;

      // Étudiants uniquement
      if (!RX_ETU.test(email)) {
        if (RX_MOD.test(email) || RX_ADM.test(email)) {
          setError(signupEmail, "Création interdite pour admin/modérateur. Utilisez un compte JSON.");
        } else {
          setError(signupEmail, "Format attendu: xxx-etudiant@laplateforme.io");
        }
        return;
      }

      if (!pwd || pwd.length < 12) { setError(signupPassword, "12 caractères minimum"); return; }
      if (pwd !== pwd2) { setError(signupPassword2, "Les mots de passe ne correspondent pas"); return; }

      const users = getUsers();
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        setError(signupEmail, "Email déjà enregistré"); return;
      }

      // Création étudiant
      users.push({ email, password: pwd, role: "etudiant" });
      saveUsers(users);

      setSession(email, "etudiant");
      location.replace("calendar.html");
    });
  }
});


