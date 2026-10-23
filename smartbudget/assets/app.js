/* ==========================================================================
   SmartBudget — application : routeur, coquille, actions, exports
   ========================================================================== */
(function () {
  "use strict";

  const App = window.App;
  const U = App.utils;
  const UI = App.UI;
  const DB = App.DB;
  const V = App.Views;
  const esc = U.esc;
  const icon = UI.icon;

  const A = {
    month: U.currentMonth(),
    theme: "light",
    renderId: 0,
    lastPath: null,
    busy: false
  };
  App.state = A;
  App.mode = "demo";
  App.month = A.month;
  App.theme = A.theme;
  App.expenseFilter = "all";
  App.expenseQuery = "";
  App.expenseCat = "all";
  App.simAmount = 0;

  const MIN_MONTH = U.shiftMonth(U.currentMonth(), -24);

  const PAGE_META = {
    dashboard: { title: "Tableau de bord", sub: "Votre mois en un regard", view: "dashboard" },
    revenus: { title: "Revenus", sub: "Ce qui entre, au bon endroit", view: "incomes" },
    depenses: { title: "Dépenses", sub: "Chaque sortie, sans surprise", view: "expenses" },
    budget: { title: "Budget 50/30/20", sub: "Une répartition qui vous ressemble", view: "budget" },
    epargne: { title: "Épargne", sub: "Vos projets prennent forme", view: "savings" },
    simulateur: { title: "Puis-je me l'offrir ?", sub: "Décider sans se tromper", view: "simulator" },
    statistiques: { title: "Statistiques", sub: "Six mois, une vue d'ensemble", view: "stats" },
    profil: { title: "Profil & réglages", sub: "Votre espace, vos règles", view: "profile" }
  };

  const APP_ROUTES = {
    "": "dashboard",
    app: "dashboard",
    "/app": "dashboard",
    "/app/tableau-de-bord": "dashboard",
    "/tableau-de-bord": "dashboard",
    "/app/revenus": "revenus",
    "/revenus": "revenus",
    "/app/depenses": "depenses",
    "/depenses": "depenses",
    "/app/budget": "budget",
    "/budget": "budget",
    "/app/epargne": "epargne",
    "/epargne": "epargne",
    "/app/simulateur": "simulateur",
    "/simulateur": "simulateur",
    "/app/statistiques": "statistiques",
    "/statistiques": "statistiques",
    "/app/profil": "profil",
    "/profil": "profil"
  };

  const AUTH_ROUTES = {
    "/connexion": "login",
    "/login": "login",
    "/inscription": "signup",
    "/signup": "signup",
    "/mot-de-passe-oublie": "reset",
    "/reset": "reset",
    "/nouveau-mot-de-passe": "recovery",
    "/recovery": "recovery"
  };

  const AUTH_FORMS = ["login", "signup", "reset", "set-password"];

  /* ------------------------------------------------------------------ */
  /* Thème                                                              */
  /* ------------------------------------------------------------------ */

  function initTheme() {
    let saved = null;
    try {
      saved = localStorage.getItem("smartbudget.theme");
    } catch (e) {
      saved = null;
    }
    if (saved !== "light" && saved !== "dark") {
      saved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    applyTheme(saved);
  }

  function applyTheme(theme) {
    App.theme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", App.theme);
    try {
      localStorage.setItem("smartbudget.theme", App.theme);
    } catch (e) {
      /* stockage indisponible */
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", App.theme === "dark" ? "#0d1714" : "#116b52");
    document.querySelectorAll("[data-theme-icon]").forEach((el) => {
      el.innerHTML = UI.icon(App.theme === "dark" ? "sun" : "moon", "", 18);
    });
    document.querySelectorAll('[data-action="toggle-theme"]').forEach((el) => {
      el.setAttribute("aria-label", App.theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre");
      el.setAttribute("title", App.theme === "dark" ? "Thème clair" : "Thème sombre");
    });
  }

  function setTheme(theme) {
    applyTheme(theme);
    if (DB.user && App.ctx && App.ctx.profile) {
      DB.updateProfile({ theme: App.theme }).catch(() => {});
    }
    if (document.querySelector("#app .app-shell")) render();
  }

  /* ------------------------------------------------------------------ */
  /* Routage                                                            */
  /* ------------------------------------------------------------------ */

  function resolveRoute() {
    const raw = String(location.hash || "").replace(/^#/, "");
    const path = raw.split("?")[0];
    const tokenInHash = /(access_token|refresh_token|error_description|type=recovery)/.test(raw);

    if (DB.recovery || App.recovery) return { kind: "auth", view: "recovery", path: "/nouveau-mot-de-passe" };
    if (tokenInHash) return { kind: "landing", path: "/" };
    if (!path || path === "/" || path === "/accueil") return { kind: "landing", path: "/" };
    if (AUTH_ROUTES[path]) return { kind: "auth", view: AUTH_ROUTES[path], path };
    if (APP_ROUTES[path] != null) {
      return { kind: "app", page: APP_ROUTES[path], path, protected: true };
    }
    return { kind: "notfound", path, protected: Boolean(DB.user) };
  }

  function navigate(target, replace) {
    const hash = target.startsWith("#") ? target : "#" + target;
    App.authError = "";
    if (replace) {
      try {
        history.replaceState(null, "", location.pathname + location.search + hash);
      } catch (e) {
        location.hash = hash.slice(1);
        return;
      }
      render();
      return;
    }
    if (location.hash === hash) {
      render();
      return;
    }
    location.hash = hash.slice(1);
  }

  function showBoot(message) {
    const host = document.getElementById("app");
    if (!host) return;
    host.innerHTML = `<div class="boot" id="boot">
      <span class="brand-mark" style="--mark-size:46px" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="46" height="46" fill="none"><rect width="32" height="32" rx="10" fill="currentColor"/><path d="M9 22.5V16M16 22.5V9.5M23 22.5v-9" stroke="white" stroke-width="3" stroke-linecap="round"/><circle cx="23" cy="10" r="2.2" fill="#c9f27c"/></svg>
      </span>
      <p>${esc(message || "Chargement de SmartBudget…")}</p>
    </div>`;
  }

  function showFatal(message) {
    const host = document.getElementById("app");
    if (!host) return;
    host.innerHTML = `<main class="auth-layout"><section class="auth-panel"><div class="auth-card">
      <h1 class="auth-title">Un instant.</h1>
      <p class="auth-sub">${esc(message || "Impossible de charger vos données pour le moment.")}</p>
      <div class="modal-actions-inline"><button class="btn btn-primary" type="button" data-action="retry">Réessayer</button><a class="btn btn-ghost" href="#/">Retour à l'accueil</a></div>
    </div></section></main>`;
  }

  async function render() {
    const id = ++A.renderId;
    const route = resolveRoute();

    if (route.kind === "auth" && route.view !== "recovery" && DB.user) {
      navigate("#/app", true);
      return;
    }
    if ((route.kind === "app" || route.kind === "notfound") && route.protected && !DB.user) {
      navigate("#/connexion", true);
      return;
    }

    if (route.kind === "landing") {
      document.title = "SmartBudget — Chaque euro, à sa place";
      document.getElementById("app").innerHTML = V.landing();
      afterRender(route);
      return;
    }

    if (route.kind === "auth") {
      const titles = {
        login: "Connexion",
        signup: "Créer un compte",
        reset: "Mot de passe oublié",
        recovery: "Nouveau mot de passe"
      };
      document.title = (titles[route.view] || "Connexion") + " — SmartBudget";
      document.getElementById("app").innerHTML = V.auth(route.view);
      afterRender(route);
      return;
    }

    if (!document.querySelector("#app .app-shell")) showBoot("Chargement de votre espace…");
    let loaded;
    try {
      loaded = await loadContext();
    } catch (e) {
      if (id !== A.renderId) return;
      showFatal(e && e.message ? e.message : "Impossible de charger vos données.");
      return;
    }
    if (id !== A.renderId) return;

    App.ctx = loaded;
    const meta = route.kind === "app" ? PAGE_META[route.page] : { title: "Page introuvable", sub: "Vérifiez le lien", view: "notFound" };
    const viewFn = V[meta.view] || V.notFound;
    document.title = meta.title + " — SmartBudget";
    document.getElementById("app").innerHTML = shell(meta, viewFn());
    afterRender(route);
  }

  function afterRender(route) {
    const appEl = document.getElementById("app");
    if (route && route.path !== A.lastPath) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      A.lastPath = route.path;
      if (appEl && route.kind === "app") {
        const content = document.getElementById("app-content");
        if (content) {
          content.classList.remove("view-enter");
          void content.offsetWidth;
          content.classList.add("view-enter");
        }
      }
    }
    applyTheme(App.theme);
  }

  async function loadContext() {
    if (A.month > U.currentMonth()) A.month = U.currentMonth();
    await DB.ensureMonth(A.month);
    const [profile, categories, recurringIncomes, incomes, recurringExpenses, expenses, goals, contributions] = await Promise.all([
      DB.getProfile(),
      DB.list("categories"),
      DB.list("recurringIncomes"),
      DB.list("incomes"),
      DB.list("recurringExpenses"),
      DB.list("expenses"),
      DB.list("goals"),
      DB.list("contributions")
    ]);
    if (!profile) throw new Error("Profil introuvable. Reconnectez-vous.");
    const data = { categories, recurringIncomes, incomes, recurringExpenses, expenses, goals, contributions };
    const c = App.compute({ profile, ...data }, A.month);
    return { profile, data, month: A.month, c, catById: new Map((categories || []).map((cat) => [cat.id, cat])) };
  }

  async function refresh() {
    await render();
  }

  /* ------------------------------------------------------------------ */
  /* Coquille de l'application                                          */
  /* ------------------------------------------------------------------ */

  const NAV = [
    {
      label: "Pilotage",
      items: [{ key: "dashboard", href: "#/app", label: "Tableau de bord", icon: "dashboard" }]
    },
    {
      label: "Mon budget",
      items: [
        { key: "revenus", href: "#/app/revenus", label: "Revenus", icon: "income" },
        { key: "depenses", href: "#/app/depenses", label: "Dépenses", icon: "expense", badge: true },
        { key: "budget", href: "#/app/budget", label: "Budget 50/30/20", icon: "chart" },
        { key: "epargne", href: "#/app/epargne", label: "Épargne", icon: "target" }
      ]
    },
    {
      label: "Décisions",
      items: [
        { key: "simulateur", href: "#/app/simulateur", label: "Puis-je me l'offrir ?", icon: "calculator" },
        { key: "statistiques", href: "#/app/statistiques", label: "Statistiques", icon: "history" },
        { key: "profil", href: "#/app/profil", label: "Profil & réglages", icon: "user" }
      ]
    }
  ];

  function shell(meta, content) {
    const ctx = App.ctx;
    const c = ctx.c;
    const profile = ctx.profile;
    const pending = c.pending.length;
    const goals = (ctx.data.goals || []).slice().sort((a, b) => {
      const pa = App.goalProgress(a, ctx.data.contributions);
      const pb = App.goalProgress(b, ctx.data.contributions);
      return Number(pa.complete) - Number(pb.complete) || pb.percent - pa.percent;
    });
    const sideGoal = goals[0];
    const sideProg = sideGoal ? App.goalProgress(sideGoal, ctx.data.contributions) : null;
    const current = U.currentMonth();
    const isCurrent = A.month === current;
    const monthText = U.monthLabel(A.month);
    const displayName = profile.fullName || profile.email || "mon compte";
    const displayInitials = UI.initials(displayName);

    const nav = NAV.map(
      (group) => `<span class="nav-label">${esc(group.label)}</span>
        ${group.items
          .map((item) => {
            const active = meta.view === PAGE_META[item.key].view;
            const badge = item.badge && pending ? `<span class="nav-badge">${pending}</span>` : "";
            return `<a class="nav-link${active ? " active" : ""}" href="${item.href}"${active ? ' aria-current="page"' : ""}>${icon(item.icon, "", 17)}<span>${esc(item.label)}</span>${badge}</a>`;
          })
          .join("")}`
    ).join("");

    return `<div class="app-shell">
      <div class="sidebar-backdrop" data-action="close-sidebar"></div>
      <aside class="sidebar" id="sidebar" aria-label="Navigation de l'application">
        <div class="sidebar-head">
          <a href="#/app" aria-label="SmartBudget, tableau de bord">${UI.logo(32)}</a>
          <button class="icon-btn sidebar-close" type="button" data-action="close-sidebar" aria-label="Fermer le menu">${icon("x", "", 18)}</button>
        </div>
        <nav class="sidebar-nav">${nav}</nav>
        <div class="side-spacer"></div>
        ${
          sideGoal && sideProg
            ? `<a class="side-goal" href="#/app/epargne" style="display:block">
                <div class="side-goal-top"><span>${icon("target", "", 11)} Objectif en cours</span><b style="font-size:10px;color:var(--text-2)">${Math.round(sideProg.percent)} %</b></div>
                <h4>${esc(sideGoal.icon || "🎯")} ${esc(sideGoal.title)}</h4>
                <p><b>${U.fmtMoney(sideProg.current, profile.currency)}</b> sur ${U.fmtMoney(sideProg.target, profile.currency)}</p>
                ${UI.progress(sideProg.percent, sideGoal.color || "var(--save)", "", `Progression de l'objectif ${sideGoal.title}`)}
              </a>`
            : `<a class="side-goal" href="#/app/epargne" style="display:block">
                <div class="side-goal-top"><span>${icon("target", "", 11)} Épargne</span></div>
                <h4>Donnez un cap à vos économies</h4>
                <p>Créez votre premier objectif et suivez-le.</p>
                <span class="panel-link">Créer un objectif ${icon("arrow-right", "", 12)}</span>
              </a>`
        }
        <div class="side-foot">
          <a class="side-user" href="#/app/profil">
            ${UI.avatar(profile.fullName || profile.email)}
            <span class="side-user-txt"><strong>${esc(profile.fullName || "Mon profil")}</strong><span>${esc(profile.email || "")}</span></span>
          </a>
          <button class="nav-link side-logout" type="button" data-action="sign-out">${icon("logout", "", 16)}<span>Se déconnecter</span></button>
          <span class="mode-pill side-mode"><i></i>${App.mode === "demo" ? "Mode démo local" : "Cloud Supabase"}</span>
        </div>
      </aside>
      <div class="app-main">
        <header class="topbar">
          <div class="topbar-left">
            <button class="icon-btn topbar-burger" type="button" data-action="open-sidebar" aria-label="Ouvrir le menu" aria-controls="sidebar" aria-expanded="false">${icon("menu", "", 19)}</button>
            <div class="topbar-title"><strong>${esc(meta.title)}</strong><span>${esc(meta.sub)}</span></div>
          </div>
          <div class="topbar-actions">
            ${UI.healthChip(c.health, true)}
            <div class="month-switch" aria-label="Changer de mois">
              <button type="button" data-action="prev-month" aria-label="Mois précédent"${A.month <= MIN_MONTH ? " disabled" : ""}>${icon("chevron-left", "", 16)}</button>
              <span class="month-label${isCurrent ? " current" : ""}">${esc(monthText)}</span>
              <button type="button" data-action="next-month" aria-label="Mois suivant"${isCurrent ? " disabled" : ""}>${icon("chevron-right", "", 16)}</button>
            </div>
            <button class="icon-btn" type="button" data-action="toggle-theme" aria-label="Changer de thème" title="Changer de thème">${icon(App.theme === "dark" ? "sun" : "moon", "", 18)}</button>
            <a class="avatar-link" href="#/app/profil" aria-label="Ouvrir mon profil : ${esc(displayName)} (${esc(displayInitials)})">${UI.avatar(displayName)}</a>
          </div>
        </header>
        <main class="app-content" id="app-content">
          ${
            App.mode === "demo"
              ? `<div class="demo-banner no-print">${icon("info", "", 15)}<span><b>Mode démo</b> — données fictives enregistrées dans ce navigateur.</span><button class="btn-link" type="button" data-action="reset-demo">Réinitialiser la démo</button></div>`
              : ""
          }
          ${content}
        </main>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Interactions                                                       */
  /* ------------------------------------------------------------------ */

  function track(event) {
    return event.target.closest("[data-action]");
  }

  async function handleAction(action, el) {
    switch (action) {
      case "start-demo": {
        await DB.startDemo();
        App.mode = DB.mode;
        App.authError = "";
        A.month = U.currentMonth();
        App.month = A.month;
        UI.toast("La démo est prête : trois mois de budget vous attendent.", "success", "Bienvenue dans SmartBudget");
        navigate("#/app", true);
        return;
      }
      case "toggle-theme":
        setTheme(App.theme === "dark" ? "light" : "dark");
        return;
      case "set-theme":
        setTheme(el.getAttribute("data-theme"));
        return;
      case "auth-login":
        navigate("#/connexion");
        return;
      case "auth-signup":
        navigate("#/inscription");
        return;
      case "auth-reset":
        navigate("#/mot-de-passe-oublie");
        return;
      case "go-home":
        navigate("#/");
        return;
      case "toggle-password": {
        const target = document.getElementById(el.getAttribute("data-target"));
        if (!target) return;
        const show = target.type === "password";
        target.type = show ? "text" : "password";
        el.innerHTML = UI.icon(show ? "eye-off" : "eye", "", 17);
        el.setAttribute("aria-label", show ? "Masquer le mot de passe" : "Afficher le mot de passe");
        return;
      }
      case "oauth-google":
        await startOAuth("google");
        return;
      case "oauth-apple":
        await startOAuth("apple");
        return;
      case "close-modal":
        UI.closeModal(false);
        return;
      case "open-sidebar": {
        const sidebar = document.getElementById("sidebar");
        const backdrop = document.querySelector(".sidebar-backdrop");
        if (sidebar) sidebar.classList.add("is-open");
        if (backdrop) backdrop.classList.add("is-open");
        el.setAttribute("aria-expanded", "true");
        return;
      }
      case "close-sidebar": {
        const sidebar = document.getElementById("sidebar");
        const backdrop = document.querySelector(".sidebar-backdrop");
        if (sidebar) sidebar.classList.remove("is-open");
        if (backdrop) backdrop.classList.remove("is-open");
        const burger = document.querySelector(".topbar-burger");
        if (burger) burger.setAttribute("aria-expanded", "false");
        return;
      }
      case "prev-month":
        changeMonth(-1);
        return;
      case "next-month":
        changeMonth(1);
        return;
      case "expense-filter":
        App.expenseFilter = el.getAttribute("data-filter") || "all";
        render();
        return;
      case "expense-category":
        return;
      case "toggle-paid":
        await togglePaid(el.getAttribute("data-id"));
        return;
      case "open-expense":
        V.expenseModal();
        return;
      case "edit-expense": {
        const item = findItem("expenses", el.getAttribute("data-id"));
        if (item) V.expenseModal(item);
        return;
      }
      case "delete-expense":
        await deleteExpense(el.getAttribute("data-id"));
        return;
      case "open-income":
        V.incomeModal();
        return;
      case "edit-income": {
        const item = findItem("incomes", el.getAttribute("data-id"));
        if (item) V.incomeModal(item);
        return;
      }
      case "delete-income":
        await deleteIncome(el.getAttribute("data-id"));
        return;
      case "open-recurring-income":
        V.recurringIncomeModal();
        return;
      case "edit-recurring-income": {
        const item = findItem("recurringIncomes", el.getAttribute("data-id"));
        if (item) V.recurringIncomeModal(item);
        return;
      }
      case "delete-recurring-income":
        await deleteRecurring("recurringIncomes", "recurring-income", el.getAttribute("data-id"));
        return;
      case "open-recurring-expense":
        V.recurringExpenseModal();
        return;
      case "edit-recurring-expense": {
        const item = findItem("recurringExpenses", el.getAttribute("data-id"));
        if (item) V.recurringExpenseModal(item);
        return;
      }
      case "delete-recurring-expense":
        await deleteRecurring("recurringExpenses", "recurring-expense", el.getAttribute("data-id"));
        return;
      case "open-goal":
        V.goalModal();
        return;
      case "edit-goal": {
        const item = findItem("goals", el.getAttribute("data-id"));
        if (item) V.goalModal(item);
        return;
      }
      case "delete-goal":
        await deleteGoal(el.getAttribute("data-id"));
        return;
      case "open-contribution":
        V.contributionModal(el.getAttribute("data-id") || null);
        return;
      case "delete-contribution":
        await deleteContribution(el.getAttribute("data-id"));
        return;
      case "open-category":
        UI.closeModal(false);
        setTimeout(() => V.categoryModal(), 120);
        return;
      case "edit-category": {
        const item = findItem("categories", el.getAttribute("data-id"));
        UI.closeModal(false);
        setTimeout(() => {
          if (item) V.categoryModal(item);
        }, 120);
        return;
      }
      case "delete-category":
        await deleteCategory(el.getAttribute("data-id"));
        return;
      case "reset-budget":
        await resetBudget();
        return;
      case "sim-quick": {
        const amount = Number(el.getAttribute("data-amount")) || 0;
        App.simAmount = amount;
        const input = document.querySelector("[data-sim-input]");
        if (input) input.value = amount;
        updateSimulator(amount);
        return;
      }
      case "goto-month":
        await goToMonth(el.getAttribute("data-month"));
        return;
      case "export-csv":
        exportCSV();
        return;
      case "export-json":
        exportJSON();
        return;
      case "export-pdf":
        exportPDF();
        return;
      case "sign-out":
        await signOut();
        return;
      case "reset-demo":
        await resetDemo();
        return;
      case "delete-account":
        await deleteAccount();
        return;
      case "retry":
        render();
        return;
      default:
        return;
    }
  }

  async function startOAuth(provider) {
    try {
      await DB.signInWithOAuth(provider);
    } catch (e) {
      UI.toast(e.message || "Connexion indisponible.", "error");
    }
  }

  async function changeMonth(delta) {
    const next = U.shiftMonth(A.month, delta);
    if (next > U.currentMonth()) return;
    if (next < MIN_MONTH) return;
    A.month = next;
    App.month = next;
    await render();
  }

  async function goToMonth(month) {
    if (!month || month > U.currentMonth() || month < MIN_MONTH) return;
    A.month = month;
    App.month = month;
    await render();
  }

  function findItem(table, id) {
    const list = (App.ctx && App.ctx.data && App.ctx.data[table]) || [];
    return list.find((item) => item.id === id) || null;
  }

  async function togglePaid(id) {
    const item = findItem("expenses", id);
    if (!item) return;
    try {
      await DB.update("expenses", id, { isPaid: !item.isPaid });
      UI.toast(item.isPaid ? "Dépense marquée comme à payer." : "Dépense marquée comme payée.", "success");
      await render();
    } catch (e) {
      UI.toast(e.message, "error");
    }
  }

  async function deleteExpense(id) {
    const item = findItem("expenses", id);
    if (!item) return;
    const ok = await UI.confirm({
      title: "Supprimer cette dépense ?",
      message: `<strong>${esc(item.title)}</strong> — ${U.fmtMoney(item.amount, App.ctx.profile.currency)}. ${item.recurringId ? "Cette occurrence sera retirée du mois, la récurrence reste active." : "Cette action est définitive."}`,
      confirmLabel: "Supprimer"
    });
    if (!ok) return;
    try {
      if (item.recurringId) await DB.update("expenses", id, { skipped: true });
      else await DB.remove("expenses", id);
      UI.toast("Dépense supprimée.", "success");
      await render();
    } catch (e) {
      UI.toast(e.message, "error");
    }
  }

  async function deleteIncome(id) {
    const item = findItem("incomes", id);
    if (!item) return;
    const ok = await UI.confirm({
      title: "Supprimer ce revenu ?",
      message: `<strong>${esc(item.title)}</strong> — ${U.fmtMoney(item.amount, App.ctx.profile.currency)}. ${item.recurringId ? "Cette occurrence sera retirée du mois, la récurrence reste active." : "Cette action est définitive."}`,
      confirmLabel: "Supprimer"
    });
    if (!ok) return;
    try {
      if (item.recurringId) await DB.update("incomes", id, { skipped: true });
      else await DB.remove("incomes", id);
      UI.toast("Revenu supprimé.", "success");
      await render();
    } catch (e) {
      UI.toast(e.message, "error");
    }
  }

  async function deleteRecurring(table, label, id) {
    const item = findItem(table, id);
    if (!item) return;
    const ok = await UI.confirm({
      title: `Supprimer cette ${label} ?`,
      message: `<strong>${esc(item.title)}</strong> ne sera plus ajouté aux prochains mois. Les occurrences déjà créées restent dans l'historique.`,
      confirmLabel: "Supprimer"
    });
    if (!ok) return;
    try {
      await DB.remove(table, id);
      UI.toast("Récurrence supprimée.", "success");
      await render();
    } catch (e) {
      UI.toast(e.message, "error");
    }
  }

  async function deleteGoal(id) {
    const item = findItem("goals", id);
    if (!item) return;
    const ok = await UI.confirm({
      title: "Supprimer cet objectif ?",
      message: `<strong>${esc(item.title)}</strong> et toutes ses contributions seront définitivement supprimés.`,
      confirmLabel: "Supprimer"
    });
    if (!ok) return;
    try {
      await DB.remove("goals", id);
      UI.toast("Objectif supprimé.", "success");
      await render();
    } catch (e) {
      UI.toast(e.message, "error");
    }
  }

  async function deleteContribution(id) {
    const ok = await UI.confirm({
      title: "Supprimer cette contribution ?",
      message: "Le solde de l'objectif sera recalculé automatiquement. Cette action est définitive.",
      confirmLabel: "Supprimer"
    });
    if (!ok) return;
    try {
      await DB.remove("contributions", id);
      UI.toast("Contribution supprimée.", "success");
      await render();
    } catch (e) {
      UI.toast(e.message, "error");
    }
  }

  async function deleteCategory(id) {
    const item = findItem("categories", id);
    if (!item) return;
    const ok = await UI.confirm({
      title: "Supprimer cette catégorie ?",
      message: `<strong>${esc(item.name)}</strong> sera retirée. Les dépenses liées resteront, mais sans catégorie.`,
      confirmLabel: "Supprimer"
    });
    if (!ok) return;
    try {
      await DB.remove("categories", id);
      if (App.expenseCat === id) App.expenseCat = "all";
      UI.toast("Catégorie supprimée.", "success");
      await render();
    } catch (e) {
      UI.toast(e.message, "error");
    }
  }

  async function resetBudget() {
    try {
      await DB.updateProfile({ needsPct: 50, wantsPct: 30, savingsPct: 20 });
      UI.toast("Répartition revenue à 50/30/20.", "success");
      await render();
    } catch (e) {
      UI.toast(e.message, "error");
    }
  }

  async function signOut() {
    const ok = await UI.confirm({
      title: "Se déconnecter ?",
      message: "Vos données restent enregistrées. Vous pourrez vous reconnecter à tout moment.",
      confirmLabel: "Se déconnecter",
      danger: false
    });
    if (!ok) return;
    try {
      await DB.signOut();
      App.mode = DB.mode;
      A.month = U.currentMonth();
      App.month = A.month;
      A.lastPath = null;
      App.authError = "";
      UI.toast("À bientôt sur SmartBudget.", "info");
      navigate("#/", true);
    } catch (e) {
      UI.toast(e.message, "error");
    }
  }

  async function resetDemo() {
    const ok = await UI.confirm({
      title: "Réinitialiser la démo ?",
      message: "Toutes les modifications de la démo seront remplacées par les données d'origine. Vos données cloud ne sont pas concernées.",
      confirmLabel: "Réinitialiser",
      danger: false
    });
    if (!ok) return;
    try {
      await DB.resetDemo();
      App.mode = DB.mode;
      A.month = U.currentMonth();
      App.month = A.month;
      App.expenseFilter = "all";
      App.expenseCat = "all";
      App.expenseQuery = "";
      App.simAmount = 0;
      UI.toast("La démo a été réinitialisée.", "success");
      navigate("#/app", true);
    } catch (e) {
      UI.toast(e.message, "error");
    }
  }

  async function deleteAccount() {
    const ok = await UI.confirm({
      title: "Supprimer définitivement votre compte ?",
      message: App.mode === "demo" ? "Le profil de démonstration et toutes les données locales seront effacés." : "Votre profil, vos revenus, vos dépenses, vos objectifs et vos contributions seront définitivement supprimés. Cette action est irréversible.",
      confirmLabel: "Supprimer mon compte"
    });
    if (!ok) return;
    try {
      await DB.deleteAccount();
      A.month = U.currentMonth();
      App.month = A.month;
      App.authError = "";
      UI.toast("Votre compte a été supprimé.", "info");
      navigate("#/", true);
    } catch (e) {
      UI.toast(e.message, "error");
    }
  }

  function updateSimulator(amount) {
    const box = document.getElementById("sim-result");
    if (!box) return;
    App.simAmount = Math.max(0, Number(amount) || 0);
    box.innerHTML = V.simResult(App.simAmount);
  }

  /* ------------------------------------------------------------------ */
  /* Formulaires                                                        */
  /* ------------------------------------------------------------------ */

  function formValues(form) {
    const out = {};
    new FormData(form).forEach((value, key) => {
      out[key] = typeof value === "string" ? value : value;
    });
    return out;
  }

  function fieldError(form, name, message) {
    const el = form.querySelector(`[name="${name}"]`);
    if (el) {
      el.setAttribute("aria-invalid", "true");
      el.focus();
      setTimeout(() => el.removeAttribute("aria-invalid"), 1800);
    }
    throw new Error(message);
  }

  function requiredText(form, name, label) {
    const value = String((formValues(form)[name] || "")).trim();
    if (!value) fieldError(form, name, `Renseignez le champ « ${label} ».`);
    return value;
  }

  function requiredAmount(form, name, label) {
    const raw = String((formValues(form)[name] || "")).trim();
    const value = U.parseAmount(raw);
    if (!raw || !Number.isFinite(value) || value <= 0) fieldError(form, name, `Saisissez un montant valide pour « ${label} ».`);
    return value;
  }

  function requiredDate(form, name, label) {
    const value = String((formValues(form)[name] || "")).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fieldError(form, name, `Choisissez une date pour « ${label} ».`);
    return value;
  }

  function isChecked(form, name) {
    const el = form.querySelector(`[name="${name}"]`);
    return Boolean(el && el.checked);
  }

  function radioValue(form, name, fallback) {
    const el = form.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : fallback;
  }

  function busy(form, fn) {
    const btn = form.querySelector('button[type="submit"]');
    if (btn && btn.dataset.busy === "1") return;
    if (!btn) return fn();
    btn.dataset.busy = "1";
    btn.disabled = true;
    return Promise.resolve()
      .then(fn)
      .finally(() => {
        btn.disabled = false;
        delete btn.dataset.busy;
      });
  }

  async function handleSubmit(form) {
    const action = form.dataset.form;
    if (action === "confirm") return;
    try {
      await busy(form, async () => {
        switch (action) {
          case "login":
            return submitLogin(form);
          case "signup":
            return submitSignup(form);
          case "reset":
            return submitReset(form);
          case "set-password":
            return submitPassword(form);
          case "budget":
            return submitBudget(form);
          case "expense":
            return submitExpense(form);
          case "income":
            return submitIncome(form);
          case "recurring-income":
            return submitRecurringIncome(form);
          case "recurring-expense":
            return submitRecurringExpense(form);
          case "goal":
            return submitGoal(form);
          case "contribution":
            return submitContribution(form);
          case "category":
            return submitCategory(form);
          case "profile":
            return submitProfile(form);
          case "simulate": {
            const amount = U.parseAmount((formValues(form) || {}).amount);
            App.simAmount = Math.max(0, amount);
            updateSimulator(amount);
            return;
          }
          case "expense-search": {
            const values = formValues(form);
            App.expenseQuery = String(values.query || "");
            App.expenseCat = String(values.category || "all");
            await render();
            return;
          }
          default:
            return;
        }
      });
    } catch (e) {
      const message = e && e.message ? e.message : "Une erreur est survenue.";
      if (AUTH_FORMS.indexOf(action) !== -1) {
        App.authError = message;
        render();
      } else {
        UI.toast(message, "error", "Action impossible");
      }
    }
  }

  async function submitLogin(form) {
    const values = formValues(form);
    const email = String(values.email || "").trim().toLowerCase();
    const password = String(values.password || "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fieldError(form, "email", "Saisissez une adresse email valide.");
    if (!password) fieldError(form, "password", "Saisissez votre mot de passe.");
    await DB.signIn(email, password);
    App.mode = DB.mode;
    App.authError = "";
    A.month = U.currentMonth();
    App.month = A.month;
    const name = (DB.user && DB.user.fullName) || email.split("@")[0];
    UI.toast(`Ravi de vous revoir, ${name}.`, "success", "Connexion réussie");
    navigate("#/app", true);
  }

  async function submitSignup(form) {
    const values = formValues(form);
    const fullName = String(values.fullName || "").trim();
    const email = String(values.email || "").trim().toLowerCase();
    const password = String(values.password || "");
    if (fullName.length < 2) fieldError(form, "fullName", "Indiquez votre nom complet.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fieldError(form, "email", "Saisissez une adresse email valide.");
    if (password.length < 6) fieldError(form, "password", "Le mot de passe doit contenir au moins 6 caractères.");
    const result = await DB.signUp(email, password, fullName);
    App.mode = DB.mode;
    App.authError = "";
    if (result.needsConfirm) {
      UI.toast("Consultez votre boîte mail pour confirmer votre adresse.", "info", "Compte créé");
      navigate("#/connexion", true);
      return;
    }
    A.month = U.currentMonth();
    App.month = A.month;
    UI.toast("Votre espace est prêt. Commencez par ajouter vos revenus.", "success", "Bienvenue");
    navigate("#/app", true);
  }

  async function submitReset(form) {
    const email = String(formValues(form).email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fieldError(form, "email", "Saisissez une adresse email valide.");
    await DB.requestReset(email);
    App.authError = "";
    UI.toast(
      DB.mode === "cloud" ? "Un lien de réinitialisation vient d'être envoyé." : "En mode démo, la réinitialisation n'est pas nécessaire : utilisez n'importe quel mot de passe.",
      "info",
      "Email envoyé"
    );
    navigate("#/connexion", true);
  }

  async function submitPassword(form) {
    const values = formValues(form);
    const password = String(values.password || "");
    const confirm = String(values.confirm || "");
    if (password.length < 6) fieldError(form, "password", "Le mot de passe doit contenir au moins 6 caractères.");
    if (password !== confirm) fieldError(form, "confirm", "Les deux mots de passe ne correspondent pas.");
    await DB.updatePassword(password);
    App.recovery = false;
    DB.recovery = false;
    App.authError = "";
    UI.toast("Votre mot de passe a été mis à jour.", "success");
    navigate(DB.user ? "#/app" : "#/connexion", true);
  }

  async function submitBudget(form) {
    const values = formValues(form);
    const needs = Number(values.besoinPct);
    const wants = Number(values.enviePct);
    const savings = Number(values.epargnePct);
    if ([needs, wants, savings].some((n) => !Number.isFinite(n) || n < 0 || n > 100)) {
      throw new Error("Chaque pourcentage doit être compris entre 0 et 100.");
    }
    if (Math.round(needs + wants + savings) !== 100) {
      throw new Error("La somme des trois pourcentages doit être égale à 100 %.");
    }
    await DB.updateProfile({ needsPct: needs, wantsPct: wants, savingsPct: savings });
    UI.toast("Nouvelle répartition enregistrée.", "success");
    await render();
  }

  async function submitExpense(form) {
    const values = formValues(form);
    const id = values.id || "";
    const title = requiredText(form, "title", "Libellé");
    const amount = requiredAmount(form, "amount", "Montant");
    const dueDate = requiredDate(form, "dueDate", "Date");
    const payload = {
      title,
      amount,
      dueDate,
      monthKey: dueDate.slice(0, 7),
      categoryId: values.categoryId || null,
      envelope: values.envelope || "besoin",
      isFixed: values.isFixed === "fixed",
      isPaid: isChecked(form, "isPaid")
    };
    if (id) await DB.update("expenses", id, payload);
    else await DB.insert("expenses", payload);
    if (payload.monthKey <= U.currentMonth()) {
      A.month = payload.monthKey;
      App.month = A.month;
    }
    UI.closeModal(true);
    UI.toast(id ? "Dépense modifiée." : "Dépense ajoutée.", "success");
    await render();
  }

  async function submitIncome(form) {
    const values = formValues(form);
    const id = values.id || "";
    const title = requiredText(form, "title", "Libellé");
    const amount = requiredAmount(form, "amount", "Montant");
    const receivedAt = requiredDate(form, "receivedAt", "Date de réception");
    const payload = {
      title,
      amount,
      receivedAt,
      monthKey: receivedAt.slice(0, 7),
      type: radioValue(form, "type", "salary")
    };
    if (id) await DB.update("incomes", id, payload);
    else await DB.insert("incomes", payload);
    if (payload.monthKey <= U.currentMonth()) {
      A.month = payload.monthKey;
      App.month = A.month;
    }
    UI.closeModal(true);
    UI.toast(id ? "Revenu modifié." : "Revenu ajouté.", "success");
    await render();
  }

  async function submitRecurringIncome(form) {
    const values = formValues(form);
    const id = values.id || "";
    const day = Number(values.dayOfMonth);
    const payload = {
      title: requiredText(form, "title", "Libellé"),
      amount: requiredAmount(form, "amount", "Montant mensuel"),
      type: radioValue(form, "type", "salary"),
      dayOfMonth: U.clamp(Number.isFinite(day) ? Math.round(day) : 1, 1, 31),
      active: isChecked(form, "active")
    };
    if (id) await DB.update("recurringIncomes", id, payload);
    else await DB.insert("recurringIncomes", payload);
    await DB.ensureMonth(A.month);
    UI.closeModal(true);
    UI.toast(id ? "Récurrence mise à jour." : "Récurrence créée.", "success");
    await render();
  }

  async function submitRecurringExpense(form) {
    const values = formValues(form);
    const id = values.id || "";
    const day = Number(values.dayOfMonth);
    const payload = {
      title: requiredText(form, "title", "Libellé"),
      amount: requiredAmount(form, "amount", "Montant mensuel"),
      dayOfMonth: U.clamp(Number.isFinite(day) ? Math.round(day) : 1, 1, 31),
      categoryId: values.categoryId || null,
      envelope: values.envelope || "besoin",
      active: isChecked(form, "active")
    };
    if (id) await DB.update("recurringExpenses", id, payload);
    else await DB.insert("recurringExpenses", payload);
    await DB.ensureMonth(A.month);
    UI.closeModal(true);
    UI.toast(id ? "Charge mise à jour." : "Charge récurrente créée.", "success");
    await render();
  }

  async function submitGoal(form) {
    const values = formValues(form);
    const id = values.id || "";
    const targetAmount = requiredAmount(form, "targetAmount", "Montant cible");
    const payload = {
      title: requiredText(form, "title", "Nom de l'objectif"),
      targetAmount,
      targetDate: values.targetDate || null,
      icon: values.icon || "🎯",
      color: values.color || "#5b7cf5"
    };
    if (id) {
      await DB.update("goals", id, payload);
    } else {
      payload.currentAmount = 0;
      const created = await DB.insert("goals", payload);
      const initial = U.parseAmount(values.initialAmount);
      if (initial > 0) {
        await DB.insert("contributions", {
          goalId: created.id,
          amount: initial,
          contributedAt: U.todayISO(),
          monthKey: U.currentMonth()
        });
      }
    }
    UI.closeModal(true);
    UI.toast(id ? "Objectif mis à jour." : "Objectif créé.", "success");
    await render();
  }

  async function submitContribution(form) {
    const values = formValues(form);
    const goalId = requiredText(form, "goalId", "Objectif");
    const amount = requiredAmount(form, "amount", "Montant");
    const date = requiredDate(form, "contributedAt", "Date");
    await DB.insert("contributions", {
      goalId,
      amount,
      contributedAt: date,
      monthKey: date.slice(0, 7)
    });
    if (date.slice(0, 7) <= U.currentMonth()) {
      A.month = date.slice(0, 7);
      App.month = A.month;
    }
    UI.closeModal(true);
    UI.toast("Contribution ajoutée. Votre objectif progresse.", "success");
    await render();
  }

  async function submitCategory(form) {
    const values = formValues(form);
    const id = values.id || "";
    const payload = {
      name: requiredText(form, "name", "Nom"),
      envelope: values.envelope || "besoin",
      icon: values.icon || "✨",
      color: values.color || "#2f8f72"
    };
    if (id) await DB.update("categories", id, payload);
    else await DB.insert("categories", payload);
    UI.closeModal(true);
    UI.toast(id ? "Catégorie mise à jour." : "Catégorie créée.", "success");
    await render();
  }

  async function submitProfile(form) {
    const values = formValues(form);
    const fullName = requiredText(form, "fullName", "Nom complet");
    const payday = Number(values.paydayDay);
    if (!Number.isFinite(payday) || payday < 1 || payday > 31) {
      fieldError(form, "paydayDay", "Le jour de paie doit être compris entre 1 et 31.");
    }
    const payload = {
      fullName,
      currency: values.currency || "EUR",
      paydayDay: Math.round(payday)
    };
    if (App.mode === "demo") payload.email = String(values.email || "").trim().toLowerCase();
    await DB.updateProfile(payload);
    UI.toast("Profil enregistré.", "success");
    await render();
  }

  /* ------------------------------------------------------------------ */
  /* Exports                                                            */
  /* ------------------------------------------------------------------ */

  function csvCell(value) {
    return `"${String(value == null ? "" : value).replace(/"/g, '""')}"`;
  }

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportCSV() {
    if (!App.ctx) return;
    const ctx = App.ctx;
    const c = ctx.c;
    const cats = ctx.catById;
    const rows = [];
    rows.push(["Type", "Date", "Libellé", "Catégorie", "Enveloppe", "Montant", "Statut"].map(csvCell).join(";"));
    c.incomes
      .slice()
      .sort((a, b) => String(a.receivedAt).localeCompare(String(b.receivedAt)))
      .forEach((inc) => {
        rows.push(["Revenu", inc.receivedAt, inc.title, inc.type === "salary" ? "Salaire" : "Ponctuel", "", inc.amount, "Reçu"].map(csvCell).join(";"));
      });
    c.expenses
      .slice()
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
      .forEach((exp) => {
        const cat = cats.get(exp.categoryId);
        const env = App.constants.ENVELOPES[exp.envelope] || {};
        rows.push(["Dépense", exp.dueDate, exp.title, cat ? cat.name : "Sans catégorie", env.short || exp.envelope || "", exp.amount, exp.isPaid ? "Payé" : "En attente"].map(csvCell).join(";"));
      });
    c.contributions.forEach((ct) => {
      const goal = (ctx.data.goals || []).find((g) => g.id === ct.goalId);
      rows.push(["Épargne", ct.contributedAt, goal ? goal.title : "Objectif", "Épargne", "Épargne", ct.amount, "Versé"].map(csvCell).join(";"));
    });
    rows.push("");
    rows.push(["Total", "", "Revenus", "", "", c.totalIncome, ""].map(csvCell).join(";"));
    rows.push(["Total", "", "Dépenses", "", "", c.totalExpenses, ""].map(csvCell).join(";"));
    rows.push(["Total", "", "Épargne", "", "", c.totalSavings, ""].map(csvCell).join(";"));
    rows.push(["Total", "", "Solde", "", "", c.remaining, ""].map(csvCell).join(";"));
    download(`smartbudget-${c.month}.csv`, "\uFEFF" + rows.join("\r\n"), "text/csv;charset=utf-8");
    UI.toast("Export CSV téléchargé.", "success");
  }

  function exportJSON() {
    if (!App.ctx) return;
    const ctx = App.ctx;
    const payload = {
      app: "SmartBudget",
      version: 3,
      exportedAt: new Date().toISOString(),
      mode: App.mode,
      profile: ctx.profile,
      data: ctx.data
    };
    download(`smartbudget-donnees-${U.todayISO()}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    UI.toast("Export complet téléchargé.", "success");
  }

  function exportPDF() {
    if (!App.ctx) return;
    const ctx = App.ctx;
    const c = ctx.c;
    const profile = ctx.profile;
    const cats = ctx.catById;
    const money = (value) => U.fmtMoney(value, profile.currency);
    const goalRows = (ctx.data.goals || [])
      .map((goal) => {
        const prog = App.goalProgress(goal, ctx.data.contributions);
        return `<tr><td>${esc(goal.title)}</td><td class="num">${money(prog.current)}</td><td class="num">${money(prog.target)}</td><td class="num">${Math.round(prog.percent)} %</td><td>${prog.eta ? esc(prog.eta) : "—"}</td></tr>`;
      })
      .join("");
    const incomeRows = c.incomes
      .slice()
      .sort((a, b) => String(a.receivedAt).localeCompare(String(b.receivedAt)))
      .map((inc) => `<tr><td>${esc(inc.title)}</td><td>${U.dateLabel(inc.receivedAt)}</td><td>${inc.type === "salary" ? "Salaire" : "Ponctuel"}</td><td class="num">${money(inc.amount)}</td></tr>`)
      .join("");
    const expenseRows = c.expenses
      .slice()
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
      .map((exp) => {
        const cat = cats.get(exp.categoryId);
        return `<tr><td>${esc(exp.title)}</td><td>${U.dateLabel(exp.dueDate)}</td><td>${esc(cat ? cat.name : "Sans catégorie")}</td><td>${exp.isPaid ? "Payé" : "En attente"}</td><td class="num">${money(exp.amount)}</td></tr>`;
      })
      .join("");
    const report = `<div class="print-report">
      <h1>Bilan SmartBudget</h1>
      <div class="print-sub">${esc(profile.fullName || profile.email || "Mon budget")} · ${esc(U.monthLabel(c.month))}</div>
      <div class="print-meta"><span>Santé financière : <strong>${esc(c.health.label)} (${c.health.score}/100)</strong></span><span>Édité le ${U.dateLabel(U.todayISO(), { day: "numeric", month: "long", year: "numeric" })}</span></div>
      <div class="print-kpis">
        <div class="print-kpi"><span>Revenus</span><strong>${money(c.totalIncome)}</strong></div>
        <div class="print-kpi"><span>Dépenses</span><strong>${money(c.totalExpenses)}</strong></div>
        <div class="print-kpi"><span>Épargne</span><strong>${money(c.totalSavings)}</strong></div>
        <div class="print-kpi"><span>Solde</span><strong>${money(c.remaining)}</strong></div>
      </div>
      <h2>Répartition 50/30/20</h2>
      <table><thead><tr><th>Enveloppe</th><th class="num">Budget</th><th class="num">Utilisé</th><th class="num">Reste</th><th class="num">Utilisation</th></tr></thead><tbody>
        ${c.envelopeRows.map((env) => `<tr><td>${esc(env.label)}</td><td class="num">${money(env.budget)}</td><td class="num">${money(env.used)}</td><td class="num">${money(env.remaining)}</td><td class="num">${Math.round(env.percent)} %</td></tr>`).join("")}
      </tbody></table>
      <h2>Revenus</h2>
      <table><thead><tr><th>Libellé</th><th>Date</th><th>Nature</th><th class="num">Montant</th></tr></thead><tbody>${incomeRows || `<tr><td colspan="4">Aucun revenu ce mois-ci.</td></tr>`}</tbody></table>
      <h2>Dépenses</h2>
      <table><thead><tr><th>Libellé</th><th>Date</th><th>Catégorie</th><th>Statut</th><th class="num">Montant</th></tr></thead><tbody>${expenseRows || `<tr><td colspan="5">Aucune dépense ce mois-ci.</td></tr>`}</tbody></table>
      <h2>Objectifs d'épargne</h2>
      <table><thead><tr><th>Objectif</th><th class="num">Épargné</th><th class="num">Cible</th><th class="num">Progression</th><th>Estimation</th></tr></thead><tbody>${goalRows || `<tr><td colspan="5">Aucun objectif.</td></tr>`}</tbody></table>
      <div class="print-foot"><span>SmartBudget — PayControl · Document personnel</span><span>${esc(location.host || "smartbudget.app")}</span></div>
    </div>`;
    document.getElementById("print-root").innerHTML = report;
    const previousTitle = document.title;
    document.title = `Bilan SmartBudget — ${U.monthLabel(c.month)}`;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    setTimeout(() => {
      window.print();
      setTimeout(restore, 1500);
    }, 60);
  }

  /* ------------------------------------------------------------------ */
  /* Délégation d'événements                                            */
  /* ------------------------------------------------------------------ */

  function bindEvents() {
    window.addEventListener("hashchange", () => {
      render();
    });

    document.addEventListener("click", (event) => {
      const scrollTarget = event.target.closest("[data-scroll]");
      if (scrollTarget) {
        event.preventDefault();
        const id = scrollTarget.getAttribute("data-scroll");
        if (location.hash && location.hash !== "#/" && location.hash !== "") {
          navigate("#/");
          setTimeout(() => {
            const target = document.getElementById(id);
            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 220);
        } else {
          const target = document.getElementById(id);
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      const skip = event.target.closest(".skip-link");
      if (skip) {
        event.preventDefault();
        const main = document.getElementById("app-content") || document.getElementById("app");
        if (main) {
          main.setAttribute("tabindex", "-1");
          main.focus({ preventScroll: true });
          main.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      const iconPick = event.target.closest("[data-pick-icon]");
      if (iconPick) {
        event.preventDefault();
        const picker = iconPick.closest("[data-icon-picker]");
        if (!picker) return;
        picker.querySelectorAll("[data-pick-icon]").forEach((btn) => btn.classList.remove("is-active"));
        iconPick.classList.add("is-active");
        const hidden = picker.querySelector('input[type="hidden"]');
        if (hidden) hidden.value = iconPick.getAttribute("data-pick-icon");
        return;
      }

      const colorPick = event.target.closest("[data-pick-color]");
      if (colorPick) {
        event.preventDefault();
        const picker = colorPick.closest("[data-color-picker]");
        if (!picker) return;
        picker.querySelectorAll("[data-pick-color]").forEach((btn) => btn.classList.remove("is-active"));
        colorPick.classList.add("is-active");
        const hidden = picker.querySelector('input[type="hidden"]');
        if (hidden) hidden.value = colorPick.getAttribute("data-pick-color");
        return;
      }

      const trigger = track(event);
      if (!trigger) return;
      const action = trigger.getAttribute("data-action");
      if (!action) return;
      if (trigger.tagName === "A" && trigger.getAttribute("href") && (action === "close-modal" || action === "open-expense" || action === "open-income")) {
        /* laisser le lien agir */
      } else {
        event.preventDefault();
      }
      Promise.resolve()
        .then(() => handleAction(action, trigger))
        .catch((e) => {
          console.error(e);
          UI.toast(e && e.message ? e.message : "Action impossible.", "error");
        });
    });

    document.addEventListener("submit", (event) => {
      const form = event.target.closest("form[data-form]");
      if (!form) return;
      event.preventDefault();
      handleSubmit(form);
    });

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (target.matches('[data-action="expense-category"]')) {
        App.expenseCat = target.value;
        render();
        return;
      }
      if (target.matches('input[type="radio"][name="type"]')) {
        const group = target.closest(".segmented");
        if (group) {
          group.querySelectorAll(".seg-opt").forEach((opt) => {
            const input = opt.querySelector("input");
            opt.classList.toggle("is-active", Boolean(input && input.checked));
          });
        }
      }
      if (target.matches('select[name="currency"]') && App.ctx) {
        /* la devise s'applique uniquement après enregistrement */
      }
    });

    document.addEventListener("input", (event) => {
      const target = event.target;
      if (target.matches("[data-pct-range]") || target.matches("[data-pct-number]")) {
        syncPercent(target);
        return;
      }
      if (target.matches("[data-sim-input]")) {
        const amount = U.parseAmount(target.value);
        updateSimulator(amount);
      }
      if (target.hasAttribute("aria-invalid")) target.removeAttribute("aria-invalid");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const sidebar = document.getElementById("sidebar");
        if (sidebar && sidebar.classList.contains("is-open")) {
          document.querySelectorAll('[data-action="close-sidebar"]').forEach((el) => el.click());
        }
      }
    });

    DB.onAuthChange((event, user) => {
      App.mode = DB.mode;
      if (event === "PASSWORD_RECOVERY") {
        App.recovery = true;
        navigate("#/nouveau-mot-de-passe", true);
        return;
      }
      if (event === "SIGNED_OUT") {
        App.recovery = false;
        A.lastPath = null;
        navigate("#/", true);
        return;
      }
      if (user) render();
    });

    window.addEventListener("error", (event) => {
      if (event && event.message) console.error("[SmartBudget]", event.message);
    });
  }

  function syncPercent(input) {
    const form = input.closest("form");
    if (!form) return;
    const isRange = input.matches("[data-pct-range]");
    const key = input.getAttribute(isRange ? "data-pct-range" : "data-pct-number");
    const range = form.querySelector(`[data-pct-range="${key}"]`);
    const number = form.querySelector(`[data-pct-number="${key}"]`);
    let value = Number(input.value);
    if (!Number.isFinite(value)) value = 0;
    value = U.clamp(Math.round(value), 0, 100);
    if (range) range.value = String(value);
    if (number) number.value = String(value);
    const total = ["besoin", "envie", "epargne"].reduce((sum, k) => {
      const inputEl = form.querySelector(`[data-pct-number="${k}"]`);
      return sum + (Number(inputEl && inputEl.value) || 0);
    }, 0);
    const label = form.querySelector("[data-budget-total]");
    if (label) {
      label.textContent = `${Math.round(total)} %`;
      label.classList.toggle("ok", Math.round(total) === 100);
      label.classList.toggle("bad", Math.round(total) !== 100);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Démarrage                                                          */
  /* ------------------------------------------------------------------ */

  async function boot() {
    initTheme();
    bindEvents();
    if (!location.hash) {
      try {
        history.replaceState(null, "", location.pathname + location.search + "#/");
      } catch (e) {
        /* fichier local : hash facultatif */
      }
    }
    try {
      await DB.init();
    } catch (e) {
      console.warn("[SmartBudget] Initialisation distante impossible, mode démo.", e);
    }
    App.mode = DB.mode;
    if (App.mode === "demo") {
      A.month = U.currentMonth();
      App.month = A.month;
    }
    if (DB.recovery) {
      App.recovery = true;
      try {
        history.replaceState(null, "", location.pathname + location.search + "#/nouveau-mot-de-passe");
      } catch (e) {
        /* ignoré */
      }
    } else if (DB.user && /(access_token|refresh_token|type=recovery)/.test(location.hash)) {
      try {
        history.replaceState(null, "", location.pathname + location.search + "#/app");
      } catch (e) {
        /* ignoré */
      }
    }
    if (App.ctx && App.ctx.profile && !localStorage.getItem("smartbudget.theme")) {
      applyTheme(App.ctx.profile.theme || "light");
    }
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(window);
