import { sb } from '../lib/supabaseClient.js';
import { DB, state, toast } from '../state.js';
import { esc } from '../lib/utils.js';
import { schoolStats, classify, log, loadAll } from '../services/dataService.js';
import { nav, render } from '../router.js';

export function viewEscolas(root) {
  const canEdit = state.user.role === 'admin';
  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <input id="schoolFilter" class="input" style="max-width:320px;" placeholder="Filtrar por nome ou bairro...">
      ${canEdit ? '<button class="btn btn-primary" id="btnNewSchool">+ Nova Escola</button>' : ''}
    </div>
    <div class="grid g3" id="schoolGrid"></div>`;
  const renderGrid = () => {
    const q = (document.getElementById('schoolFilter').value || '').toLowerCase();
    const list = DB.schools.filter((s) => !q || s.name.toLowerCase().includes(q) || (s.neighborhood || '').toLowerCase().includes(q));
    const grid = document.getElementById('schoolGrid');
    if (!list.length) { grid.innerHTML = `<div class="empty" style="grid-column:1/-1;">Nenhuma escola encontrada.${canEdit ? ' Cadastre a primeira escola para começar.' : ''}</div>`; return; }
    grid.innerHTML = list.map((s) => {
      const st = schoolStats(s.id); const c = classify(st.pctConform);
      return `<div class="school-card" data-open="${s.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <h3 style="font-size:15px;">${esc(s.name)}</h3><span class="pill ${c.cls}">${c.dot}</span>
        </div>
        <p class="small muted" style="margin:4px 0 10px;">${esc(s.neighborhood || '—')}</p>
        <div class="tag-row small muted"><span>📋 ${st.totalVisits} visitas</span><span>⚠️ ${st.pendings} pendências</span></div>
      </div>`;
    }).join('');
    grid.querySelectorAll('[data-open]').forEach((el) => (el.onclick = () => nav('escolaDetalhe', { schoolId: el.dataset.open })));
  };
  renderGrid();
  document.getElementById('schoolFilter').oninput = renderGrid;
  if (canEdit) document.getElementById('btnNewSchool').onclick = () => openSchoolModal();
}

export function openSchoolModal(existing) {
  const s = existing || { id: null, name: '', code: 'ESC-' + Math.floor(1000 + Math.random() * 9000), address: '', neighborhood: '', director: '', phone: '', cooks: '', students: '', notes: '' };
  const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal">
    <h2 style="margin-bottom:16px;">${existing ? 'Editar Escola' : 'Nova Escola'}</h2>
    <div class="grid g2">
      <div class="field"><label class="label">Nome da escola</label><input class="input" id="f_name" value="${esc(s.name)}"></div>
      <div class="field"><label class="label">Código</label><input class="input" id="f_code" value="${esc(s.code)}" readonly style="background:var(--gray-50);"></div>
      <div class="field"><label class="label">Endereço</label><input class="input" id="f_address" value="${esc(s.address)}"></div>
      <div class="field"><label class="label">Bairro / Localidade</label><input class="input" id="f_neighborhood" value="${esc(s.neighborhood)}"></div>
      <div class="field"><label class="label">Diretor(a)</label><input class="input" id="f_director" value="${esc(s.director)}"></div>
      <div class="field"><label class="label">Telefone</label><input class="input" id="f_phone" value="${esc(s.phone)}"></div>
      <div class="field"><label class="label">Merendeiras (nomes)</label><input class="input" id="f_cooks" value="${esc(s.cooks)}"></div>
      <div class="field"><label class="label">Quantidade de alunos</label><input class="input" type="number" id="f_students" value="${esc(String(s.students || ''))}"></div>
    </div>
    <div class="field"><label class="label">Observações</label><textarea class="input" id="f_notes">${esc(s.notes)}</textarea></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="btn btn-secondary" id="btnCancel">Cancelar</button>
      <button class="btn btn-primary" id="btnSave">Salvar</button>
    </div>
  </div>`;
  document.body.appendChild(backdrop);
  backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  backdrop.querySelector('#btnCancel').onclick = () => backdrop.remove();
  const val = (id) => document.getElementById(id).value;
  backdrop.querySelector('#btnSave').onclick = async () => {
    const name = val('f_name').trim();
    if (!name) { toast('Informe o nome da escola.', true); return; }
    const payload = { name, code: s.code, address: val('f_address'), neighborhood: val('f_neighborhood'), director: val('f_director'), phone: val('f_phone'), cooks: val('f_cooks'), students: val('f_students') ? parseInt(val('f_students')) : null, notes: val('f_notes') };
    const btnSave = backdrop.querySelector('#btnSave'); btnSave.disabled = true; btnSave.innerHTML = '<span class="spinner"></span>';
    try {
      if (existing) {
        const { error } = await sb.from('schools').update(payload).eq('id', s.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('schools').insert({ ...payload, created_by: state.user.id });
        if (error) throw error;
      }
      await log(existing ? 'edit_school' : 'create_school', name);
      await loadAll();
      backdrop.remove(); toast('Escola salva com sucesso.'); render();
    } catch (e) { toast('Erro ao salvar escola: ' + e.message, true); btnSave.disabled = false; btnSave.textContent = 'Salvar'; }
  };
}

export function viewEscolaDetalhe(root) {
  const s = DB.schools.find((x) => x.id === state.params.schoolId);
  if (!s) { root.innerHTML = '<div class="empty">Escola não encontrada.</div>'; return; }
  const st = schoolStats(s.id); const c = classify(st.pctConform);
  const canEdit = state.user.role === 'admin';
  root.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
      <div>
        <button class="btn btn-ghost btn-sm" id="btnBack">← Voltar</button>
        <h2 style="font-size:22px;margin-top:8px;">${esc(s.name)}</h2>
        <p class="muted small">${esc(s.code)} · ${esc(s.neighborhood || '—')}</p>
      </div>
      <span class="pill ${c.cls}" style="font-size:13px;padding:6px 14px;">${c.dot} ${c.label}</span>
    </div>
    <div class="tag-row" style="margin-bottom:20px;">
      ${canEdit ? `<button class="btn btn-primary btn-sm" id="btnNewVisit">📋 Nova Visita</button>` : ''}
      <button class="btn btn-secondary btn-sm" data-nav="__hist">📖 Histórico</button>
      <button class="btn btn-secondary btn-sm" data-nav="__rel">📄 Relatórios</button>
      <button class="btn btn-secondary btn-sm" data-nav="__fot">📷 Fotografias</button>
      <button class="btn btn-secondary btn-sm" data-nav="__pen">⚠️ Pendências</button>
      ${canEdit ? `<button class="btn btn-secondary btn-sm" id="btnEditSchool">✎ Editar Ficha</button>` : ''}
    </div>
    <div class="grid g4" style="margin-bottom:20px;">
      <div class="card stat"><span class="stat-label">Total de visitas</span><span class="stat-num">${st.totalVisits}</span></div>
      <div class="card stat"><span class="stat-label">Fotografias</span><span class="stat-num">${st.photos}</span></div>
      <div class="card stat"><span class="stat-label">Não conformidades</span><span class="stat-num">${st.ncCount}</span></div>
      <div class="card stat"><span class="stat-label">Pendências abertas</span><span class="stat-num">${st.pendings}</span></div>
    </div>
    <div class="grid g2">
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:10px;">Dados da Escola</h3>
        <table>
          <tr><td class="muted">Endereço</td><td>${esc(s.address || '—')}</td></tr>
          <tr><td class="muted">Diretor(a)</td><td>${esc(s.director || '—')}</td></tr>
          <tr><td class="muted">Telefone</td><td>${esc(s.phone || '—')}</td></tr>
          <tr><td class="muted">Merendeiras</td><td>${esc(s.cooks || '—')}</td></tr>
          <tr><td class="muted">Alunos</td><td>${esc(String(s.students || '—'))}</td></tr>
          <tr><td class="muted">Observações</td><td>${esc(s.notes || '—')}</td></tr>
        </table>
      </div>
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:10px;">Linha do tempo</h3>
        ${st.visits.length ? `<div style="display:flex;flex-direction:column;gap:10px;max-height:280px;overflow-y:auto;">
          ${st.visits.map((v) => { const cc = classify((v.checklist.filter(i=>i.status==='ok').length / Math.max(1,v.checklist.filter(i=>i.status!=='na').length))*100); const nc = (v.checklist || []).filter((i) => i.status === 'nc').length;
            return `<div style="border-left:3px solid ${cc.cls === 'pill-ok' ? 'var(--ok)' : cc.cls === 'pill-warn' ? 'var(--warn)' : 'var(--danger)'};padding-left:10px;cursor:pointer;" data-goto-report="${v.id}">
              <div style="font-weight:700;font-size:13px;">${v.date} <span class="pill ${cc.cls}" style="margin-left:6px;">${cc.label}</span></div>
              <div class="small muted">${nc} não conformidade(s)</div>
            </div>`; }).join('')}
        </div>` : '<p class="muted small">Nenhuma visita registrada ainda.</p>'}
      </div>
    </div>`;
  root.querySelector('#btnBack').onclick = () => nav('escolas');
  root.querySelectorAll('[data-goto-report]').forEach((el) => (el.onclick = () => nav('relatorioDetalhe', { visitId: el.dataset.gotoReport })));
  root.querySelector('[data-nav="__hist"]').onclick = () => nav('historico', { schoolId: s.id });
  root.querySelector('[data-nav="__rel"]').onclick = () => nav('relatorios', { schoolId: s.id });
  root.querySelector('[data-nav="__fot"]').onclick = () => nav('fotografias', { schoolId: s.id });
  root.querySelector('[data-nav="__pen"]').onclick = () => nav('pendencias', { schoolId: s.id });
  if (canEdit) {
    document.getElementById('btnNewVisit').onclick = () => nav('novaVisita', { schoolId: s.id });
    document.getElementById('btnEditSchool').onclick = () => openSchoolModal(s);
  }
}
