
"use strict";

// BUSINESS SAVINGS ORG
// Front-end demonstration only. Do not use for real financial records.
// localStorage is browser-specific and does not synchronize between devices.

const DB_KEY = "nickStudioBusinessSavingsDB_v2";

const SOCIAL_LINKS = {
  whatsapp: "",
  facebook: "",
  instagram: "",
  youtube: "",
  x: ""
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) =>
  [...root.querySelectorAll(selector)];

const today = () => {
  const date = new Date();
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return local.toISOString().slice(0, 10);
};

const newId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const freshDB = () => ({
  target: 50000,
  users: [],
  contributions: [],
  notices: []
});

let db = readDB();
let currentUserId = sessionStorage.getItem("bsoCurrentUser") || "";
let authMode = "login";

function readDB() {
  try {
    return {
      ...freshDB(),
      ...JSON.parse(localStorage.getItem(DB_KEY) || "{}")
    };
  } catch {
    return freshDB();
  }
}

function saveDB() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    renderPublic();
  } catch (error) {
    alert("Could not save data in this browser.");
    console.error(error);
  }
}

function userById(id) {
  return db.users.find(user => user.id === id);
}

function currentUser() {
  return userById(currentUserId);
}

function approvedMembers() {
  return db.users.filter(
    user => user.role === "member" && user.status === "approved"
  );
}

function approvedContributions() {
  return db.contributions.filter(
    contribution => contribution.status === "approved"
  );
}

function sumApproved() {
  return approvedContributions().reduce(
    (sum, contribution) => sum + Number(contribution.amount || 0),
    0
  );
}

function money(value) {
  return "KSh " + Number(value || 0).toLocaleString("en-KE", {
    maximumFractionDigits: 2
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0] || "")
    .join("")
    .toUpperCase();
}

// Demo password hashing only. Real authentication belongs on a server.
async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function openModal(selector) {
  const element = $(selector);
  element.classList.add("open");
  element.setAttribute("aria-hidden", "false");
}

function closeModal(selector) {
  const element = $(selector);
  element.classList.remove("open");
  element.setAttribute("aria-hidden", "true");
}

function closeAllModals() {
  closeModal("#authModal");
  closeModal("#contributionModal");
}

// --------------------------------------------------
// INITIAL SETUP AND NAVIGATION
// --------------------------------------------------

$("#year").textContent = new Date().getFullYear();

$("#mobileMenu").addEventListener("click", () => {
  $("#nav").classList.toggle("open");
});

$$(".nav-link").forEach(link => {
  link.addEventListener("click", () => {
    $$(".nav-link").forEach(item => item.classList.remove("active"));
    link.classList.add("active");
    $("#nav").classList.remove("open");
  });
});

$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
});

$("#openAuth").addEventListener("click", () => openAuth("login"));
$("#joinNow").addEventListener("click", () => openAuth("register"));

$("#closeAuth").addEventListener("click", () => {
  closeModal("#authModal");
});

$("#closeContribution").addEventListener("click", () => {
  closeModal("#contributionModal");
});

$("#authModal").addEventListener("click", event => {
  if (event.target === $("#authModal")) {
    closeModal("#authModal");
  }
});

