import { sb, uploadPhotoDataUrl } from '../lib/supabaseClient.js';
import { DB, state, toast } from '../state.js';
import { esc, uid, todayISO, fileToCompressedDataURL } from '../lib/utils.js';
import { CHECKLIST_TEMPLATE, ORIENTACOES_OPCOES, MOTIVOS_ALTERACAO } from '../lib/constants.js';
import { menuForDate, fmtMenuDay, computeClassificationFromChecklist, log, loadAll, schoolById } from '../services/dataService.js';
import { generateVisitAISummary } from '../lib/ai.js';
import { nav } from '../router.js';

let draftVisit = null;

function buildChecklist() {
  const items = [];
  CHECKLIST_TEMPLATE.forEach((sec) => sec.items.forEach((text) => {
    items.push({ id: uid(), section: sec.section, text, status: null, obs: '', photos: [], guidance: { types: [], text: '' } });
  }));
  return items;
}
function autofillMenu() {
  const r = menuForDate(draftVisit.schoolId, draftVisit.date);
  draftVisit.plannedMenu = r ? fmtMenuDay(r.day) : '';
}

export async function viewNovaVisita(root) {
  if (!DB.schools.length) { root.innerHTML = '<div class="empty">Cadastre uma escola antes de iniciar uma visita.</div>'; return; }
  if (!draftVisit || draftVisit.status !== 'rascunho') {
    const schoolId = state.params.schoolId || DB.schools[0].id;
    draftVisit = {
      id: uid(), schoolId, date: todayISO(), startTime: '', endTime: '',
      nutritionist: state.user.name, plannedMenu: '', executedMenu: '', menuChangeReason: '', menuChangeOther: '',
      checklist: buildChecklist(), signatures: { nutritionist: '', director: '', schoolResponsible: '' },
      status: 'rascunho', createdAt: new Date().toISOString(), versions: [],
    };
    autofillMenu();
  }
  renderVisitForm(root);
}

function renderChecklistItem(it) {
  const isNC = it.status === 'nc';
  return `<div class="checklist-item ${isNC ? 'nc' : ''}">
    <p style="font-size:13.5px;font-weight:600;margin-bottom:2px;">${esc(it.text)}</p>
    <div class="status-btns">
      <button class="status-btn ${it.status === 'ok' ? 'sel-ok' : ''}" data-status-for="${it.id}" data-status="ok">✔ Conforme</button>
      <button class="status-btn ${it.status === 'nc' ? 'sel-nc' : ''}" data-status-for="${it.id}" data-status="nc">✘ Não Conforme</button>
      <button class="status-btn ${it.status === 'na' ? 'sel-na' : ''}" data-status-for="${it.id}" data-status="na">➖ Não se Aplica</button>
    </div>
    <div class="field" style="margin-bottom:6px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <label class="label" style="margin-bottom:2px;">Observações ${isNC ? '(obrigatório)' : ''}</label>
        <button class="mic-btn" id="mic_${it.id}" type="button">🎤 Ditar</button>
      </div>
      <textarea class="input" id="obs_${it.id}" placeholder="Observações sobre este item...">${esc(it.obs)}</textarea>
    </div>
    <div>
      <label class="mic-btn" style="display:inline-flex;cursor:pointer;">📷 Adicionar Foto<input type="file" accept="image/*" capture="environment" id="photo_${it.id}" style="display:none;"></label>
      <div class="photo-row">
        ${it.photos.map((p) => `<div style="position:relative;"><img class="photo-thumb" src="${p.src}"><button data-rm-photo-for="${it.id}" data-rm-photo-id="${p.id}" style="position:absolute;top:-6px;right:-6px;background:var(--danger);color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;">✕</button></div>`).join('')}
      </div>
    </div>
    ${isNC ? `
      <div class="divider"></div>
      <label class="label">Orientações realizadas</label>
      <div class="grid g2" style="margin-bottom:6px;">
        ${ORIENTACOES_OPCOES.map((o) => `<label class="checkbox-row"><input type="checkbox" data-orient-for="${it.id}" value="${o}" ${it.guidance.types.includes(o) ? 'checked' : ''}> ${o}</label>`).join('')}
      </div>
      <label class="label">Orientações Realizadas — detalhamento</label>
      <textarea class="input" id="gtext_${it.id}" placeholder="Descreva a orientação dada...">${esc(it.guidance.text)}</textarea>
    ` : ''}
  </div>`;
}

