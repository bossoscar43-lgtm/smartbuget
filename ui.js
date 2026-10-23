/* ==========================================================================
   SmartBudget — interface : icônes, composants, graphiques, modales, toasts
   ========================================================================== */
(function () {
  "use strict";

  const App = window.App;
  const U = App.utils;

  /* ------------------------------------------------------------------ */
  /* Icônes                                                             */
  /* ------------------------------------------------------------------ */

  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M16 12h.01"/>',
    income: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    expense: '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
    calculator: '<rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h4"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
    settings: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    "chevron-left": '<path d="M15 18l-6-6 6-6"/>',
    "chevron-right": '<path d="M9 18l6-6-6-6"/>',
    "chevron-down": '<path d="M6 9l6 6 6-6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    "check-circle": '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    printer: '<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="9" rx="2"/><path d="M7 14h10v7H7z"/>',
    logout: '<path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5M15 12H3"/>',
    alert: '<path d="M10.3 3.6 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    sparkles: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/><path d="M5 14l.6 1.4L7 16l-1.4.6L5 18l-.6-1.4L3 16l1.4-.6Z"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>',
    "eye-off": '<path d="M3 3l18 18"/><path d="M10.6 6.2A11 11 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.8M6.6 6.6A17 17 0 0 0 2 12s3.5 6 10 6a10 10 0 0 0 4.4-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    "arrow-right": '<path d="M4 12h16M14 6l6 6-6 6"/>',
    "arrow-up-right": '<path d="M7 17 17 7M8 7h9v9"/>',
    "arrow-down-left": '<path d="M17 7 7 17M16 17H7V8"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8Z"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
    piggy: '<path d="M19 11c0-3.3-3.1-6-7-6s-7 2.7-7 6c0 1.3.5 2.5 1.4 3.5V18h3v-1.2c.8.2 1.7.2 2.6.1V18h3v-2.5c1.1-.6 2-1.4 2.6-2.5H21v-3h-2Z"/><path d="M9 5.5C9 4.1 10.1 3 11.5 3M16 9h.01"/>',
    "credit-card": '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h3"/>',
    home: '<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.3-4L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4L21 15"/><path d="M21 20v-5h-5"/>',
    shield: '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5Z"/><path d="m9 12 2 2 4-4"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    flag: '<path d="M5 22V3"/><path d="M5 4h11l-2 4 2 4H5"/>',
    "external-link": '<path d="M14 3h7v7M21 3l-9 9"/><path d="M20 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5"/>',
    "brand-google": '<path fill="currentColor" stroke="none" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4ZM12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22ZM6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14ZM12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6Z"/>',
    "brand-apple": '<path fill="currentColor" stroke="none" d="M16.4 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.9-3-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.7 2.2 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.7-2.2.9-1.2 1.2-2.4 1.3-2.5-.1 0-2.4-.9-2.4-3.5ZM14.1 5.3c.6-.8 1-1.9.9-3-1 0-2.2.7-2.9 1.5-.6.7-1.1 1.8-1 2.8 1.1.1 2.3-.5 3-1.3Z"/>',
    dot: '<circle cx="12" cy="12" r="3"/>'
  };

  function icon(name, cls, size) {
    const inner = ICONS[name] || ICONS.dot;
    return `<svg class="ic${cls ? " " + cls : ""}" width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  }

  function logo(size, withText) {
    const mark = `<span class="brand-mark" style="--mark-size:${size || 38}px" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="${size || 38}" height="${size || 38}" fill="none">
        <rect width="32" height="32" rx="10" fill="currentColor"/>
        <path d="M9 22.5V16M16 22.5V9.5M23 22.5v-9" stroke="white" stroke-width="3" stroke-linecap="round"/>
        <circle cx="23" cy="10" r="2.2" fill="#c9f27c"/>
      </svg>
    </span>`;
    return `<span class="brand">${mark}${withText === false ? "" : `<span class="brand-text">Smart<span>Budget</span></span>`}</span>`;
  }

  /* ------------------------------------------------------------------ */
  /* Toasts                                                             */
  /* ------------------------------------------------------------------ */

  function toast(message, type, title) {
    let root = document.getElementById("toast-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "toast-root";
      root.className = "toast-root";
      root.setAttribute("aria-live", "polite");
      document.body.appendChild(root);
    }
    const kind = type || "success";
    const el = document.createElement("div");
    el.className = "toast toast-" + kind;
    const iconName = kind === "error" ? "alert" : kind === "info" ? "info" : "check-circle";
    el.innerHTML = `<span class="toast-ic">${icon(iconName, "", 18)}</span>
      <span class="toast-txt">${title ? `<strong>${U.esc(title)}</strong>` : ""}<span>${U.esc(message)}</span></span>
      <button class="toast-x" type="button" aria-label="Fermer">${icon("x", "", 15)}</button>`;
    el.querySelector(".toast-x").addEventListener("click", () => dismiss());
    function dismiss() {
      if (!el.isConnected) return;
      el.classList.add("is-leaving");
      setTimeout(() => el.remove(), 220);
    }
    root.appendChild(el);
    setTimeout(dismiss, kind === "error" ? 7000 : 4500);
  }

  /* ------------------------------------------------------------------ */
  /* Modales                                                            */
  /* ------------------------------------------------------------------ */

  let activeModal = null;

  function focusables(card) {
    return [...card.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(
      (el) => el.offsetParent !== null
    );
  }

  function onModalKey(e) {
    if (!activeModal) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal(false);
      return;
    }
    if (e.key === "Tab") {
      const list = focusables(activeModal.card);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function openModal(opts) {
    if (activeModal) closeModal(false);
    const root = document.getElementById("modal-root");
    if (!root) return;
    const o = opts || {};
    const footer = o.footer
      ? `<footer class="modal-foot">${o.footer}</footer>`
      : "";
    const body = `<div class="modal-body">${o.body || ""}</div>${footer}`;
    const inner = o.form
      ? `<form id="${o.form.id || "modal-form"}" data-form="${o.form.action || ""}" novalidate>${body}</form>`
      : body;
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.innerHTML = `<div class="modal-card modal-${o.size || "md"}${o.danger ? " modal-danger" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal-head">
        <div class="modal-head-txt">
          ${o.eyebrow ? `<span class="modal-eyebrow">${U.esc(o.eyebrow)}</span>` : ""}
          <h2 id="modal-title">${o.title || ""}</h2>
          ${o.subtitle ? `<p>${o.subtitle}</p>` : ""}
        </div>
        <button class="icon-btn modal-close" type="button" data-action="close-modal" aria-label="Fermer">${icon("x", "", 18)}</button>
      </header>
      ${inner}
    </div>`;
    root.appendChild(wrap);
    document.body.classList.add("modal-open");
    activeModal = { wrap, card: wrap.querySelector(".modal-card"), resolve: o.resolve || null };
    wrap.addEventListener("mousedown", (e) => {
      if (e.target === wrap) closeModal(false);
    });
    document.addEventListener("keydown", onModalKey);
    setTimeout(() => {
      const list = focusables(activeModal ? activeModal.card : wrap);
      if (list.length) list[0].focus();
    }, 60);
    return wrap;
  }

  function closeModal(result) {
    if (!activeModal) return;
    const current = activeModal;
    activeModal = null;
    document.removeEventListener("keydown", onModalKey);
    current.wrap.classList.add("is-closing");
    setTimeout(() => current.wrap.remove(), 180);
    document.body.classList.remove("modal-open");
    if (current.resolve) current.resolve(Boolean(result));
  }

  function confirm(opts) {
    const o = opts || {};
    return new Promise((resolve) => {
      openModal({
        title: o.title || "Confirmer l'action",
        subtitle: o.subtitle,
        size: "sm",
        danger: o.danger !== false,
        body: `<p class="confirm-text">${o.message || ""}</p>`,
        footer: `<button class="btn btn-ghost" type="button" data-action="close-modal">Annuler</button>
          <button class="btn ${o.danger === false ? "btn-primary" : "btn-danger"}" type="submit">${o.confirmLabel || "Confirmer"}</button>`,
        form: { id: "confirm-form", action: "confirm" },
        resolve
      });
      const form = document.getElementById("confirm-form");
      if (form) {
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          closeModal(true);
        });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Graphiques                                                         */
  /* ------------------------------------------------------------------ */

  function donut(segments, centerValue, centerLabel, opts) {
    const list = (segments || []).filter((s) => Number(s.value) > 0);
    const total = U.sum(list, (s) => s.value);
    let offset = 0;
    const circles = list
      .map((s) => {
        const pct = total > 0 ? (Number(s.value) / total) * 100 : 0;
        const dash = Math.max(0, pct - 0.7);
        const html = `<circle class="donut-seg" cx="21" cy="21" r="15.9155" fill="none" stroke="${s.color}" stroke-width="${opts && opts.thin ? 4 : 5.6}" stroke-dasharray="${dash} ${100 - dash}" stroke-dashoffset="${-offset}" stroke-linecap="round" pathLength="100"><title>${U.esc(s.label)} : ${U.esc(s.display || "")}</title></circle>`;
        offset += pct;
        return html;
      })
      .join("");
    return `<div class="donut-wrap${opts && opts.small ? " donut-sm" : ""}">
      <svg class="donut" viewBox="0 0 42 42" role="img" aria-label="${U.esc(opts && opts.aria ? opts.aria : "Répartition")}">
        <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--surface-3)" stroke-width="${opts && opts.thin ? 4 : 5.6}"/>
        ${circles}
      </svg>
      <div class="donut-center">
        <strong>${centerValue || ""}</strong>
        <span>${centerLabel || ""}</span>
      </div>
    </div>`;
  }

  function linePath(points, key, x, y) {
    let d = "";
    let started = false;
    points.forEach((p) => {
      if (p[key] == null) return;
      d += (started ? "L" : "M") + x(p).toFixed(1) + " " + y(p[key]).toFixed(1) + " ";
      started = true;
    });
    return d.trim();
  }

  function lineChart(points, currency, opts) {
    const o = opts || {};
    const W = 680;
    const H = 250;
    const left = 48;
    const right = 14;
    const top = 18;
    const bottom = 30;
    const values = [];
    points.forEach((p) => {
      if (p.projected != null) values.push(p.projected);
      if (p.actual != null) values.push(p.actual);
    });
    if (!values.length) values.push(0, 100);
    let max = Math.max(...values, 0);
    let min = Math.min(...values, 0);
    if (max === min) max = min + 100;
    const spread = max - min || 1;
    max += spread * 0.12;
    min -= spread * 0.08;
    const dim = points.length || 1;
    const x = (p) => left + ((p.day - 1) / Math.max(1, dim - 1)) * (W - left - right);
    const y = (v) => top + ((max - v) / (max - min)) * (H - top - bottom);
    const projected = linePath(points, "projected", x, y);
    const actual = linePath(points, "actual", x, y);
    const area = projected
      ? `${projected} L ${x(points[points.length - 1]).toFixed(1)} ${(H - bottom).toFixed(1)} L ${x(points[0]).toFixed(1)} ${(H - bottom).toFixed(1)} Z`
      : "";
    const zeroY = y(0);
    const gridCount = 4;
    let grid = "";
    for (let i = 0; i <= gridCount; i += 1) {
      const val = min + ((max - min) * i) / gridCount;
      const yy = y(val);
      grid += `<line class="chart-grid" x1="${left}" y1="${yy.toFixed(1)}" x2="${W - right}" y2="${yy.toFixed(1)}"/>
        <text class="chart-axis" x="${left - 8}" y="${(yy + 3).toFixed(1)}" text-anchor="end">${compact(val, currency)}</text>`;
    }
    const dayTicks = [1, Math.ceil(dim / 2), dim];
    const dayLabels = dayTicks
      .map((d) => `<text class="chart-axis" x="${x({ day: d }).toFixed(1)}" y="${H - 8}" text-anchor="middle">${d}</text>`)
      .join("");
    const lastActual = [...points].reverse().find((p) => p.actual != null);
    const dot = lastActual
      ? `<circle class="chart-dot" cx="${x(lastActual).toFixed(1)}" cy="${y(lastActual.actual).toFixed(1)}" r="4"/>
         <circle class="chart-dot-halo" cx="${x(lastActual).toFixed(1)}" cy="${y(lastActual.actual).toFixed(1)}" r="8"/>`
      : "";
    const summary = `Solde projeté en fin de mois : ${U.fmtMoney(points[points.length - 1] ? points[points.length - 1].projected : 0, currency)}`;
    return `<div class="chart-box">
      <svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${U.esc(summary)}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--brand)" stop-opacity=".22"/>
            <stop offset="100%" stop-color="var(--brand)" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${grid}
        <line class="chart-zero" x1="${left}" y1="${zeroY.toFixed(1)}" x2="${W - right}" y2="${zeroY.toFixed(1)}"/>
        ${area ? `<path d="${area}" fill="url(#areaFill)"/>` : ""}
        ${projected ? `<path class="chart-line-projected" d="${projected}"/>` : ""}
        ${actual ? `<path class="chart-line-actual" d="${actual}"/>` : ""}
        ${dot}
        ${dayLabels}
      </svg>
      <div class="chart-legend-inline">
        <span><i class="legend-dash legend-actual"></i>Solde réel</span>
        <span><i class="legend-dash legend-projected"></i>Projection (factures incluses)</span>
      </div>
    </div>`;
  }

  function compact(value, currency) {
    try {
      return new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
    } catch (e) {
      return String(Math.round(value));
    }
  }

  function barChart(rows, currency) {
    const W = 680;
    const H = 240;
    const left = 48;
    const right = 14;
    const top = 18;
    const bottom = 36;
    const max = Math.max(1, ...rows.map((r) => Math.max(r.income, r.expenses)));
    const gridCount = 4;
    const innerW = W - left - right;
    const innerH = H - top - bottom;
    const groupW = innerW / Math.max(1, rows.length);
    const barW = Math.min(28, groupW * 0.26);
    let grid = "";
    for (let i = 0; i <= gridCount; i += 1) {
      const val = (max * i) / gridCount;
      const yy = top + innerH - (val / max) * innerH;
      grid += `<line class="chart-grid" x1="${left}" y1="${yy.toFixed(1)}" x2="${W - right}" y2="${yy.toFixed(1)}"/>
        <text class="chart-axis" x="${left - 8}" y="${(yy + 3).toFixed(1)}" text-anchor="end">${compact(val, currency)}</text>`;
    }
    const bars = rows
      .map((r, i) => {
        const cx = left + groupW * i + groupW / 2;
        const hInc = (r.income / max) * innerH;
        const hExp = (r.expenses / max) * innerH;
        const label = U.monthShort(r.month);
        return `<g>
          <rect class="bar-income" x="${(cx - barW - 2).toFixed(1)}" y="${(top + innerH - hInc).toFixed(1)}" width="${barW}" height="${Math.max(1, hInc).toFixed(1)}" rx="4"><title>Revenus ${U.monthLabel(r.month)} : ${U.fmtMoney(r.income, currency)}</title></rect>
          <rect class="bar-expense" x="${(cx + 2).toFixed(1)}" y="${(top + innerH - hExp).toFixed(1)}" width="${barW}" height="${Math.max(1, hExp).toFixed(1)}" rx="4"><title>Dépenses ${U.monthLabel(r.month)} : ${U.fmtMoney(r.expenses, currency)}</title></rect>
          <text class="chart-axis" x="${cx.toFixed(1)}" y="${H - 12}" text-anchor="middle">${U.esc(label)}</text>
        </g>`;
      })
      .join("");
    return `<div class="chart-box">
      <svg class="bar-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Revenus et dépenses des six derniers mois" preserveAspectRatio="none">
        ${grid}${bars}
      </svg>
      <div class="chart-legend-inline">
        <span><i class="legend-dot legend-income"></i>Revenus</span>
        <span><i class="legend-dot legend-expense"></i>Dépenses</span>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Petits composants                                                  */
  /* ------------------------------------------------------------------ */

  function progress(percent, color, cls, label) {
    const p = U.clamp(Number(percent) || 0, 0, 100);
    return `<div class="progress${cls ? " " + cls : ""}" role="progressbar" aria-label="${U.esc(label || "Progression")}" aria-valuenow="${Math.round(p)}" aria-valuemin="0" aria-valuemax="100">
      <span class="progress-fill" style="width:${p.toFixed(1)}%;--bar:${color || "var(--brand)"}"></span>
    </div>`;
  }

  function initials(name) {
    const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
  }

  function avatar(name, size) {
    return `<span class="avatar" style="${size ? "width:" + size + "px;height:" + size + "px;font-size:" + Math.round(size / 2.6) + "px" : ""}">${U.esc(initials(name))}</span>`;
  }

  function healthChip(health, compactMode) {
    const tone = health ? health.tone : "neutral";
    return `<span class="health-chip tone-${tone}${compactMode ? " health-compact" : ""}">
      <i class="health-dot" aria-hidden="true"></i>
      <span>${U.esc(health ? health.label : "À configurer")}</span>
      ${health && !compactMode ? `<b>${health.score}</b>` : ""}
    </span>`;
  }

  function healthBanner(health) {
    if (!health) return "";
    return `<div class="health-banner tone-${health.tone}">
      <div class="health-ring" style="--score:${health.score}">
        <span>${health.score}</span>
        <small>/100</small>
      </div>
      <div class="health-txt">
        <strong>${U.esc(health.label)}</strong>
        <p>${U.esc(health.reasons && health.reasons.length ? health.reasons[0] : "Votre budget est équilibré. Continuez ainsi.")}</p>
      </div>
    </div>`;
  }

  function empty(opts) {
    const o = opts || {};
    return `<div class="empty">
      <div class="empty-ic">${icon(o.icon || "sparkles", "", 26)}</div>
      <h3>${U.esc(o.title || "Rien ici pour le moment")}</h3>
      <p>${U.esc(o.text || "Ajoutez un premier élément pour démarrer.")}</p>
      ${o.action || ""}
    </div>`;
  }

  function catBadge(cat) {
    if (!cat) {
      return `<span class="cat-badge" style="--cat:#8a9a91"><span class="cat-emoji">✨</span><span>Sans catégorie</span></span>`;
    }
    return `<span class="cat-badge" style="--cat:${cat.color}"><span class="cat-emoji">${U.esc(cat.icon || "✨")}</span><span>${U.esc(cat.name)}</span></span>`;
  }

  function envBadge(key) {
    const env = App.constants.ENVELOPES[key] || App.constants.ENVELOPES.besoin;
    return `<span class="env-badge" style="--env:${env.color};--env-soft:${env.soft}"><i></i>${U.esc(env.short)}</span>`;
  }

  function statusTag(paid) {
    return paid
      ? `<span class="tag tag-paid">${icon("check", "", 12)} Payé</span>`
      : `<span class="tag tag-pending">${icon("clock", "", 12)} En attente</span>`;
  }

  function field(opts) {
    const o = opts || {};
    const id = o.id || "f-" + Math.random().toString(36).slice(2, 7);
    const value = o.value == null ? "" : o.value;
    const attrs = [
      o.required ? "required" : "",
      o.min != null ? `min="${o.min}"` : "",
      o.max != null ? `max="${o.max}"` : "",
      o.step != null ? `step="${o.step}"` : "",
      o.placeholder ? `placeholder="${U.esc(o.placeholder)}"` : "",
      o.autocomplete ? `autocomplete="${U.esc(o.autocomplete)}"` : "",
      o.inputmode ? `inputmode="${U.esc(o.inputmode)}"` : ""
    ]
      .filter(Boolean)
      .join(" ");
    let control = "";
    if (o.type === "select") {
      control = `<select id="${id}" name="${o.name}" class="input" ${attrs}>${o.options || ""}</select>`;
    } else if (o.type === "textarea") {
      control = `<textarea id="${id}" name="${o.name}" class="input" rows="${o.rows || 3}" ${attrs}>${U.esc(value)}</textarea>`;
    } else {
      control = `<input id="${id}" name="${o.name}" type="${o.type || "text"}" class="input" value="${U.esc(value)}" ${attrs}>`;
    }
    return `<div class="field${o.wide ? " field-wide" : ""}">
      <label for="${id}">${U.esc(o.label)}${o.optional ? ' <span class="optional">facultatif</span>' : ""}</label>
      ${control}
      ${o.hint ? `<span class="field-hint">${o.hint}</span>` : ""}
      ${o.error ? `<span class="field-error"></span>` : ""}
    </div>`;
  }

  function segmented(name, options, value) {
    return `<div class="segmented" role="group" aria-label="${U.esc(name)}">
      ${options
        .map(
          (o) =>
            `<label class="seg-opt${String(o.value) === String(value) ? " is-active" : ""}">
              <input type="radio" name="${U.esc(name)}" value="${U.esc(o.value)}" ${String(o.value) === String(value) ? "checked" : ""}>
              <span>${o.icon ? icon(o.icon, "", 15) : ""}${U.esc(o.label)}</span>
            </label>`
        )
        .join("")}
    </div>`;
  }

  function toggle(name, label, checked, hint) {
    return `<label class="switch-row">
      <span class="switch-copy"><strong>${U.esc(label)}</strong>${hint ? `<small>${U.esc(hint)}</small>` : ""}</span>
      <span class="switch">
        <input type="checkbox" name="${U.esc(name)}" ${checked ? "checked" : ""}>
        <span class="switch-track"><span class="switch-thumb"></span></span>
      </span>
    </label>`;
  }

  App.UI = {
    icon,
    logo,
    toast,
    openModal,
    closeModal,
    confirm,
    donut,
    lineChart,
    barChart,
    progress,
    initials,
    avatar,
    healthChip,
    healthBanner,
    empty,
    catBadge,
    envBadge,
    statusTag,
    field,
    segmented,
    toggle,
    compact
  };
  App.icon = icon;
})(window);