$("#contributionModal").addEventListener("click", event => {
  if (event.target === $("#contributionModal")) {
    closeModal("#contributionModal");
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeAllModals();
});

// --------------------------------------------------
// REGISTRATION, LOGIN AND ADMIN ACCOUNT
// --------------------------------------------------

function openAuth(mode = "login") {
  authMode = mode;
  $("#authView").classList.remove("hidden");
  $("#accountView").classList.add("hidden");
  renderAuthForm();
  openModal("#authModal");
}

function renderAuthForm() {
  $$(".auth-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.authMode === authMode);
  });

  $("#authMessage").textContent = "";

  $("#authTitle").innerHTML =
    authMode === "register"
      ? 'Create a new <span class="gold-text">account</span>'
      : authMode === "admin"
        ? 'Admin <span class="gold-text">access</span>'
        : 'Welcome <span class="gold-text">back</span>';

  $("#authIntro").textContent =
    authMode === "register"
      ? "Create your profile. The administrator must approve your application."
      : authMode === "admin"
        ? "Create the first administrator account or log in."
        : "Log in to access your member profile.";

  if (authMode === "register") {
    $("#authFields").innerHTML = `
      <label>Full name
        <input name="name" required maxlength="80"
          autocomplete="name" placeholder="Your full name">
      </label>
      <label>Phone number
        <input name="phone" required maxlength="25"
          autocomplete="tel" placeholder="07XX XXX XXX">
      </label>
      <label>Email address
        <input name="email" type="email" required maxlength="120"
          autocomplete="email" placeholder="you@example.com">
      </label>
      <label>Reason for joining
        <input name="reason" required maxlength="300"
          placeholder="Your savings goals">
      </label>
      <label>Create password
        <input name="password" type="password" required minlength="8"
          autocomplete="new-password">
      </label>
      <label>Confirm password
        <input name="confirm" type="password" required minlength="8"
          autocomplete="new-password">
      </label>`;

    $("#authSubmit").textContent = "Create account ↗";
    return;
  }

  if (authMode === "admin") {
    const adminExists = db.users.some(user => user.role === "admin");

    $("#authFields").innerHTML = adminExists
      ? `
        <label>Admin email
          <input name="email" type="email" required autocomplete="username">
        </label>
        <label>Admin password
          <input name="password" type="password" required minlength="10"
            autocomplete="current-password">
        </label>`
      : `
        <label>Admin full name
          <input name="name" required maxlength="80">
        </label>
        <label>Admin email
          <input name="email" type="email" required autocomplete="email">
        </label>
        <label>Set admin password
          <input name="password" type="password" required minlength="10"
            autocomplete="new-password">
        </label>
        <label>Confirm admin password
          <input name="confirm" type="password" required minlength="10"
            autocomplete="new-password">
        </label>`;

    $("#authSubmit").textContent = adminExists
      ? "Admin login ↗"
      : "Create admin account ↗";
    return;
  }

  $("#authFields").innerHTML = `
    <label>Email address
      <input name="email" type="email" required autocomplete="username">
    </label>
    <label>Password
      <input name="password" type="password" required
        autocomplete="current-password">
    </label>`;

  $("#authSubmit").textContent = "Login ↗";
}

$$(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    authMode = tab.dataset.authMode;
    renderAuthForm();
  });
});