function setupSigPad(canvas, existingDataUrl, onChange) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#20261F'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  if (existingDataUrl) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height); img.src = existingDataUrl; }
  let drawing = false, last = null;
  function pos(e) { const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: (t.clientX - r.left) * (canvas.width / r.width), y: (t.clientY - r.top) * (canvas.height / r.height) }; }
  function start(e) { drawing = true; last = pos(e); e.preventDefault(); }
  function move(e) { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; e.preventDefault(); }
  function end() { if (drawing) { drawing = false; onChange(canvas.toDataURL('image/png')); } }
  canvas.onmousedown = start; canvas.onmousemove = move; window.addEventListener('mouseup', end);
  canvas.ontouchstart = start; canvas.ontouchmove = move; canvas.ontouchend = end;
}

function startVoiceInput(btn, textarea, item) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast('Reconhecimento de voz não é suportado neste navegador.', true); return; }
  const rec = new SR(); rec.lang = 'pt-BR'; rec.interimResults = false;
  btn.classList.add('rec'); btn.textContent = '● Gravando...';
  rec.onresult = (e) => { const text = e.results[0][0].transcript; textarea.value = (textarea.value ? textarea.value + ' ' : '') + text; item.obs = textarea.value; };
  rec.onerror = () => toast('Não foi possível capturar o áudio.', true);
  rec.onend = () => { btn.classList.remove('rec'); btn.textContent = '🎤 Ditar'; };
  rec.start();
}

