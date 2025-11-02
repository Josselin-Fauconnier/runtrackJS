

const STUDENT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+-etudiant@laplateforme\.io$/;
const ROLE_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+-(etudiant|moderateur|admin)@laplateforme\.io$/;

const STAFF = [
  { email: "alice-moderateur@laplateforme.io", password: "SuperPass!2025", role: "moderateur" },
  { email: "root-admin@laplateforme.io", password: "AdminPass!2025", role: "admin" }
];


function readUsers() {
  try { return JSON.parse(localStorage.getItem("users")) || []; }
  catch { return []; }
}

function writeUsers(users) {
  localStorage.setItem("users", JSON.stringify(users));
}

function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify({
    email: user.email,
    role: user.role,
    createdAt: user.createdAt || new Date().toISOString()
  }));
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("currentUser")); }
  catch { return null; }
}


function validatePassword(value) {
  let error = "";
  if (!value) {
    error = "Mot de passe obligatoire";
  } else {
    const manque = [];
    if (value.length < 12) manque.push(`${12 - value.length} caractère(s) supplémentaire(s)`);
    if (!/[A-Z]/.test(value)) manque.push("une majuscule");
    if (!/[a-z]/.test(value)) manque.push("une minuscule");
    if (!/[0-9]/.test(value)) manque.push("un chiffre");
    if (!/[!@#$%^&_+\-=\[\].<>?]/.test(value)) manque.push("un caractère spécial (!@#$%^&_+...)");

    if (manque.length > 0) {
      if (manque.length === 1) {
        error = `Il manque : ${manque[0]}`;
      } else {
        const dernier = manque.pop();
        error = `Il manque : ${manque.join(", ")} et ${dernier}`;
      }
    }
  }
  return { ok: !error, error };
}

function isValidSignupEmail(email) {
  return STUDENT_EMAIL_REGEX.test(email);
}

function parseRole(email) {
  const m = email.match(ROLE_EMAIL_REGEX);
  return m ? m[1] : null;
}


function redirectByRole(role) {
  if (role === "admin") window.location.href = "admistration.html";
  else if (role === "moderateur") window.location.href = "moderation.html";
  else window.location.href = "calendar.html";
}

// ------------------- Affichage erreurs sous input -------------------
function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  if (!input) return;

  let errorSpan = input.nextElementSibling;
  if (!errorSpan || !errorSpan.classList.contains("error-message")) {
    errorSpan = document.createElement("div");
    errorSpan.className = "error-message";
    errorSpan.style.color = "red";
    errorSpan.style.fontSize = "0.9em";
    input.insertAdjacentElement("afterend", errorSpan);
  }
  errorSpan.textContent = message || "";
}

// ------------------- Inscription -------------------
function handleSignup(e) {
  e.preventDefault();

  const email = (document.getElementById("signupEmail")?.value || "").trim();
  const password = document.getElementById("signupPassword")?.value || "";
  const confirm = document.getElementById("signupPassword2")?.value || "";

  // Vérifie email
  if (!isValidSignupEmail(email)) {
    setFieldError("signupEmail", "Format email invalide. Utilisez nom-etudiant@laplateforme.io");
    return;
  } else {
    setFieldError("signupEmail", "");
  }

  // Vérifie mot de passe
  const pwd = validatePassword(password);
  if (!pwd.ok) {
    setFieldError("signupPassword", pwd.error);
    return;
  } else {
    setFieldError("signupPassword", "");
  }

  if (password !== confirm) {
    setFieldError("signupPassword2", "Les mots de passe ne correspondent pas");
    return;
  } else {
    setFieldError("signupConfirm", "");
  }

  const role = "etudiant";
  const users = readUsers();
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    setFieldError("signupEmail", "Un compte existe déjà avec cet email");
    return;
  }

  users.push({ email, password, role, createdAt: new Date().toISOString() });
  writeUsers(users);
  setCurrentUser({ email, role });
  localStorage.setItem("session", JSON.stringify({ email, role }));
  
  redirectByRole(role);

}

// ------------------- Connexion -------------------
function handleLogin(e) {
  e.preventDefault();

  const email = (document.getElementById("loginEmail")?.value || "").trim();
  const password = document.getElementById("loginPassword")?.value || "";

  if (!ROLE_EMAIL_REGEX.test(email)) {
    setFieldError("loginEmail", "Format email invalide. Utilisez nom-ROLE@laplateforme.io (ROLE = etudiant|moderateur|admin)");
    return;
  } else {
    setFieldError("loginEmail", "");
  }

  const role = parseRole(email);
  if (!role) {
    setFieldError("loginEmail", "Rôle indéterminé dans l'adresse email");
    return;
  }

  if (role === "etudiant") {
    const users = readUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      setFieldError("loginEmail", "Compte étudiant introuvable. Inscrivez-vous d'abord.");
      return;
    }
    if (found.password !== password) {
      setFieldError("loginPassword", "Mot de passe incorrect");
      return;
    }
    setCurrentUser(found);
    redirectByRole("etudiant");
    return;
  }

  const staff = STAFF.find(u => u.email.toLowerCase() === email.toLowerCase() && u.role === role);
  if (!staff) {
    setFieldError("loginEmail", "Ce compte modérateur/admin n'est pas autorisé.");
    return;
  }
  if (staff.password !== password) {
    setFieldError("loginPassword", "Mot de passe incorrect");
    return;
  }
  setCurrentUser(staff);
  redirectByRole(role);
}


document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  if (signupForm) signupForm.addEventListener("submit", handleSignup);
  if (loginForm) loginForm.addEventListener("submit", handleLogin);
});

window.__auth = { handleSignup, handleLogin };