$("#authForm").addEventListener("submit", async event => {
  event.preventDefault();

  const form = new FormData(event.currentTarget);
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const message = $("#authMessage");

  message.textContent = "";

  if (!email || !password) {
    message.textContent = "Enter your email and password.";
    return;
  }

  if (authMode === "register") {
    const name = String(form.get("name") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const reason = String(form.get("reason") || "").trim();

    if (password.length < 8) {
      message.textContent = "Use at least 8 characters for your password.";
      return;
    }

    if (password !== form.get("confirm")) {
      message.textContent = "Passwords do not match.";
      return;
    }

    if (db.users.some(user => user.email === email)) {
      message.textContent = "That email is already registered.";
      return;
    }

    db.users.push({
      id: newId(),
      name,
      phone,
      email,
      reason,
      passwordHash: await hashPassword(password),
      role: "member",
      status: "pending",
      createdAt: new Date().toISOString()
    });

    saveDB();

    message.textContent =
      "Account created. Your membership is awaiting admin approval.";

    event.currentTarget.reset();
    return;
  }

  if (authMode === "admin") {
    const existingAdmin = db.users.find(user => user.role === "admin");

    if (!existingAdmin) {
      const name = String(form.get("name") || "").trim();

      if (password.length < 10) {
        message.textContent =
          "Use at least 10 characters for the admin password.";
        return;
      }

      if (password !== form.get("confirm")) {
        message.textContent = "Admin passwords do not match.";
        return;
      }

      if (db.users.some(user => user.email === email)) {
        message.textContent =
          "That email already exists. Use another email.";
        return;
      }

      const admin = {
        id: newId(),
        name,
        email,
        phone: "",
        reason: "Organization administrator",
        passwordHash: await hashPassword(password),
        role: "admin",
        status: "approved",
        createdAt: new Date().toISOString()
      };

      db.users.push(admin);
      saveDB();
      signIn(admin);
      return;
    }

    const passwordHash = await hashPassword(password);

    if (
      existingAdmin.email !== email ||
      existingAdmin.passwordHash !== passwordHash
    ) {
      message.textContent = "Incorrect admin email or password.";
      return;
    }

    signIn(existingAdmin);
    return;
  }

  const passwordHash = await hashPassword(password);

  const user = db.users.find(
    item => item.email === email && item.passwordHash === passwordHash
  );

  if (!user) {
    message.textContent = "Email or password is incorrect.";
    return;
  }

  signIn(user);
});

function signIn(user) {
  currentUserId = user.id;
  sessionStorage.setItem("bsoCurrentUser", user.id);

  $("#openAuth").textContent =
    user.role === "admin" ? "♜ Admin" : "♟ My account";

  showAccount();
  renderPublic();
}

function signOut() {
  currentUserId = "";
  sessionStorage.removeItem("bsoCurrentUser");
  $("#openAuth").textContent = "♟ Login";
  openAuth("login");
}

// --------------------------------------------------
// MEMBER PROFILE
// --------------------------------------------------

function showAccount() {
  const user = currentUser();

  if (!user) {
    openAuth("login");
    return;
  }

  $("#authView").classList.add("hidden");
  $("#accountView").classList.remove("hidden");

  const isAdministrator = user.role === "admin";
  const ownContributions = db.contributions.filter(
    contribution => contribution.userId === user.id
  );

  $("#accountView").innerHTML = `
    <span class="eyebrow">
      ${isAdministrator ? "ORGANIZATION CONTROL CENTER" : "YOUR MEMBER PROFILE"}
    </span>

    <h2>
      ${isAdministrator ? "Admin " : "Hello, "}
      <span class="gold-text">${escapeHTML(user.name)}</span>
    </h2>

    <p>
      ${
        isAdministrator
          ? "Review applications, approve payments and manage your savings target."
          : `Membership status:
            <b class="${
              user.status === "approved"
                ? "status-approved"
                : "status-pending"
            }">${escapeHTML(user.status.toUpperCase())}</b>`
      }
    </p>

    ${
      isAdministrator
        ? adminDashboardHTML()
        : memberAccountHTML(user, ownContributions)
    }

    <div class="account-actions">
      <button class="button button-outline" id="accountRefresh">
        Refresh dashboard
      </button>
      <button class="button button-login" id="accountLogout">
        Log out
      </button>
    </div>`;

  $("#accountRefresh").onclick = showAccount;
  $("#accountLogout").onclick = signOut;

  if (isAdministrator) {
    bindAdminDashboard();
  } else {
    const contributeButton = $("#accountContribute");
    if (contributeButton) {
      contributeButton.onclick = openContribution;
    }
  }
}

function memberAccountHTML(user, contributions) {
  const approvedTotal = contributions
    .filter(item => item.status === "approved")
    .reduce((sum, item) => sum + Number(item.amount), 0);

  return `
    <div class="account-box">
      <b>Profile details</b>
      <p>${escapeHTML(user.email)} · ${escapeHTML(user.phone)}</p>
      <p>Application: ${escapeHTML(user.reason)}</p>
    </div>

    <div class="account-box">
      <b>Your contribution records</b>
      <p>Approved total: <strong>${money(approvedTotal)}</strong></p>

      ${
        contributions.length
          ? contributions.slice().reverse().map(item => `
            <p>
              ${money(item.amount)} · ${escapeHTML(item.date)} ·
              <span class="${
                item.status === "approved"
                  ? "status-approved"
                  : "status-pending"
              }">${escapeHTML(item.status)}</span>
            </p>`).join("")
          : "<p>You have not submitted a contribution yet.</p>"
      }
    </div>

    ${
      user.status === "approved"
        ? '<button class="button button-gold full" id="accountContribute">＋ Submit a contribution</button>'
        : '<p class="warning-note">You can submit contributions after admin approval.</p>'
    }`;
}

// --------------------------------------------------
// ADMIN DASHBOARD
// --------------------------------------------------

function adminDashboardHTML() {
  const pendingUsers = db.users.filter(
    user => user.role === "member" && user.status === "pending"
  );

  const pendingContributions = db.contributions.filter(
    item => item.status === "pending"
  );

  const members = approvedMembers();

  return `
    <div class="account-box">
      <b>Organization summary</b>
      <p>
        Approved members: <strong>${members.length}</strong><br>
        Approved contributions: <strong>${money(sumApproved())}</strong><br>
        Target: <strong>${money(db.target)}</strong>
      </p>
    </div>

    <div class="account-box">
      <b>Set savings target</b>
      <form id="targetForm">
        <label>Target amount (KSh)
          <input name="target" type="number" min="1" required
            value="${Number(db.target)}">
        </label>
        <button class="button button-gold">Save target</button>
      </form>
    </div>

    <div class="account-box">
      <b>Pending member applications (${pendingUsers.length})</b>
      ${
        pendingUsers.length
          ? pendingUsers.map(user => `
            <div class="admin-row">
              <div>
                <strong>${escapeHTML(user.name)}</strong>
                <small>
                  ${escapeHTML(user.email)} · ${escapeHTML(user.phone)}<br>
                  ${escapeHTML(user.reason)}
                </small>
              </div>
              <div>
                <button class="mini-button"
                  data-approve-user="${user.id}">Approve</button>
                <button class="mini-button reject"
                  data-reject-user="${user.id}">Reject</button>
              </div>
            </div>`).join("")
          : "<p>No pending member applications.</p>"
      }
    </div>

    <div class="account-box">
      <b>Pending contributions (${pendingContributions.length})</b>
      ${
        pendingContributions.length
          ? pendingContributions.map(item => `
            <div class="admin-row">
              <div>
                <strong>${escapeHTML(item.memberName)} · ${money(item.amount)}</strong>
                <small>
                  ${escapeHTML(item.date)} · Ref:
                  ${escapeHTML(item.reference)}
                </small>
              </div>
              <div>
                <button class="mini-button"
                  data-approve-contribution="${item.id}">Approve</button>
                <button class="mini-button reject"
                  data-reject-contribution="${item.id}">Reject</button>
              </div>
            </div>`).join("")
          : "<p>No pending contributions.</p>"
      }
    </div>

    <div class="account-box">
      <b>Publish a notice</b>
      <form id="noticeForm">
        <label>Notice title
          <input name="title" required maxlength="90">
        </label>
        <label>Message
          <textarea name="body" rows="3" required maxlength="500"></textarea>
        </label>
        <button class="button button-outline">Publish notice</button>
      </form>
    </div>

    <div class="account-box">
      <b>Approved members and their contributions</b>
      ${
        members.map(user => {
          const total = approvedContributions()
            .filter(item => item.userId === user.id)
            .reduce((sum, item) => sum + Number(item.amount), 0);

          return `<p>
            ${escapeHTML(user.name)} · ${escapeHTML(user.email)} ·
            <strong>${money(total)}</strong> contributed
          </p>`;
        }).join("") || "<p>No approved members yet.</p>"
      }
    </div>`;
}

function bindAdminDashboard() {
  const targetForm = $("#targetForm");

  if (targetForm) {
    targetForm.onsubmit = event => {
      event.preventDefault();

      const amount = Number(new FormData(targetForm).get("target"));

      if (!Number.isFinite(amount) || amount <= 0) {
        alert("Enter a valid target amount.");
        return;
      }

      db.target = amount;
      saveDB();
      showAccount();
    };
  }

  $$("[data-approve-user]").forEach(button => {
    button.onclick = () => {
      const user = userById(button.dataset.approveUser);

      if (user) user.status = "approved";

      saveDB();
      showAccount();
    };
  });

  $$("[data-reject-user]").forEach(button => {
    button.onclick = () => {
      const user = userById(button.dataset.rejectUser);

      if (user) user.status = "rejected";

      saveDB();
      showAccount();
    };
  });

  $$("[data-approve-contribution]").forEach(button => {
    button.onclick = () => {
      const contribution = db.contributions.find(
        item => item.id === button.dataset.approveContribution
      );

      if (contribution) {
        contribution.status = "approved";
        contribution.approvedAt = new Date().toISOString();
      }

      saveDB();
      showAccount();
    };
  });

  $$("[data-reject-contribution]").forEach(button => {
    button.onclick = () => {
      const contribution = db.contributions.find(
        item => item.id === button.dataset.rejectContribution
      );

      if (contribution) contribution.status = "rejected";

      saveDB();
      showAccount();
    };
  });

  const noticeForm = $("#noticeForm");

  if (noticeForm) {
    noticeForm.onsubmit = event => {
      event.preventDefault();

      const form = new FormData(noticeForm);

      db.notices.push({
        id: newId(),
        title: String(form.get("title")).trim(),
        body: String(form.get("body")).trim(),
        date: today()
      });

      saveDB();
      showAccount();
    };
  }
}

// --------------------------------------------------
// CONTRIBUTION SUBMISSION AND APPROVAL
// --------------------------------------------------

function openContribution() {
  const user = currentUser();

  if (!user) {
    openAuth("login");
    $("#authMessage").textContent = "Log in first.";
    return;
  }

  if (user.role !== "member" || user.status !== "approved") {
    openAuth("login");
    $("#authMessage").textContent =
      "Only approved members can submit contributions.";
    return;
  }

  $("#contributionForm").reset();
  $('#contributionForm [name="date"]').value = today();
  $("#contributionMessage").textContent = "";

  openModal("#contributionModal");
}

$("#contributeButton").addEventListener("click", openContribution);

$("#contributionForm").addEventListener("submit", event => {
  event.preventDefault();

  const user = currentUser();

  if (!user || user.role !== "member" || user.status !== "approved") {
    $("#contributionMessage").textContent =
      "Log in with an approved member account.";
    return;
  }

  const form = new FormData(event.currentTarget);
  const amount = Number(form.get("amount"));
  const reference = String(form.get("reference") || "").trim();
  const paymentDate = String(form.get("date") || "");

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !reference ||
    !paymentDate
  ) {
    $("#contributionMessage").textContent =
      "Enter a valid amount, date and payment reference.";
    return;
  }

  db.contributions.push({
    id: newId(),
    userId: user.id,
    memberName: user.name,
    amount,
    date: paymentDate,
    reference,
    note: String(form.get("note") || "").trim(),
    status: "pending",
    createdAt: new Date().toISOString()
  });

  saveDB();

  $("#contributionMessage").textContent =
    "Submitted for admin review. It counts toward the total after approval.";

  event.currentTarget.reset();
  $('#contributionForm [name="date"]').value = today();
});

// --------------------------------------------------
// PUBLIC DASHBOARD AND MEMBER DIRECTORY
// --------------------------------------------------

function renderPublic() {
  const members = approvedMembers();
  const contributions = approvedContributions();
  const total = sumApproved();
  const target = Math.max(1, Number(db.target) || 1);
  const percent = Math.min(100, Math.round(total / target * 100));

  $("#statMembers").textContent = members.length;
  $("#statTotal").textContent = money(total);
  $("#statTarget").textContent = money(db.target);

  $("#statToday").textContent = contributions.filter(
    item => item.date === today()
  ).length;

  $("#progressPercent").textContent = percent + "%";
  $("#progressRemaining").textContent =
    money(Math.max(0, target - total)) + " remaining";
  $("#progressCaption").textContent =
    `${money(total)} saved toward ${money(target)}`;

  $("#progressBar").style.width = percent + "%";

  const query = ($("#memberSearch")?.value || "").trim().toLowerCase();

  const visibleMembers = members.filter(member =>
    `${member.name} ${member.email}`.toLowerCase().includes(query)
  );

  $("#directoryCount").textContent =
    `${visibleMembers.length} approved member` +
    (visibleMembers.length === 1 ? "" : "s");

  $("#memberDirectory").innerHTML = visibleMembers.length
    ? visibleMembers.map(member => `
        <article class="member-card">
          <span class="avatar">${escapeHTML(initials(member.name))}</span>
          <div>
            <b>${escapeHTML(member.name)}</b>
            <small>Member since ${escapeHTML(
              (member.createdAt || "").slice(0, 10)
            )}</small>
            <small class="member-badge">✓ Approved member</small>
          </div>
        </article>`).join("")
    : `<div class="empty-state">${
        members.length
          ? "No matching approved members."
          : "No approved members yet. Create an account to apply."
      }</div>`;

  const sorted = contributions.slice().sort((a, b) =>
    String(b.date).localeCompare(String(a.date)) ||
    String(b.createdAt).localeCompare(String(a.createdAt))
  );

  $("#contributionRows").innerHTML = sorted.length
    ? sorted.map(item => `
        <tr>
          <td>${escapeHTML(item.memberName)}</td>
          <td>${money(item.amount)}</td>
          <td>${escapeHTML(item.date)}</td>
          <td>${escapeHTML(item.reference)}</td>
          <td><span class="status-approved">✓ Approved</span></td>
        </tr>`).join("")
    : `<tr>
        <td colspan="5" class="empty-state">
          No approved contributions yet.
        </td>
      </tr>`;

  const notices = [...db.notices].reverse();

  $("#noticeList").innerHTML = notices.length
    ? notices.map(notice => `
        <article class="panel notice">
          <span>✦</span>
          <div>
            <b>${escapeHTML(notice.title)}</b>
            <p>${escapeHTML(notice.body)}</p>
          </div>
        </article>`).join("")
    : `<article class="panel notice">
        <span>✦</span>
        <div>
          <b>Welcome to Business Savings Org</b>
          <p>Official updates from the organization will appear here.</p>
        </div>
      </article>`;

  const user = currentUser();

  if (user) {
    $("#openAuth").textContent =
      user.role === "admin" ? "♜ Admin" : "♟ My account";
  }
}

$("#memberSearch").addEventListener("input", renderPublic);

// --------------------------------------------------
// SOCIAL MEDIA PLACEHOLDERS
// --------------------------------------------------

$$("[data-social]").forEach(link => {
  const key = link.dataset.social;
  const url = SOCIAL_LINKS[key];

  if (url) {
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  } else {
    link.href = "#";
    link.title = "Add your account link in script.js";

    link.addEventListener("click", event => {
      event.preventDefault();
      alert(
        `Add your ${key} account URL in the SOCIAL_LINKS section of script.js.`
      );
    });
  }
});

// --------------------------------------------------
// CONTACT FORM
// --------------------------------------------------

$("#contactForm").addEventListener("submit", event => {
  event.preventDefault();

  const form = new FormData(event.currentTarget);

  const subject = encodeURIComponent(
    "Business Savings Org enquiry from " + String(form.get("name"))
  );

  const body = encodeURIComponent(
    `Name: ${form.get("name")}\n` +
    `Contact: ${form.get("contact")}\n\n` +
    `${form.get("message")}`
  );

  $("#contactMessage").textContent =
    "Message prepared. Connect an email service to send it.";

  // This only prepares the message; it does not send an email.
  console.info("Contact message prepared:", { subject, body });
});

// --------------------------------------------------
// START THE WEBSITE
// --------------------------------------------------

renderPublic();

if (currentUser()) {
  $("#openAuth").textContent =
    currentUser().role === "admin" ? "♜ Admin" : "♟ My account";
}
