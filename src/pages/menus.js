import { sb } from '../lib/supabaseClient.js';
import { DB, state, toast } from '../state.js';
import { esc, emptyDays } from '../lib/utils.js';
import { MESES, REFEICOES, DIAS_SEMANA } from '../lib/constants.js';
import { log, loadAll, schoolById } from '../services/dataService.js';

export function viewCardapios(root) {
  const canEdit = state.user.role === 'admin';
  const now = new Date();
  if (!DB.schools.length) { root.innerHTML = '<div class="empty">Cadastre uma escola primeiro para gerenciar cardápios.</div>'; return; }
  const schoolOpts = DB.schools.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  const sel = state.params.schoolId || DB.schools[0].id;
  const month = state.params.month || now.getMonth() + 1;
  const year = state.params.year || now.getFullYear();
  root.innerHTML = `
    <div class="card" style="margin-bottom:18px;">
      <div class="grid g3">
        <div class="field"><label class="label">Escola</label><select class="input" id="cmSchool">${schoolOpts}</select></div>
        <div class="field"><label class="label">Mês</label><select class="input" id="cmMonth">${MESES.map((m, i) => `<option value="${i + 1}" ${i + 1 == month ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        <div class="field"><label class="label">Ano</label><input class="input" type="number" id="cmYear" value="${year}"></div>
      </div>
      ${canEdit ? `<div class="tag-row"><button class="btn btn-secondary btn-sm" id="btnDuplicate">📋 Duplicar mês anterior</button></div>` : ''}
    </div>
    <div id="cmTableWrap"></div>`;
  document.getElementById('cmSchool').value = sel;

  const refresh = () => {
    const schoolId = document.getElementById('cmSchool').value;
    const m = parseInt(document.getElementById('cmMonth').value);
    const y = parseInt(document.getElementById('cmYear').value);
    let menu = DB.menus.find((mm) => mm.schoolId === schoolId && mm.month === m && mm.year === y);
    const wrap = document.getElementById('cmTableWrap');
    wrap.innerHTML = `<div class="card"><table>
      <thead><tr><th>Dia</th>${REFEICOES.map((r) => `<th>${r[1]}</th>`).join('')}</tr></thead>
      <tbody>${DIAS_SEMANA.map((dn) => `<tr>
        <td style="font-weight:700;">${dn}</td>
        ${REFEICOES.map(([k]) => `<td><input class="input" data-day="${dn}" data-meal="${k}" style="min-width:130px;font-size:12.5px;" value="${esc(menu ? menu.days[dn][k] : '')}" ${canEdit ? '' : 'readonly'}></td>`).join('')}
      </tr>`).join('')}</tbody>
    </table>
    ${canEdit ? `<div style="display:flex;justify-content:flex-end;margin-top:12px;"><button class="btn btn-primary btn-sm" id="btnSaveMenu">Salvar Cardápio</button></div>` : ''}
    </div>`;
    if (canEdit) {
      document.getElementById('btnSaveMenu').onclick = async () => {
        const days = emptyDays();
        wrap.querySelectorAll('[data-day]').forEach((inp) => { days[inp.dataset.day][inp.dataset.meal] = inp.value; });
        const btnSave = document.getElementById('btnSaveMenu'); btnSave.disabled = true; btnSave.innerHTML = '<span class="spinner"></span>';
        try {
          const { data: upserted, error } = await sb.from('menus').upsert({ id: menu ? menu.id : undefined, school_id: schoolId, month: m, year: y, days, created_by: state.user.id }, { onConflict: 'school_id,month,year' }).select().single();
          if (error) throw error;
          await sb.from('menu_history').insert({ menu_id: upserted.id, user_id: state.user.id, reason: menu ? 'Edição do cardápio' : 'Criação do cardápio' });
          await log('save_menu', `${schoolById(schoolId).name} ${m}/${y}`);
          await loadAll();
          toast('Cardápio salvo com sucesso.'); refresh();
        } catch (e) { toast('Erro ao salvar cardápio: ' + e.message, true); btnSave.disabled = false; btnSave.textContent = 'Salvar Cardápio'; }
      };
    }
  };
  ['cmSchool', 'cmMonth', 'cmYear'].forEach((id) => (document.getElementById(id).onchange = refresh));
  refresh();

  if (canEdit) {
    document.getElementById('btnDuplicate').onclick = async () => {
      const schoolId = document.getElementById('cmSchool').value;
      let m = parseInt(document.getElementById('cmMonth').value), y = parseInt(document.getElementById('cmYear').value);
      m--; if (m < 1) { m = 12; y--; }
      const prev = DB.menus.find((mm) => mm.schoolId === schoolId && mm.month === m && mm.year === y);
      if (!prev) { toast('Não há cardápio no mês anterior para duplicar.', true); return; }
      const curM = parseInt(document.getElementById('cmMonth').value), curY = parseInt(document.getElementById('cmYear').value);
      try {
        const { data: upserted, error } = await sb.from('menus').upsert({ school_id: schoolId, month: curM, year: curY, days: prev.days, created_by: state.user.id }, { onConflict: 'school_id,month,year' }).select().single();
        if (error) throw error;
        await sb.from('menu_history').insert({ menu_id: upserted.id, user_id: state.user.id, reason: 'Duplicado do mês anterior' });
        await loadAll();
        toast('Cardápio duplicado do mês anterior.'); refresh();
      } catch (e) { toast('Erro ao duplicar cardápio: ' + e.message, true); }
    };
  }
}
