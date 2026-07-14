import { DB, state } from '../state.js';
import { esc } from '../lib/utils.js';
import { schoolById } from '../services/dataService.js';
import { nav } from '../router.js';

export function viewPesquisa(root) {
  const q = (state.searchQuery || '').toLowerCase().trim();
  if (!q) { root.innerHTML = '<div class="empty">Digite algo na busca no topo da página.</div>'; return; }
  const schools = DB.schools.filter((s) => s.name.toLowerCase().includes(q) || (s.neighborhood || '').toLowerCase().includes(q));
  const visits = DB.visits.filter((v) => v.status === 'finalizada' && ((schoolById(v.schoolId)?.name || '').toLowerCase().includes(q) || (v.nutritionist || '').toLowerCase().includes(q)));
  const plans = DB.actionPlans.filter((a) => (a.problem || '').toLowerCase().includes(q) || (schoolById(a.schoolId)?.name || '').toLowerCase().includes(q));
  root.innerHTML = `
    <p class="muted small" style="margin-bottom:14px;">Resultados para "<b>${esc(state.searchQuery)}</b>"</p>
    <div class="section-title">Escolas (${schools.length})</div>
    ${schools.length ? schools.map((s) => `<div class="card" style="margin-bottom:8px;cursor:pointer;" data-go-school="${s.id}">🏫 ${esc(s.name)} — ${esc(s.neighborhood || '')}</div>`).join('') : '<p class="muted small">Nenhuma escola encontrada.</p>'}
    <div class="section-title">Visitas / Relatórios (${visits.length})</div>
    ${visits.length ? visits.map((v) => `<div class="card" style="margin-bottom:8px;cursor:pointer;" data-go-visit="${v.id}">📄 ${esc(schoolById(v.schoolId)?.name)} — ${v.date}</div>`).join('') : '<p class="muted small">Nenhuma visita encontrada.</p>'}
    <div class="section-title">Pendências (${plans.length})</div>
    ${plans.length ? plans.map((a) => `<div class="card" style="margin-bottom:8px;">⚠️ ${esc(schoolById(a.schoolId)?.name)} — ${esc(a.problem)}</div>`).join('') : '<p class="muted small">Nenhuma pendência encontrada.</p>'}`;
  root.querySelectorAll('[data-go-school]').forEach((el) => (el.onclick = () => nav('escolaDetalhe', { schoolId: el.dataset.goSchool })));
  root.querySelectorAll('[data-go-visit]').forEach((el) => (el.onclick = () => nav('relatorioDetalhe', { visitId: el.dataset.goVisit })));
}