function renderVisitForm(root) {
  const schoolOpts = DB.schools.map((sc) => `<option value="${sc.id}" ${sc.id === draftVisit.schoolId ? 'selected' : ''}>${esc(sc.name)}</option>`).join('');
  const groups = {};
  draftVisit.checklist.forEach((it) => (groups[it.section] = groups[it.section] || []).push(it));
  const answered = draftVisit.checklist.filter((i) => i.status).length;
  const pct = Math.round((answered / draftVisit.checklist.length) * 100);

  root.innerHTML = `
    <div class="card" style="margin-bottom:18px;">
      <h3 style="font-size:14px;margin-bottom:12px;">Dados da Visita</h3>
      <div class="grid g3">
        <div class="field"><label class="label">Escola</label><select class="input" id="v_school">${schoolOpts}</select></div>
        <div class="field"><label class="label">Data</label><input type="date" class="input" id="v_date" value="${draftVisit.date}"></div>
        <div class="field"><label class="label">Nutricionista responsável</label><input class="input" id="v_nutri" value="${esc(draftVisit.nutritionist)}"></div>
        <div class="field"><label class="label">Horário de início</label><input type="time" class="input" id="v_start" value="${draftVisit.startTime}"></div>
        <div class="field"><label class="label">Horário de término</label><input type="time" class="input" id="v_end" value="${draftVisit.endTime}"></div>
      </div>
      <div class="field"><label class="label">Cardápio previsto (preenchido automaticamente)</label><input class="input" id="v_planned" value="${esc(draftVisit.plannedMenu)}" readonly style="background:var(--gray-50);"></div>
      <div class="field"><label class="label">Preparação realizada</label><textarea class="input" id="v_executed">${esc(draftVisit.executedMenu)}</textarea></div>
      <div id="menuChangeWrap"></div>
    </div>
    <div style="position:sticky;top:70px;z-index:4;background:var(--gray-50);padding:8px 0;margin-bottom:6px;">
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;"></div></div>
      <p class="small muted" style="margin-top:4px;">${answered}/${draftVisit.checklist.length} itens avaliados</p>
    </div>
    ${Object.entries(groups).map(([section, items]) => `<div class="section-title">${esc(section)}</div>${items.map((it) => renderChecklistItem(it)).join('')}`).join('')}
    <div class="section-title">Assinaturas</div>
    <div class="card grid g3">
      ${['nutritionist', 'director', 'schoolResponsible'].map((k, i) => {
        const labels = ['Nutricionista', 'Diretor(a)', 'Responsável pela Escola'];
        return `<div><label class="label">${labels[i]}</label><canvas class="sig-pad" id="sig_${k}" width="260" height="130"></canvas><button class="btn btn-ghost btn-sm" data-clear-sig="${k}">Limpar</button></div>`;
      }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:22px;">
      <button class="btn btn-secondary" id="btnCancelVisit">Cancelar</button>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" id="btnSaveDraft">Salvar Rascunho</button>
        <button class="btn btn-primary" id="btnFinalize">Finalizar Visita</button>
      </div>
    </div>`;

  document.getElementById('v_school').onchange = (e) => { draftVisit.schoolId = e.target.value; autofillMenu(); renderVisitForm(root); };
  document.getElementById('v_date').onchange = (e) => { draftVisit.date = e.target.value; autofillMenu(); renderVisitForm(root); };
  document.getElementById('v_nutri').oninput = (e) => (draftVisit.nutritionist = e.target.value);
  document.getElementById('v_start').oninput = (e) => (draftVisit.startTime = e.target.value);
  document.getElementById('v_end').oninput = (e) => (draftVisit.endTime = e.target.value);
  document.getElementById('v_executed').oninput = (e) => { draftVisit.executedMenu = e.target.value; renderMenuChangeBlock(); };
  renderMenuChangeBlock();

  function renderMenuChangeBlock() {
    const wrap = document.getElementById('menuChangeWrap');
    const differs = draftVisit.executedMenu.trim() && draftVisit.plannedMenu.trim() && draftVisit.executedMenu.trim() !== draftVisit.plannedMenu.trim();
    if (!differs) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `<div class="field" style="background:var(--warn-bg);padding:12px;border-radius:8px;">
      <label class="label">A preparação difere do cardápio previsto. Motivo da alteração</label>
      <select class="input" id="v_reason">${['', ...MOTIVOS_ALTERACAO].map((m) => `<option value="${m}" ${draftVisit.menuChangeReason === m ? 'selected' : ''}>${m || 'Selecione...'}</option>`).join('')}</select>
      ${draftVisit.menuChangeReason === 'Outro' ? `<textarea class="input" id="v_reasonOther" style="margin-top:8px;" placeholder="Descreva o motivo">${esc(draftVisit.menuChangeOther)}</textarea>` : ''}
    </div>`;
    document.getElementById('v_reason').onchange = (e) => { draftVisit.menuChangeReason = e.target.value; renderMenuChangeBlock(); };
    const other = document.getElementById('v_reasonOther'); if (other) other.oninput = (e) => (draftVisit.menuChangeOther = e.target.value);
  }

  draftVisit.checklist.forEach((it) => {
    document.querySelectorAll(`[data-status-for="${it.id}"]`).forEach((btn) => { btn.onclick = () => { it.status = btn.dataset.status; renderVisitForm(root); }; });
    const obsEl = document.getElementById(`obs_${it.id}`);
    if (obsEl) obsEl.oninput = (e) => (it.obs = e.target.value);
    const photoInput = document.getElementById(`photo_${it.id}`);
    if (photoInput) photoInput.onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      toast('Processando foto...');
      const dataUrl = await fileToCompressedDataURL(file);
      it.photos.push({ id: uid(), src: dataUrl, at: new Date().toISOString() });
      renderVisitForm(root);
    };
    document.querySelectorAll(`[data-rm-photo-for="${it.id}"]`).forEach((b) => (b.onclick = () => { it.photos = it.photos.filter((p) => p.id !== b.dataset.rmPhotoId); renderVisitForm(root); }));
    document.querySelectorAll(`[data-orient-for="${it.id}"]`).forEach((cb) => (cb.onchange = () => { if (cb.checked) it.guidance.types.push(cb.value); else it.guidance.types = it.guidance.types.filter((t) => t !== cb.value); }));
    const gText = document.getElementById(`gtext_${it.id}`);
    if (gText) gText.oninput = (e) => (it.guidance.text = e.target.value);
    const micBtn = document.getElementById(`mic_${it.id}`);
    if (micBtn) micBtn.onclick = () => startVoiceInput(micBtn, obsEl, it);
  });

  ['nutritionist', 'director', 'schoolResponsible'].forEach((k) => setupSigPad(document.getElementById('sig_' + k), draftVisit.signatures[k], (sig) => (draftVisit.signatures[k] = sig)));
  document.querySelectorAll('[data-clear-sig]').forEach((b) => (b.onclick = () => { const cv = document.getElementById('sig_' + b.dataset.clearSig); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); draftVisit.signatures[b.dataset.clearSig] = ''; }));

  document.getElementById('btnCancelVisit').onclick = () => { if (confirm('Cancelar esta visita? Os dados não serão salvos.')) { draftVisit = null; nav('escolas'); } };
  document.getElementById('btnSaveDraft').onclick = async () => toast('Rascunho mantido nesta sessão. Finalize a visita para salvar definitivamente.');
  document.getElementById('btnFinalize').onclick = () => finalizeVisit(root);
}

