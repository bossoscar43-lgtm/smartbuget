/* ==========================================================================
   SmartBudget — vues (rendu HTML)
   ========================================================================== */
(function () {
  "use strict";

  const App = window.App;
  const U = App.utils;
  const UI = App.UI;
  const icon = UI.icon;
  const esc = U.esc;
  const V = (App.Views = App.Views || {});

  const ctx = () => App.ctx || {};
  const money = (value) => U.fmtMoney(value, (ctx().profile || {}).currency || "EUR");
  const catMap = () => (ctx().catById || new Map());
  const catOf = (id) => catMap().get(id) || null;

  function envelopeKey(value) {
    return App.constants.ENVELOPES[value] ? value : "besoin";
  }

  function monthName(key) {
    return U.monthLabel(key || (ctx().month || U.currentMonth()));
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 6) return "Bonsoir";
    if (h < 12) return "Bonjour";
    if (h < 18) return "Bon après-midi";
    return "Bonsoir";
  }

  function firstName() {
    const name = ((ctx().profile || {}).fullName || "").trim();
    return name ? name.split(/\s+/)[0] : "vous";
  }

  function categoryOptions(selected, includeEmpty) {
    const cats = (ctx().data && ctx().data.categories) || [];
    const groups = { besoin: [], envie: [], epargne: [] };
    cats.forEach((c) => {
      if (groups[envelopeKey(c.envelope)]) groups[envelopeKey(c.envelope)].push(c);
    });
    let html = includeEmpty === false ? "" : `<option value="">Sans catégorie</option>`;
    Object.keys(groups).forEach((key) => {
      if (!groups[key].length) return;
      const env = App.constants.ENVELOPES[key];
      html += `<optgroup label="${esc(env.label)}">`;
      groups[key].forEach((c) => {
        html += `<option value="${esc(c.id)}"${selected === c.id ? " selected" : ""}>${esc(c.icon || "")} ${esc(c.name)}</option>`;
      });
      html += `</optgroup>`;
    });
    return html;
  }

  function envelopeOptions(selected) {
    return Object.keys(App.constants.ENVELOPES)
      .map((key) => {
        const env = App.constants.ENVELOPES[key];
        return `<option value="${key}"${selected === key ? " selected" : ""}>${esc(env.label)}</option>`;
      })
      .join("");
  }

  function goalOptions(selected) {
    return ((ctx().data && ctx().data.goals) || [])
      .map((g) => `<option value="${esc(g.id)}"${selected === g.id ? " selected" : ""}>${esc(g.icon || "🎯")} ${esc(g.title)}</option>`)
      .join("");
  }

  function progressColor(pct) {
    if (pct > 100) return "var(--danger)";
    if (pct > 85) return "var(--warning)";
    return "var(--brand)";
  }

  function paydayText() {
    const info = App.nextPayday(ctx().profile);
    if (info.days === 0) return "Aujourd'hui";
    if (info.days === 1) return "Demain";
    return "J-" + info.days;
  }

  /* ------------------------------------------------------------------ */
  /* Site vitrine                                                       */
  /* ------------------------------------------------------------------ */

  V.landing = function () {
    const tpl = document.getElementById("landing-template");
    if (!tpl) return "";
    const wrap = document.createElement("div");
    wrap.innerHTML = tpl.innerHTML;
    wrap.querySelectorAll("[data-icon]").forEach((el) => {
      const name = el.getAttribute("data-icon");
      el.outerHTML = UI.icon(name, "", 18);
    });
    wrap.querySelectorAll("[data-check]").forEach((el) => {
      el.outerHTML = `<span class="check-ic" style="display:inline-flex;color:var(--brand)">${UI.icon("check-circle", "", 14)}</span>`;
    });
    wrap.querySelectorAll("[data-arrow]").forEach((el) => {
      el.outerHTML = `<span class="step-arrow">${UI.icon("arrow-right", "", 20)}</span>`;
    });
    wrap.querySelectorAll("[data-theme-icon]").forEach((el) => {
      el.innerHTML = UI.icon(App.theme === "dark" ? "sun" : "moon", "", 18);
    });
    const logo = wrap.querySelector(".brand-mark");
    if (logo) logo.style.color = "";
    return wrap.innerHTML;
  };

  /* ------------------------------------------------------------------ */
  /* Authentification                                                   */
  /* ------------------------------------------------------------------ */

  V.auth = function (mode) {
    const current = mode || "login";
    const demo = App.mode === "demo";
    const err = App.authError
      ? `<div class="form-note" style="background:var(--danger-soft);border-color:transparent;color:var(--danger)">${icon("alert", "", 16)}<span>${esc(App.authError)}</span></div>`
      : "";

    let title = "Content de vous revoir.";
    let sub = "Connectez-vous pour retrouver votre budget, vos factures et vos objectifs.";
    let formTitle = "Se connecter";
    let form = "";

    if (current === "signup") {
      title = "Créez votre espace.";
      sub = "Deux minutes suffisent pour poser les bases d'un budget qui respire.";
      formTitle = "Créer mon compte";
      form = `
        <form class="auth-form" data-form="signup" novalidate>
          ${err}
          <div class="field">
            <label for="signup-name">Nom complet</label>
            <input class="input" id="signup-name" name="fullName" type="text" autocomplete="name" placeholder="Camille Martin" required>
          </div>
          <div class="field">
            <label for="signup-email">Adresse email</label>
            <input class="input" id="signup-email" name="email" type="email" autocomplete="email" placeholder="vous@exemple.fr" required>
          </div>
          <div class="field">
            <label for="signup-password">Mot de passe</label>
            <div class="password-field">
              <input class="input" id="signup-password" name="password" type="password" autocomplete="new-password" placeholder="6 caractères minimum" minlength="6" required>
              <button class="password-toggle" type="button" data-action="toggle-password" data-target="signup-password" aria-label="Afficher le mot de passe">${icon("eye", "", 17)}</button>
            </div>
            <span class="field-hint">Utilisez au moins 6 caractères, dont une majuscule et un chiffre de préférence.</span>
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">Créer mon compte ${icon("arrow-right", "", 16)}</button>
          <p class="auth-hint">En créant un compte, vous acceptez nos <a href="legal.html#cgu">conditions d'utilisation</a> et notre <a href="legal.html#donnees">politique de confidentialité</a>.</p>
        </form>
        <div class="auth-sep">ou</div>
        <div class="oauth-row">
          <button class="oauth-btn" type="button" data-action="oauth-google">${icon("brand-google", "", 17)} Google</button>
          <button class="oauth-btn" type="button" data-action="oauth-apple">${icon("brand-apple", "", 18)} Apple</button>
        </div>
        ${demo ? demoCallout() : ""}
        <p class="auth-hint" style="margin-top:20px">Déjà un compte ? <a href="#/connexion" data-action="auth-login">Se connecter</a></p>
      `;
    } else if (current === "reset") {
      title = "Mot de passe oublié.";
      sub = "Indiquez votre email : nous vous enverrons un lien sécurisé pour en choisir un nouveau.";
      formTitle = "Recevoir le lien";
      form = `
        <form class="auth-form" data-form="reset" novalidate>
          ${err}
          <div class="field">
            <label for="reset-email">Adresse email</label>
            <input class="input" id="reset-email" name="email" type="email" autocomplete="email" placeholder="vous@exemple.fr" required>
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">Envoyer le lien ${icon("arrow-right", "", 16)}</button>
        </form>
        <p class="auth-hint" style="margin-top:20px"><a href="#/connexion" data-action="auth-login">${icon("chevron-left", "", 13)} Revenir à la connexion</a></p>
        ${demo ? `<div class="demo-callout">${icon("info", "", 18)}<div><strong>Mode démo</strong>La réinitialisation d'email n'est pas active. Utilisez directement la démo ou n'importe quel mot de passe.</div></div>` : ""}
      `;
    } else if (current === "recovery") {
      title = "Nouveau mot de passe.";
      sub = "Choisissez un mot de passe solide. Il remplacera l'ancien immédiatement.";
      formTitle = "Enregistrer le mot de passe";
      form = `
        <form class="auth-form" data-form="set-password" novalidate>
          ${err}
          <div class="field">
            <label for="new-password">Nouveau mot de passe</label>
            <div class="password-field">
              <input class="input" id="new-password" name="password" type="password" autocomplete="new-password" placeholder="6 caractères minimum" minlength="6" required>
              <button class="password-toggle" type="button" data-action="toggle-password" data-target="new-password" aria-label="Afficher le mot de passe">${icon("eye", "", 17)}</button>
            </div>
          </div>
          <div class="field">
            <label for="confirm-password">Confirmer le mot de passe</label>
            <input class="input" id="confirm-password" name="confirm" type="password" autocomplete="new-password" placeholder="Retapez le mot de passe" required>
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">Mettre à jour ${icon("check", "", 16)}</button>
        </form>
      `;
    } else {
      form = `
        <form class="auth-form" data-form="login" novalidate>
          ${err}
          <div class="field">
            <label for="login-email">Adresse email</label>
            <input class="input" id="login-email" name="email" type="email" autocomplete="email" placeholder="vous@exemple.fr" required>
          </div>
          <div class="field">
            <label for="login-password">Mot de passe</label>
            <div class="password-field">
              <input class="input" id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Votre mot de passe" required>
              <button class="password-toggle" type="button" data-action="toggle-password" data-target="login-password" aria-label="Afficher le mot de passe">${icon("eye", "", 17)}</button>
            </div>
          </div>
          <div class="row-between" style="margin-top:-3px">
            <span class="small muted" style="font-size:11px"></span>
            <a class="auth-link small" style="font-size:11px" href="#/connexion" data-action="auth-reset">Mot de passe oublié ?</a>
          </div>
          <button class="btn btn-primary btn-lg btn-block" type="submit">${formTitle} ${icon("arrow-right", "", 16)}</button>
        </form>
        <div class="auth-sep">ou continuer avec</div>
        <div class="oauth-row">
          <button class="oauth-btn" type="button" data-action="oauth-google">${icon("brand-google", "", 17)} Google</button>
          <button class="oauth-btn" type="button" data-action="oauth-apple">${icon("brand-apple", "", 18)} Apple</button>
        </div>
        ${demo ? demoCallout() : ""}
        <p class="auth-hint" style="margin-top:20px">Pas encore de compte ? <a href="#/connexion" data-action="auth-signup">Créer un espace</a></p>
      `;
    }

    return `<main class="auth-layout">
      <section class="auth-panel">
        <div class="auth-top">
          <a href="#/" data-action="go-home">${UI.logo(34)}</a>
          <a class="back" href="#/" data-action="go-home">${icon("chevron-left", "", 14)} <span>Retour au site</span></a>
        </div>
        <div class="auth-card">
          <h1 class="auth-title">${title}</h1>
          <p class="auth-sub">${sub}</p>
          ${form}
          <p class="auth-legal">${demo ? "Mode démonstration local · " : ""}Données protégées · <a href="legal.html#donnees">Confidentialité</a> · <a href="legal.html#securite">Sécurité</a></p>
        </div>
      </section>
      <aside class="auth-side" aria-hidden="true">
        <div class="auth-side-top">
          ${UI.logo(34)}
          <span class="auth-side-badge">${icon("lock", "", 11)} Espace personnel</span>
        </div>
        <div class="auth-side-mid">
          <h2>Votre budget,<br><em>enfin lisible.</em></h2>
          <p>Un regard clair sur ce qui entre, ce qui sort et ce qui reste. SmartBudget relie vos revenus à vos projets, sans vous noyer dans les chiffres.</p>
          <div class="auth-side-cards">
            <div class="auth-side-card">
              <small>${icon("wallet", "", 12)} Reste à vivre</small>
              <strong>77,42 €</strong>
              <span>par jour jusqu'au 31</span>
              <div class="mini-progress"><i style="width:74%"></i></div>
            </div>
            <div class="auth-side-card">
              <small>${icon("piggy", "", 12)} Épargne totale</small>
              <strong>2 150 €</strong>
              <span>3 projets en cours</span>
              <div class="mini-progress"><i style="width:58%"></i></div>
            </div>
          </div>
        </div>
        <div class="auth-side-foot">${icon("shield", "", 14)} Connexion sécurisée · Supabase Auth & Row Level Security</div>
      </aside>
    </main>`;
  };

  function demoCallout() {
    return `<div class="demo-callout">
      ${icon("sparkles", "", 18)}
      <div>
        <strong>Curieux ? Entrez sans compte.</strong>
        La démo charge un budget complet avec trois mois d'historique, dans votre navigateur.
        <button class="btn btn-soft btn-sm" type="button" data-action="start-demo">Explorer la démo ${icon("arrow-right", "", 14)}</button>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Tableau de bord                                                    */
  /* ------------------------------------------------------------------ */

  V.dashboard = function () {
    const c = ctx().c;
    const profile = ctx().profile;
    const data = ctx().data;
    const health = c.health;
    const pay = App.nextPayday(profile);
    const salary = U.sum(c.incomes.filter((i) => i.type === "salary"), (i) => i.amount);
    const extras = U.sum(c.incomes.filter((i) => i.type !== "salary"), (i) => i.amount);
    const goals = (data.goals || []).slice(0, 3).map((g) => ({ goal: g, prog: App.goalProgress(g, data.contributions) }));
    const remainingRatio = c.totalIncome > 0 ? (c.remaining / c.totalIncome) * 100 : 0;
    const wants = c.envelopeRows.find((e) => e.key === "envie");
    const savingsGoal = (data.goals || [])[0];

    const notice =
      health.tone === "red" || health.tone === "orange"
        ? `<div class="insight ${health.tone === "red" ? "danger" : "warn"}" style="margin-bottom:14px">
            ${icon(health.tone === "red" ? "alert" : "info", "", 17)}
            <div><strong>${esc(health.label)}.</strong> ${esc(health.reasons[0] || "Vérifiez vos enveloppes pour retrouver de la marge.")}</div>
          </div>`
        : "";

    return `<div class="page-head">
      <div class="page-head-txt">
        <span class="page-eyebrow">${icon("dashboard", "", 13)} Tableau de bord</span>
        <h1 class="page-title">${greeting()}, ${esc(firstName())}.</h1>
        <p class="page-sub">Voici où en est votre budget en ${esc(monthName(c.month).toLowerCase())}.</p>
      </div>
      <div class="page-actions">
        ${UI.healthChip(health)}
        <a class="btn btn-ghost btn-sm" href="#/app/simulateur">${icon("calculator", "", 15)} Puis-je me l'offrir ?</a>
        <button class="btn btn-primary btn-sm" type="button" data-action="open-expense">${icon("plus", "", 15)} Dépense</button>
      </div>
    </div>
    ${notice}
    <div class="dash-main">
      <article class="daily-card">
        <div class="daily-card-top">
          <span>${icon("sun", "", 14)} Reste à vivre quotidien</span>
          <span class="daily-countdown">${icon("calendar", "", 12)} ${pay.days === 0 ? "Paie aujourd'hui" : pay.days === 1 ? "Paie demain" : "Paie dans " + pay.days + " j"}</span>
        </div>
        <div>
          <div class="daily-value">${money(c.dailyAvailable)} <small>/ jour</small></div>
          <p class="daily-caption">
            ${c.totalIncome > 0
              ? `Après ${money(c.totalExpenses)} de dépenses et ${money(c.savingsBudget)} d'épargne prévue, il reste ${money(Math.max(0, c.safeFree))} à répartir sur ${c.daysLeft} jour${c.daysLeft > 1 ? "s" : ""}.`
              : "Ajoutez vos revenus pour calculer votre marge quotidienne réelle."}
          </p>
        </div>
        <div class="daily-bar">
          <div class="track"><i style="width:${U.clamp(remainingRatio, 0, 100).toFixed(0)}%"></i></div>
          <div class="daily-bar-foot">
            <span>Marge non affectée <b>${money(Math.max(0, c.safeFree))}</b></span>
            <span>Prochain jour de paie : <b>${U.dateShort(pay.date)}</b></span>
          </div>
        </div>
      </article>

      <div class="kpi-grid">
        <article class="kpi">
          <div class="kpi-top">
            <span class="kpi-ic tone-income">${icon("income", "", 17)}</span>
            <span class="kpi-delta good">${c.incomes.length} entrée${c.incomes.length > 1 ? "s" : ""}</span>
          </div>
          <div>
            <span class="kpi-label">Revenus du mois</span>
            <div class="kpi-value">${money(c.totalIncome)}</div>
          </div>
          <div class="kpi-foot"><span>Fixe <b>${money(salary)}</b></span><span>Ponctuel <b>${money(extras)}</b></span></div>
        </article>
        <article class="kpi">
          <div class="kpi-top">
            <span class="kpi-ic tone-expense">${icon("expense", "", 17)}</span>
            <span class="kpi-delta ${c.totalPending > 0 ? "bad" : "good"}">${c.totalPending > 0 ? money(c.totalPending) + " à payer" : "Tout est payé"}</span>
          </div>
          <div>
            <span class="kpi-label">Dépenses engagées</span>
            <div class="kpi-value">${money(c.totalExpenses)}</div>
          </div>
          <div class="kpi-foot"><span>Payé <b>${money(c.totalPaid)}</b></span><span>${c.expenses.length} dépense${c.expenses.length > 1 ? "s" : ""}</span></div>
        </article>
        <article class="kpi">
          <div class="kpi-top">
            <span class="kpi-ic tone-save">${icon("piggy", "", 17)}</span>
            <span class="kpi-delta ${c.totalSavings >= c.savingsBudget ? "good" : ""}">${Math.round(c.health.savingsRatio * 100)} % de l'objectif</span>
          </div>
          <div>
            <span class="kpi-label">Épargne du mois</span>
            <div class="kpi-value">${money(c.totalSavings)}</div>
          </div>
          <div class="kpi-foot"><span>Objectif <b>${money(c.savingsBudget)}</b></span><span>${goals.length} projet${goals.length > 1 ? "s" : ""}</span></div>
        </article>
      </div>
    </div>

    <div class="env-grid">
      ${c.envelopeRows
        .map(
          (env) => `<article class="env-card" style="--env:${env.color};--env-soft:${env.soft}">
            <div class="env-top">
              <div class="env-name">
                <span class="env-icon">${icon(env.icon, "", 16)}</span>
                <div><strong>${esc(env.label)}</strong><span>${Math.round(env.percent)} % utilisé</span></div>
              </div>
              <span class="env-pct">${Math.round(env.percent)}%</span>
            </div>
            <div class="env-amounts"><strong>${money(env.used)}</strong><span>/ ${money(env.budget)}</span></div>
            ${UI.progress(Math.min(100, env.percent), env.percent > 100 ? "var(--danger)" : env.color, "", `Utilisation ${env.label}`)}
            <div class="env-foot">
              <span>${env.remaining >= 0 ? "Reste " + money(env.remaining) : "Dépassé de " + money(-env.remaining)}</span>
              <span>${keyPercent(env.key, profile)} % du revenu</span>
            </div>
          </article>`
        )
        .join("")}
    </div>

    <div class="chart-grid">
      <section class="card">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">${icon("chart", "", 16)} Évolution du solde</h2>
            <span class="panel-sub">${esc(monthName(c.month))} · revenus, factures et épargne incluses</span>
          </div>
          <span class="mode-pill">${icon("info", "", 11)} Projection</span>
        </div>
        <div class="panel-body top">
          ${UI.lineChart(c.line, c.currency)}
        </div>
      </section>
      <section class="card">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">${icon("chart", "", 16)} Répartition du budget</h2>
            <span class="panel-sub">Dépenses et épargne du mois</span>
          </div>
        </div>
        <div class="donut-layout">
          ${UI.donut(
            c.envelopeRows.map((e) => ({ label: e.label, value: e.used, color: e.color, display: money(e.used) })),
            money(c.totalExpenses + c.totalSavings),
            "utilisés"
          )}
          <div class="legend-list">
            ${c.envelopeRows
              .map(
                (e) => `<div class="legend-item"><i style="background:${e.color}"></i><span>${esc(e.short)}</span><b>${money(e.used)}</b><small>${Math.round(e.percent)}%</small></div>`
              )
              .join("")}
          </div>
        </div>
      </section>
    </div>

    <div class="dash-bottom">
      <section class="card">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">${icon("calendar", "", 16)} Factures à venir</h2>
            <span class="panel-sub">${c.upcoming.length} en attente${c.upcoming.length > 1 ? "s" : ""} · ${money(c.totalPending)}</span>
          </div>
          <a class="panel-link" href="#/app/depenses">Tout voir ${icon("arrow-right", "", 13)}</a>
        </div>
        <div class="panel-body flush">
          ${
            c.upcoming.length
              ? `<div class="bill-list">
                  ${c.upcoming
                    .slice(0, 4)
                    .map((e) => {
                      const cat = catOf(e.categoryId);
                      const late = e.dueDate && e.dueDate < c.today;
                      return `<div class="bill-row">
                        <span class="bill-ic">${esc(cat ? cat.icon : "✨")}</span>
                        <div class="bill-main">
                          <strong>${esc(e.title)}</strong>
                          <span>${esc(cat ? cat.name : "Sans catégorie")} ${late ? "· en retard" : ""}</span>
                        </div>
                        <span class="bill-due ${late ? "late" : ""}">${U.dateShort(e.dueDate)}</span>
                        <span class="bill-amount">${money(e.amount)}</span>
                        <button class="bill-check" type="button" data-action="toggle-paid" data-id="${esc(e.id)}" aria-label="Marquer ${esc(e.title)} comme payée" title="Marquer comme payée">${icon("check", "", 14)}</button>
                      </div>`;
                    })
                    .join("")}
                </div>`
              : UI.empty({ icon: "check-circle", title: "Aucune facture en attente", text: "Toutes vos charges du mois sont réglées. Profitez-en.", action: "" }).replace('class="empty"', 'class="empty empty-inline"')
          }
        </div>
      </section>

      <section class="card">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">${icon("target", "", 16)} Objectifs d'épargne</h2>
            <span class="panel-sub">${goals.length} projet${goals.length > 1 ? "s" : ""} en cours</span>
          </div>
          <a class="panel-link" href="#/app/epargne">Gérer ${icon("arrow-right", "", 13)}</a>
        </div>
        <div class="panel-body flush">
          ${
            goals.length
              ? `<div class="mini-goals">
                  ${goals
                    .map(
                      ({ goal, prog }) => `<div class="mini-goal">
                        <span class="goal-emoji">${esc(goal.icon || "🎯")}</span>
                        <div class="mini-goal-main">
                          <strong>${esc(goal.title)}</strong>
                          ${UI.progress(prog.percent, goal.color || "var(--save)", "", `Objectif ${goal.title}`)}
                          <span>${money(prog.current)} sur ${money(prog.target)}</span>
                        </div>
                        <b>${Math.round(prog.percent)} %</b>
                      </div>`
                    )
                    .join("")}
                </div>`
              : `<div class="panel-body">
                  ${UI.empty({
                    icon: "target",
                    title: "Donnez un nom à votre épargne",
                    text: "Un voyage, un matelas de sécurité, un projet : fixez un objectif et suivez-le.",
                    action: `<a class="btn btn-soft btn-sm" href="#/app/epargne">${icon("plus", "", 14)} Créer un objectif</a>`
                  })}
                </div>`
          }
        </div>
      </section>
    </div>

    <div class="insight" style="margin-top:14px">
      ${icon("sparkles", "", 17)}
      <div>
        <strong>${wants && wants.remaining > 0 ? "Il vous reste " + money(wants.remaining) + " dans l'enveloppe plaisirs." : "Votre enveloppe plaisirs est bien utilisée."}</strong>
        ${savingsGoal ? ` Objectif en cours : <b>${esc(savingsGoal.title)}</b> à ${Math.round(App.goalProgress(savingsGoal, data.contributions).percent)} %.` : " Créez un objectif d'épargne pour donner un cap à votre budget."}
        <a class="panel-link" style="margin-left:6px" href="#/app/simulateur">Simuler un achat ${icon("arrow-right", "", 12)}</a>
      </div>
    </div>`;
  };

  function keyPercent(key, profile) {
    if (key === "besoin") return profile.needsPct;
    if (key === "envie") return profile.wantsPct;
    return profile.savingsPct;
  }

  V._helpers = { categoryOptions, envelopeOptions, goalOptions, money, catOf, monthName, firstName, paydayText, progressColor, keyPercent, envelopeKey, greeting };

/* ------------------------------------------------------------------ */
  /* Revenus                                                            */
  /* ------------------------------------------------------------------ */

  V.incomes = function () {
    const c = ctx().c;
    const data = ctx().data;
    const profile = ctx().profile;
    const pay = App.nextPayday(profile);
    const salaries = c.incomes.filter((i) => i.type === "salary");
    const extras = c.incomes.filter((i) => i.type !== "salary");
    const salaryTotal = U.sum(salaries, (i) => i.amount);
    const extraTotal = U.sum(extras, (i) => i.amount);
    const recurring = data.recurringIncomes || [];
    const dim = c.dim;
    const elapsed = c.isCurrent ? U.clamp(((new Date().getDate() - 1) / dim) * 100, 0, 100) : 100;

    const incomeRow = (inc) => {
      const isGenerated = Boolean(inc.recurringId);
      return `<div class="recurring-row">
        <span class="tx-icon">${inc.type === "salary" ? "💼" : "✨"}</span>
        <div class="tx-main">
          <div class="tx-name">
            <strong>${esc(inc.title)}</strong>
            <div class="tx-meta">
              <span>${U.dateLabel(inc.receivedAt)}</span>
              <span class="sep"></span>
              <span class="tag ${inc.type === "salary" ? "tag-neutral" : "tag-pending"}" style="height:18px;font-size:9px">${inc.type === "salary" ? "Salaire" : "Ponctuel"}</span>
              ${isGenerated ? `<span class="tag tag-neutral" style="height:18px;font-size:9px">${icon("repeat", "", 9)} Récurrent</span>` : ""}
            </div>
          </div>
        </div>
        <span class="tx-amount">${money(inc.amount)}</span>
        <div class="tx-actions">
          <button class="icon-btn" type="button" data-action="edit-income" data-id="${esc(inc.id)}" aria-label="Modifier ${esc(inc.title)}" title="Modifier">${icon("edit", "", 15)}</button>
          <button class="icon-btn danger" type="button" data-action="delete-income" data-id="${esc(inc.id)}" aria-label="Supprimer ${esc(inc.title)}" title="Supprimer">${icon("trash", "", 15)}</button>
        </div>
      </div>`;
    };

    return `<div class="page-head">
      <div class="page-head-txt">
        <span class="page-eyebrow">${icon("income", "", 13)} Revenus</span>
        <h1 class="page-title">Ce qui entre ce mois-ci.</h1>
        <p class="page-sub">Salaire, primes et revenus ponctuels — ${esc(monthName(c.month))}.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-action="open-recurring-income">${icon("repeat", "", 15)} Récurrences</button>
        <button class="btn btn-primary btn-sm" type="button" data-action="open-income">${icon("plus", "", 15)} Nouveau revenu</button>
      </div>
    </div>

    <div class="income-hero">
      <article class="salary-card">
        <span class="eyebrow-dark">${icon("wallet", "", 13)} Revenus de ${esc(monthName(c.month))}</span>
        <div class="salary-value">${money(c.totalIncome)} <small>attendus et reçus</small></div>
        <div class="salary-meta">
          <span class="salary-chip">${icon("check-circle", "", 12)} Salaire ${money(salaryTotal)}</span>
          <span class="salary-chip">${icon("sparkles", "", 12)} Ponctuel ${money(extraTotal)}</span>
          <span class="salary-chip">${icon("income", "", 12)} ${c.incomes.length} entrée${c.incomes.length > 1 ? "s" : ""}</span>
        </div>
      </article>
      <article class="card payday-card">
        <div class="payday-top">
          <span>Prochain jour de paie</span>
          <span class="mode-pill">${icon("calendar", "", 11)} le ${profile.paydayDay}</span>
        </div>
        <div>
          <div class="payday-days">${pay.days === 0 ? "Aujourd'hui" : "J-" + pay.days} <small>${pay.days === 0 ? "" : pay.days > 1 ? "jours" : "jour"}</small></div>
          <p>${U.dateLabel(pay.date, { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        ${UI.progress(elapsed, null, null, "Progression du mois")}
        <p class="tiny muted" style="margin-top:6px">${c.isCurrent ? `Mois en cours · ${c.daysLeft} jour${c.daysLeft > 1 ? "s" : ""} restant${c.daysLeft > 1 ? "s" : ""}` : "Mois clôturé"}</p>
      </article>
    </div>

    <div class="summary-strip">
      <div class="summary-cell"><span>Salaire net</span><strong>${money(salaryTotal)}</strong><small>${salaries.length} versement${salaries.length > 1 ? "s" : ""}</small></div>
      <div class="summary-cell"><span>Revenus ponctuels</span><strong>${money(extraTotal)}</strong><small>${extras.length} entrée${extras.length > 1 ? "s" : ""}</small></div>
      <div class="summary-cell"><span>Total du mois</span><strong>${money(c.totalIncome)}</strong><small>Base de la règle 50/30/20</small></div>
    </div>

    <div class="grid-2">
      <section class="card">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">${icon("income", "", 16)} Revenus du mois</h2>
            <span class="panel-sub">${c.incomes.length} mouvement${c.incomes.length > 1 ? "s" : ""}</span>
          </div>
          <button class="panel-link" type="button" data-action="open-income">${icon("plus", "", 13)} Ajouter</button>
        </div>
        <div class="panel-body flush">
          ${
            c.incomes.length
              ? `<div class="recurring-list">${[...c.incomes].sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt))).map(incomeRow).join("")}</div>`
              : UI.empty({ icon: "income", title: "Aucun revenu ce mois-ci", text: "Commencez par enregistrer votre salaire net pour activer le calcul des enveloppes.", action: `<button class="btn btn-primary btn-sm" type="button" data-action="open-income">${icon("plus", "", 14)} Ajouter un revenu</button>` })
          }
        </div>
      </section>

      <section class="card">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">${icon("repeat", "", 16)} Revenus récurrents</h2>
            <span class="panel-sub">Versés automatiquement chaque mois</span>
          </div>
          <button class="panel-link" type="button" data-action="open-recurring-income">${icon("plus", "", 13)} Ajouter</button>
        </div>
        <div class="panel-body flush">
          ${
            recurring.length
              ? `<div class="recurring-list">
                  ${recurring
                    .map(
                      (tpl) => `<div class="recurring-row">
                        <span class="tx-icon">${tpl.type === "salary" ? "💼" : "🔁"}</span>
                        <div class="tx-main">
                          <div class="tx-name">
                            <strong>${esc(tpl.title)}</strong>
                            <div class="tx-meta"><span>Chaque mois le ${tpl.dayOfMonth}</span><span class="sep"></span><span class="${tpl.active ? "tag tag-paid" : "tag tag-neutral"}" style="height:18px;font-size:9px">${tpl.active ? "Actif" : "En pause"}</span></div>
                          </div>
                        </div>
                        <span class="tx-amount">${money(tpl.amount)}</span>
                        <div class="tx-actions">
                          <button class="icon-btn" type="button" data-action="edit-recurring-income" data-id="${esc(tpl.id)}" aria-label="Modifier ${esc(tpl.title)}">${icon("edit", "", 15)}</button>
                          <button class="icon-btn danger" type="button" data-action="delete-recurring-income" data-id="${esc(tpl.id)}" aria-label="Supprimer ${esc(tpl.title)}">${icon("trash", "", 15)}</button>
                        </div>
                      </div>`
                    )
                    .join("")}
                </div>`
              : UI.empty({ icon: "repeat", title: "Aucun revenu récurrent", text: "Ajoutez votre salaire une fois : il se placera tout seul chaque mois.", action: `<button class="btn btn-soft btn-sm" type="button" data-action="open-recurring-income">${icon("plus", "", 14)} Configurer</button>` })
          }
        </div>
      </section>
    </div>

    <div class="insight" style="margin-top:14px">
      ${icon("info", "", 17)}
      <div><strong>Comment ça marche ?</strong> Les revenus récurrents sont copiés automatiquement à chaque nouveau mois. Vous pouvez modifier une occurrence sans toucher au modèle.</div>
    </div>`;
  };

  /* ------------------------------------------------------------------ */
  /* Dépenses                                                           */
  /* ------------------------------------------------------------------ */

  V.expenses = function () {
    const c = ctx().c;
    const data = ctx().data;
    const filter = App.expenseFilter || "all";
    const query = (App.expenseQuery || "").trim().toLowerCase();
    const catFilter = App.expenseCat || "all";

    let rows = c.expenses.slice();
    if (filter === "fixed") rows = rows.filter((e) => e.isFixed);
    if (filter === "variable") rows = rows.filter((e) => !e.isFixed);
    if (filter === "pending") rows = rows.filter((e) => !e.isPaid);
    if (filter === "paid") rows = rows.filter((e) => e.isPaid);
    if (catFilter !== "all") rows = rows.filter((e) => (e.categoryId || "none") === catFilter);
    if (query) {
      rows = rows.filter((e) => {
        const cat = catOf(e.categoryId);
        return (e.title + " " + (cat ? cat.name : "")).toLowerCase().includes(query);
      });
    }
    rows.sort((a, b) => {
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
      return String(a.dueDate || "").localeCompare(String(b.dueDate || ""));
    });

    const counts = {
      all: c.expenses.length,
      fixed: c.expenses.filter((e) => e.isFixed).length,
      variable: c.expenses.filter((e) => !e.isFixed).length,
      pending: c.expenses.filter((e) => !e.isPaid).length,
      paid: c.expenses.filter((e) => e.isPaid).length
    };
    const filteredTotal = U.sum(rows, (e) => e.amount);
    const recurring = data.recurringExpenses || [];
    const categories = data.categories || [];

    const row = (e) => {
      const cat = catOf(e.categoryId);
      const late = !e.isPaid && e.dueDate && e.dueDate < c.today && c.isCurrent;
      return `<div class="tx-row${!e.isPaid ? " is-pending" : ""}">
        <div class="tx-main">
          <button class="tx-check${e.isPaid ? " is-paid" : ""}" type="button" data-action="toggle-paid" data-id="${esc(e.id)}" aria-pressed="${e.isPaid ? "true" : "false"}" aria-label="${e.isPaid ? "Marquer comme non payée" : "Marquer comme payée"} : ${esc(e.title)}">${icon("check", "", 13)}</button>
          <span class="tx-icon">${esc(cat ? cat.icon : "✨")}</span>
          <div class="tx-name">
            <strong>${esc(e.title)}</strong>
            <div class="tx-meta">
              <span class="${late ? "bill-due late" : ""}">${U.dateLabel(e.dueDate)}</span>
              <span class="sep"></span>
              ${UI.envBadge(envelopeKey(e.envelope || (cat && cat.envelope)))}
              ${e.isFixed ? `<span class="tag tag-neutral" style="height:18px;font-size:9px">${icon("repeat", "", 9)} Fixe</span>` : ""}
            </div>
          </div>
        </div>
        <span class="tx-amount">${money(e.amount)}<small>${esc(cat ? cat.name : "Sans catégorie")}</small></span>
        <div class="tx-status">
          <button class="pay-toggle${e.isPaid ? " is-paid" : ""}" type="button" data-action="toggle-paid" data-id="${esc(e.id)}">
            ${e.isPaid ? icon("check", "", 11) + " Payé" : icon("clock", "", 11) + (late ? " En retard" : " En attente")}
          </button>
        </div>
        <div class="tx-actions">
          <button class="icon-btn" type="button" data-action="edit-expense" data-id="${esc(e.id)}" aria-label="Modifier ${esc(e.title)}" title="Modifier">${icon("edit", "", 15)}</button>
          <button class="icon-btn danger" type="button" data-action="delete-expense" data-id="${esc(e.id)}" aria-label="Supprimer ${esc(e.title)}" title="Supprimer">${icon("trash", "", 15)}</button>
        </div>
      </div>`;
    };

    return `<div class="page-head">
      <div class="page-head-txt">
        <span class="page-eyebrow">${icon("expense", "", 13)} Dépenses</span>
        <h1 class="page-title">Chaque sortie, sans surprise.</h1>
        <p class="page-sub">Fixes, variables et factures à venir — ${esc(monthName(c.month))}.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-action="open-recurring-expense">${icon("repeat", "", 15)} Charges fixes</button>
        <button class="btn btn-primary btn-sm" type="button" data-action="open-expense">${icon("plus", "", 15)} Nouvelle dépense</button>
      </div>
    </div>

    <div class="summary-strip">
      <div class="summary-cell"><span>Total engagé</span><strong>${money(c.totalExpenses)}</strong><small>${counts.fixed} fixe${counts.fixed > 1 ? "s" : ""} · ${counts.variable} variable${counts.variable > 1 ? "s" : ""}</small></div>
      <div class="summary-cell"><span>Déjà payé</span><strong>${money(c.totalPaid)}</strong><small>${counts.paid} dépense${counts.paid > 1 ? "s" : ""} réglée${counts.paid > 1 ? "s" : ""}</small></div>
      <div class="summary-cell"><span>En attente</span><strong style="color:${counts.pending ? "var(--warning)" : "inherit"}">${money(c.totalPending)}</strong><small>${counts.pending} facture${counts.pending > 1 ? "s" : ""} à régler</small></div>
    </div>

    <div class="toolbar">
      <div class="toolbar-left">
        <div class="tabs" role="tablist" aria-label="Filtrer les dépenses">
          ${[
            ["all", "Toutes", counts.all],
            ["fixed", "Fixes", counts.fixed],
            ["variable", "Variables", counts.variable],
            ["pending", "À payer", counts.pending],
            ["paid", "Payées", counts.paid]
          ]
            .map(
              ([key, label, count]) =>
                `<button class="tab${filter === key ? " is-active" : ""}" type="button" data-action="expense-filter" data-filter="${key}">${label}<span class="count">${count}</span></button>`
            )
            .join("")}
        </div>
      </div>
      <div class="toolbar-right">
        <form class="toolbar-right" data-form="expense-search" style="gap:8px">
          <div class="search-box">
            ${icon("search", "", 16)}
            <input class="input" type="search" name="query" value="${esc(App.expenseQuery || "")}" placeholder="Rechercher une dépense…" aria-label="Rechercher une dépense">
          </div>
          <select class="input" name="category" data-action="expense-category" aria-label="Filtrer par catégorie">
            <option value="all">Toutes catégories</option>
            ${categories.map((cat) => `<option value="${esc(cat.id)}"${catFilter === cat.id ? " selected" : ""}>${esc(cat.icon || "")} ${esc(cat.name)}</option>`).join("")}
          </select>
          <button class="btn btn-soft btn-sm" type="submit" aria-label="Rechercher">${icon("search", "", 15)}</button>
        </form>
      </div>
    </div>

    <section class="card list-card">
      ${
        rows.length
          ? `<div>${rows.map(row).join("")}</div>
             <div class="list-foot"><span>${rows.length} dépense${rows.length > 1 ? "s" : ""} affichée${rows.length > 1 ? "s" : ""}</span><span>Total filtré <b>${money(filteredTotal)}</b></span></div>`
          : UI.empty({
              icon: filter === "pending" ? "check-circle" : "receipt",
              title: filter === "pending" ? "Aucune facture en attente" : "Aucune dépense trouvée",
              text: filter === "pending" ? "Tout est réglé pour ce mois. Votre budget vous dit merci." : "Ajustez les filtres ou ajoutez une nouvelle dépense pour compléter le mois.",
              action: `<button class="btn btn-primary btn-sm" type="button" data-action="open-expense">${icon("plus", "", 14)} Ajouter une dépense</button>`
            })
      }
    </section>

    <section class="card" style="margin-top:14px">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">${icon("repeat", "", 16)} Charges récurrentes</h2>
          <span class="panel-sub">Copiées automatiquement chaque mois · ${recurring.length} modèle${recurring.length > 1 ? "s" : ""}</span>
        </div>
        <button class="panel-link" type="button" data-action="open-recurring-expense">${icon("plus", "", 13)} Ajouter</button>
      </div>
      <div class="panel-body flush">
        ${
          recurring.length
            ? `<div class="recurring-list">
                ${recurring
                  .map(
                    (tpl) => `<div class="recurring-row">
                      <span class="tx-icon">${esc((catOf(tpl.categoryId) || {}).icon || "🔁")}</span>
                      <div class="tx-main">
                        <div class="tx-name">
                          <strong>${esc(tpl.title)}</strong>
                          <div class="tx-meta">
                            <span>Chaque mois le ${tpl.dayOfMonth}</span><span class="sep"></span>
                            ${UI.envBadge(tpl.envelope)}
                            <span class="${tpl.active ? "tag tag-paid" : "tag tag-neutral"}" style="height:18px;font-size:9px">${tpl.active ? "Actif" : "En pause"}</span>
                          </div>
                        </div>
                      </div>
                      <span class="tx-amount">${money(tpl.amount)}</span>
                      <div class="tx-actions">
                        <button class="icon-btn" type="button" data-action="edit-recurring-expense" data-id="${esc(tpl.id)}" aria-label="Modifier ${esc(tpl.title)}">${icon("edit", "", 15)}</button>
                        <button class="icon-btn danger" type="button" data-action="delete-recurring-expense" data-id="${esc(tpl.id)}" aria-label="Supprimer ${esc(tpl.title)}">${icon("trash", "", 15)}</button>
                      </div>
                    </div>`
                  )
                  .join("")}
              </div>`
            : `<div class="panel-body">${UI.empty({ icon: "repeat", title: "Aucune charge récurrente", text: "Loyer, abonnements, crédits : enregistrez-les une fois et laissez SmartBudget les replacer chaque mois." })}</div>`
        }
      </div>
    </section>`;
  };

  /* ------------------------------------------------------------------ */
  /* Budget 50/30/20                                                    */
  /* ------------------------------------------------------------------ */

  V.budget = function () {
    const c = ctx().c;
    const profile = ctx().profile;
    const pcts = { besoin: profile.needsPct, envie: profile.wantsPct, epargne: profile.savingsPct };
    const total = Number(pcts.besoin) + Number(pcts.envie) + Number(pcts.epargne);
    const income = c.totalIncome;

    return `<div class="page-head">
      <div class="page-head-txt">
        <span class="page-eyebrow">${icon("chart", "", 13)} Budget</span>
        <h1 class="page-title">Une répartition qui vous ressemble.</h1>
        <p class="page-sub">La règle 50/30/20, calculée sur vos revenus de ${esc(monthName(c.month)).toLowerCase()}.</p>
      </div>
      <div class="page-actions">
        ${UI.healthChip(c.health)}
        <button class="btn btn-ghost btn-sm" type="button" data-action="reset-budget">${icon("refresh", "", 15)} Revenir à 50/30/20</button>
      </div>
    </div>

    ${income <= 0 ? `<div class="insight warn" style="margin-bottom:14px">${icon("alert", "", 17)}<div><strong>Aucun revenu ce mois-ci.</strong> Ajoutez votre salaire pour que les enveloppes se calculent automatiquement.</div></div>` : ""}

    <section class="card allocation-card">
      <div class="allocation-top">
        <div>
          <h2>${money(income)} répartis en trois enveloppes</h2>
          <p>Les montants s'ajustent à chaque revenu enregistré. Vous gardez la main sur les pourcentages.</p>
        </div>
        <span class="mode-pill">${icon("calculate", "", 11)} ${total} % répartis</span>
      </div>
      <div class="allocation-bar" role="img" aria-label="Répartition ${pcts.besoin} % besoins, ${pcts.envie} % envies, ${pcts.epargne} % épargne">
        ${Object.keys(pcts)
          .map((key) => {
            const env = App.constants.ENVELOPES[key];
            return `<span class="allocation-seg" style="width:${U.clamp(pcts[key], 0, 100)}%;background:${env.color}"><span>${pcts[key]} %</span></span>`;
          })
          .join("")}
      </div>
      <div class="allocation-legend">
        ${c.envelopeRows
          .map(
            (env) => `<div class="alloc-legend-item">
              <i style="background:${env.color}"></i>
              <div>
                <strong>${esc(env.label)} · ${money(env.budget)}</strong>
                <span>${money(env.used)} utilisés${env.remaining >= 0 ? " · " + money(env.remaining) + " restants" : " · dépassement de " + money(-env.remaining)}</span>
              </div>
            </div>`
          )
          .join("")}
      </div>
    </section>

    <div class="budget-grid">
      <section class="card">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">${icon("settings", "", 16)} Ajuster les pourcentages</h2>
            <span class="panel-sub">La somme doit être égale à 100 %</span>
          </div>
        </div>
        <div class="panel-body">
          <form data-form="budget" novalidate>
            <div class="pct-editor">
              ${["besoin", "envie", "epargne"]
                .map((key) => {
                  const env = App.constants.ENVELOPES[key];
                  const value = pcts[key];
                  return `<div class="pct-row" style="--env:${env.color};--env-soft:${env.soft}">
                    <span class="pct-badge">${icon(env.icon, "", 18)}</span>
                    <div class="pct-main">
                      <strong>${esc(env.label)}</strong>
                      <span>${esc(env.hint)}</span>
                      <input type="range" min="0" max="100" step="1" value="${value}" data-pct-range="${key}" aria-label="Pourcentage ${esc(env.label)}">
                    </div>
                    <div class="pct-input">
                      <input class="input" type="number" name="${key}Pct" min="0" max="100" step="1" value="${value}" data-pct-number="${key}" aria-label="Pourcentage ${esc(env.label)}">
                      <span>%</span>
                    </div>
                  </div>`;
                })
                .join("")}
            </div>
            <div class="alloc-sum">
              <span>Total de la répartition</span>
              <span class="alloc-total ${total === 100 ? "ok" : "bad"}" data-budget-total>${total} %</span>
            </div>
            <div class="modal-actions-inline">
              <button class="btn btn-primary" type="submit">Enregistrer la répartition</button>
            </div>
          </form>
        </div>
      </section>

      <div class="budget-side">
        <section class="card rule-visual">
          <h3>Utilisation réelle</h3>
          <p>Ce que vous avez consommé par rapport à chaque enveloppe.</p>
          <div class="bars">
            ${c.envelopeRows
              .map(
                (env) => `<div class="rrow" style="--env:${env.color}">
                  <div class="rrow-head"><span>${esc(env.short)} <span>${Math.round(env.percent)} %</span></span><span>${money(env.used)} / ${money(env.budget)}</span></div>
                  ${UI.progress(Math.min(100, env.percent), env.percent > 100 ? "var(--danger)" : env.color, "", `Utilisation ${env.label}`)}
                </div>`
              )
              .join("")}
          </div>
        </section>
        <div class="budget-tip">
          ${icon("sparkles", "", 20)}
          <strong>${c.savingsRate >= 0.2 ? "Votre épargne est sur la bonne voie." : "Un petit point d'épargne en plus ?"}</strong>
          <p>${c.savingsRate >= 0.2
            ? `Vous épargnez ${Math.round(c.savingsRate * 100)} % de vos revenus ce mois-ci. Continuez à alimenter vos objectifs.`
            : `Vous épargnez ${Math.round(c.savingsRate * 100)} % de vos revenus. Passer à 20 % libérerait ${money(Math.max(0, c.savingsBudget - c.totalSavings))} de plus ce mois-ci.`}</p>
        </div>
        <div class="budget-tip">
          ${icon("info", "", 20)}
          <strong>Reste à vivre</strong>
          <p>Après factures et épargne prévue, il reste <b>${money(Math.max(0, c.safeFree))}</b> pour ${c.daysLeft || 0} jour${c.daysLeft > 1 ? "s" : ""}, soit <b>${money(c.dailyAvailable)}</b> par jour.</p>
        </div>
      </div>
    </div>

    <div class="env-grid" style="margin-top:14px">
      ${c.envelopeRows
        .map(
          (env) => `<article class="env-card" style="--env:${env.color};--env-soft:${env.soft}">
            <div class="env-top">
              <div class="env-name">
                <span class="env-icon">${icon(env.icon, "", 16)}</span>
                <div><strong>${esc(env.label)}</strong><span>${esc(env.hint)}</span></div>
              </div>
              <span class="env-pct">${Math.round(env.percent)}%</span>
            </div>
            <div class="env-amounts"><strong>${money(env.used)}</strong><span>/ ${money(env.budget)}</span></div>
            ${UI.progress(Math.min(100, env.percent), env.percent > 100 ? "var(--danger)" : env.color, "", `Utilisation ${env.label}`)}
            <div class="env-foot">
              <span>${env.remaining >= 0 ? "Disponible " + money(env.remaining) : "Dépassé de " + money(-env.remaining)}</span>
              <span>${keyPercent(env.key, profile)} % du revenu</span>
            </div>
          </article>`
        )
        .join("")}
    </div>`;
  };

/* ------------------------------------------------------------------ */
  /* Épargne                                                            */
  /* ------------------------------------------------------------------ */

  const GOAL_ICONS = ["🎯", "✈️", "🛡️", "💻", "🏠", "🚗", "🏖️", "🎁", "💍", "🎓", "🐾", "🌱"];

  V.savings = function () {
    const c = ctx().c;
    const data = ctx().data;
    const profile = ctx().profile;
    const goals = data.goals || [];
    const contributions = (data.contributions || []).slice().sort((a, b) => String(b.contributedAt || "").localeCompare(String(a.contributedAt || "")));
    const enriched = goals
      .map((goal) => ({ goal, prog: App.goalProgress(goal, contributions) }))
      .sort((a, b) => Number(b.prog.complete) - Number(a.prog.complete) || b.prog.percent - a.prog.percent);
    const totalCurrent = U.sum(goals, (g) => g.currentAmount);
    const totalTarget = U.sum(goals, (g) => g.targetAmount);
    const overall = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
    const monthContrib = c.totalSavings;
    const monthTarget = c.savingsBudget;
    const monthPct = monthTarget > 0 ? (monthContrib / monthTarget) * 100 : monthContrib > 0 ? 100 : 0;

    const goalCard = ({ goal, prog }) => {
      const color = goal.color || "var(--save)";
      const history = contributions.filter((ct) => ct.goalId === goal.id).slice(0, 2);
      return `<article class="card goal-card" style="--goal:${esc(color)}">
        <div class="goal-top">
          <div class="goal-identity">
            <span class="goal-emoji-lg">${esc(goal.icon || "🎯")}</span>
            <div>
              <strong>${esc(goal.title)}</strong>
              <span>${prog.complete ? "Objectif atteint" : goal.targetDate ? "Pour " + U.dateLabel(goal.targetDate, { day: "numeric", month: "long", year: "numeric" }) : "Sans échéance"}</span>
            </div>
          </div>
          <span class="goal-pct">${Math.round(prog.percent)}%</span>
        </div>
        <div>
          <div class="goal-amount"><strong>${money(prog.current)}</strong><span>sur ${money(prog.target)}</span></div>
          ${UI.progress(prog.percent, color, "", `Objectif ${goal.title}`)}
        </div>
        <div class="goal-meta">
          <span>${prog.complete ? "Bravo, projet financé !" : "Reste <b>" + money(prog.remaining) + "</b>"}</span>
          <span>${prog.complete ? icon("check-circle", "", 11) + " Terminé" : prog.eta ? "Atteint en <b>" + esc(prog.eta) + "</b>" : "Ajoutez une contribution"}</span>
        </div>
        <div class="goal-actions">
          <button class="btn btn-soft btn-sm" type="button" data-action="open-contribution" data-id="${esc(goal.id)}"${prog.complete ? " disabled" : ""}>${icon("plus", "", 13)} Contribuer</button>
          <button class="icon-btn" type="button" data-action="edit-goal" data-id="${esc(goal.id)}" aria-label="Modifier ${esc(goal.title)}" title="Modifier">${icon("edit", "", 15)}</button>
          <button class="icon-btn danger" type="button" data-action="delete-goal" data-id="${esc(goal.id)}" aria-label="Supprimer ${esc(goal.title)}" title="Supprimer">${icon("trash", "", 15)}</button>
        </div>
        ${
          history.length
            ? `<div class="goal-history">${history
                .map((ct) => `<div class="goal-history-row">${icon("check", "", 11)}<span>${U.dateLabel(ct.contributedAt, { day: "numeric", month: "short" })}</span><b>+ ${money(ct.amount)}</b></div>`)
                .join("")}</div>`
            : ""
        }
      </article>`;
    };

    return `<div class="page-head">
      <div class="page-head-txt">
        <span class="page-eyebrow">${icon("target", "", 13)} Épargne</span>
        <h1 class="page-title">Vos projets prennent forme.</h1>
        <p class="page-sub">${goals.length} objectif${goals.length > 1 ? "s" : ""} · ${money(totalCurrent)} déjà mis de côté.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-action="open-contribution">${icon("plus", "", 15)} Contribution</button>
        <button class="btn btn-primary btn-sm" type="button" data-action="open-goal">${icon("target", "", 15)} Nouvel objectif</button>
      </div>
    </div>

    <div class="savings-head">
      <article class="savings-total">
        <span>Épargne cumulée</span>
        <div class="value">${money(totalCurrent)}</div>
        <p>sur ${money(totalTarget)} visés · ${Math.round(overall)} % du chemin parcouru</p>
        <div class="mini-progress"><i style="width:${U.clamp(overall, 0, 100).toFixed(1)}%"></i></div>
      </article>
      <article class="card savings-month">
        <div>
          <span class="tiny muted" style="text-transform:uppercase;letter-spacing:.08em;font-weight:700">Épargne de ${esc(monthName(c.month))}</span>
          <div class="value">${money(monthContrib)}</div>
          <p>${monthTarget > 0 ? `Objectif mensuel ${money(monthTarget)} · ${Math.round(monthPct)} % atteint` : "Aucun objectif d'épargne calculé ce mois-ci"}</p>
        </div>
        ${UI.progress(Math.min(100, monthPct), monthPct >= 100 ? "var(--save)" : "var(--brand)", "", `Épargne du mois ${monthPct} %`)}
        <div class="row-between" style="margin-top:9px">
          <span class="tiny muted">${profile.savingsPct} % des revenus</span>
          <button class="panel-link" type="button" data-action="open-contribution">${icon("plus", "", 12)} Ajouter</button>
        </div>
      </article>
    </div>

    ${
      enriched.length
        ? `<div class="goal-grid">${enriched.map(goalCard).join("")}
            <button class="add-goal-card" type="button" data-action="open-goal">
              <span class="plus-circle">${icon("plus", "", 19)}</span>
              <strong>Ajouter un objectif</strong>
              <span>Voyage, fond d'urgence, achat important…</span>
            </button>
          </div>`
        : `<div class="goal-grid">
            <button class="add-goal-card" type="button" data-action="open-goal" style="min-height:240px">
              <span class="plus-circle">${icon("plus", "", 19)}</span>
              <strong>Créer votre premier objectif</strong>
              <span>Donnez un nom à votre épargne et fixez un montant cible.</span>
            </button>
          </div>`
    }

    <section class="card" style="margin-top:14px">
      <div class="panel-head">
        <div>
          <h2 class="panel-title">${icon("history", "", 16)} Dernières contributions</h2>
          <span class="panel-sub">Chaque versement met à jour l'objectif correspondant</span>
        </div>
        <button class="panel-link" type="button" data-action="open-contribution">${icon("plus", "", 13)} Ajouter</button>
      </div>
      ${
        contributions.length
          ? `<div class="panel-body flush" style="overflow-x:auto">
              <table class="contrib-table">
                <thead><tr><th>Date</th><th>Objectif</th><th>Montant</th><th></th></tr></thead>
                <tbody>
                  ${contributions
                    .slice(0, 10)
                    .map((ct) => {
                      const goal = goals.find((g) => g.id === ct.goalId);
                      return `<tr>
                        <td>${U.dateLabel(ct.contributedAt)}</td>
                        <td><span class="muted">${esc(goal ? (goal.icon || "🎯") + " " + goal.title : "Objectif supprimé")}</span></td>
                        <td class="contrib-amount">+ ${money(ct.amount)}</td>
                        <td><button class="icon-btn danger" type="button" data-action="delete-contribution" data-id="${esc(ct.id)}" aria-label="Supprimer cette contribution" title="Supprimer">${icon("trash", "", 14)}</button></td>
                      </tr>`;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>`
          : UI.empty({ icon: "piggy", title: "Aucune contribution pour le moment", text: "Alimentez un objectif pour voir votre épargne progresser mois après mois.", action: `<button class="btn btn-primary btn-sm" type="button" data-action="open-contribution">${icon("plus", "", 14)} Ajouter une contribution</button>` })
      }
    </section>`;
  };

  /* ------------------------------------------------------------------ */
  /* Simulateur « Puis-je me l'offrir ? »                               */
  /* ------------------------------------------------------------------ */

  V.simulator = function () {
    const c = ctx().c;
    const amount = Math.max(0, Number(App.simAmount) || 0);
    return `<div class="page-head">
      <div class="page-head-txt">
        <span class="page-eyebrow">${icon("calculator", "", 13)} Simulateur</span>
        <h1 class="page-title">Puis-je me l'offrir ?</h1>
        <p class="page-sub">Une réponse honnête, basée sur vos factures, votre épargne et votre marge réelle.</p>
      </div>
      <div class="page-actions">${UI.healthChip(c.health)}</div>
    </div>

    <div class="sim-layout">
      <section class="card sim-form-card">
        <h2>Un achat en tête ?</h2>
        <p>Entrez le montant. Nous vérifions ce qu'il reste après les charges du mois et l'épargne prévue, sans jamais toucher à vos factures.</p>
        <form data-form="simulate" novalidate>
          <div class="sim-amount">
            <input class="input" type="text" inputmode="decimal" name="amount" data-sim-input value="${amount ? esc(amount) : ""}" placeholder="0" aria-label="Montant de l'achat">
            <span class="suffix">${esc((ctx().profile || {}).currency === "EUR" ? "€" : (ctx().profile || {}).currency || "€")}</span>
          </div>
          <div class="quick-amounts" aria-label="Montants rapides">
            ${[20, 50, 100, 200, 500, 1000]
              .map((value) => `<button class="quick-amount" type="button" data-action="sim-quick" data-amount="${value}">${value} ${esc((ctx().profile || {}).currency === "EUR" ? "€" : (ctx().profile || {}).currency || "€")}</button>`)
              .join("")}
          </div>
          <button class="btn btn-primary btn-block" type="submit">${icon("calculator", "", 16)} Analyser cet achat</button>
        </form>
        <div class="modal-note" style="margin-top:16px">
          ${icon("shield", "", 15)}
          <span>Le calcul se base sur <b>${money(Math.max(0, c.safeFree))}</b> de marge non affectée et <b>${money(c.savingsBudget)}</b> d'épargne prévue ce mois-ci.</span>
        </div>
      </section>
      <section class="card sim-result-card" id="sim-result">${V.simResult(amount)}</section>
    </div>`;
  };

  V.simResult = function (amount) {
    const c = ctx().c;
    const value = Math.max(0, Number(amount) || 0);
    const wants = c.envelopeRows.find((e) => e.key === "envie") || { budget: 0, used: 0, remaining: 0 };
    const safe = Math.max(0, c.safeFree);
    const actualRoom = c.remaining;
    const days = Math.max(1, c.daysLeft || 1);

    if (value <= 0) {
      return `<div class="sim-placeholder">
        <div class="empty-ic">${icon("calculator", "", 26)}</div>
        <h3>Votre réponse apparaîtra ici</h3>
        <p>Saisissez un montant à gauche. Nous croisons votre enveloppe plaisirs, vos factures restantes et votre épargne prévue.</p>
      </div>`;
    }

    let tone = "green";
    let title = "Oui, vous pouvez vous l'offrir.";
    let text = "Cet achat tient dans votre enveloppe envies et ne touche ni vos factures ni votre épargne.";
    let advice = `Il vous restera <b>${money(Math.max(0, safe - value))}</b> de marge non affectée après cet achat.`;
    if (value > safe) {
      if (value <= actualRoom) {
        tone = "orange";
        title = "Oui, avec un ajustement.";
        text = "L'achat dépasse votre marge non affectée : il faudra réduire l'épargne prévue ce mois-ci.";
        advice = `Vous devrez retirer <b>${money(value - safe)}</b> de votre épargne du mois. Vérifiez que cela ne compromet pas vos objectifs.`;
      } else {
        tone = "red";
        title = "Pas cette fois.";
        text = "Cet achat mettrait le mois en déséquilibre, même en réduisant l'épargne prévue.";
        advice = `Il manque <b>${money(value - actualRoom)}</b> pour rester à l'équilibre. Reportez l'achat ou réduisez d'abord une autre dépense.`;
      }
    } else if (value > Math.max(0, wants.remaining)) {
      tone = "orange";
      title = "Oui, sans toucher aux factures.";
      text = "L'achat dépasse l'enveloppe envies, mais votre marge non affectée peut l'absorber.";
      advice = `Votre enveloppe plaisirs sera dépassée de <b>${money(value - Math.max(0, wants.remaining))}</b>. La marge du mois reste positive.`;
    }

    const remainingAfter = Math.max(0, safe - value);
    const dailyImpact = value / days;
    const wantsAfter = wants.remaining - value;
    const ratio = wants.budget > 0 ? ((wants.used + value) / wants.budget) * 100 : 100;
    const iconName = tone === "green" ? "check-circle" : tone === "orange" ? "info" : "alert";

    return `<div class="sim-verdict ${tone}">
        <span class="verdict-ic">${icon(iconName, "", 24)}</span>
        <div><h3>${title}</h3><p>${text}</p></div>
      </div>
      <div class="sim-metrics">
        <div class="sim-metric"><span>Marge après achat</span><strong>${money(remainingAfter)}</strong><small>sur ${money(safe)} disponibles</small></div>
        <div class="sim-metric"><span>Impact quotidien</span><strong>${money(dailyImpact)}</strong><small>par jour jusqu'à la paie</small></div>
        <div class="sim-metric"><span>Enveloppe envies</span><strong style="color:${wantsAfter < 0 ? "var(--danger)" : "inherit"}">${money(wantsAfter)}</strong><small>${wantsAfter < 0 ? "de dépassement" : "encore disponibles"}</small></div>
        <div class="sim-metric"><span>Solde du mois</span><strong style="color:${c.remaining - value < 0 ? "var(--danger)" : "inherit"}">${money(c.remaining - value)}</strong><small>après revenus, dépenses et épargne</small></div>
      </div>
      <div class="sim-bar">
        <div class="sim-bar-head"><span>Enveloppe envies après achat</span><b>${Math.round(Math.max(0, ratio))} %</b></div>
        ${UI.progress(Math.min(100, Math.max(0, ratio)), ratio > 100 ? "var(--danger)" : tone === "orange" ? "var(--warning)" : "var(--brand)", "", "Enveloppe envies après achat")}
      </div>
      <div class="sim-advice">${icon("sparkles", "", 17)}<div><strong>Le conseil SmartBudget.</strong> ${advice}</div></div>`;
  };

  /* ------------------------------------------------------------------ */
  /* Statistiques & historique                                          */
  /* ------------------------------------------------------------------ */

  V.stats = function () {
    const c = ctx().c;
    const state = { profile: ctx().profile, categories: ctx().data.categories, incomes: ctx().data.incomes, expenses: ctx().data.expenses, goals: ctx().data.goals, contributions: ctx().data.contributions };
    const months = [];
    for (let i = 5; i >= 0; i -= 1) months.push(U.shiftMonth(c.month, -i));
    const rows = months.map((month) => App.monthSummary(state, month));
    const current = rows[rows.length - 1];
    const previous = rows[rows.length - 2] || null;
    const withIncome = rows.filter((r) => r.income > 0);
    const average = (key) => (rows.length ? U.sum(rows, (r) => r[key]) / rows.length : 0);
    const avgIncome = average("income");
    const avgExpenses = average("expenses");
    const avgSavings = average("savings");
    const savingsRate = avgIncome > 0 ? (avgSavings / avgIncome) * 100 : 0;
    const avgBalance = average("balance");
    const balanceDelta = previous ? current.balance - previous.balance : 0;
    const maxBar = Math.max(1, ...rows.map((r) => Math.max(r.income, r.expenses)));
    const totalSpent = U.sum(rows, (r) => r.expenses);
    const catTotal = U.sum(c.byCategory, (cat) => cat.amount);
    const healthDelta = previous && previous.health ? current.health.score - previous.health.score : 0;

    const trend = (delta, goodWhenPositive, suffix) => {
      const good = goodWhenPositive ? delta >= 0 : delta <= 0;
      return `<span class="trend ${delta === 0 ? "" : good ? "good" : "bad"}">${delta === 0 ? "" : icon(delta > 0 ? "arrow-up-right" : "arrow-down-left", "", 10)} ${signedMoney(delta)}${suffix || ""}</span>`;
    };

    return `<div class="page-head">
      <div class="page-head-txt">
        <span class="page-eyebrow">${icon("chart", "", 13)} Statistiques</span>
        <h1 class="page-title">Six mois, une vue d'ensemble.</h1>
        <p class="page-sub">Historique des revenus, des dépenses et de l'épargne · ${esc(monthName(rows[0].month))} – ${esc(monthName(c.month))}.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" type="button" data-action="export-csv">${icon("download", "", 15)} CSV</button>
        <button class="btn btn-primary btn-sm" type="button" data-action="export-pdf">${icon("printer", "", 15)} Bilan PDF</button>
      </div>
    </div>

    <div class="stats-top">
      <article class="stat-card">
        <div class="stat-card-top"><span>Solde moyen</span>${trend(balanceDelta, true)}</div>
        <div class="value" style="color:${avgBalance < 0 ? "var(--danger)" : "inherit"}">${money(avgBalance)}</div>
        <small>par mois sur la période</small>
      </article>
      <article class="stat-card">
        <div class="stat-card-top"><span>Taux d'épargne</span><span class="trend ${savingsRate >= 20 ? "good" : "bad"}">${U.fmtPct(savingsRate, 0)}</span></div>
        <div class="value">${money(avgSavings)}</div>
        <small>épargnés en moyenne chaque mois</small>
      </article>
      <article class="stat-card">
        <div class="stat-card-top"><span>Dépenses moyennes</span>${trend(previous ? current.expenses - previous.expenses : 0, false)}</div>
        <div class="value">${money(avgExpenses)}</div>
        <small>${money(totalSpent)} sur six mois</small>
      </article>
      <article class="stat-card">
        <div class="stat-card-top"><span>Santé financière</span><span class="trend ${healthDelta >= 0 ? "good" : "bad"}">${current.health.score}/100</span></div>
        <div class="value" style="font-size:16px;letter-spacing:-.01em;margin-top:10px">${esc(current.health.label)}</div>
        <small>${withIncome.length} mois avec revenus enregistrés</small>
      </article>
    </div>

    <div class="stats-grid">
      <section class="card">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">${icon("chart", "", 16)} Revenus & dépenses</h2>
            <span class="panel-sub">Comparaison sur six mois</span>
          </div>
        </div>
        <div class="panel-body top">
          ${UI.barChart(rows.map((r) => ({ month: r.month, income: r.income, expenses: r.expenses })), c.currency)}
        </div>
      </section>
      <section class="card">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">${icon("filter", "", 16)} Par catégorie</h2>
            <span class="panel-sub">${esc(monthName(c.month))} · ${money(catTotal)}</span>
          </div>
        </div>
        <div class="panel-body flush">
          ${
            c.byCategory.length
              ? `<div class="cat-breakdown">${c.byCategory
                  .slice(0, 8)
                  .map((cat) => {
                    const pct = catTotal > 0 ? (cat.amount / catTotal) * 100 : 0;
                    return `<div class="cat-row">
                      <span class="cat-emoji">${esc(cat.icon)}</span>
                      <div class="cat-row-main">
                        <div class="row-top"><span>${esc(cat.name)}</span><b>${Math.round(pct)} %</b></div>
                        ${UI.progress(pct, cat.color, "", `Part de ${cat.name}`)}
                      </div>
                      <b>${money(cat.amount)}</b>
                    </div>`;
                  })
                  .join("")}</div>`
              : `<div class="panel-body">${UI.empty({ icon: "filter", title: "Pas encore de dépenses", text: "Ajoutez des dépenses pour voir la répartition par catégorie." })}</div>`
          }
        </div>
      </section>
    </div>

    <div class="stats-grid">
      <section class="card">
        <div class="panel-head">
          <div>
            <h2 class="panel-title">${icon("history", "", 16)} Historique mensuel</h2>
            <span class="panel-sub">Solde après dépenses et épargne</span>
          </div>
        </div>
        <div class="panel-body flush">
          <div class="history-months">
            ${rows
              .slice()
              .reverse()
              .map((row) => {
                const incWidth = (row.income / maxBar) * 100;
                const expWidth = (row.expenses / maxBar) * 100;
                return `<button class="history-row" type="button" data-action="goto-month" data-month="${esc(row.month)}" style="border:0;background:transparent;width:100%;text-align:left;cursor:pointer">
                  <span class="history-month">${esc(U.monthShort(row.month))}</span>
                  <span class="history-bars"><i style="width:${Math.max(2, incWidth).toFixed(1)}%"></i><i style="width:${Math.max(2, expWidth).toFixed(1)}%"></i></span>
                  <span class="history-balance" style="color:${row.balance < 0 ? "var(--danger)" : "inherit"}">${money(row.balance)}<small>${money(row.income)} entrées</small></span>
                </button>`;
              })
              .join("")}
          </div>
        </div>
      </section>

      <div class="stack">
        <div class="export-card">
          <span class="export-ic">${icon("download", "", 19)}</span>
          <div><strong>Exporter en CSV</strong><p>Transactions du mois, prêtes pour un tableur.</p></div>
          <button class="btn btn-soft btn-sm" type="button" data-action="export-csv">Exporter</button>
        </div>
        <div class="export-card">
          <span class="export-ic">${icon("printer", "", 19)}</span>
          <div><strong>Bilan PDF</strong><p>Un rapport mensuel propre à imprimer ou archiver.</p></div>
          <button class="btn btn-soft btn-sm" type="button" data-action="export-pdf">Créer</button>
        </div>
        <div class="export-card">
          <span class="export-ic">${icon("shield", "", 19)}</span>
          <div><strong>Export complet JSON</strong><p>Toutes vos données, pour sauvegarde ou migration.</p></div>
          <button class="btn btn-soft btn-sm" type="button" data-action="export-json">Télécharger</button>
        </div>
        <div class="profile-note">${icon("info", "", 16)}<span>Les statistiques se recalculent à partir de vos données réelles. Aucun chiffre n'est simulé en dehors des données de démonstration.</span></div>
      </div>
    </div>`;
  };

  function signedMoney(value) {
    const n = Number(value) || 0;
    const sign = n > 0 ? "+" : n < 0 ? "−" : "";
    return sign + money(Math.abs(n));
  }

  /* ------------------------------------------------------------------ */
  /* Profil & réglages                                                  */
  /* ------------------------------------------------------------------ */

  V.profile = function () {
    const profile = ctx().profile || {};
    const data = ctx().data;
    const c = ctx().c;
    const categories = (data.categories || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const created = profile.createdAt ? U.dateLabel(profile.createdAt, { day: "numeric", month: "long", year: "numeric" }) : "—";
    const mode = App.mode === "demo" ? "Démo locale" : "Cloud Supabase";

    return `<div class="page-head">
      <div class="page-head-txt">
        <span class="page-eyebrow">${icon("user", "", 13)} Profil</span>
        <h1 class="page-title">Votre espace, vos règles.</h1>
        <p class="page-sub">Devise, jour de paie, apparence et gestion du compte.</p>
      </div>
      <div class="page-actions">
        <a class="btn btn-ghost btn-sm" href="#/app/budget">${icon("chart", "", 15)} Répartition 50/30/20</a>
      </div>
    </div>

    <div class="profile-grid">
      <div class="stack">
        <section class="card profile-card">
          <div class="profile-head">
            ${UI.avatar(profile.fullName || profile.email, 56)}
            <div><h2>${esc(profile.fullName || "Votre profil")}</h2><p>${esc(profile.email || "—")}</p></div>
          </div>
          <form data-form="profile" novalidate>
            <div class="form-grid">
              ${UI.field({ id: "profile-name", label: "Nom complet", name: "fullName", value: profile.fullName || "", required: true, autocomplete: "name" })}
              ${UI.field({ id: "profile-email", label: "Adresse email", name: "email", type: "email", value: profile.email || "", hint: App.mode === "demo" ? "Modifiable en mode démo uniquement." : "Gérée par Supabase Auth." })}
              ${UI.field({
                id: "profile-currency",
                label: "Devise",
                name: "currency",
                type: "select",
                value: profile.currency,
                options: App.constants.CURRENCIES.map((cur) => `<option value="${esc(cur.code)}"${profile.currency === cur.code ? " selected" : ""}>${esc(cur.label)}</option>`).join("")
              })}
              ${UI.field({ id: "profile-payday", label: "Jour de paie", name: "paydayDay", type: "number", min: 1, max: 31, step: 1, value: profile.paydayDay || 1, hint: "Entre 1 et 31. Ajusté automatiquement selon le mois." })}
            </div>
            <div class="modal-actions-inline"><button class="btn btn-primary" type="submit">${icon("check", "", 15)} Enregistrer les modifications</button></div>
          </form>
        </section>

        <section class="card">
          <div class="panel-head">
            <div>
              <h2 class="panel-title">${icon("filter", "", 16)} Catégories personnalisées</h2>
              <span class="panel-sub">${categories.length} catégorie${categories.length > 1 ? "s" : ""} · utilisées pour classer vos dépenses</span>
            </div>
            <button class="panel-link" type="button" data-action="open-category">${icon("plus", "", 13)} Ajouter</button>
          </div>
          <div class="panel-body flush">
            ${
              categories.length
                ? `<div class="account-list" style="padding:0 20px 8px">${categories
                    .map(
                      (cat) => `<div class="account-row">
                        ${UI.catBadge(cat)}
                        <span class="muted small" style="margin-left:auto">${esc((App.constants.ENVELOPES[cat.envelope] || {}).short || "Besoin")}</span>
                        <button class="icon-btn" type="button" data-action="edit-category" data-id="${esc(cat.id)}" aria-label="Modifier ${esc(cat.name)}" title="Modifier">${icon("edit", "", 14)}</button>
                        <button class="icon-btn danger" type="button" data-action="delete-category" data-id="${esc(cat.id)}" aria-label="Supprimer ${esc(cat.name)}" title="Supprimer">${icon("trash", "", 14)}</button>
                      </div>`
                    )
                    .join("")}</div>`
                : `<div class="panel-body">${UI.empty({ icon: "filter", title: "Aucune catégorie", text: "Créez des catégories pour retrouver vos dépenses en un coup d'œil." })}</div>`
            }
          </div>
        </section>
      </div>

      <div class="stack">
        <section class="card profile-card">
          <div class="panel-head">
            <div><h2 class="panel-title">${icon("settings", "", 16)} Apparence</h2><span class="panel-sub">Le thème est enregistré dans votre profil</span></div>
          </div>
          <div class="settings-row">
            <div class="settings-row-txt"><strong>Thème de l'interface</strong><span>Clair, sombre ou selon le système.</span></div>
            <div class="theme-choice" role="group" aria-label="Choisir le thème">
              <button type="button" class="${App.theme === "light" ? "is-active" : ""}" data-action="set-theme" data-theme="light" aria-label="Thème clair" title="Clair">${icon("sun", "", 16)}</button>
              <button type="button" class="${App.theme === "dark" ? "is-active" : ""}" data-action="set-theme" data-theme="dark" aria-label="Thème sombre" title="Sombre">${icon("moon", "", 16)}</button>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-txt"><strong>Réinitialiser le budget</strong><span>Revenir à la règle 50/30/20.</span></div>
            <button class="btn btn-soft btn-sm" type="button" data-action="reset-budget">${icon("refresh", "", 14)} Réinitialiser</button>
          </div>
          <div class="profile-note">${icon("sparkles", "", 16)}<span>Le mode démo conserve vos modifications dans ce navigateur. Le mode cloud synchronise tout dans votre projet Supabase.</span></div>
        </section>

        <section class="card profile-card">
          <div class="panel-head">
            <div><h2 class="panel-title">${icon("shield", "", 16)} Compte & sécurité</h2><span class="panel-sub">Informations de votre espace</span></div>
          </div>
          <div class="account-list">
            <div class="account-row">${icon("mail", "", 16)} Adresse email <b>${esc(profile.email || "—")}</b></div>
            <div class="account-row">${icon("lock", "", 16)} Mode de stockage <b>${esc(mode)}</b></div>
            <div class="account-row">${icon("calendar", "", 16)} Membre depuis <b>${esc(created)}</b></div>
            <div class="account-row">${icon("receipt", "", 16)} Transactions ce mois <b>${c.counts.incomes + c.counts.expenses}</b></div>
            <div class="account-row">${icon("target", "", 16)} Objectifs d'épargne <b>${c.counts.goals}</b></div>
            <div class="account-row">${icon("download", "", 16)} Vos données <b>Exportables à tout moment</b></div>
          </div>
          <div class="modal-actions-inline" style="margin-top:16px">
            <button class="btn btn-ghost btn-sm" type="button" data-action="export-json">${icon("download", "", 14)} Exporter mes données</button>
            <button class="btn btn-ghost btn-sm" type="button" data-action="sign-out">${icon("logout", "", 14)} Se déconnecter</button>
          </div>
        </section>

        <div class="danger-zone">
          <h3>Zone sensible</h3>
          <p>${App.mode === "demo" ? "Réinitialisez la démo avec ses données d'origine, ou supprimez le compte local pour repartir de zéro." : "La suppression du compte efface définitivement votre profil, vos transactions et vos objectifs. Cette action est irréversible."}</p>
          <div class="modal-actions-inline" style="margin-top:0">
            ${App.mode === "demo" ? `<button class="btn btn-soft btn-sm" type="button" data-action="reset-demo">${icon("refresh", "", 14)} Réinitialiser la démo</button>` : ""}
            <button class="btn btn-danger btn-sm" type="button" data-action="delete-account">${icon("trash", "", 14)} Supprimer mon compte</button>
          </div>
        </div>
      </div>
    </div>`;
  };

  /* ------------------------------------------------------------------ */
  /* Page introuvable                                                   */
  /* ------------------------------------------------------------------ */

  V.notFound = function () {
    return `<div class="page-head"><div class="page-head-txt"><span class="page-eyebrow">${icon("info", "", 13)} Navigation</span><h1 class="page-title">Cette page n'existe pas.</h1><p class="page-sub">Le lien est peut-être ancien, ou la page a été déplacée.</p></div></div>
      <section class="card">${UI.empty({
        icon: "search",
        title: "Page introuvable",
        text: "Revenez au tableau de bord pour retrouver votre budget.",
        action: `<a class="btn btn-primary btn-sm" href="#/app">${icon("arrow-right", "", 14)} Retour au tableau de bord</a>`
      })}</section>`;
  };

  /* ------------------------------------------------------------------ */
  /* Modales de formulaire                                              */
  /* ------------------------------------------------------------------ */

  const CANCEL = `<button class="btn btn-ghost" type="button" data-action="close-modal">Annuler</button>`;

  function submit(label, iconName) {
    return `<button class="btn btn-primary" type="submit">${icon(iconName || "check", "", 15)} ${esc(label)}</button>`;
  }

  function pickerIcons(name, value, list) {
    return `<div class="icon-grid" data-icon-picker="${esc(name)}">
      <input type="hidden" name="${esc(name)}" value="${esc(value)}">
      ${(list || App.constants.CATEGORY_ICONS)
        .map((ic) => `<button class="icon-option${value === ic ? " is-active" : ""}" type="button" data-pick-icon="${esc(ic)}" aria-label="Choisir ${esc(ic)}">${esc(ic)}</button>`)
        .join("")}
    </div>`;
  }

  function pickerColors(name, value) {
    return `<div class="color-grid" data-color-picker="${esc(name)}">
      <input type="hidden" name="${esc(name)}" value="${esc(value)}">
      ${App.constants.CATEGORY_COLORS.map(
        (color) => `<button class="color-option${value === color ? " is-active" : ""}" type="button" data-pick-color="${esc(color)}" style="--pick:${esc(color)}" aria-label="Choisir la couleur ${esc(color)}"></button>`
      ).join("")}
    </div>`;
  }

  function syncCategoryEnvelope(wrap) {
    const catSel = wrap.querySelector('[name="categoryId"]');
    const envSel = wrap.querySelector('[name="envelope"]');
    if (!catSel || !envSel) return;
    catSel.addEventListener("change", () => {
      const cat = catOf(catSel.value);
      const key = cat ? envelopeKey(cat.envelope) : null;
      if (key) envSel.value = key;
    });
  }

  V.expenseModal = function (expense) {
    const item = expense || {};
    const isEdit = Boolean(item.id);
    const cat = catOf(item.categoryId);
    const fallbackDay = ctx().month === U.currentMonth() ? new Date().getDate() : 15;
    const dueDate = item.dueDate || U.dateInMonth(ctx().month || U.currentMonth(), Math.min(fallbackDay, U.daysInMonth(ctx().month || U.currentMonth())));
    const envelope = envelopeKey(item.envelope || (cat && cat.envelope));

    const wrap = UI.openModal({
      eyebrow: "Dépenses",
      title: isEdit ? "Modifier la dépense" : "Nouvelle dépense",
      subtitle: isEdit ? "Ajustez les détails de cette sortie." : "Ajoutez une sortie et rangez-la dans la bonne enveloppe.",
      form: { id: "expense-form", action: "expense" },
      body: `<input type="hidden" name="id" value="${esc(item.id || "")}">
        <div class="form-grid">
          ${UI.field({ id: "expense-title", label: "Libellé", name: "title", value: item.title || "", placeholder: "Courses, loyer, restaurant…", required: true })}
          ${UI.field({ id: "expense-amount", label: "Montant", name: "amount", type: "text", inputmode: "decimal", value: item.amount != null ? item.amount : "", placeholder: "0,00", required: true })}
          ${UI.field({ id: "expense-date", label: "Date", name: "dueDate", type: "date", value: dueDate, required: true })}
          ${UI.field({ id: "expense-cat", label: "Catégorie", name: "categoryId", type: "select", value: item.categoryId || "", options: categoryOptions(item.categoryId) })}
          ${UI.field({ id: "expense-env", label: "Enveloppe", name: "envelope", type: "select", value: envelope, options: envelopeOptions(envelope) })}
          ${UI.field({ id: "expense-fixed", label: "Type de dépense", name: "isFixed", type: "select", value: item.isFixed ? "fixed" : "variable", options: `<option value="variable"${!item.isFixed ? " selected" : ""}>Variable</option><option value="fixed"${item.isFixed ? " selected" : ""}>Fixe / récurrente</option>` })}
        </div>
        ${UI.toggle("isPaid", "Déjà payée", Boolean(item.isPaid), "Cochez si cette dépense a été réglée.")}
        <div class="modal-note">${icon("info", "", 15)}<span>${isEdit ? "Le changement s'applique à cette occurrence uniquement." : "Pour une facture mensuelle, utilisez plutôt les charges récurrentes."}</span></div>`,
      footer: `${CANCEL}${submit(isEdit ? "Enregistrer" : "Ajouter la dépense", "plus")}`,
      size: "lg"
    });
    syncCategoryEnvelope(wrap);
    return wrap;
  };

  V.incomeModal = function (income) {
    const item = income || {};
    const isEdit = Boolean(item.id);
    const receivedAt = item.receivedAt || U.todayISO();
    return UI.openModal({
      eyebrow: "Revenus",
      title: isEdit ? "Modifier le revenu" : "Nouveau revenu",
      subtitle: isEdit ? "Une correction sur cette entrée." : "Salaire, prime, remboursement : chaque entrée compte.",
      form: { id: "income-form", action: "income" },
      body: `<input type="hidden" name="id" value="${esc(item.id || "")}">
        <div class="form-grid">
          ${UI.field({ id: "income-title", label: "Libellé", name: "title", value: item.title || "", placeholder: "Salaire net, prime, mission…", required: true })}
          ${UI.field({ id: "income-amount", label: "Montant", name: "amount", type: "text", inputmode: "decimal", value: item.amount != null ? item.amount : "", placeholder: "0,00", required: true })}
          ${UI.field({ id: "income-date", label: "Date de réception", name: "receivedAt", type: "date", value: receivedAt, required: true })}
          <div class="field">
            <label>Nature du revenu</label>
            ${UI.segmented("type", [{ value: "salary", label: "Salaire", icon: "wallet" }, { value: "extra", label: "Ponctuel", icon: "sparkles" }], item.type || "salary")}
          </div>
        </div>
        <div class="modal-note">${icon("info", "", 15)}<span>Les revenus récurrents se configurent depuis le bouton « Récurrences » de la page Revenus.</span></div>`,
      footer: `${CANCEL}${submit(isEdit ? "Enregistrer" : "Ajouter le revenu", "plus")}`
    });
  };

  V.recurringIncomeModal = function (template) {
    const item = template || {};
    const isEdit = Boolean(item.id);
    return UI.openModal({
      eyebrow: "Revenus récurrents",
      title: isEdit ? "Modifier la récurrence" : "Nouveau revenu récurrent",
      subtitle: "Le montant sera ajouté automatiquement chaque mois.",
      form: { id: "recurring-income-form", action: "recurring-income" },
      body: `<input type="hidden" name="id" value="${esc(item.id || "")}">
        <div class="form-grid">
          ${UI.field({ id: "ri-title", label: "Libellé", name: "title", value: item.title || "", placeholder: "Salaire net", required: true })}
          ${UI.field({ id: "ri-amount", label: "Montant mensuel", name: "amount", type: "text", inputmode: "decimal", value: item.amount != null ? item.amount : "", placeholder: "0,00", required: true })}
          ${UI.field({ id: "ri-day", label: "Jour du versement", name: "dayOfMonth", type: "number", min: 1, max: 31, step: 1, value: item.dayOfMonth || 1, required: true, hint: "Ajusté si le mois est plus court." })}
          <div class="field">
            <label>Nature</label>
            ${UI.segmented("type", [{ value: "salary", label: "Salaire", icon: "wallet" }, { value: "extra", label: "Ponctuel", icon: "sparkles" }], item.type || "salary")}
          </div>
        </div>
        ${UI.toggle("active", "Récurrence active", item.active !== false, "Les mois futurs seront alimentés automatiquement.")}`,
      footer: `${CANCEL}${submit(isEdit ? "Enregistrer" : "Créer la récurrence", "repeat")}`,
      size: "lg"
    });
  };

  V.recurringExpenseModal = function (template) {
    const item = template || {};
    const isEdit = Boolean(item.id);
    const cat = catOf(item.categoryId);
    const envelope = envelopeKey(item.envelope || (cat && cat.envelope));
    const wrap = UI.openModal({
      eyebrow: "Charges récurrentes",
      title: isEdit ? "Modifier la charge" : "Nouvelle charge récurrente",
      subtitle: "Loyer, abonnements, crédits : une seule saisie, chaque mois recopié.",
      form: { id: "recurring-expense-form", action: "recurring-expense" },
      body: `<input type="hidden" name="id" value="${esc(item.id || "")}">
        <div class="form-grid">
          ${UI.field({ id: "re-title", label: "Libellé", name: "title", value: item.title || "", placeholder: "Loyer, Netflix, crédit…", required: true })}
          ${UI.field({ id: "re-amount", label: "Montant mensuel", name: "amount", type: "text", inputmode: "decimal", value: item.amount != null ? item.amount : "", placeholder: "0,00", required: true })}
          ${UI.field({ id: "re-day", label: "Jour de prélèvement", name: "dayOfMonth", type: "number", min: 1, max: 31, step: 1, value: item.dayOfMonth || 1, required: true, hint: "Ajusté si le mois est plus court." })}
          ${UI.field({ id: "re-cat", label: "Catégorie", name: "categoryId", type: "select", value: item.categoryId || "", options: categoryOptions(item.categoryId) })}
          ${UI.field({ id: "re-env", label: "Enveloppe", name: "envelope", type: "select", value: envelope, options: envelopeOptions(envelope) })}
        </div>
        ${UI.toggle("active", "Charge active", item.active !== false, "Les prochains mois seront créés automatiquement.")}`,
      footer: `${CANCEL}${submit(isEdit ? "Enregistrer" : "Créer la charge", "repeat")}`,
      size: "lg"
    });
    syncCategoryEnvelope(wrap);
    return wrap;
  };

  V.goalModal = function (goal) {
    const item = goal || {};
    const isEdit = Boolean(item.id);
    const iconValue = item.icon || "🎯";
    const colorValue = item.color || "#5b7cf5";
    const targetDate = item.targetDate || U.shiftMonth(U.currentMonth(), 6) + "-01";
    return UI.openModal({
      eyebrow: "Épargne",
      title: isEdit ? "Modifier l'objectif" : "Nouvel objectif d'épargne",
      subtitle: "Donnez un cap à votre épargne et suivez chaque euro mis de côté.",
      form: { id: "goal-form", action: "goal" },
      body: `<input type="hidden" name="id" value="${esc(item.id || "")}">
        <div class="form-grid">
          ${UI.field({ id: "goal-title", label: "Nom de l'objectif", name: "title", value: item.title || "", placeholder: "Voyage au Japon, fond d'urgence…", required: true })}
          ${UI.field({ id: "goal-target", label: "Montant cible", name: "targetAmount", type: "text", inputmode: "decimal", value: item.targetAmount != null ? item.targetAmount : "", placeholder: "0,00", required: true })}
          ${UI.field({ id: "goal-date", label: "Échéance souhaitée", name: "targetDate", type: "date", value: targetDate, optional: true })}
          ${isEdit ? "" : UI.field({ id: "goal-initial", label: "Premier versement", name: "initialAmount", type: "text", inputmode: "decimal", placeholder: "0,00", optional: true, hint: "Un montant déjà mis de côté pour ce projet." })}
        </div>
        <div class="field">
          <label>Icône</label>
          ${pickerIcons("icon", iconValue, GOAL_ICONS)}
        </div>
        <div class="field">
          <label>Couleur</label>
          ${pickerColors("color", colorValue)}
        </div>`,
      footer: `${CANCEL}${submit(isEdit ? "Enregistrer" : "Créer l'objectif", "target")}`,
      size: "lg"
    });
  };

  V.contributionModal = function (goalId) {
    const goals = (ctx().data.goals || []).slice();
    if (!goals.length) {
      UI.toast("Créez d'abord un objectif d'épargne.", "info");
      return V.goalModal();
    }
    const selected = goalId || goals[0].id;
    return UI.openModal({
      eyebrow: "Épargne",
      title: "Ajouter une contribution",
      subtitle: "Chaque versement fait avancer votre objectif.",
      form: { id: "contribution-form", action: "contribution" },
      body: `<div class="form-grid">
        ${UI.field({ id: "ct-goal", label: "Objectif", name: "goalId", type: "select", value: selected, options: goalOptions(selected), required: true })}
        ${UI.field({ id: "ct-amount", label: "Montant", name: "amount", type: "text", inputmode: "decimal", placeholder: "0,00", required: true, hint: "Compte dans l'enveloppe épargne du mois." })}
        ${UI.field({ id: "ct-date", label: "Date", name: "contributedAt", type: "date", value: U.todayISO(), required: true })}
      </div>
      <div class="modal-note">${icon("info", "", 15)}<span>La contribution est ajoutée à l'objectif choisi et apparaît dans les statistiques du mois.</span></div>`,
      footer: `${CANCEL}${submit("Ajouter la contribution", "plus")}`
    });
  };

  V.categoryModal = function (category) {
    const item = category || {};
    const isEdit = Boolean(item.id);
    const iconValue = item.icon || "✨";
    const colorValue = item.color || "#2f8f72";
    return UI.openModal({
      eyebrow: "Catégories",
      title: isEdit ? "Modifier la catégorie" : "Nouvelle catégorie",
      subtitle: "Une catégorie claire rend vos statistiques plus utiles.",
      form: { id: "category-form", action: "category" },
      body: `<input type="hidden" name="id" value="${esc(item.id || "")}">
        <div class="form-grid">
          ${UI.field({ id: "cat-name", label: "Nom", name: "name", value: item.name || "", placeholder: "Animaux, sport, vacances…", required: true })}
          ${UI.field({ id: "cat-env", label: "Enveloppe", name: "envelope", type: "select", value: envelopeKey(item.envelope), options: envelopeOptions(envelopeKey(item.envelope)), required: true })}
        </div>
        <div class="field">
          <label>Icône</label>
          ${pickerIcons("icon", iconValue)}
        </div>
        <div class="field">
          <label>Couleur</label>
          ${pickerColors("color", colorValue)}
        </div>`,
      footer: `${CANCEL}${submit(isEdit ? "Enregistrer" : "Créer la catégorie", "filter")}`,
      size: "lg"
    });
  };

  V.categoriesModal = function () {
    const categories = (ctx().data.categories || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return UI.openModal({
      eyebrow: "Profil",
      title: "Gérer les catégories",
      subtitle: "Ajoutez, modifiez ou supprimez vos catégories de dépenses.",
      size: "lg",
      body: `<div class="account-list" style="max-height:46vh;overflow-y:auto">
        ${
          categories.length
            ? categories
                .map(
                  (cat) => `<div class="account-row">
                    ${UI.catBadge(cat)}
                    <span class="muted small" style="margin-left:auto">${esc((App.constants.ENVELOPES[cat.envelope] || {}).short || "")}</span>
                    <button class="icon-btn" type="button" data-action="edit-category" data-id="${esc(cat.id)}" aria-label="Modifier ${esc(cat.name)}">${icon("edit", "", 14)}</button>
                    <button class="icon-btn danger" type="button" data-action="delete-category" data-id="${esc(cat.id)}" aria-label="Supprimer ${esc(cat.name)}">${icon("trash", "", 14)}</button>
                  </div>`
                )
                .join("")
            : `<p class="muted small">Aucune catégorie pour le moment.</p>`
        }
      </div>`,
      footer: `<button class="btn btn-ghost" type="button" data-action="close-modal">Fermer</button><button class="btn btn-primary" type="button" data-action="open-category">${icon("plus", "", 15)} Nouvelle catégorie</button>`
    });
  };
})(window);
