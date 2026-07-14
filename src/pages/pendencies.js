import { sb } from '../lib/supabaseClient.js';
import { DB, state, toast } from '../state.js';
import { esc, fmtDate, todayISO } from '../lib/utils.js';
import { schoolById, log } from '../services/dataService.js';

export function viewPendencias(root) {
  let list = DB.actionPlans.slice().sort((a, b) => (a.status === 'Concluído') - (b.status === 'Concluído'));
  if (state.params.schoolId) list = list.filter((a) => a.schoolId === state.params.schoolId);
  const canEdit = state.user.role === 'admin';
  root.innerHTML = `<div class="card">
    ${list.length ? `<table><thead><tr><th>Escola</th><th>Problema</th><th>Recomendação</th><th>Responsável</th><th>Prazo</th><th>Situação</th></tr></thead><tbody>
    ${list.map((a) => { const s = schoolById(a.schoolId); const overdue = a.deadline && a.deadline < todayISO() && a.status !== 'Concluído';
      return `<tr>
        <td>${esc(s ? s.name : '—')}</td>
        <td style="max-width:220px;">${esc(a.problem)}</td>
        <td style="max-width:220px;">${esc(a.recommendation)}</td>
        <td>${esc(a.responsible || '—')}</td>
        <td>${a.deadline ? fmtDate(a.deadline) : '—'} ${overdue ? '<span class="pill pill-danger">Vencido</span>' : ''}</td>
        <td>${canEdit ? `<select class="input" data-status-plan="${a.id}" style="font-size:12px;padding:5px 8px;">${['Em aberto', 'Em andamento', 'Concluído'].map((o) => `<option ${a.status === o ? 'selected' : ''}>${o}</option>`).join('')}</select>` : `<span class="pill ${a.status === 'Concluído' ? 'pill-ok' : 'pill-warn'}">${a.status}</span>`}</td>
      </tr>`; }).join('')}</tbody></table>` : '<div class="empty">Nenhuma pendência registrada.</div>'}
  </div>`;
  if (canEdit) root.querySelectorAll('[data-status-plan]').forEach((sel) => (sel.onchange = async () => {
    const ap = DB.actionPlans.find((a) => a.id === sel.dataset.statusPlan);
    const { error } = await sb.from('action_plans').update({ status: sel.value }).eq('id', ap.id);
    if (error) { toast('Erro ao atualizar: ' + error.message, true); return; }
    ap.status = sel.value; await log('update_action_plan', ap.problem); toast('Situação atualizada.');
  }));
}
