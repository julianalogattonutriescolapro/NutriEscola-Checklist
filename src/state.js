// ---------------------------------------------------------------
// Estado global do app: cache local dos dados vindos do Supabase
// (DB) e estado de navegação/UI (state). Ambos são objetos mutáveis
// — outros módulos importam a referência e alteram suas
// propriedades (nunca reatribuem o objeto inteiro).
// ---------------------------------------------------------------

export const DB = {
  schools: [],
  menus: [],
  visits: [],
  actionPlans: [],
  users: [],
  settings: null,
  auditLogs: [],
};

export const state = {
  user: null,
  view: 'dashboard',
  params: {},
  searchQuery: '',
  blocked: null,
  connectionError: false,
};

export function toast(msg, isErr) {
  const w = document.getElementById('toastWrap');
  if (!w) return;
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  w.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export let CHART_INSTANCES = [];
export function destroyCharts() {
  CHART_INSTANCES.forEach((c) => c.destroy());
  CHART_INSTANCES = [];
}
export function registerChart(c) {
  CHART_INSTANCES.push(c);
}
