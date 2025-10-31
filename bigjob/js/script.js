(async function initUsers(){
  try {
    const res = await fetch("assets/data/users.json", {cache:"no-store"});
    const users = await res.json();
    if (!localStorage.getItem("users")) {
      localStorage.setItem("users", JSON.stringify(Array.isArray(users) ? users : []));
    }
  } catch {
    localStorage.setItem("users","[]");
  }
})();
