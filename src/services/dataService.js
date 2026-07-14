import { sb } from '../lib/supabaseClient.js';
import { DB, state } from '../state.js';
import { emptyDays, todayISO } from '../lib/utils.js';

function mapMenuRow(row, historyRows) {
  return {
    id: row.id,
    schoolId: row.school_id,
    month: row.month,
    year: row.year,
    days: row.days || emptyDays(),
    history: (historyRows || []).filter((h) => h.menu_id === row.id).map((h) => ({ user: h.user_name || '—', at: h.at, reason: h.reason })),
  };
}

function mapVisitRow(row, checklistRows, photoRows) {
  const items = (checklistRows || [])
    .filter((c) => c.visit_id === row.id)
    .sort((a, b) => a.item_order - b.item_order)
    .map((c) => ({
      id: c.id,
      section: c.section,
      text: c.text,
      status: c.status,
      obs: c.observation || '',
      photos: (photoRows || []).filter((p) => p.checklist_item_id === c.id).map((p) => ({ id: p.id, src: p.publicUrl, path: p.storage_path, at: p.taken_at })),
      guidance: { types: c.guidance_types || [], text: c.guidance_text || '' },
    }));
  return {
    id: row.id,
    schoolId: row.school_id,
    date: row.date,
    startTime: (row.start_time || '').slice(0, 5),
    endTime: (row.end_time || '').slice(0, 5),
    nutritionist: row.nutritionist_name || '',
    plannedMenu: row.planned_menu || '',
    executedMenu: row.executed_menu || '',
    menuChangeReason: row.menu_change_reason || '',
    menuChangeOther: row.menu_change_other || '',
    checklist: items,
    signatures: { nutritionist: row.signature_nutritionist || '', director: row.signature_director || '', schoolResponsible: row.signature_school_responsible || '' },
    status: row.status,
    classification: row.classification,
    ai: row.ai_summary || null,
    createdAt: row.created_at,
    finalizedAt: row.finalized_at,
    versions: [],
  };
}

const DEFAULT_SETTINGS = {
  appName: 'NutriEscola Checklist', municipio: '', secretaria: '', responsavel: '', logo: '',
  prefeituraNome: '', prefeituraLogo: '', secretariaNome: '', secretariaLogo: '', julianaLogo: '',
};
function mapSettingsRow(row) {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    appName: row.app_name, municipio: row.municipio || '', secretaria: row.secretaria || '',
    responsavel: row.responsavel_tecnico || '', logo: row.logo_url || '',
    prefeituraNome: row.prefeitura_nome || '', prefeituraLogo: row.prefeitura_logo_url || '',
    secretariaNome: row.secretaria_nome || '', secretariaLogo: row.secretaria_logo_url || '',
    julianaLogo: row.juliana_logo_url || '',
  };
}

/** Carrega apenas as configurações públicas (necessárias antes do login, para a marca na tela de login). */
export async function loadSettingsOnly() {
  const { data: settingsRows } = await sb.from('settings').select('*').eq('id', 1).limit(1);
  DB.settings = mapSettingsRow(settingsRows && settingsRows[0]);
}

/** Carrega todo o estado do app a partir do Supabase. Chamado após login. */
export async function loadAll() {
  const [
    { data: profiles }, { data: schools }, { data: menus }, { data: menuHist },
    { data: visits }, { data: checklist }, { data: photos }, { data: actions },
    { data: settingsRows }, { data: logs },
  ] = await Promise.all([
    sb.from('profiles').select('*'),
    sb.from('schools').select('*').order('name'),
    sb.from('menus').select('*'),
    sb.from('menu_history').select('*'),
    sb.from('visits').select('*').order('date', { ascending: false }),
    sb.from('checklist_items').select('*'),
    sb.from('photos').select('*'),
    sb.from('action_plans').select('*'),
    sb.from('settings').select('*').eq('id', 1).limit(1),
    sb.from('audit_logs').select('*').order('at', { ascending: false }).limit(50),
  ]);

  DB.users = (profiles || []).map((p) => ({
    id: p.id, name: p.name, email: p.email || '', role: p.role, active: p.active,
    status: p.status || (p.active ? 'aprovado' : 'pendente'), createdAt: p.created_at,
  }));

  DB.schools = (schools || []).map((s) => ({
    id: s.id, code: s.code, name: s.name, address: s.address, neighborhood: s.neighborhood,
    director: s.director, phone: s.phone, cooks: s.cooks, students: s.students, notes: s.notes,
  }));

  const photosWithUrl = (photos || []).map((p) => ({ ...p, publicUrl: sb.storage.from('photos').getPublicUrl(p.storage_path).data.publicUrl }));
  DB.menus = (menus || []).map((m) => mapMenuRow(m, menuHist));

  const nutriByVisit = {};
  (visits || []).forEach((v) => {
    const p = (profiles || []).find((pp) => pp.id === v.nutritionist_id);
    nutriByVisit[v.id] = p ? p.name : '';
  });
  DB.visits = (visits || []).map((v) => mapVisitRow({ ...v, nutritionist_name: nutriByVisit[v.id] }, checklist, photosWithUrl));

  DB.actionPlans = (actions || []).map((a) => ({
    id: a.id, visitId: a.visit_id, schoolId: a.school_id, problem: a.problem,
    recommendation: a.recommendation, responsible: a.responsible, deadline: a.deadline, status: a.status,
  }));

  DB.settings = mapSettingsRow(settingsRows && settingsRows[0]);
  DB.auditLogs = (logs || []).map((l) => ({ id: l.id, action: l.action, details: l.details, user: '—', at: l.at }));
}