async function finalizeVisit(root) {
  const missing = draftVisit.checklist.filter((i) => !i.status);
  if (missing.length) { toast(`Preencha todos os itens do checklist (${missing.length} restante(s)).`, true); return; }
  const ncMissingObs = draftVisit.checklist.filter((i) => i.status === 'nc' && !i.obs.trim());
  if (ncMissingObs.length) { toast('Itens marcados como Não Conforme precisam de observação.', true); return; }
  if (!draftVisit.startTime || !draftVisit.endTime) { toast('Informe o horário de início e término da visita.', true); return; }

  const btn = document.getElementById('btnFinalize');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Gerando análise técnica com IA...';

  try {
    const cls = computeClassificationFromChecklist(draftVisit.checklist);
    const school = schoolById(draftVisit.schoolId);
    const prevVisit = DB.visits.filter((v) => v.schoolId === draftVisit.schoolId && v.status === 'finalizada').sort((a, b) => b.date.localeCompare(a.date))[0];
    const ai = await generateVisitAISummary({ ...draftVisit, checklist: draftVisit.checklist }, school, prevVisit);

    btn.innerHTML = '<span class="spinner"></span> Salvando no banco de dados...';

    const { data: visitRow, error: visitErr } = await sb.from('visits').insert({
      school_id: draftVisit.schoolId, nutritionist_id: state.user.id, date: draftVisit.date,
      start_time: draftVisit.startTime, end_time: draftVisit.endTime,
      planned_menu: draftVisit.plannedMenu, executed_menu: draftVisit.executedMenu,
      menu_change_reason: draftVisit.menuChangeReason, menu_change_other: draftVisit.menuChangeOther,
      status: 'finalizada', classification: cls.label,
      signature_nutritionist: draftVisit.signatures.nutritionist, signature_director: draftVisit.signatures.director,
      signature_school_responsible: draftVisit.signatures.schoolResponsible,
      ai_summary: ai || null, created_by: state.user.id, finalized_at: new Date().toISOString(),
    }).select().single();
    if (visitErr) throw visitErr;

    const itemsPayload = draftVisit.checklist.map((it, idx) => ({ visit_id: visitRow.id, section: it.section, item_order: idx, text: it.text, status: it.status, observation: it.obs, guidance_types: it.guidance.types, guidance_text: it.guidance.text }));
    const { data: itemRows, error: itemsErr } = await sb.from('checklist_items').insert(itemsPayload).select();
    if (itemsErr) throw itemsErr;

    for (let i = 0; i < draftVisit.checklist.length; i++) {
      const it = draftVisit.checklist[i]; const dbItem = itemRows[i];
      for (const p of it.photos) {
        const path = `${draftVisit.schoolId}/${visitRow.id}/${dbItem.id}/${p.id}.jpg`;
        await uploadPhotoDataUrl(p.src, path);
        await sb.from('photos').insert({ checklist_item_id: dbItem.id, visit_id: visitRow.id, school_id: draftVisit.schoolId, storage_path: path, taken_by: state.user.id });
      }
    }

    const ncIdx = draftVisit.checklist.map((it, idx) => ({ it, idx })).filter((x) => x.it.status === 'nc');
    if (ncIdx.length) {
      const aiPlans = (ai && ai.planoAcao) || [];
      const plansPayload = ncIdx.map(({ it, idx }, i) => ({
        visit_id: visitRow.id, school_id: draftVisit.schoolId, checklist_item_id: itemRows[idx].id,
        problem: it.text + (it.obs ? ' — ' + it.obs : ''),
        recommendation: (aiPlans[i] && aiPlans[i].recomendacao) || it.guidance.text || 'A definir',
        deadline: (aiPlans[i] && aiPlans[i].prazo) || null,
        responsible: draftVisit.nutritionist, status: 'Em aberto',
      }));
      await sb.from('action_plans').insert(plansPayload);
    }

    await log('finalize_visit', school.name);
    await loadAll();
    toast('Visita finalizada e salva no banco de dados. Relatório e Dashboard atualizados automaticamente.');
    draftVisit = null;
    if (state.user.role === 'admin') nav('relatorioDetalhe', { visitId: visitRow.id });
    else nav('novaVisita');
  } catch (e) {
    console.error(e);
    toast('Erro ao finalizar visita: ' + e.message, true);
    btn.disabled = false; btn.textContent = 'Finalizar Visita';
  }
}
