/**
 * APP.JS — Matfin · Organizador Financeiro
 * Usa Firebase Authentication + Firestore (banco de dados em nuvem).
 * Todas as operações de dados são assíncronas (async/await).
 */

// ─── ESTADO GLOBAL ────────────────────────────────────────────
let currentUser = null; // { uid, username }

// ─── INICIALIZAÇÃO ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  showLoading(true);

  // Firebase mantém a sessão automaticamente entre aberturas do navegador.
  // onAuthChange dispara imediatamente com o usuário atual (ou null).
  DB.Auth.onAuthChange(async (firebaseUser) => {
    if (firebaseUser) {
      // Busca o perfil (username) no Firestore
      const snap = await firebase.firestore()
        .collection("users").doc(firebaseUser.uid).get();
      const profile = snap.data() || {};
      currentUser = { uid: firebaseUser.uid, username: profile.username || firebaseUser.email };
      showApp();
    } else {
      currentUser = null;
      showLoading(false);
      showAuth("login");
    }
  });
});

function showLoading(on) {
  const el = document.getElementById("loading-screen");
  if (el) el.style.display = on ? "flex" : "none";
}

// ─── AUTH / APP TOGGLE ────────────────────────────────────────
function showAuth(view = "login") {
  showLoading(false);
  document.getElementById("auth-root").style.display = "flex";
  document.getElementById("app-root").style.display = "none";
  switchAuthTab(view);
}

function showApp() {
  showLoading(false);
  document.getElementById("auth-root").style.display = "none";
  document.getElementById("app-root").style.display = "block";
  renderUserChip();
  navigateTo("dashboard");
}

// ─── AUTH TABS ────────────────────────────────────────────────
function switchAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
  document.getElementById("pane-login").style.display    = "none";
  document.getElementById("pane-register").style.display = "none";
  document.getElementById("pane-reset").style.display    = "none";
  clearMsgs();
  if (tab === "login") {
    document.getElementById("tab-login").classList.add("active");
    document.getElementById("pane-login").style.display = "block";
  } else if (tab === "register") {
    document.getElementById("tab-register").classList.add("active");
    document.getElementById("pane-register").style.display = "block";
  } else {
    document.getElementById("pane-reset").style.display = "block";
  }
}

function clearMsgs() {
  document.querySelectorAll(".msg").forEach((m) => {
    m.style.display = "none"; m.textContent = ""; m.className = "msg";
  });
}
function showMsg(id, text, type = "error") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text; el.className = "msg " + type; el.style.display = "block";
}

// ─── HELPERS DE LOADING NOS BOTÕES ───────────────────────────
function setBtnLoading(btnId, loading, label) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? "Aguarde..." : label;
}

// ─── LOGIN ────────────────────────────────────────────────────
async function handleLogin() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  clearMsgs();
  setBtnLoading("btn-login", true, "Entrar na Conta");
  const result = await DB.Auth.login(username, password);
  setBtnLoading("btn-login", false, "Entrar na Conta");
  if (!result.ok) { showMsg("login-msg", result.error); return; }
  // onAuthChange cuida do redirecionamento automaticamente
}

// ─── REGISTRO ────────────────────────────────────────────────
async function handleRegister() {
  const username = document.getElementById("reg-username").value.trim();
  const password = document.getElementById("reg-password").value;
  const confirm  = document.getElementById("reg-confirm").value;
  clearMsgs();
  if (password !== confirm) { showMsg("reg-msg", "As senhas não coincidem."); return; }
  setBtnLoading("btn-register", true, "Criar Conta");
  const result = await DB.Auth.register(username, password);
  setBtnLoading("btn-register", false, "Criar Conta");
  if (!result.ok) { showMsg("reg-msg", result.error); return; }
  showMsg("reg-msg", "Conta criada com sucesso! Fazendo login...", "success");
  // onAuthChange vai redirecionar automaticamente após o registro
}

// ─── REDEFINIR SENHA ──────────────────────────────────────────
async function handleReset() {
  const username = document.getElementById("reset-username").value.trim();
  const newPass  = document.getElementById("reset-newpass").value;
  const confirm  = document.getElementById("reset-confirm").value;
  clearMsgs();
  if (newPass !== confirm) { showMsg("reset-msg", "As senhas não coincidem."); return; }
  setBtnLoading("btn-reset", true, "Redefinir Senha");
  const result = await DB.Auth.resetPassword(username, newPass);
  setBtnLoading("btn-reset", false, "Redefinir Senha");
  if (!result.ok) { showMsg("reset-msg", result.error); return; }
  showMsg("reset-msg", "Senha redefinida com sucesso!", "success");
  setTimeout(() => switchAuthTab("login"), 1500);
}

// ─── LOGOUT ──────────────────────────────────────────────────
async function handleLogout() {
  await DB.Auth.logout();
  // onAuthChange cuida do redirecionamento
}

// ─── DELETAR CONTA ────────────────────────────────────────────
function openDeleteModal()  { document.getElementById("delete-modal").classList.add("open"); }
function closeDeleteModal() { document.getElementById("delete-modal").classList.remove("open"); }

async function confirmDeleteAccount() {
  const result = await DB.Auth.deleteAccount(currentUser.uid, currentUser.username);
  if (!result.ok) { alert("Erro ao excluir: " + result.error); return; }
  closeDeleteModal();
  // onAuthChange cuida do redirecionamento
}

// ─── NAVEGAÇÃO ────────────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  const pageEl = document.getElementById("page-" + page);
  const navEl  = document.querySelector(`[data-page="${page}"]`);
  if (pageEl) { pageEl.classList.add("active"); renderPage(page); }
  if (navEl)  navEl.classList.add("active");
}

function renderUserChip() {
  const nameEl   = document.getElementById("sidebar-username");
  const avatarEl = document.getElementById("sidebar-avatar");
  if (nameEl)   nameEl.textContent   = currentUser.username;
  if (avatarEl) avatarEl.textContent = currentUser.username.charAt(0).toUpperCase();
}

// ─── RENDER ROUTER ────────────────────────────────────────────
function renderPage(page) {
  switch (page) {
    case "dashboard":  renderDashboard();  break;
    case "income":     renderIncome();     break;
    case "expenses":   renderExpenses();   break;
    case "simple":     renderSimple();     break;
    case "compound":   renderCompound();   break;
    case "consignado": renderConsignado(); break;
    case "savings":    renderSavings();    break;
    case "goals":      renderGoals();      break;
    case "discount":   renderDiscount();   break;
    case "cashflow":   renderCashflow();   break;
    case "vehicle":    renderVehicle();    break;
    case "videos":     renderVideos();     break;
    case "credits":    renderCredits();    break;
    case "settings":   renderSettings();   break;
  }
}

// ─── UTILITÁRIOS GLOBAIS ──────────────────────────────────────
function fmtDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }

function parseMoney(raw) {
  if (!raw && raw !== 0) return NaN;
  const s = String(raw).trim().replace(/R\$\s*/g, "").replace(/\s/g, "");
  if (!s) return NaN;
  if (s.includes(",")) {
    const parts = s.split(",");
    return parseFloat(parts[0].replace(/\./g, "") + "." + parts[parts.length - 1]);
  }
  if (s.includes(".")) {
    const parts = s.split(".");
    if (parts.length === 2 && parts[1].length <= 2) return parseFloat(s);
    return parseFloat(parts.join(""));
  }
  return parseFloat(s);
}
function getMoneyVal(id) {
  const el = document.getElementById(id);
  return el ? parseMoney(el.value) : NaN;
}
function showMoneyInField(id, value) {
  const el = document.getElementById(id);
  if (!el || isNaN(value)) return;
  el.value = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}
function clearMoneyField(id) {
  const el = document.getElementById(id);
  if (el) el.value = "";
}
function initMoneyInputs() { /* noop — type=text não precisa de eventos */ }

function chartColors() {
  const dark = document.documentElement.getAttribute("data-theme") !== "light";
  return {
    tick:   dark ? "#6a7fa0" : "#5a7090",
    legend: dark ? "#a8b8d8" : "#2e4060",
    grid:   dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
  };
}

// ─── TEMA ────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem("matfin_theme") || "dark";
  applyTheme(saved);
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("matfin_theme", theme);
  const label = document.getElementById("theme-label");
  if (label) label.textContent = theme === "dark" ? "Modo Claro" : "Modo Escuro";
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  applyTheme(cur === "dark" ? "light" : "dark");
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════
let dashChart = null;
let dashDonut = null;

async function renderDashboard() {
  const [transactions, allocations, goals] = await Promise.all([
    DB.Transactions.findByUser(currentUser.uid),
    DB.Allocations.findByUser(currentUser.uid),
    DB.Goals.findByUser(currentUser.uid),
  ]);

  const totalIncome   = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalSaved    = allocations.reduce((s, a) => s + a.savedAmount, 0);
  const totalInvested = allocations.reduce((s, a) => s + a.investedAmount, 0);
  const balance       = totalIncome - totalExpenses;

  document.getElementById("dash-income").textContent     = Finance.fmt(totalIncome);
  document.getElementById("dash-expenses").textContent   = Finance.fmt(totalExpenses);
  document.getElementById("dash-balance").textContent    = Finance.fmt(balance);
  document.getElementById("dash-saved").textContent      = Finance.fmt(totalSaved + totalInvested);
  document.getElementById("dash-goals-count").textContent = goals.length;

  const expensesByCategory = {};
  transactions.filter((t) => t.type === "expense").forEach((t) => {
    expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
  });
  const catLabels = Object.keys(expensesByCategory).slice(0, 7);
  const catValues = catLabels.map((c) => expensesByCategory[c]);

  const c = chartColors();
  const ctx1 = document.getElementById("dash-bar-chart").getContext("2d");
  if (dashChart) dashChart.destroy();
  dashChart = new Chart(ctx1, {
    type: "bar",
    data: {
      labels: catLabels.length ? catLabels : ["Sem dados"],
      datasets: [{ label: "Despesas por Categoria", data: catValues.length ? catValues : [0],
        backgroundColor: "rgba(0,168,107,0.5)", borderColor: "#00d68f", borderWidth: 2, borderRadius: 6 }],
    },
    options: { responsive: true, plugins: { legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => Finance.fmt(ctx.raw) } } },
      scales: { x: { ticks: { color: c.tick }, grid: { color: c.grid } },
        y: { ticks: { color: c.tick, callback: (v) => Finance.fmt(v) }, grid: { color: c.grid } } } },
  });

  const ctx2 = document.getElementById("dash-donut-chart").getContext("2d");
  if (dashDonut) dashDonut.destroy();
  dashDonut = new Chart(ctx2, {
    type: "doughnut",
    data: { labels: ["Receitas", "Despesas"],
      datasets: [{ data: [totalIncome || 1, totalExpenses || 0.01],
        backgroundColor: ["#00d68f", "#ff4f6a"], borderWidth: 0, hoverOffset: 6 }] },
    options: { responsive: true, cutout: "70%",
      plugins: { legend: { position: "bottom", labels: { color: c.legend, padding: 14, font: { size: 12 } } },
        tooltip: { callbacks: { label: (ctx) => Finance.fmt(ctx.raw) } } } },
  });
}

