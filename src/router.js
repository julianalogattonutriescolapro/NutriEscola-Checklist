import { DB, state, destroyCharts } from './state.js';
import { esc } from './lib/utils.js';
import { MENU_ITEMS, ADMIN_ONLY_VIEWS } from './lib/constants.js';
import { renderLogin, attachLoginEvents, renderBlocked, attachBlockedEvents, renderConnectionError, attachConnectionErrorEvents, doLogout } from './pages/auth.js';
import { viewDashboard } from './pages/dashboard.js';
import { viewEscolas, viewEscolaDetalhe, openSchoolModal } from './pages/schools.js';
import { viewCardapios } from './pages/menus.js';
import { viewNovaVisita } from './pages/visit.js';
import { viewHistorico, viewRelatorios, viewRelatorioDetalhe } from './pages/reports.js';
import { viewFotografias } from './pages/photos.js';
import { viewPendencias } from './pages/pendencies.js';
import { viewIndicadores } from './pages/indicators.js';
import { viewAssistenteIA } from './pages/assistant.js';
import { viewAdmin } from './pages/admin.js';
import { viewPesquisa } from './pages/search.js';
import { testConnection } from './lib/supabaseClient.js';

export function nav(view, params) {
  if (state.user && state.user.role === 'nutricionista' && ADMIN_ONLY_VIEWS.includes(view)) view = 'novaVisita';
  state.view = view;
  state.params = params || {};
  render();
  window.scrollTo(0, 0);
}

export async function render() {
  const app = document.getElementById('app');
  if (state.connectionError) {
    app.innerHTML = renderConnectionError();
    attachConnectionErrorEvents(async () => {
      const ok = await testConnection();
      if (ok) { state.connectionError = false; location.reload(); }
      else render();
    });
    return;
  }
  if (state.blocked) { app.innerHTML = renderBlocked(); attachBlockedEvents(); return; }
  if (!state.user) { app.innerHTML = renderLogin(); attachLoginEvents(); return; }
  app.innerHTML = renderShell();
  attachShellEvents();
  await renderView();
}

function renderAppFooter() {
  return `
  <div class="no-print" style="text-align:center;padding:14px 10px 4px;border-top:1px solid var(--gray-100);margin-top:6px;">
    ${DB.settings.julianaLogo ? `<img src="${DB.settings.julianaLogo}" style="max-width:60px;max-height:36px;display:block;margin:0 auto 6px;">` : ''}
    <div style="font-size:10.5px;color:var(--gray-500);line-height:1.4;">
      Criado por<br><span style="font-weight:700;">Juliana Logatto Consultoria e Assessoria</span>
    </div>
  </div>`;
}

function renderShell() {
  const nav_ = MENU_ITEMS.filter((m) => m.roles.includes(state.user.role))
    .map((m) => `<button class="navitem ${state.view === m.id ? 'active' : ''}" data-nav="${m.id}"><span class="ic">${m.ic}</span> ${m.label}</button>`)
    .join('');
  return `
  <div class="sidebar">
    <div class="brand">
   <div class="brand-mark">
  <img src="/logo.png" alt="Nutri Escola Checklist">
</div>

<div>
  <div class="brand-name">
    ${esc(DB.settings.appName)}
  </div>

  <div class="brand-sub">
    ${esc(DB.settings.municipio || 'Alimentação Escolar')}
  </div>
</div>

</div>
    <div class="navlist">${nav_}</div>
    <div class="nav-user">
      <div class="nav-user-name">${esc(state.user.name)}</div>
      <div class="nav-user-role">${state.user.role === 'admin' ? 'Administradora' : 'Nutricionista'}</div>
      <button class="nav-logout" id="btnLogout">Sair do aplicativo</button>
    </div>
    ${renderAppFooter()}
  </div>
  <div class="main">
    <div class="topbar">
      <h1 id="pageTitle">Dashboard</h1>
      ${state.user.role === 'admin' ? `<div class="topbar-search no-print"><input id="globalSearch" class="input" placeholder="Pesquisar escola, visita, relatório, pendência..."></div>` : ''}
    </div>
    <div class="content" id="viewRoot"><div class="empty"><span class="spinner"></span></div></div>
  </div>`;
}

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

function attachShellEvents() {
  document.querySelectorAll('[data-nav]').forEach((b) => (b.onclick = () => nav(b.dataset.nav)));
  document.getElementById('btnLogout').onclick = doLogout;
  const gs = document.getElementById('globalSearch');
  if (gs) {
    gs.value = state.searchQuery;
    gs.oninput = debounce(() => { state.searchQuery = gs.value; if (state.searchQuery.trim()) nav('pesquisa'); }, 400);
    gs.onkeydown = (e) => { if (e.key === 'Enter') { state.searchQuery = gs.value; nav('pesquisa'); } };
  }
}

const TITLE_MAP = {
  dashboard: 'Dashboard',
  escolas: 'Escolas',
  escolaDetalhe: 'Escola',
  novaVisita: 'Nova Visita',
  minhasVisitas: 'Minhas Visitas',
  historico: 'Histórico de Visitas',
  relatorios: 'Relatórios',
  relatorioDetalhe: 'Relatório',
  fotografias: 'Fotografias',
  cardapios: 'Cardápio Mensal',
  pendencias: 'Pendências e Plano de Ação',
  indicadores: 'Indicadores',
  assistenteIA: 'Assistente IA',
  admin: 'Administração do Sistema',
  pesquisa: 'Pesquisa',
};

async function renderView() {
  const root = document.getElementById('viewRoot');
  document.getElementById('pageTitle').textContent = TITLE_MAP[state.view] || '';
  destroyCharts();
  try {
    switch (state.view) {
      case 'dashboard': await viewDashboard(root); break;
      case 'escolas': viewEscolas(root); break;
      case 'escolaDetalhe': viewEscolaDetalhe(root); break;
      case 'novaVisita': await viewNovaVisita(root); break;
      case 'historico': viewHistorico(root); break;
      case 'relatorios': viewRelatorios(root); break;
      case 'relatorioDetalhe': viewRelatorioDetalhe(root); break;
      case 'fotografias': viewFotografias(root); break;
      case 'cardapios': viewCardapios(root); break;
      case 'pendencias': viewPendencias(root); break;
      case 'indicadores': viewIndicadores(root); break;
      case 'assistenteIA': viewAssistenteIA(root); break;
      case 'admin': viewAdmin(root); break;
      case 'pesquisa': viewPesquisa(root); break;
      default: root.innerHTML = '<div class="empty">Página não encontrada.</div>';
    }
  } catch (e) {
    console.error(e);
    root.innerHTML = `<div class="empty">Não foi possível carregar esta tela.<br><span class="small">${esc(e.message)}</span></div>`;
  }
}