export async function log(action, details) {
  try {
    await sb.from('audit_logs').insert({ user_id: state.user ? state.user.id : null, action, details });
  } catch (e) {
    console.error(e);
  }
}

// ---------------- derived data helpers ----------------
export function schoolStats(schoolId) {
  const visits = DB.visits.filter((v) => v.schoolId === schoolId && v.status === 'finalizada').sort((a, b) => b.date.localeCompare(a.date));
  const photos = visits.reduce((n, v) => n + (v.checklist || []).reduce((m, it) => m + (it.photos ? it.photos.length : 0), 0), 0);
  const ncCount = visits.reduce((n, v) => n + (v.checklist || []).filter((it) => it.status === 'nc').length, 0);
  const pendings = DB.actionPlans.filter((a) => a.schoolId === schoolId && a.status !== 'Concluído').length;
  const last = visits[0];
  let pctConform = null;
  if (last) {
    const total = (last.checklist || []).filter((it) => it.status !== 'na').length;
    const ok = (last.checklist || []).filter((it) => it.status === 'ok').length;
    pctConform = total ? Math.round((ok / total) * 100) : null;
  }
  return { visits, photos, ncCount, pendings, last, pctConform, totalVisits: visits.length };
}
export function classify(pct) {
  if (pct === null) return { label: 'Sem dados', cls: 'pill-gray', dot: '⚪' };
  if (pct >= 90) return { label: 'Adequada', cls: 'pill-ok', dot: '🟢' };
  if (pct >= 70) return { label: 'Parcialmente Adequada', cls: 'pill-warn', dot: '🟡' };
  return { label: 'Inadequada', cls: 'pill-danger', dot: '🔴' };
}
export function computeClassificationFromChecklist(checklist) {
  const total = (checklist || []).filter((it) => it.status !== 'na').length;
  const ok = (checklist || []).filter((it) => it.status === 'ok').length;
  const pct = total ? Math.round((ok / total) * 100) : 100;
  return { pct, ...classify(pct) };
}
export function schoolById(id) {
  return DB.schools.find((s) => s.id === id);
}
export function visitById(id) {
  return DB.visits.find((v) => v.id === id);
}
export function menuForDate(schoolId, dateISO) {
  const d = new Date(dateISO + 'T00:00:00');
  const month = d.getMonth() + 1, year = d.getFullYear();
  const dow = d.getDay();
  if (dow === 0) return null;
  const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const dayName = DIAS_SEMANA[dow - 1];
  const menu = DB.menus.find((m) => m.schoolId === schoolId && m.month === month && m.year === year);
  if (!menu) return null;
  return { menu, day: menu.days[dayName], dayName };
}
export function fmtMenuDay(day) {
  if (!day) return '';
  const REFEICOES = [['breakfast', '☕ Café da manhã'], ['morningSnack', '🥪 Lanche da manhã'], ['lunch', '🍛 Almoço'], ['afternoonSnack', '🍎 Lanche da tarde'], ['dinner', '🍲 Jantar']];
  return REFEICOES.map(([k, label]) => (day[k] ? `${label}: ${day[k]}` : null)).filter(Boolean).join(' · ');
}