// ══════════════════════════════════════════════════════════════
// RECEITAS
// ══════════════════════════════════════════════════════════════
async function renderIncome() {
  const [alloc, incTx] = await Promise.all([
    DB.Allocations.findByUser(currentUser.uid),
    DB.Transactions.findByUser(currentUser.uid).then((t) => t.filter((x) => x.type === "income")),
  ]);

  const totalSaved    = alloc.reduce((s, a) => s + a.savedAmount, 0);
  const totalInvested = alloc.reduce((s, a) => s + a.investedAmount, 0);
  document.getElementById("income-total-saved").textContent    = Finance.fmt(totalSaved);
  document.getElementById("income-total-invested").textContent = Finance.fmt(totalInvested);

  const tbody = document.getElementById("income-alloc-table");
  tbody.innerHTML = "";
  alloc.slice().sort((a, b) => b.date.localeCompare(a.date)).forEach((a) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${fmtDate(a.date)}</td>
      <td class="text-green">${Finance.fmt(a.totalIncome)}</td>
      <td>${Finance.fmt(a.savedAmount)}</td>
      <td class="text-yellow">${Finance.fmt(a.investedAmount)}</td>
      <td>${Finance.fmt(a.totalIncome - a.savedAmount - a.investedAmount)}</td>
      <td><button class="btn-del" onclick="deleteAlloc('${a.id}')">Remover</button></td>`;
    tbody.appendChild(tr);
  });
  if (!alloc.length) tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhuma alocação registrada.</td></tr>`;

  const txBody = document.getElementById("income-tx-table");
  txBody.innerHTML = "";
  incTx.forEach((t) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${fmtDate(t.date)}</td><td>${t.description}</td>
      <td class="text-green">${Finance.fmt(t.amount)}</td>
      <td><button class="btn-del" onclick="deleteTransaction('${t.id}')">Remover</button></td>`;
    txBody.appendChild(tr);
  });
  if (!incTx.length) txBody.innerHTML = `<tr><td colspan="4" class="empty-state">Nenhuma receita registrada.</td></tr>`;
}

async function addAllocation() {
  const income   = getMoneyVal("alloc-income");
  const saved    = getMoneyVal("alloc-saved") || 0;
  const invested = getMoneyVal("alloc-invested") || 0;
  const date     = document.getElementById("alloc-date").value || todayISO();
  if (!income || income <= 0) { alert("Informe um valor de renda válido."); return; }
  if (saved + invested > income) { alert("Guardado + Investido não pode superar a renda total."); return; }
  await DB.Allocations.create(currentUser.uid, { totalIncome: income, savedAmount: saved, investedAmount: invested, date });
  await DB.Transactions.create(currentUser.uid, { type: "income", amount: income, description: "Renda registrada", category: "Renda", date });
  ["alloc-income", "alloc-saved", "alloc-invested"].forEach(clearMoneyField);
  renderIncome();
}

async function deleteAlloc(id) {
  await DB.Allocations.delete(currentUser.uid, id);
  renderIncome();
}

// ══════════════════════════════════════════════════════════════
// DESPESAS
// ══════════════════════════════════════════════════════════════
let expPieChart = null;
let expBarChart = null;

async function renderExpenses() {
  const expenses    = (await DB.Transactions.findByUser(currentUser.uid)).filter((t) => t.type === "expense");
  const essential   = expenses.filter((e) => e.isEssential);
  const nonEssential= expenses.filter((e) => !e.isEssential);
  const totalEss    = essential.reduce((s, e) => s + e.amount, 0);
  const totalNon    = nonEssential.reduce((s, e) => s + e.amount, 0);
  const total       = totalEss + totalNon;

  document.getElementById("exp-total-essential").textContent    = Finance.fmt(totalEss);
  document.getElementById("exp-total-nonessential").textContent = Finance.fmt(totalNon);
  document.getElementById("exp-total").textContent              = Finance.fmt(total);
  const pctEss = total > 0 ? ((totalEss / total) * 100).toFixed(2) : "0.00";
  const pctNon = total > 0 ? ((totalNon / total) * 100).toFixed(2) : "0.00";
  document.getElementById("exp-pct-ess").textContent = pctEss + "% do total";
  document.getElementById("exp-pct-non").textContent = pctNon + "% do total";

  const c = chartColors();
  const ctx1 = document.getElementById("exp-pie-chart").getContext("2d");
  if (expPieChart) expPieChart.destroy();
  expPieChart = new Chart(ctx1, {
    type: "doughnut",
    data: { labels: ["Essenciais", "Não Essenciais"],
      datasets: [{ data: [totalEss || 0.01, totalNon || 0.01],
        backgroundColor: ["#00d68f", "#f0c040"], borderWidth: 0, hoverOffset: 8 }] },
    options: { responsive: true, cutout: "65%",
      plugins: { legend: { position: "bottom", labels: { color: c.legend, padding: 12, font: { size: 12 } } },
        tooltip: { callbacks: { label: (ctx2) => `${ctx2.label}: ${Finance.fmt(ctx2.raw)} (${total > 0 ? ((ctx2.raw / total) * 100).toFixed(2) : "0.00"}%)` } } } },
  });

  const byCat = {};
  expenses.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const catL = Object.keys(byCat);
  const catV = catL.map((cat) => byCat[cat]);
  const ctx2 = document.getElementById("exp-bar-chart").getContext("2d");
  if (expBarChart) expBarChart.destroy();
  expBarChart = new Chart(ctx2, {
    type: "bar",
    data: { labels: catL.length ? catL : ["Sem dados"],
      datasets: [{ label: "Valor", data: catV.length ? catV : [0],
        backgroundColor: catL.map((_, i) => i % 2 === 0 ? "rgba(240,192,64,0.65)" : "rgba(0,168,107,0.6)"),
        borderRadius: 6, borderWidth: 0 }] },
    options: { responsive: true, indexAxis: "y",
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx3) => Finance.fmt(ctx3.raw) } } },
      scales: { x: { ticks: { color: c.tick, callback: (v) => Finance.fmt(v) }, grid: { color: c.grid } },
        y: { ticks: { color: c.legend }, grid: { display: false } } } },
  });

  const tbody = document.getElementById("exp-table");
  tbody.innerHTML = "";
  expenses.slice().sort((a, b) => b.date.localeCompare(a.date)).forEach((e) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${fmtDate(e.date)}</td><td>${e.description}</td><td>${e.category}</td>
      <td><span class="tag ${e.isEssential ? "essential" : "non-essential"}">${e.isEssential ? "Essencial" : "Não Essencial"}</span></td>
      <td class="text-red">${Finance.fmt(e.amount)}</td>
      <td><button class="btn-del" onclick="deleteTransaction('${e.id}')">Remover</button></td>`;
    tbody.appendChild(tr);
  });
  if (!expenses.length) tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nenhuma despesa registrada.</td></tr>`;
}

async function addExpense() {
  const amount      = getMoneyVal("exp-amount");
  const description = document.getElementById("exp-desc").value;
  const category    = document.getElementById("exp-category").value;
  const isEssential = document.querySelector('input[name="exp-type"]:checked')?.value === "essential";
  const date        = document.getElementById("exp-date").value || todayISO();
  if (!amount || !description) { alert("Preencha valor e descrição."); return; }
  await DB.Transactions.create(currentUser.uid, { type: "expense", amount, description, category, isEssential, date });
  clearMoneyField("exp-amount");
  document.getElementById("exp-desc").value = "";
  renderExpenses();
}

async function deleteTransaction(id) {
  await DB.Transactions.delete(currentUser.uid, id);
  renderPage(document.querySelector(".page.active").id.replace("page-", ""));
}

// ══════════════════════════════════════════════════════════════
// JUROS SIMPLES
// ══════════════════════════════════════════════════════════════
let simpleChart = null;
function renderSimple() {}

function calcSimple() {
  const P = getMoneyVal("si-principal");
  const r = parseFloat(document.getElementById("si-rate").value);
  const t = parseInt(document.getElementById("si-periods").value);
  if (!P || !r || !t) { alert("Preencha todos os campos."); return; }
  showMoneyInField("si-principal", P);
  const res = Finance.simpleInterest(P, r, t);
  document.getElementById("si-result").style.display = "block";
  document.getElementById("si-res-principal").textContent = Finance.fmt(res.principal);
  document.getElementById("si-res-interest").textContent  = Finance.fmt(res.interest);
  document.getElementById("si-res-total").textContent     = Finance.fmt(res.total);
  document.getElementById("si-res-rate").textContent      = (res.rate * 100).toFixed(2) + "% por período";
  const c = chartColors();
  const ctx = document.getElementById("si-chart").getContext("2d");
  if (simpleChart) simpleChart.destroy();
  simpleChart = new Chart(ctx, {
    type: "line",
    data: { labels: res.schedule.map((s) => "Per. " + s.period),
      datasets: [
        { label: "Saldo Total", data: res.schedule.map((s) => s.balance),
          borderColor: "#00d68f", backgroundColor: "rgba(0,214,143,0.08)", fill: true, tension: 0.1, pointRadius: 3 },
        { label: "Principal", data: res.schedule.map(() => res.principal),
          borderColor: "#3d9bff", borderDash: [5, 5], pointRadius: 0 },
      ] },
    options: { responsive: true,
      plugins: { legend: { labels: { color: c.legend } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Finance.fmt(ctx.raw)}` } } },
      scales: { x: { ticks: { color: c.tick }, grid: { color: c.grid } }, y: { ticks: { color: c.tick, callback: (v) => Finance.fmt(v) }, grid: { color: c.grid } } } },
  });
}

