/* ==========================================================================
   SmartBudget — noyau applicatif
   Utilitaires, modèle de données, stockage local (démo) et adaptateur Supabase.
   Aucun build : ce fichier est chargé tel quel par index.html.
   ========================================================================== */
(function () {
  "use strict";

  const App = (window.App = window.App || {});
  const CFG = window.APP_CONFIG || {};

  /* ------------------------------------------------------------------ */
  /* Utilitaires                                                        */
  /* ------------------------------------------------------------------ */

  const pad = (n) => String(n).padStart(2, "0");
  const uid = () =>
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);

  const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDate = (s) => {
    const [y, m, d] = String(s).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const todayISO = () => isoDate(new Date());
  const currentMonth = () => todayISO().slice(0, 7);
  const monthOf = (d) => (typeof d === "string" ? d.slice(0, 7) : isoDate(d).slice(0, 7));
  const shiftMonth = (key, delta) => {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return monthOf(d);
  };
  const daysInMonth = (key) => {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  };
  const dateInMonth = (key, day) => `${key}-${pad(Math.min(Math.max(1, day || 1), daysInMonth(key)))}`;
  const addDays = (date, n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  };
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const sum = (arr, fn = (x) => x) => arr.reduce((acc, item) => acc + Number(fn(item) || 0), 0);
  const avg = (arr) => (arr.length ? sum(arr) / arr.length : 0);

  const esc = (value) =>
    String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  const monthLabel = (key) => {
    if (!key) return "";
    return capitalize(
      new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(parseDate(key + "-01"))
    );
  };
  const monthShort = (key) =>
    capitalize(new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(parseDate(key + "-01"))).replace(".", "");

  const dateLabel = (iso, opts) => {
    if (!iso) return "—";
    return new Intl.DateTimeFormat("fr-FR", opts || { day: "numeric", month: "long" }).format(parseDate(iso));
  };
  const dateShort = (iso) => (iso ? dateLabel(iso, { day: "2-digit", month: "2-digit" }) : "—");

  const parseAmount = (value) => {
    if (typeof value === "number") return round2(value);
    const cleaned = String(value || "")
      .replace(/[^\d,.\-]/g, "")
      .replace(/\s/g, "")
      .replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? round2(n) : 0;
  };

  const CURRENCIES = [
    { code: "EUR", label: "Euro — €", locale: "fr-FR" },
    { code: "USD", label: "Dollar américain — $", locale: "en-US" },
    { code: "GBP", label: "Livre sterling — £", locale: "en-GB" },
    { code: "CHF", label: "Franc suisse — CHF", locale: "fr-CH" },
    { code: "CAD", label: "Dollar canadien — CA$", locale: "fr-CA" },
    { code: "XOF", label: "Franc CFA (UEMOA) — FCFA", locale: "fr-FR" },
    { code: "XAF", label: "Franc CFA (CEMAC) — FCFA", locale: "fr-FR" },
    { code: "MAD", label: "Dirham marocain — DH", locale: "fr-MA" },
    { code: "DZD", label: "Dinar algérien — DA", locale: "fr-DZ" },
    { code: "TND", label: "Dinar tunisien — DT", locale: "fr-TN" }
  ];
  const zeroDecimal = new Set(["XOF", "XAF"]);
  const currencyInfo = (code) => CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];

  const fmtMoney = (amount, code, opts) => {
    const info = currencyInfo(code || "EUR");
    const value = Number(amount) || 0;
    try {
      return new Intl.NumberFormat(info.locale, {
        style: "currency",
        currency: info.code,
        minimumFractionDigits: zeroDecimal.has(info.code) ? 0 : Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: zeroDecimal.has(info.code) ? 0 : 2,
        ...(opts || {})
      }).format(value);
    } catch (e) {
      return value.toFixed(2) + " " + info.code;
    }
  };

  const fmtNumber = (n, code) => {
    const info = currencyInfo(code || "EUR");
    const value = Number(n) || 0;
    try {
      return new Intl.NumberFormat(info.locale, {
        minimumFractionDigits: zeroDecimal.has(info.code) ? 0 : Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: zeroDecimal.has(info.code) ? 0 : 2
      }).format(value);
    } catch (e) {
      return String(value);
    }
  };

  const fmtPct = (n, digits = 0) =>
    `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits }).format(Number(n) || 0)} %`;

  const uidPrefix = (prefix) => `${prefix}-${uid().slice(0, 8)}`;

  const ENVELOPES = {
    besoin: {
      key: "besoin",
      label: "Besoins vitaux",
      short: "Besoins",
      color: "#2f8f72",
      soft: "rgba(47, 143, 114, .14)",
      icon: "home",
      hint: "Loyer, courses, factures, transport, santé."
    },
    envie: {
      key: "envie",
      label: "Envies & plaisirs",
      short: "Envies",
      color: "#e0a23b",
      soft: "rgba(224, 162, 59, .16)",
      icon: "sparkles",
      hint: "Sorties, restaurants, shopping, abonnements loisirs."
    },
    epargne: {
      key: "epargne",
      label: "Épargne & projets",
      short: "Épargne",
      color: "#5b7cf5",
      soft: "rgba(91, 124, 245, .15)",
      icon: "piggy",
      hint: "Fond d'urgence, voyages, investissements, projets."
    }
  };

  const DEFAULT_CATEGORIES = [
    { id: "cat-logement", name: "Logement", envelope: "besoin", icon: "🏠", color: "#5b7cf5" },
    { id: "cat-alimentation", name: "Alimentation", envelope: "besoin", icon: "🛒", color: "#2f9e79" },
    { id: "cat-transport", name: "Transport", envelope: "besoin", icon: "🚗", color: "#e0a458" },
    { id: "cat-factures", name: "Factures & abonnements", envelope: "besoin", icon: "📺", color: "#7a6ff0" },
    { id: "cat-sante", name: "Santé", envelope: "besoin", icon: "💊", color: "#e0708a" },
    { id: "cat-education", name: "Éducation", envelope: "besoin", icon: "📚", color: "#4ea8de" },
    { id: "cat-loisirs", name: "Loisirs", envelope: "envie", icon: "🎬", color: "#e9b44c" },
    { id: "cat-restaurants", name: "Restaurants", envelope: "envie", icon: "🍽️", color: "#d97757" },
    { id: "cat-shopping", name: "Shopping", envelope: "envie", icon: "🛍️", color: "#b07cd6" },
    { id: "cat-epargne", name: "Épargne", envelope: "epargne", icon: "💰", color: "#3baa8c" },
    { id: "cat-autres", name: "Autres", envelope: "besoin", icon: "✨", color: "#8a9a91" }
  ];

  const CATEGORY_COLORS = [
    "#5b7cf5", "#2f9e79", "#e0a458", "#7a6ff0", "#e0708a", "#4ea8de",
    "#e9b44c", "#d97757", "#b07cd6", "#3baa8c", "#8a9a91", "#c26b5b"
  ];
  const CATEGORY_ICONS = ["🏠", "🛒", "🚗", "📺", "💊", "📚", "🎬", "🍽️", "🛍️", "💰", "✨", "✈️", "🎁", "🐾", "🧸", "🎮", "☕", "⛽", "💻", "🏋️"];

  /* ------------------------------------------------------------------ */
  /* Données de démonstration                                           */
  /* ------------------------------------------------------------------ */

  const DEMO_KEY = "smartbudget.demo.v3";
  const SESSION_KEY = "smartbudget.session.v3";

  const DEFAULT_PROFILE = () => ({
    id: "demo-user",
    email: "demo@smartbudget.app",
    fullName: "Camille Martin",
    currency: "EUR",
    paydayDay: 1,
    theme: "light",
    needsPct: 50,
    wantsPct: 30,
    savingsPct: 20,
    createdAt: new Date().toISOString()
  });

  function buildSeed() {
    const now = new Date();
    const today = isoDate(now);
    const m0 = currentMonth();
    const months = [shiftMonth(m0, -2), shiftMonth(m0, -1), m0];
    const colorOf = (id) => (DEFAULT_CATEGORIES.find((c) => c.id === id) || {}).color || "#8a9a91";

    const categories = DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      createdAt: new Date(months[0] + "-01T08:00:00").toISOString()
    }));

    const recurringIncomes = [
      { id: "rec-sal", title: "Salaire net", amount: 2800, type: "salary", dayOfMonth: 1, active: true, createdAt: months[0] + "-01T08:00:00.000Z" },
      { id: "rec-prime", title: "Prime transport", amount: 75, type: "extra", dayOfMonth: 5, active: true, createdAt: months[0] + "-01T08:00:00.000Z" }
    ];

    const recurringExpenses = [
      { id: "rec-loyer", title: "Loyer", amount: 780, envelope: "besoin", categoryId: "cat-logement", dayOfMonth: 2, active: true, createdAt: months[0] + "-01T08:00:00.000Z" },
      { id: "rec-elec", title: "Électricité", amount: 68, envelope: "besoin", categoryId: "cat-factures", dayOfMonth: 28, active: true, createdAt: months[0] + "-01T08:00:00.000Z" },
      { id: "rec-internet", title: "Internet fibre", amount: 29.99, envelope: "besoin", categoryId: "cat-factures", dayOfMonth: 5, active: true, createdAt: months[0] + "-01T08:00:00.000Z" },
      { id: "rec-tel", title: "Forfait mobile", amount: 19.99, envelope: "besoin", categoryId: "cat-factures", dayOfMonth: 5, active: true, createdAt: months[0] + "-01T08:00:00.000Z" },
      { id: "rec-mutuelle", title: "Mutuelle santé", amount: 42, envelope: "besoin", categoryId: "cat-sante", dayOfMonth: 10, active: true, createdAt: months[0] + "-01T08:00:00.000Z" },
      { id: "rec-credit", title: "Crédit auto", amount: 210, envelope: "besoin", categoryId: "cat-transport", dayOfMonth: 12, active: true, createdAt: months[0] + "-01T08:00:00.000Z" },
      { id: "rec-assurance", title: "Assurance habitation", amount: 24.5, envelope: "besoin", categoryId: "cat-logement", dayOfMonth: 26, active: true, createdAt: months[0] + "-01T08:00:00.000Z" },
      { id: "rec-netflix", title: "Netflix", amount: 13.49, envelope: "envie", categoryId: "cat-factures", dayOfMonth: 15, active: true, createdAt: months[0] + "-01T08:00:00.000Z" },
      { id: "rec-spotify", title: "Spotify", amount: 10.99, envelope: "envie", categoryId: "cat-factures", dayOfMonth: 15, active: true, createdAt: months[0] + "-01T08:00:00.000Z" },
      { id: "rec-sport", title: "Salle de sport", amount: 29.99, envelope: "envie", categoryId: "cat-loisirs", dayOfMonth: 3, active: true, createdAt: months[0] + "-01T08:00:00.000Z" }
    ];

    const variableModels = [
      { title: "Courses alimentaires", amount: 112, categoryId: "cat-alimentation", day: 12 },
      { title: "Courses alimentaires", amount: 98, categoryId: "cat-alimentation", day: 19 },
      { title: "Courses alimentaires", amount: 86, categoryId: "cat-alimentation", day: 21 },
      { title: "Carburant", amount: 72, categoryId: "cat-transport", day: 10 },
      { title: "Pharmacie", amount: 24.5, categoryId: "cat-sante", day: 18 },
      { title: "Restaurant entre amis", amount: 68, categoryId: "cat-restaurants", day: 17 },
      { title: "Shopping vêtements", amount: 119, categoryId: "cat-shopping", day: 16 },
      { title: "Cinéma", amount: 31, categoryId: "cat-loisirs", day: 21 },
      { title: "Jeu vidéo", amount: 24.99, categoryId: "cat-loisirs", day: 13 }
    ];
    const monthScale = [0.93, 1.06, 1];

    const incomes = [];
    const expenses = [];

    months.forEach((month, index) => {
      recurringIncomes.forEach((tpl) => {
        const receivedAt = dateInMonth(month, tpl.dayOfMonth);
        incomes.push({
          id: uid(),
          title: tpl.title,
          amount: tpl.amount,
          type: tpl.type,
          receivedAt,
          monthKey: month,
          recurringId: tpl.id,
          skipped: false,
          createdAt: new Date(month + "-01T08:00:00").toISOString()
        });
      });

      recurringExpenses.forEach((tpl) => {
        const dueDate = dateInMonth(month, tpl.dayOfMonth);
        expenses.push({
          id: uid(),
          title: tpl.title,
          amount: tpl.amount,
          envelope: tpl.envelope,
          categoryId: tpl.categoryId,
          isFixed: true,
          isPaid: dueDate <= today || month < m0,
          dueDate,
          monthKey: month,
          recurringId: tpl.id,
          skipped: false,
          createdAt: new Date(month + "-01T08:00:00").toISOString()
        });
      });

      variableModels.forEach((model) => {
        const amount = round2(model.amount * monthScale[index]);
        const dueDate = dateInMonth(month, model.day);
        if (month === m0 && dueDate > today) return;
        const cat = categories.find((c) => c.id === model.categoryId);
        expenses.push({
          id: uid(),
          title: model.title,
          amount,
          envelope: cat ? cat.envelope : "besoin",
          categoryId: model.categoryId,
          isFixed: false,
          isPaid: true,
          dueDate,
          monthKey: month,
          recurringId: null,
          skipped: false,
          createdAt: new Date(dueDate + "T12:00:00").toISOString()
        });
      });
    });

    const extraIncomes = [
      { month: months[0], title: "Remboursement mutuelle", amount: 68, day: 22 },
      { month: months[1], title: "Vente vélo", amount: 140, day: 19 },
      { month: m0, title: "Mission freelance", amount: 320, day: 14 }
    ];
    extraIncomes.forEach((extra) => {
      incomes.push({
        id: uid(),
        title: extra.title,
        amount: extra.amount,
        type: "extra",
        receivedAt: dateInMonth(extra.month, extra.day),
        monthKey: extra.month,
        recurringId: null,
        skipped: false,
        createdAt: new Date(extra.month + "-01T08:00:00").toISOString()
      });
    });

    const goalDefs = [
      { title: "Voyage au Japon", target: 1200, initial: 250, monthly: 200, icon: "✈️", color: "#5b7cf5", date: shiftMonth(m0, 8) + "-15" },
      { title: "Fond d'urgence", target: 3000, initial: 500, monthly: 200, icon: "🛡️", color: "#2f9e79", date: shiftMonth(m0, 14) + "-01" },
      { title: "Nouvel ordinateur", target: 900, initial: 50, monthly: 50, icon: "💻", color: "#e0a23b", date: shiftMonth(m0, 6) + "-20" }
    ];

    const goals = [];
    const contributions = [];
    goalDefs.forEach((def, gi) => {
      const goalId = "goal-" + (gi + 1);
      goals.push({
        id: goalId,
        title: def.title,
        targetAmount: def.target,
        currentAmount: 0,
        targetDate: def.date,
        icon: def.icon,
        color: def.color,
        createdAt: new Date(months[0] + "-01T08:00:00").toISOString()
      });
      const initialId = uid();
      contributions.push({
        id: initialId,
        goalId,
        amount: def.initial,
        contributedAt: dateInMonth(months[0], 2),
        monthKey: months[0],
        createdAt: new Date(months[0] + "-02T08:00:00").toISOString()
      });
      months.forEach((month) => {
        contributions.push({
          id: uid(),
          goalId,
          amount: def.monthly,
          contributedAt: dateInMonth(month, 6),
          monthKey: month,
          createdAt: new Date(month + "-06T08:00:00").toISOString()
        });
      });
    });
    goals.forEach((goal) => {
      goal.currentAmount = round2(sum(contributions.filter((c) => c.goalId === goal.id), (c) => c.amount));
    });

    return {
      profile: DEFAULT_PROFILE(),
      categories,
      recurringIncomes,
      incomes,
      recurringExpenses,
      expenses,
      goals,
      contributions,
      createdAt: new Date().toISOString()
    };
  }

  const delay = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

  /* ------------------------------------------------------------------ */
  /* Stockage local (mode démo)                                         */
  /* ------------------------------------------------------------------ */

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  const Demo = {
    seed(fullName) {
      const state = buildSeed();
      if (fullName) {
        state.profile.fullName = fullName;
        state.profile.email = "demo@smartbudget.app";
      }
      writeStorage(DEMO_KEY, state);
      return state;
    },
    read() {
      let state = readStorage(DEMO_KEY, null);
      if (!state || !state.profile) state = this.seed();
      return state;
    },
    save(state) {
      writeStorage(DEMO_KEY, state);
    },
    reset() {
      return this.seed();
    },
    session() {
      return readStorage(SESSION_KEY, null);
    },
    setSession(session) {
      if (session) writeStorage(SESSION_KEY, session);
      else localStorage.removeItem(SESSION_KEY);
    },
    tables() {
      const names = ["categories", "recurringIncomes", "incomes", "recurringExpenses", "expenses", "goals", "contributions"];
      const state = this.read();
      names.forEach((n) => {
        if (!Array.isArray(state[n])) state[n] = [];
      });
      this.save(state);
      return state;
    },
    async list(table) {
      await delay(20);
      return clone(this.tables()[table] || []);
    },
    async insert(table, row) {
      const state = this.tables();
      const record = { ...row, id: row.id || uid(), createdAt: row.createdAt || new Date().toISOString() };
      state[table] = state[table] || [];
      state[table].push(record);
      if (table === "contributions") this.recomputeGoal(state, record.goalId);
      this.save(state);
      await delay(20);
      return clone(record);
    },
    async update(table, id, patch) {
      const state = this.tables();
      const list = state[table] || [];
      const index = list.findIndex((r) => r.id === id);
      if (index === -1) throw new Error("Élément introuvable.");
      list[index] = { ...list[index], ...patch, id };
      state[table] = list;
      if (table === "contributions") this.recomputeGoal(state, list[index].goalId);
      this.save(state);
      await delay(20);
      return clone(list[index]);
    },
    async remove(table, id) {
      const state = this.tables();
      const list = state[table] || [];
      const row = list.find((r) => r.id === id);
      state[table] = list.filter((r) => r.id !== id);
      if (table === "goals") {
        state.contributions = (state.contributions || []).filter((c) => c.goalId !== id);
      }
      if (table === "categories") {
        (state.expenses || []).forEach((e) => {
          if (e.categoryId === id) e.categoryId = null;
        });
        (state.recurringExpenses || []).forEach((e) => {
          if (e.categoryId === id) e.categoryId = null;
        });
      }
      if (table === "contributions" && row) this.recomputeGoal(state, row.goalId);
      this.save(state);
      await delay(20);
      return true;
    },
    recomputeGoal(state, goalId) {
      const goal = (state.goals || []).find((g) => g.id === goalId);
      if (!goal) return;
      goal.currentAmount = round2(sum((state.contributions || []).filter((c) => c.goalId === goalId), (c) => c.amount));
    },
    async ensureMonth(monthKey) {
      if (monthKey > currentMonth()) return;
      const state = this.tables();
      const templatesIn = state.recurringIncomes || [];
      const templatesEx = state.recurringExpenses || [];
      let changed = false;

      templatesIn.forEach((tpl) => {
        if (!tpl.active) return;
        if (monthKey < monthOf(tpl.createdAt || todayISO())) return;
        const exists = (state.incomes || []).some((i) => i.recurringId === tpl.id && (i.monthKey || i.receivedAt.slice(0, 7)) === monthKey);
        if (exists) return;
        state.incomes.push({
          id: uid(),
          title: tpl.title,
          amount: tpl.amount,
          type: tpl.type || "extra",
          receivedAt: dateInMonth(monthKey, tpl.dayOfMonth),
          monthKey,
          recurringId: tpl.id,
          skipped: false,
          createdAt: new Date().toISOString()
        });
        changed = true;
      });

      templatesEx.forEach((tpl) => {
        if (!tpl.active) return;
        if (monthKey < monthOf(tpl.createdAt || todayISO())) return;
        const exists = (state.expenses || []).some((e) => e.recurringId === tpl.id && (e.monthKey || e.dueDate.slice(0, 7)) === monthKey);
        if (exists) return;
        state.expenses.push({
          id: uid(),
          title: tpl.title,
          amount: tpl.amount,
          envelope: tpl.envelope,
          categoryId: tpl.categoryId || null,
          isFixed: true,
          isPaid: false,
          dueDate: dateInMonth(monthKey, tpl.dayOfMonth),
          monthKey,
          recurringId: tpl.id,
          skipped: false,
          createdAt: new Date().toISOString()
        });
        changed = true;
      });

      if (changed) this.save(state);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Adaptateur Supabase                                                */
  /* ------------------------------------------------------------------ */

  const TABLE_DEFS = {
    categories: {
      table: "categories",
      fields: { id: "id", name: "name", envelope: "envelope", icon: "icon", color: "color", createdAt: "created_at" }
    },
    recurringIncomes: {
      table: "recurring_incomes",
      fields: { id: "id", title: "title", amount: "amount", type: "type", dayOfMonth: "day_of_month", active: "active", createdAt: "created_at" }
    },
    incomes: {
      table: "incomes",
      fields: { id: "id", title: "title", amount: "amount", type: "type", receivedAt: "received_at", monthKey: "month_key", recurringId: "recurring_id", skipped: "skipped", createdAt: "created_at" }
    },
    recurringExpenses: {
      table: "recurring_expenses",
      fields: { id: "id", title: "title", amount: "amount", envelope: "envelope", categoryId: "category_id", dayOfMonth: "day_of_month", active: "active", createdAt: "created_at" }
    },
    expenses: {
      table: "expenses",
      fields: { id: "id", title: "title", amount: "amount", envelope: "envelope", categoryId: "category_id", isFixed: "is_fixed", isPaid: "is_paid", dueDate: "due_date", monthKey: "month_key", recurringId: "recurring_id", skipped: "skipped", createdAt: "created_at" }
    },
    goals: {
      table: "savings_goals",
      fields: { id: "id", title: "title", targetAmount: "target_amount", currentAmount: "current_amount", targetDate: "target_date", icon: "icon", color: "color", createdAt: "created_at" }
    },
    contributions: {
      table: "savings_contributions",
      fields: { id: "id", goalId: "goal_id", amount: "amount", contributedAt: "contributed_at", monthKey: "month_key", createdAt: "created_at" }
    }
  };

  const PROFILE_FIELDS = {
    id: "id",
    email: "email",
    fullName: "full_name",
    currency: "currency",
    paydayDay: "payday_day",
    theme: "theme",
    needsPct: "needs_pct",
    wantsPct: "wants_pct",
    savingsPct: "savings_pct",
    createdAt: "created_at"
  };

  function mapRow(def, source, direction) {
    const out = {};
    Object.keys(def.fields).forEach((key) => {
      const dbKey = def.fields[key];
      if (direction === "from" && dbKey in source) out[key] = source[dbKey];
      if (direction === "to" && key in source && source[key] !== undefined) out[dbKey] = source[key];
    });
    return out;
  }

  function mapProfile(source) {
    const out = {};
    Object.keys(PROFILE_FIELDS).forEach((key) => {
      const dbKey = PROFILE_FIELDS[key];
      if (dbKey in source) out[key] = source[dbKey];
    });
    if (!out.fullName) out.fullName = "";
    if (!out.currency) out.currency = "EUR";
    if (!out.paydayDay) out.paydayDay = 1;
    if (!out.theme) out.theme = "light";
    out.needsPct = source.needs_pct == null ? 50 : Number(source.needs_pct);
    out.wantsPct = source.wants_pct == null ? 30 : Number(source.wants_pct);
    out.savingsPct = source.savings_pct == null ? 20 : Number(source.savings_pct);
    return out;
  }

  function frError(error) {
    const msg = String((error && error.message) || error || "");
    if (/Invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
    if (/Email not confirmed/i.test(msg)) return "Confirmez votre adresse email avant de vous connecter.";
    if (/User already registered/i.test(msg)) return "Un compte existe déjà avec cet email.";
    if (/Password should be at least/i.test(msg)) return "Le mot de passe doit contenir au moins 6 caractères.";
    if (/rate limit|too many/i.test(msg)) return "Trop de tentatives. Réessayez dans quelques minutes.";
    if (/JWT|session|Auth session missing/i.test(msg)) return "Votre session a expiré. Reconnectez-vous.";
    if (/duplicate key/i.test(msg)) return "Cet élément existe déjà.";
    if (/Database error saving new user/i.test(msg)) {
      return "L'initialisation de votre espace a échoué. Exécutez le correctif Supabase (fix_signup_trigger.sql), puis réessayez.";
    }
    if (/Failed to fetch|NetworkError|fetch/i.test(msg)) return "Connexion impossible. Vérifiez votre réseau.";
    return msg || "Une erreur inattendue est survenue.";
  }

  const S = {
    mode: "demo",
    client: null,
    user: null,
    recovery: false,
    _authCb: null
  };

  const DB = {
    get mode() {
      return S.mode;
    },
    get configured() {
      return Boolean(S.client);
    },
    get user() {
      return S.user;
    },
    get recovery() {
      return S.recovery;
    },
    set recovery(v) {
      S.recovery = Boolean(v);
    },

    async init() {
      const url = String(CFG.SUPABASE_URL || "").trim();
      const key = String(CFG.SUPABASE_ANON_KEY || "").trim();
      if (url && key && window.supabase && url.startsWith("http")) {
        try {
          S.client = window.supabase.createClient(url, key, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
          });
          S.mode = "cloud";
          const { data } = await S.client.auth.getSession();
          if (data && data.session && data.session.user) {
            S.user = await this._loadCloudUser(data.session.user);
          }
          S.client.auth.onAuthStateChange(async (event, session) => {
            if (event === "PASSWORD_RECOVERY") S.recovery = true;
            if (session && session.user) {
              try {
                S.user = await this._loadCloudUser(session.user);
              } catch (e) {
                S.user = { id: session.user.id, email: session.user.email, fullName: session.user.email };
              }
            } else {
              S.user = null;
            }
            if (S._authCb) S._authCb(event, S.user);
          });
          return S.mode;
        } catch (e) {
          console.warn("[SmartBudget] Supabase indisponible, passage en mode démo.", e);
          S.client = null;
        }
      }
      S.mode = "demo";
      const session = Demo.session();
      S.user = session ? { email: session.email, id: "demo-user" } : null;
      return S.mode;
    },

    async _loadCloudUser(authUser) {
      const { data, error } = await S.client.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
      if (error && error.code !== "PGRST116") throw new Error(frError(error));
      let profile = data ? mapProfile(data) : null;
      let profileCreated = false;
      if (!profile) {
        const fallback = {
          id: authUser.id,
          email: authUser.email,
          full_name: (authUser.user_metadata && authUser.user_metadata.full_name) || (authUser.email || "").split("@")[0],
          currency: "EUR",
          payday_day: 1,
          theme: "light",
          needs_pct: 50,
          wants_pct: 30,
          savings_pct: 20
        };
        const { data: created, error: insertError } = await S.client.from("profiles").insert(fallback).select("*").single();
        if (insertError) throw new Error(frError(insertError));
        profile = mapProfile(created);
        profileCreated = true;
      }

      // Le trigger Supabase crée normalement les catégories à l'inscription.
      // Ce rattrapage couvre les projets où le trigger est absent ou a échoué.
      if (profileCreated) {
        const defaults = DEFAULT_CATEGORIES.map((cat) => ({
          user_id: authUser.id,
          name: cat.name,
          envelope: cat.envelope,
          icon: cat.icon,
          color: cat.color
        }));
        const { error: categoriesError } = await S.client.from("categories").insert(defaults);
        if (categoriesError) {
          console.warn("[SmartBudget] Catégories par défaut non créées.", categoriesError);
        }
      }

      return { id: authUser.id, email: profile.email || authUser.email, fullName: profile.fullName, profile };
    },

    onAuthChange(cb) {
      S._authCb = cb;
    },

    async getProfile() {
      if (S.mode === "cloud") {
        if (!S.user) return null;
        const { data, error } = await S.client.from("profiles").select("*").eq("id", S.user.id).maybeSingle();
        if (error) throw new Error(frError(error));
        return data ? mapProfile(data) : null;
      }
      const state = Demo.read();
      const profile = state.profile || DEFAULT_PROFILE();
      if (S.user && S.user.email) profile.email = S.user.email;
      return clone(profile);
    },

    async updateProfile(patch) {
      if (S.mode === "cloud") {
        const payload = {};
        Object.keys(PROFILE_FIELDS).forEach((key) => {
          if (patch[key] !== undefined) payload[PROFILE_FIELDS[key]] = patch[key];
        });
        const { data, error } = await S.client.from("profiles").update(payload).eq("id", S.user.id).select("*").single();
        if (error) throw new Error(frError(error));
        if (S.user) S.user.fullName = data.full_name;
        return mapProfile(data);
      }
      const state = Demo.read();
      state.profile = { ...state.profile, ...patch };
      Demo.save(state);
      if (patch.email) {
        const email = String(patch.email).trim().toLowerCase();
        Demo.setSession({ email, at: Date.now() });
        if (S.user) {
          S.user.email = email;
          if (S.user.profile) S.user.profile.email = email;
        }
      }
      return clone(state.profile);
    },

    async signIn(email, password) {
      if (S.mode === "cloud") {
        const { data, error } = await S.client.auth.signInWithPassword({ email, password });
        if (error) throw new Error(frError(error));
        if (data.user) S.user = await this._loadCloudUser(data.user);
        return S.user;
      }
      const state = Demo.read();
      Demo.setSession({ email, at: Date.now() });
      S.user = { id: "demo-user", email, profile: state.profile };
      return S.user;
    },

    async signUp(email, password, fullName) {
      if (S.mode === "cloud") {
        const { data, error } = await S.client.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw new Error(frError(error));
        const needsConfirm = !data.session;
        if (data.session && data.user) S.user = await this._loadCloudUser(data.user);
        return { needsConfirm, user: S.user };
      }
      const state = Demo.read();
      if (fullName) state.profile.fullName = fullName;
      state.profile.email = email;
      Demo.save(state);
      Demo.setSession({ email, at: Date.now() });
      S.user = { id: "demo-user", email, profile: state.profile };
      return { needsConfirm: false, user: S.user };
    },

    async startDemo() {
      if (S.client) {
        S.mode = "demo";
        S.user = null;
      }
      const state = Demo.read();
      Demo.setSession({ email: state.profile.email, at: Date.now() });
      S.user = { id: "demo-user", email: state.profile.email, profile: state.profile };
      return S.user;
    },

    async signOut() {
      if (S.mode === "cloud") {
        await S.client.auth.signOut();
      } else {
        Demo.setSession(null);
        if (S.client) S.mode = "cloud";
      }
      S.user = null;
    },

    async requestReset(email) {
      if (S.mode === "cloud") {
        const { error } = await S.client.auth.resetPasswordForEmail(email, {
          redirectTo: location.origin + location.pathname
        });
        if (error) throw new Error(frError(error));
        return;
      }
      await delay(300);
    },

    async updatePassword(password) {
      if (S.mode === "cloud") {
        const { error } = await S.client.auth.updateUser({ password });
        if (error) throw new Error(frError(error));
        S.recovery = false;
        return;
      }
      await delay(200);
      S.recovery = false;
    },

    async signInWithOAuth(provider) {
      if (S.mode !== "cloud") throw new Error("Les connexions Google et Apple nécessitent un projet Supabase configuré.");
      const { error } = await S.client.auth.signInWithOAuth({
        provider,
        options: { redirectTo: location.origin + location.pathname }
      });
      if (error) throw new Error(frError(error));
    },

    async deleteAccount() {
      if (S.mode === "cloud") {
        const { error } = await S.client.rpc("delete_my_account");
        if (error) throw new Error(frError(error));
        await S.client.auth.signOut();
        S.user = null;
        return;
      }
      Demo.reset();
      Demo.setSession(null);
      S.user = null;
    },

    async resetDemo() {
      const state = Demo.reset();
      Demo.setSession({ email: state.profile.email, at: Date.now() });
      S.user = { id: "demo-user", email: state.profile.email, profile: state.profile };
      return state;
    },

    async list(table) {
      const def = TABLE_DEFS[table];
      if (!def) throw new Error("Table inconnue : " + table);
      if (S.mode === "demo") return Demo.list(table);
      const order = table === "contributions" ? ["contributed_at", true] : ["created_at", true];
      const { data, error } = await S.client.from(def.table).select("*").order(order[0], { ascending: order[1] });
      if (error) throw new Error(frError(error));
      return (data || []).map((row) => mapRow(def, row, "from"));
    },

    async insert(table, row) {
      const def = TABLE_DEFS[table];
      if (!def) throw new Error("Table inconnue : " + table);
      if (S.mode === "demo") return Demo.insert(table, row);
      const payload = mapRow(def, row, "to");
      payload.user_id = S.user.id;
      const { data, error } = await S.client.from(def.table).insert(payload).select("*").single();
      if (error) throw new Error(frError(error));
      return mapRow(def, data, "from");
    },

    async update(table, id, patch) {
      const def = TABLE_DEFS[table];
      if (!def) throw new Error("Table inconnue : " + table);
      if (S.mode === "demo") return Demo.update(table, id, patch);
      const payload = mapRow(def, patch, "to");
      const { data, error } = await S.client.from(def.table).update(payload).eq("id", id).select("*").single();
      if (error) throw new Error(frError(error));
      return mapRow(def, data, "from");
    },

    async remove(table, id) {
      const def = TABLE_DEFS[table];
      if (!def) throw new Error("Table inconnue : " + table);
      if (S.mode === "demo") return Demo.remove(table, id);
      const { error } = await S.client.from(def.table).delete().eq("id", id);
      if (error) throw new Error(frError(error));
      return true;
    },

    async ensureMonth(monthKey) {
      if (S.mode === "demo") return Demo.ensureMonth(monthKey);
      if (!S.user || monthKey > currentMonth()) return;
      const [incTpl, expTpl, incomes, expenses] = await Promise.all([
        this.list("recurringIncomes"),
        this.list("recurringExpenses"),
        this.list("incomes"),
        this.list("expenses")
      ]);
      const ops = [];
      (incTpl || []).forEach((tpl) => {
        if (!tpl.active) return;
        if (monthKey < monthOf(tpl.createdAt || todayISO())) return;
        const exists = (incomes || []).some((i) => i.recurringId === tpl.id && (i.monthKey || (i.receivedAt || "").slice(0, 7)) === monthKey);
        if (exists) return;
        ops.push(
          this.insert("incomes", {
            title: tpl.title,
            amount: tpl.amount,
            type: tpl.type || "extra",
            receivedAt: dateInMonth(monthKey, tpl.dayOfMonth),
            monthKey,
            recurringId: tpl.id,
            skipped: false
          })
        );
      });
      (expTpl || []).forEach((tpl) => {
        if (!tpl.active) return;
        if (monthKey < monthOf(tpl.createdAt || todayISO())) return;
        const exists = (expenses || []).some((e) => e.recurringId === tpl.id && (e.monthKey || (e.dueDate || "").slice(0, 7)) === monthKey);
        if (exists) return;
        ops.push(
          this.insert("expenses", {
            title: tpl.title,
            amount: tpl.amount,
            envelope: tpl.envelope,
            categoryId: tpl.categoryId || null,
            isFixed: true,
            isPaid: false,
            dueDate: dateInMonth(monthKey, tpl.dayOfMonth),
            monthKey,
            recurringId: tpl.id,
            skipped: false
          })
        );
      });
      for (let i = 0; i < ops.length; i += 1) {
        try {
          await ops[i];
        } catch (e) {
          console.warn("[SmartBudget] Matérialisation impossible", e);
        }
      }
    }
  };

  /* ------------------------------------------------------------------ */
  /* Moteur de calcul                                                   */
  /* ------------------------------------------------------------------ */

  const envKey = (value) => (ENVELOPES[value] ? value : "besoin");

  function nextPayday(profile, from) {
    const now = from || new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = clamp(Number((profile && profile.paydayDay) || 1), 1, 31);
    let year = start.getFullYear();
    let month = start.getMonth();
    let candidate = new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));
    if (candidate < start) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      candidate = new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));
    }
    const days = Math.round((candidate - start) / 86400000);
    return { date: isoDate(candidate), days, day };
  }

  function goalProgress(goal, contributions) {
    const target = Number(goal.targetAmount) || 0;
    const current = Math.max(0, Number(goal.currentAmount) || 0);
    const percent = target > 0 ? clamp((current / target) * 100, 0, 100) : 0;
    const remaining = Math.max(0, target - current);
    const recent = (contributions || []).filter((c) => c.goalId === goal.id && Number(c.amount) > 0);
    const last = recent.slice(-6);
    const avgMonthly = last.length ? sum(last, (c) => c.amount) / 6 : 0;
    let eta = null;
    if (remaining <= 0) eta = "Objectif atteint";
    else if (avgMonthly > 0.5) {
      const months = Math.ceil(remaining / avgMonthly);
      const d = new Date();
      d.setMonth(d.getMonth() + months);
      eta = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
    }
    return { target, current, percent, remaining, avgMonthly, eta, complete: remaining <= 0 };
  }

  function compute(state, monthKey) {
    const profile = state.profile || DEFAULT_PROFILE();
    const currency = profile.currency || "EUR";
    const month = monthKey || currentMonth();
    const today = todayISO();
    const isCurrent = month === currentMonth();
    const dim = daysInMonth(month);
    const dayToday = isCurrent ? new Date().getDate() : dim;

    const cats = state.categories || [];
    const catById = new Map(cats.map((c) => [c.id, c]));

    const incomes = (state.incomes || []).filter(
      (i) => !i.skipped && (i.monthKey || (i.receivedAt || "").slice(0, 7)) === month
    );
    const expenses = (state.expenses || []).filter(
      (e) => !e.skipped && (e.monthKey || (e.dueDate || "").slice(0, 7)) === month
    );
    const contributions = (state.contributions || []).filter(
      (c) => (c.monthKey || (c.contributedAt || "").slice(0, 7)) === month
    );

    const totalIncome = round2(sum(incomes, (i) => i.amount));
    const totalExpenses = round2(sum(expenses, (e) => e.amount));
    const totalSavings = round2(sum(contributions, (c) => c.amount));
    const totalPaid = round2(sum(expenses.filter((e) => e.isPaid), (e) => e.amount));
    const totalPending = round2(totalExpenses - totalPaid);
    const remaining = round2(totalIncome - totalExpenses - totalSavings);

    const needsPct = Number(profile.needsPct == null ? 50 : profile.needsPct);
    const wantsPct = Number(profile.wantsPct == null ? 30 : profile.wantsPct);
    const savingsPct = Number(profile.savingsPct == null ? 20 : profile.savingsPct);
    const needsBudget = round2((totalIncome * needsPct) / 100);
    const wantsBudget = round2((totalIncome * wantsPct) / 100);
    const savingsBudget = round2((totalIncome * savingsPct) / 100);

    const spent = { besoin: 0, envie: 0, epargne: 0 };
    expenses.forEach((e) => {
      const cat = catById.get(e.categoryId);
      const env = envKey(e.envelope || (cat && cat.envelope));
      spent[env] = round2(spent[env] + Number(e.amount || 0));
    });
    spent.epargne = round2(spent.epargne + totalSavings);

    const budgets = { besoin: needsBudget, envie: wantsBudget, epargne: savingsBudget };
    const envelopeRows = ["besoin", "envie", "epargne"].map((key) => {
      const budget = budgets[key];
      const used = spent[key];
      return {
        key,
        ...ENVELOPES[key],
        budget,
        used,
        remaining: round2(budget - used),
        percent: budget > 0 ? (used / budget) * 100 : used > 0 ? 100 : 0
      };
    });

    const byCategoryMap = new Map();
    expenses.forEach((e) => {
      const cat = catById.get(e.categoryId);
      const id = e.categoryId || "none";
      if (!byCategoryMap.has(id)) {
        byCategoryMap.set(id, {
          id,
          name: cat ? cat.name : "Sans catégorie",
          icon: cat ? cat.icon : "✨",
          color: cat ? cat.color : "#8a9a91",
          envelope: envKey(e.envelope || (cat && cat.envelope)),
          amount: 0,
          count: 0
        });
      }
      const row = byCategoryMap.get(id);
      row.amount = round2(row.amount + Number(e.amount || 0));
      row.count += 1;
    });
    const byCategory = [...byCategoryMap.values()].sort((a, b) => b.amount - a.amount);

    const safeFree = round2(totalIncome - totalExpenses - savingsBudget);
    const daysLeft = isCurrent ? Math.max(1, dim - dayToday + 1) : 0;
    const dailyAvailable = isCurrent ? Math.max(0, safeFree / daysLeft) : 0;

    const pending = expenses
      .filter((e) => !e.isPaid)
      .sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));
    const overdue = isCurrent ? pending.filter((e) => e.dueDate && e.dueDate < today && month === currentMonth()) : [];
    const upcoming = isCurrent ? pending.filter((e) => !e.dueDate || e.dueDate >= today) : pending;

    const needsRatio = needsBudget > 0 ? spent.besoin / needsBudget : spent.besoin > 0 ? 2 : 0;
    const wantsRatio = wantsBudget > 0 ? spent.envie / wantsBudget : spent.envie > 0 ? 2 : 0;
    const savingsRatio = savingsBudget > 0 ? totalSavings / savingsBudget : totalSavings > 0 ? 1 : 0;

    let score = 100;
    const reasons = [];
    if (totalIncome <= 0) {
      score = 0;
      reasons.push("Ajoutez vos revenus pour activer le diagnostic.");
    } else {
      if (needsRatio > 1) {
        score -= 30;
        reasons.push("Les besoins vitaux dépassent leur enveloppe.");
      } else if (needsRatio > 0.9) {
        score -= 8;
        reasons.push("Les besoins vitaux approchent de leur plafond.");
      }
      if (wantsRatio > 1) {
        score -= 25;
        reasons.push("Les envies dépassent le budget prévu.");
      } else if (wantsRatio > 0.85) {
        score -= 8;
        reasons.push("Les dépenses plaisirs sont proches de la limite.");
      }
      if (savingsRatio < 0.5) {
        score -= 20;
        reasons.push("L'épargne du mois est très en retard sur l'objectif.");
      } else if (savingsRatio < 0.8) {
        score -= 8;
        reasons.push("L'épargne du mois est légèrement en retard.");
      }
      if (remaining < 0) {
        score -= 45;
        reasons.unshift("Le solde du mois est négatif.");
      } else if (remaining < totalIncome * 0.05) {
        score -= 15;
        reasons.push("La marge de sécurité est faible.");
      }
      if (overdue.length) {
        score -= 25;
        reasons.unshift(overdue.length + (overdue.length > 1 ? " factures en retard." : " facture en retard."));
      }
    }
    score = clamp(Math.round(score), 0, 100);
    let tone = "green";
    let label = "Budget maîtrisé";
    if (totalIncome <= 0) {
      tone = "neutral";
      label = "À configurer";
    } else if (score < 45 || remaining < 0) {
      tone = "red";
      label = "Risque de découvert";
    } else if (score < 75) {
      tone = "orange";
      label = "Vigilance";
    }
    const health = { tone, label, score, reasons, needsRatio, wantsRatio, savingsRatio };

    /* Courbe : solde cumulé jour par jour */
    const line = [];
    for (let d = 1; d <= dim; d += 1) {
      const dayIso = dateInMonth(month, d);
      const incomeToDay = sum(incomes.filter((i) => i.receivedAt && i.receivedAt <= dayIso), (i) => i.amount);
      const spentToDay = sum(expenses.filter((e) => e.dueDate && e.dueDate <= dayIso), (e) => e.amount);
      const savedToDay = sum(contributions.filter((c) => c.contributedAt && c.contributedAt <= dayIso), (c) => c.amount);
      const paidToDay = sum(expenses.filter((e) => e.dueDate && e.dueDate <= dayIso && e.isPaid), (e) => e.amount);
      const actual = d <= dayToday ? round2(incomeToDay - paidToDay - savedToDay) : null;
      line.push({ day: d, iso: dayIso, projected: round2(incomeToDay - spentToDay - savedToDay), actual });
    }

    const balanceRatio = totalIncome > 0 ? remaining / totalIncome : 0;
    const savingsRate = totalIncome > 0 ? totalSavings / totalIncome : 0;

    return {
      month,
      isCurrent,
      today,
      dim,
      daysLeft,
      currency,
      profile,
      incomes,
      expenses,
      contributions,
      totalIncome,
      totalExpenses,
      totalSavings,
      totalPaid,
      totalPending,
      remaining,
      safeFree,
      dailyAvailable,
      needsBudget,
      wantsBudget,
      savingsBudget,
      budgets,
      spent,
      envelopeRows,
      byCategory,
      pending,
      overdue,
      upcoming,
      health,
      line,
      balanceRatio,
      savingsRate,
      counts: {
        incomes: incomes.length,
        expenses: expenses.length,
        goals: (state.goals || []).length
      }
    };
  }

  function monthSummary(state, monthKey) {
    const c = compute(state, monthKey);
    return {
      month: monthKey,
      income: c.totalIncome,
      expenses: c.totalExpenses,
      savings: c.totalSavings,
      balance: c.remaining,
      health: c.health,
      paid: c.totalPaid
    };
  }

  /* ------------------------------------------------------------------ */
  /* Export public                                                      */
  /* ------------------------------------------------------------------ */

  App.utils = {
    pad, uid, isoDate, parseDate, todayISO, currentMonth, monthOf, shiftMonth, daysInMonth,
    dateInMonth, addDays, clamp, round2, sum, avg, esc, clone, capitalize, monthLabel,
    monthShort, dateLabel, dateShort, parseAmount, fmtMoney, fmtNumber, fmtPct, uidPrefix
  };
  App.constants = {
    CURRENCIES, ENVELOPES, DEFAULT_CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS,
    DEFAULT_PROFILE, CFG
  };
  App.DB = DB;
  App.compute = compute;
  App.monthSummary = monthSummary;
  App.goalProgress = goalProgress;
  App.nextPayday = nextPayday;
  App.demoSeed = buildSeed;
})(window);
