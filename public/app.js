let me = null;

const $ = id => document.getElementById(id);

function toast(message) {
  const box = document.createElement("div");
  box.className = "toast";
  box.textContent = message;
  $("toasts").appendChild(box);
  setTimeout(() => box.remove(), 3500);
}

function closeModal() {
  $("modal").classList.add("hidden");
}

function auth(mode) {
  $("modal").classList.remove("hidden");

  $("modalBody").innerHTML = mode === "signup" ? `
    <h2>Create account</h2>
    <form class="form" id="signupForm">
      <input name="username" placeholder="Username" required>
      <input name="email" type="email" placeholder="Email" required>
      <input name="password" type="password" placeholder="Password" minlength="8" required>
      <button class="primary">Create account</button>
    </form>
    <p class="muted">Already have an account?
      <a href="#" id="switchLogin">Log in</a>
    </p>
  ` : `
    <h2>Log in</h2>
    <form class="form" id="loginForm">
      <input name="identity" placeholder="Username or email" required>
      <input name="password" type="password" placeholder="Password" required>
      <button class="primary">Log in</button>
    </form>
    <p class="muted">Need an account?
      <a href="#" id="switchSignup">Sign up</a>
    </p>
  `;

  $("switchLogin")?.addEventListener("click", e => {
    e.preventDefault();
    auth("login");
  });

  $("switchSignup")?.addEventListener("click", e => {
    e.preventDefault();
    auth("signup");
  });

  $("signupForm")?.addEventListener("submit", async e => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(e.target));

    try {
      const r = await fetch("/api/signup", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
      });

      const result = await r.json();

      if (!r.ok) throw