// ══════════════════════════════════════════════════════════════
// JUROS COMPOSTOS
// ══════════════════════════════════════════════════════════════
let compChart = null;
function renderCompound() {}

function calcCompound() {
  const P      = getMoneyVal("ci-principal");
  const r      = parseFloat(document.getElementById("ci-rate").value);
  const t      = parseInt(document.getElementById("ci-periods").value);
  const aporte = getMoneyVal("ci-aporte") || 0;
  if (!P || !r || !t) { alert("Preencha Capital Inicial, Taxa e Número de Períodos."); return; }
  showMoneyInField("ci-principal", P);
  if (aporte > 0) showMoneyInField("ci-aporte", aporte);
  const resS = Finance.simpleInterest(P, r, t);
  const res  = aporte > 0 ? Finance.compoundWithAporte(P, r, t, aporte) : Finance.compoundInterest(P, r, t);
  document.getElementById("ci-result").style.display = "block";
  document.getElementById("ci-res-principal").textContent    = Finance.fmt(res.principal);
  document.getElementById("ci-res-aporte-total").textContent = aporte > 0 ? Finance.fmt(res.totalAportes) : "Sem aporte";
  document.getElementById("ci-res-interest").textContent     = Finance.fmt(res.interest);
  document.getElementById("ci-res-total").textContent        = Finance.fmt(res.total);
  document.getElementById("ci-res-diff").textContent         = Finance.fmt(res.interest - resS.interest);
  const tbody = document.getElementById("ci-schedule-body");
  const thead = document.getElementById("ci-schedule-head");
  if (tbody) {
    tbody.innerHTML = "";
    if (thead) thead.innerHTML = aporte > 0
      ? "<tr><th>Período</th><th>Aporte</th><th>Juros do Período</th><th>Saldo Acumulado</th></tr>"
      : "<tr><th>Período</th><th>Juros do Período</th><th>Saldo Acumulado</th></tr>";
    const mostrar = Math.min(res.schedule.length, 10);
    res.schedule.slice(0, mostrar).forEach((row) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="mono">${row.period}</td>
        ${aporte > 0 ? `<td class="mono text-blue">${Finance.fmt(row.aporte)}</td>` : ""}
        <td class="mono text-yellow">${Finance.fmt(row.interest)}</td>
        <td class="mono text-green">${Finance.fmt(row.balance)}</td>`;
      tbody.appendChild(tr);
    });
    if (res.schedule.length > 10) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="${aporte > 0 ? 4 : 3}" class="text-muted small" style="text-align:center;padding:8px;">... e mais ${res.schedule.length - 10} períodos</td>`;
      tbody.appendChild(tr);
    }
  }
  const c = chartColors();
  const ctx = document.getElementById("ci-chart").getContext("2d");
  if (compChart) compChart.destroy();
  const datasets = [
    { label: aporte > 0 ? "Compostos com Aporte" : "Juros Compostos", data: res.schedule.map((s) => s.balance),
      borderColor: "#f0c040", backgroundColor: "rgba(240,192,64,0.08)", fill: true, tension: 0.3, pointRadius: t <= 24 ? 4 : 1 },
    { label: "Juros Simples (comparação)", data: resS.schedule.map((s) => s.balance),
      borderColor: "#3d9bff", borderDash: [6, 4], fill: false, pointRadius: 0, borderWidth: 2 },
  ];
  if (aporte > 0) {
    const resSemAporte = Finance.compoundInterest(P, r, t);
    datasets.push({ label: "Compostos sem Aporte", data: resSemAporte.schedule.map((s) => s.balance),
      borderColor: "#00d68f", borderDash: [3, 3], fill: false, pointRadius: 0, borderWidth: 1.5 });
  }
  compChart = new Chart(ctx, {
    type: "line", data: { labels: res.schedule.map((s) => "Per. " + s.period), datasets },
    options: { responsive: true,
      plugins: { legend: { labels: { color: c.legend } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Finance.fmt(ctx.raw)}` } } },
      scales: { x: { ticks: { color: c.tick, maxTicksLimit: 12 }, grid: { color: c.grid } }, y: { ticks: { color: c.tick, callback: (v) => Finance.fmt(v) }, grid: { color: c.grid } } } },
  });
  const card = document.getElementById("ci-schedule-card");
  if (card) card.style.display = "block";
}

// ══════════════════════════════════════════════════════════════
// CONSIGNADO
// ══════════════════════════════════════════════════════════════
let consiChart = null;
let consiMode  = "findPMT";
function renderConsignado() { switchConsiMode(consiMode); }

function switchConsiMode(mode) {
  consiMode = mode;
  document.querySelectorAll(".mode-btn").forEach((b) => b.classList.remove("active"));
  const btn = document.getElementById("mode-btn-" + mode);
  if (btn) btn.classList.add("active");
  document.getElementById("con-group-pmt-input").style.display  = mode === "findRate" ? "" : "none";
  document.getElementById("con-group-rate-input").style.display = mode === "findPMT"  ? "" : "none";
  document.getElementById("con-result").style.display    = "none";
  document.getElementById("con-amort-card").style.display = "none";
  document.getElementById("con-mode-hint-findPMT").style.display = mode === "findPMT" ? "" : "none";
  document.getElementById("con-mode-hint-findRate").style.display = mode === "findRate" ? "" : "none";
}

function onModalityChange() {
  const mIdx = parseInt(document.getElementById("con-modality").value);
  if (!isNaN(mIdx) && mIdx < 3 && consiMode === "findPMT") {
    document.getElementById("con-rate-input").value = Finance.CONSIGNADO_RATES[mIdx].monthlyRate.toFixed(2);
  }
  const maxM = Finance.CONSIGNADO_RATES[mIdx]?.maxMonths || 96;
  document.getElementById("con-months").max = maxM;
  document.getElementById("con-max-months").textContent = "Máximo: " + maxM + " parcelas para esta modalidade";
}

function calcConsignado() {
  const PV    = getMoneyVal("con-value");
  const months = parseInt(document.getElementById("con-months").value);
  const mIdx   = parseInt(document.getElementById("con-modality").value);
  if (!PV || !months) { alert("Preencha Valor e Número de Parcelas."); return; }
  showMoneyInField("con-value", PV);
  let params = { PV, months, modalityIndex: mIdx, mode: consiMode };
  if (consiMode === "findPMT") {
    let rateVal = getMoneyVal("con-rate-input");
    if (!rateVal && mIdx < 3) rateVal = Finance.CONSIGNADO_RATES[mIdx].monthlyRate;
    if (!rateVal) { alert("Informe a taxa de juros mensal."); return; }
    params.rateMonthly = rateVal;
  } else {
    const PMT = getMoneyVal("con-pmt-input");
    if (!PMT) { alert("Informe o valor da parcela."); return; }
    params.PMT = PMT;
  }
  const res = Finance.consignado(params);
  document.getElementById("con-result").style.display    = "block";
  document.getElementById("con-amort-card").style.display = "block";
  document.getElementById("con-res-modality").textContent = res.modality.label;
  document.getElementById("con-res-rate").textContent     = res.rateMonthly.toFixed(2) + "% a.m.";
  document.getElementById("con-res-cet").textContent      = "~" + res.cetEstimated.toFixed(2) + "% a.m.";
  document.getElementById("con-res-pmt").textContent      = Finance.fmt(res.PMT);
  document.getElementById("con-res-total").textContent    = Finance.fmt(res.totalPaid);
  document.getElementById("con-res-interest").textContent = Finance.fmt(res.totalInterest);
  const tbody = document.getElementById("con-amort-table");
  tbody.innerHTML = "";
  res.schedule.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="mono">${row.installment}</td><td class="mono">${Finance.fmt(row.pmt)}</td>
      <td class="mono text-red">${Finance.fmt(row.interest)}</td><td class="mono text-green">${Finance.fmt(row.principal)}</td>
      <td class="mono">${Finance.fmt(row.balance)}</td>`;
    tbody.appendChild(tr);
  });
  const c = chartColors();
  const ctx = document.getElementById("con-chart").getContext("2d");
  if (consiChart) consiChart.destroy();
  const step = Math.max(1, Math.floor(res.schedule.length / 24));
  const sample = res.schedule.filter((_, i) => i % step === 0);
  consiChart = new Chart(ctx, {
    type: "bar",
    data: { labels: sample.map((s) => "P" + s.installment),
      datasets: [
        { label: "Juros", data: sample.map((s) => s.interest), backgroundColor: "rgba(214,48,80,0.7)", borderRadius: 4 },
        { label: "Amortização", data: sample.map((s) => s.principal), backgroundColor: "rgba(0,168,107,0.65)", borderRadius: 4 },
      ] },
    options: { responsive: true,
      scales: { x: { stacked: true, ticks: { color: c.tick }, grid: { display: false } },
        y: { stacked: true, ticks: { color: c.tick, callback: (v) => Finance.fmt(v) }, grid: { color: c.grid } } },
      plugins: { legend: { labels: { color: c.legend } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Finance.fmt(ctx.raw)}` } } } },
  });
}

// ══════════════════════════════════════════════════════════════
// POUPANÇA
// ══════════════════════════════════════════════════════════════
let savChart = null;
let selicAtual = 14.75;

async function fetchSelic() {
  const badge  = document.getElementById("selic-badge-val");
  const ruleEl = document.getElementById("selic-rule");
  if (badge) badge.textContent = "buscando...";
  try {
    const resp = await fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json");
    if (resp.ok) {
      const data = await resp.json();
      selicAtual = parseFloat(data[0].valor);
      if (badge)  badge.textContent  = selicAtual.toFixed(2) + "% a.a.";
      if (ruleEl) ruleEl.textContent = selicAtual >= 8.5
        ? "Regra: 0,5% ao mês + TR (Selic acima de 8,5% a.a.)"
        : "Regra: 70% da Selic dividido por 12 (Selic abaixo de 8,5% a.a.)";
    } else throw new Error();
  } catch {
    selicAtual = 14.75;
    if (badge)  badge.textContent  = "14,75% a.a. (referência)";
    if (ruleEl) ruleEl.textContent = "Regra: 0,5% ao mês + TR (Selic acima de 8,5% a.a.)";
  }
}
function renderSavings() { fetchSelic(); }

function calcSavings() {
  const P      = getMoneyVal("sav-principal");
  const m      = parseInt(document.getElementById("sav-months").value);
  const aporte = getMoneyVal("sav-aporte") || 0;
  if (!P || !m) { alert("Preencha o valor depositado e o número de meses."); return; }
  showMoneyInField("sav-principal", P);
  if (aporte > 0) showMoneyInField("sav-aporte", aporte);
  const res = Finance.savingsInterest(P, m, selicAtual, aporte);
  document.getElementById("sav-result").style.display            = "block";
  document.getElementById("sav-res-principal").textContent       = Finance.fmt(res.principal);
  document.getElementById("sav-res-aporte-total").textContent    = aporte > 0 ? Finance.fmt(res.totalAportes) + " (total aportado)" : "Sem aporte mensal";
  document.getElementById("sav-res-interest").textContent        = Finance.fmt(res.interest);
  document.getElementById("sav-res-total").textContent           = Finance.fmt(res.total);
  document.getElementById("sav-res-rate").textContent            = (res.monthlyRate * 100).toFixed(2) + "% a.m.";
  document.getElementById("sav-res-selic").textContent           = res.selicRef.toFixed(2) + "% a.a.";
  document.getElementById("sav-res-rule").textContent            = res.rule;
  const c = chartColors();
  const ctx = document.getElementById("sav-chart").getContext("2d");
  if (savChart) savChart.destroy();
  const datasets = [
    { label: aporte > 0 ? "Saldo com Aporte" : "Saldo da Poupança", data: res.schedule.map((s) => s.balance),
      borderColor: "#00d68f", backgroundColor: "rgba(0,214,143,0.08)", fill: true, tension: 0.3, pointRadius: m <= 24 ? 4 : 1 },
  ];
  if (aporte > 0) {
    const resSemAporte = Finance.savingsInterest(P, m, selicAtual, 0);
    datasets.push({ label: "Sem Aporte (referência)", data: resSemAporte.schedule.map((s) => s.balance),
      borderColor: "#3d9bff", borderDash: [5, 4], fill: false, pointRadius: 0, borderWidth: 1.5 });
  }
  savChart = new Chart(ctx, {
    type: "line", data: { labels: res.schedule.map((s) => "Mês " + s.month), datasets },
    options: { responsive: true,
      plugins: { legend: { labels: { color: c.legend } }, tooltip: { callbacks: { label: (ctx) => Finance.fmt(ctx.raw) } } },
      scales: { x: { ticks: { color: c.tick, maxTicksLimit: 12 }, grid: { color: c.grid } }, y: { ticks: { color: c.tick, callback: (v) => Finance.fmt(v) }, grid: { color: c.grid } } } },
  });
}

// ══════════════════════════════════════════════════════════════
// DESCONTO À VISTA
// ══════════════════════════════════════════════════════════════
function renderDiscount() {}
function calcDiscount() {
  const price = getMoneyVal("disc-price");
  const pct   = parseFloat(document.getElementById("disc-pct").value);
  if (!price || isNaN(pct)) { alert("Preencha o valor do produto e o desconto."); return; }
  showMoneyInField("disc-price", price);
  const res = Finance.discountCalc(price, pct);
  document.getElementById("disc-result").style.display          = "block";
  document.getElementById("disc-res-original").textContent      = Finance.fmt(res.originalPrice);
  document.getElementById("disc-res-discount").textContent      = Finance.fmt(res.discountValue) + " (" + pct + "% de desconto)";
  document.getElementById("disc-res-final").textContent         = Finance.fmt(res.finalPrice);
  document.getElementById("disc-res-savings").textContent       = Finance.fmt(res.savings);
  const pctEl = document.getElementById("disc-progress");
  if (pctEl) pctEl.style.width = Math.min(pct, 100) + "%";
}

// ══════════════════════════════════════════════════════════════
// COMPRA PARCELADA
// ══════════════════════════════════════════════════════════════
let cashflowChart = null;
function renderCashflow() {}

function calcCashflow() {
  const PV    = getMoneyVal("cf-valor");
  const taxa  = getMoneyVal("cf-taxa");
  const n     = parseInt(document.getElementById("cf-parcelas").value);
  const grace = parseInt(document.getElementById("cf-carencia").value) || 0;
  const nome  = document.getElementById("cf-nome").value.trim() || "Item";
  if (!PV || !taxa || !n) { alert("Preencha o valor do item, a taxa de juros e o número de parcelas."); return; }
  showMoneyInField("cf-valor", PV);
  const res = Finance.cashflow(PV, taxa, n, grace);
  const inicioMap = { 0: "No ato da compra", 1: "30 dias após a compra", 2: "60 dias após a compra",
    3: "90 dias após a compra", 4: "4 meses após a compra", 5: "5 meses após a compra", 6: "6 meses após a compra" };
  document.getElementById("cf-result").style.display        = "block";
  document.getElementById("cf-res-nome").textContent        = nome;
  document.getElementById("cf-res-pv").textContent          = Finance.fmt(res.PV);
  document.getElementById("cf-res-inicio").textContent      = inicioMap[grace] || `${grace} meses após a compra`;
  document.getElementById("cf-res-pvcorr").textContent      = grace === 0 ? Finance.fmt(res.PV) + " (sem acréscimo por espera)" : Finance.fmt(res.PVcorr);
  document.getElementById("cf-res-pmt").textContent         = Finance.fmt(res.PMT);
  document.getElementById("cf-res-total").textContent       = Finance.fmt(res.totalPaid);
  document.getElementById("cf-res-juros").textContent       = Finance.fmt(res.totalInterest);
  document.getElementById("cf-res-acrescimo").textContent   = ((res.totalInterest / res.PV) * 100).toFixed(2) + "% acima do preço original";
  const tbody = document.getElementById("cf-timeline-table");
  tbody.innerHTML = "";
  res.timeline.forEach((row) => {
    const isCarencia = row.type === "carência";
    const isAto      = row.month === 0;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="mono">${isAto ? "Ato" : "Mês " + row.month}</td>
      <td><span class="tag ${isAto ? "income" : (isCarencia ? "non-essential" : "essential")}">${isAto ? "Entrada" : (isCarencia ? "Aguardando" : "Pagamento")}</span></td>
      <td class="mono ${isCarencia ? "text-muted" : "text-yellow"}">${isCarencia ? "—" : Finance.fmt(row.payment)}</td>
      <td class="mono ${row.interest > 0 ? "text-red" : "text-muted"}">${row.interest > 0 ? Finance.fmt(row.interest) : "—"}</td>
      <td class="mono text-green">${isCarencia ? "—" : Finance.fmt(row.principal)}</td>
      <td class="mono">${Finance.fmt(row.balance)}</td>`;
    tbody.appendChild(tr);
  });
  document.getElementById("cf-timeline-card").style.display = "block";
  document.getElementById("cf-tip").style.display           = "block";
  const pagamentos = res.timeline.filter((r) => r.type === "pagamento");
  const step       = Math.max(1, Math.floor(pagamentos.length / 24));
  const sample     = pagamentos.filter((_, i) => i % step === 0);
  const c = chartColors();
  const ctx = document.getElementById("cf-chart").getContext("2d");
  if (cashflowChart) cashflowChart.destroy();
  cashflowChart = new Chart(ctx, {
    type: "bar",
    data: { labels: sample.map((r) => "Mês " + r.month),
      datasets: [
        { label: "Juros", data: sample.map((r) => r.interest), backgroundColor: "rgba(214,48,80,0.7)", borderRadius: 4 },
        { label: "Valor do Produto", data: sample.map((r) => r.principal), backgroundColor: "rgba(0,168,107,0.65)", borderRadius: 4 },
      ] },
    options: { responsive: true,
      scales: { x: { stacked: true, ticks: { color: c.tick }, grid: { display: false } },
        y: { stacked: true, ticks: { color: c.tick, callback: (v) => Finance.fmt(v) }, grid: { color: c.grid } } },
      plugins: { legend: { labels: { color: c.legend } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Finance.fmt(ctx.raw)}` } } } },
  });
}

// ══════════════════════════════════════════════════════════════
// METAS FINANCEIRAS
// ══════════════════════════════════════════════════════════════
async function renderGoals() {
  const goals     = await DB.Goals.findByUser(currentUser.uid);
  const container = document.getElementById("goals-list");
  container.innerHTML = "";
  if (!goals.length) {
    container.innerHTML = `<div class="empty-state"><p>Nenhuma meta criada. Crie sua primeira meta!</p></div>`;
    return;
  }
  for (const goal of goals) {
    const deposits  = await DB.GoalDeposits.findByGoal(currentUser.uid, goal.id);
    const saved     = deposits.reduce((s, d) => s + d.amount, 0);
    const pct       = Math.min(100, (saved / goal.targetAmount) * 100).toFixed(2);
    const remaining = Math.max(0, goal.targetAmount - saved);
    const card      = document.createElement("div");
    card.className  = "card mb-20";
    card.innerHTML  = `
      <div class="flex items-center justify-between">
        <div class="card-title"><span class="dot ${pct >= 100 ? "green" : "yellow"}"></span>${goal.title}</div>
        <button class="btn-del" onclick="deleteGoal('${goal.id}')">Remover Meta</button>
      </div>
      <div class="grid-3" style="gap:12px; margin:12px 0;">
        <div class="stat-card ${pct >= 100 ? "green" : "yellow"}">
          <div class="stat-label">Guardado</div>
          <div class="stat-value ${pct >= 100 ? "green" : "yellow"}">${Finance.fmt(saved)}</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-label">Meta</div>
          <div class="stat-value blue">${Finance.fmt(goal.targetAmount)}</div>
        </div>
        <div class="stat-card ${remaining === 0 ? "green" : "red"}">
          <div class="stat-label">Faltam</div>
          <div class="stat-value ${remaining === 0 ? "green" : "red"}">${Finance.fmt(remaining)}</div>
        </div>
      </div>
      <div class="progress-track">
        <div class="progress-fill ${pct >= 100 ? "" : "yellow"}" style="width:${pct}%"></div>
      </div>
      <div class="flex justify-between mt-4 small text-muted">
        <span>${pct}% concluída</span>
        <span>${pct >= 100 ? "META ATINGIDA!" : "Em progresso"}</span>
      </div>
      <hr class="divider">
      <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-md);padding:14px 16px;margin-bottom:16px;">
        <p class="small bold" style="margin-bottom:10px;">Simulação: em quanto tempo eu atinjo a meta?</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;">
          <div class="field" style="flex:1;min-width:130px;margin-bottom:0;">
            <label>Aporte Mensal (R$)</label>
            <input type="text" inputmode="decimal" id="sim-aporte-${goal.id}" placeholder="Ex: 300,00" />
          </div>
          <div class="field" style="flex:0;margin-bottom:0;">
            <button class="btn btn-calc" style="padding:10px 18px;" onclick="simGoalAporte('${goal.id}', ${goal.targetAmount}, ${saved})">Simular</button>
          </div>
        </div>
        <div id="sim-result-${goal.id}" style="display:none;margin-top:12px;" class="highlight-box">
          <p class="small" id="sim-result-text-${goal.id}"></p>
        </div>
      </div>
      <div class="flex gap-10" style="flex-wrap:wrap;margin-bottom:12px;">
        <div class="field" style="flex:1;min-width:120px;">
          <label>Valor a depositar</label>
          <input type="text" inputmode="decimal" id="dep-val-${goal.id}" placeholder="R$ 0,00">
        </div>
        <div class="field" style="flex:1;min-width:120px;">
          <label>Anotação (opcional)</label>
          <input type="text" id="dep-note-${goal.id}" placeholder="Ex: salário do mês">
        </div>
        <div class="field" style="flex:0;display:flex;align-items:flex-end;">
          <button class="btn btn-yellow" onclick="addGoalDeposit('${goal.id}')">+ Depositar</button>
        </div>
      </div>
      <div class="small text-muted">Histórico de depósitos:</div>
      <div style="max-height:150px;overflow-y:auto;margin-top:6px;">
        <table style="width:100%;font-size:0.82rem;">
          <thead><tr><th>Data</th><th>Valor</th><th>Anotação</th></tr></thead>
          <tbody>
            ${deposits.length
              ? deposits.map((d) => `<tr><td>${fmtDate(d.date)}</td><td class="text-green">${Finance.fmt(d.amount)}</td><td>${d.note || "-"}</td></tr>`).join("")
              : `<tr><td colspan="3" class="empty-state">Nenhum depósito ainda.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
    container.appendChild(card);
  }
}

async function addGoal() {
  const title  = document.getElementById("goal-title").value.trim();
  const target = getMoneyVal("goal-target");
  if (!title || !target) { alert("Preencha título e valor alvo."); return; }
  const result = await DB.Goals.create(currentUser.uid, { title, targetAmount: target });
  if (!result.ok) { alert(result.error); return; }
  document.getElementById("goal-title").value = "";
  clearMoneyField("goal-target");
  renderGoals();
}

async function addGoalDeposit(goalId) {
  const amount = parseMoney(document.getElementById(`dep-val-${goalId}`).value);
  const note   = document.getElementById(`dep-note-${goalId}`).value;
  if (!amount || isNaN(amount) || amount <= 0) { alert("Informe um valor válido."); return; }
  await DB.GoalDeposits.create(currentUser.uid, goalId, { amount, note });
  const depEl = document.getElementById(`dep-val-${goalId}`);
  if (depEl) depEl.value = "";
  document.getElementById(`dep-note-${goalId}`).value = "";
  renderGoals();
}

async function deleteGoal(goalId) {
  if (!confirm("Remover esta meta e todos os seus depósitos?")) return;
  await DB.Goals.delete(currentUser.uid, goalId);
  renderGoals();
}

function simGoalAporte(goalId, targetAmount, savedAlready) {
  const aporte   = parseMoney(document.getElementById(`sim-aporte-${goalId}`).value);
  const resultEl = document.getElementById(`sim-result-${goalId}`);
  const textEl   = document.getElementById(`sim-result-text-${goalId}`);
  if (!aporte || aporte <= 0) { alert("Informe um valor de aporte mensal."); return; }
  const restante = targetAmount - savedAlready;
  if (restante <= 0) { resultEl.style.display = "block"; textEl.innerHTML = `<strong class="text-green">Você já atingiu esta meta!</strong>`; return; }
  const mesesSemJuros = Math.ceil(restante / aporte);
  const i = 0.005;
  let saldo = savedAlready, mesesComJuros = 0;
  while (saldo < targetAmount && mesesComJuros < 1200) { saldo = saldo * (1 + i) + aporte; mesesComJuros++; }
  const anos = (m) => m >= 12 ? `${Math.floor(m / 12)} ano(s) e ${m % 12} mês(es)` : `${m} mês(es)`;
  resultEl.style.display = "block";
  textEl.innerHTML = `<strong>Aportando ${Finance.fmt(aporte)} por mês:</strong><br>
    Sem rendimento: você atinge em <strong class="text-yellow">${anos(mesesSemJuros)}</strong> (${mesesSemJuros} meses).<br>
    Com poupança (0,5% a.m.): você atinge em <strong class="text-green">${anos(mesesComJuros)}</strong> (${mesesComJuros} meses).`;
}

// ══════════════════════════════════════════════════════════════
// VEÍCULOS E IMÓVEIS
// ══════════════════════════════════════════════════════════════
let vehicleChart = null;
let vehicleCompareChart = null;

function renderVehicle() {
  const sel = document.getElementById("veh-modality");
  if (sel && sel.options.length <= 1) {
    Finance.FINANCING_OPTIONS.forEach((opt, idx) => {
      const o = document.createElement("option");
      o.value = idx;
      o.textContent = `${opt.label} — ${opt.monthlyRate.toFixed(2)}% a.m. (máx. ${opt.maxMonths}x)`;
      sel.appendChild(o);
    });
  }
}

function onVehicleModalityChange() {
  const idx = parseInt(document.getElementById("veh-modality").value);
  if (isNaN(idx)) return;
  const opt = Finance.FINANCING_OPTIONS[idx];
  if (!opt) return;
  document.getElementById("veh-rate-input").value = opt.monthlyRate.toFixed(2);
  document.getElementById("veh-months").max = opt.maxMonths;
  document.getElementById("veh-max-months").textContent = `Máximo: ${opt.maxMonths} parcelas para esta modalidade`;
}

function calcVehicle() {
  const PV      = getMoneyVal("veh-valor");
  const idx     = parseInt(document.getElementById("veh-modality").value);
  const months  = parseInt(document.getElementById("veh-months").value);
  const rateOvr = getMoneyVal("veh-rate-input") || 0;
  if (!PV || isNaN(idx) || !months) { alert("Preencha o valor, a modalidade e o número de parcelas."); return; }
  showMoneyInField("veh-valor", PV);
  const res = Finance.vehicleFinancing(PV, rateOvr, months, idx);
  document.getElementById("veh-result").style.display   = "block";
  document.getElementById("veh-amort-card").style.display = "block";
  document.getElementById("veh-res-option").textContent  = res.option.label;
  document.getElementById("veh-res-pv").textContent      = Finance.fmt(res.PV);
  document.getElementById("veh-res-rate").textContent    = (res.i * 100).toFixed(2) + "% a.m.";
  document.getElementById("veh-res-cet").textContent     = "~" + res.cet.toFixed(2) + "% a.m. (estimado)";
  document.getElementById("veh-res-pmt").textContent     = Finance.fmt(res.PMT);
  document.getElementById("veh-res-total").textContent   = Finance.fmt(res.totalPrice);
  document.getElementById("veh-res-juros").textContent   = Finance.fmt(res.totalJuros);
  document.getElementById("veh-res-pct-juros").textContent = ((res.totalJuros / res.PV) * 100).toFixed(2) + "% acima do valor original";
  document.getElementById("veh-cons-pmt").textContent    = Finance.fmt(res.consortium.pmtCons);
  document.getElementById("veh-cons-total").textContent  = Finance.fmt(res.consortium.totalCons);
  document.getElementById("veh-cons-taxa").textContent   = res.consortium.taxaCons.toFixed(2) + "% de taxa de administração";
  document.getElementById("veh-cons-meses").textContent  = res.consortium.nCons + " meses";
  const recEl = document.getElementById("veh-recommendation");
  const diff  = res.diff;
  recEl.className = diff > 0 ? "highlight-box yellow" : "highlight-box";
  recEl.innerHTML = diff > 0
    ? `<p class="small bold text-yellow">Financiamento custa ${Finance.fmt(diff)} a mais que o consórcio</p>
       <p class="small text-muted mt-4">No financiamento você recebe o bem imediatamente, mas paga mais. No consórcio você aguarda ser contemplado, mas paga menos.</p>
       <p class="small text-muted mt-4">Se precisa do bem agora: <strong>financiamento</strong>. Se pode esperar: <strong>consórcio pode compensar</strong>.</p>`
    : `<p class="small bold text-green">Consórcio custa ${Finance.fmt(Math.abs(diff))} a mais que o financiamento</p>
       <p class="small text-muted mt-4">Neste caso, o financiamento é a opção mais barata em valor total.</p>`;
  const tbody = document.getElementById("veh-amort-table");
  tbody.innerHTML = "";
  res.schedule.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="mono">${row.installment}</td><td class="mono">${Finance.fmt(row.pmt)}</td>
      <td class="mono text-red">${Finance.fmt(row.interest)}</td><td class="mono text-green">${Finance.fmt(row.principal)}</td>
      <td class="mono">${Finance.fmt(row.balance)}</td>`;
    tbody.appendChild(tr);
  });
  const c = chartColors();
  const ctx1 = document.getElementById("veh-compare-chart").getContext("2d");
  if (vehicleCompareChart) vehicleCompareChart.destroy();
  vehicleCompareChart = new Chart(ctx1, {
    type: "bar",
    data: { labels: ["Financiamento", "Consórcio"],
      datasets: [
        { label: "Valor Original", data: [res.PV, res.PV], backgroundColor: "rgba(61,155,255,0.6)", borderRadius: 6 },
        { label: "Juros / Taxa Adm.", data: [res.totalJuros, res.consortium.totalCons - res.PV], backgroundColor: "rgba(214,48,80,0.7)", borderRadius: 6 },
      ] },
    options: { responsive: true,
      scales: { x: { stacked: true, ticks: { color: c.tick }, grid: { display: false } },
        y: { stacked: true, ticks: { color: c.tick, callback: (v) => Finance.fmt(v) }, grid: { color: c.grid } } },
      plugins: { legend: { labels: { color: c.legend } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Finance.fmt(ctx.raw)}` } } } },
  });
  const ctx2 = document.getElementById("veh-schedule-chart").getContext("2d");
  if (vehicleChart) vehicleChart.destroy();
  const step = Math.max(1, Math.floor(res.schedule.length / 24));
  const sample = res.schedule.filter((_, i) => i % step === 0);
  vehicleChart = new Chart(ctx2, {
    type: "bar",
    data: { labels: sample.map((s) => "P" + s.installment),
      datasets: [
        { label: "Juros", data: sample.map((s) => s.interest), backgroundColor: "rgba(214,48,80,0.7)", borderRadius: 4 },
        { label: "Amortização", data: sample.map((s) => s.principal), backgroundColor: "rgba(0,168,107,0.65)", borderRadius: 4 },
      ] },
    options: { responsive: true,
      scales: { x: { stacked: true, ticks: { color: c.tick }, grid: { display: false } },
        y: { stacked: true, ticks: { color: c.tick, callback: (v) => Finance.fmt(v) }, grid: { color: c.grid } } },
      plugins: { legend: { labels: { color: c.legend } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${Finance.fmt(ctx.raw)}` } } } },
  });
}

// ══════════════════════════════════════════════════════════════
// VÍDEOS EDUCACIONAIS
// ══════════════════════════════════════════════════════════════
const VIDEO_LIST = [
  { id: "R2xzxxvriLg" },
  { id: "rS1CFwsC8Qk" },
  { id: "3zftx5UfBzk" },
  { id: "aOy-bk0-FCg" },
  { id: "d2xD1L4OWWk" },
];

function renderVideos() {
  const container = document.getElementById("videos-list");
  if (!container) return;
  container.innerHTML = "";
  VIDEO_LIST.forEach((video) => {
    const div = document.createElement("div");
    div.className = "card mb-20";
    div.innerHTML = `
      <div class="video-embed-wrap">
        <iframe src="https://www.youtube.com/embed/${video.id}?rel=0&modestbranding=1"
          title="${video.id}" frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen></iframe>
      </div>
      <div style="margin-top:12px; text-align:right;">
        <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noopener"
          style="color:var(--blue-bright); font-size:0.82rem; font-weight:600;">
          Assistir no YouTube &rarr;
        </a>
      </div>`;
    container.appendChild(div);
  });
}

// ══════════════════════════════════════════════════════════════
// CRÉDITOS
// ══════════════════════════════════════════════════════════════
function renderCredits() {}

// ══════════════════════════════════════════════════════════════
// CONFIGURAÇÕES
// ══════════════════════════════════════════════════════════════
function renderSettings() {
  document.getElementById("settings-username").textContent = currentUser.username;
  document.getElementById("settings-created").textContent  =
    new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

async function handleChangePassword() {
  const current = document.getElementById("cfg-current").value;
  const newPass = document.getElementById("cfg-new").value;
  const confirm = document.getElementById("cfg-confirm").value;
  const msg     = document.getElementById("cfg-msg");
  msg.style.display = "none";
  if (newPass !== confirm) { msg.textContent = "As novas senhas não coincidem."; msg.className = "msg error"; msg.style.display = "block"; return; }
  // Reautentica para poder trocar a senha
  const email = `${currentUser.username.toLowerCase()}@matfin.internal`;
  try {
    const cred = firebase.auth.EmailAuthProvider.credential(email, current);
    await auth.currentUser.reauthenticateWithCredential(cred);
    await auth.currentUser.updatePassword(newPass);
    msg.textContent = "Senha alterada com sucesso!";
    msg.className = "msg success"; msg.style.display = "block";
    ["cfg-current", "cfg-new", "cfg-confirm"].forEach((id) => { document.getElementById(id).value = ""; });
  } catch (e) {
    msg.textContent = "Senha atual incorreta ou erro ao alterar.";
    msg.className = "msg error"; msg.style.display = "block";
  }
}
