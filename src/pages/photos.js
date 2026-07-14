import { DB, state } from '../state.js';
import { esc, fmtDate } from '../lib/utils.js';
import { toast } from '../state.js';
import { visitById, schoolById } from '../services/dataService.js';

export function viewFotografias(root) {
  const schoolOpts = ['<option value="">Todas as escolas</option>'].concat(DB.schools.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`)).join('');
  root.innerHTML = `
    <div class="grid g3" style="margin-bottom:16px;">
      <div class="field"><label class="label">Escola</label><select id="pfSchool" class="input">${schoolOpts}</select></div>
      <div class="field"><label class="label">Comparar duas visitas</label><button class="btn btn-secondary btn-sm" id="btnCompare" style="width:100%;">🔀 Comparar Visitas</button></div>
    </div>
    <div id="pfGallery"></div>`;
  if (state.params.schoolId) document.getElementById('pfSchool').value = state.params.schoolId;
  const refresh = () => {
    const schoolId = document.getElementById('pfSchool').value;
    const visits = DB.visits.filter((v) => v.status === 'finalizada' && (!schoolId || v.schoolId === schoolId));
    const photos = [];
    visits.forEach((v) => { const s = schoolById(v.schoolId); (v.checklist || []).forEach((it) => (it.photos || []).forEach((p) => photos.push({ ...p, school: s ? s.name : '—', date: v.date, item: it.text }))); });
    photos.sort((a, b) => b.date.localeCompare(a.date));
    const gal = document.getElementById('pfGallery');
    gal.innerHTML = photos.length ? `<div class="grid g4">${photos.map((p) => `<div class="card" style="padding:8px;"><img src="${p.src}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;"><p class="small" style="margin-top:6px;font-weight:700;">${esc(p.school)}</p><p class="small muted">${fmtDate(p.date)} · ${esc(p.item)}</p></div>`).join('')}</div>` : '<div class="empty">Nenhuma fotografia registrada ainda.</div>';
  };
  document.getElementById('pfSchool').onchange = refresh;
  refresh();
  document.getElementById('btnCompare').onclick = () => openCompareModal(document.getElementById('pfSchool').value);
}

function openCompareModal(schoolId) {
  const visits = DB.visits.filter((v) => v.status === 'finalizada' && (!schoolId || v.schoolId === schoolId)).sort((a, b) => b.date.localeCompare(a.date));
  if (visits.length < 2) { toast('São necessárias ao menos duas visitas da mesma escola para comparar.', true); return; }
  const backdrop = document.createElement('div'); backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal" style="max-width:800px;">
    <h2 style="margin-bottom:14px;">Comparar Visitas</h2>
    <div class="grid g2" style="margin-bottom:14px;">
      <select class="input" id="cmpA">${visits.map((v) => `<option value="${v.id}">${fmtDate(v.date)} — ${schoolById(v.schoolId).name}</option>`).join('')}</select>
      <select class="input" id="cmpB">${visits.map((v, i) => `<option value="${v.id}" ${i === 1 ? 'selected' : ''}>${fmtDate(v.date)} — ${schoolById(v.schoolId).name}</option>`).join('')}</select>
    </div>
    <div class="grid g2" id="cmpResult"></div>
    <div style="text-align:right;margin-top:14px;"><button class="btn btn-secondary" id="btnCloseCmp">Fechar</button></div>
  </div>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector('#btnCloseCmp').onclick = () => backdrop.remove();
  const doCompare = () => {
    const a = visitById(document.getElementById('cmpA').value), b = visitById(document.getElementById('cmpB').value);
    const photosOf = (v) => (v.checklist || []).flatMap((it) => (it.photos || []).map((p) => ({ ...p, item: it.text })));
    const pa = photosOf(a), pb = photosOf(b);
    const ncA = a.checklist.filter((i) => i.status === 'nc').length, ncB = b.checklist.filter((i) => i.status === 'nc').length;
    document.getElementById('cmpResult').innerHTML = `
      <div><h4 style="font-size:13px;margin-bottom:8px;">${fmtDate(a.date)} — ${ncA} não conf.</h4>${pa.map((p) => `<img src="${p.src}" style="width:100%;border-radius:6px;margin-bottom:8px;">`).join('') || '<p class="muted small">Sem fotos.</p>'}</div>
      <div><h4 style="font-size:13px;margin-bottom:8px;">${fmtDate(b.date)} — ${ncB} não conf.</h4>${pb.map((p) => `<img src="${p.src}" style="width:100%;border-radius:6px;margin-bottom:8px;">`).join('') || '<p class="muted small">Sem fotos.</p>'}</div>
      <div style="grid-column:1/-1;padding:12px;background:var(--green-50);border-radius:8px;font-size:13px;">
        ${ncB < ncA ? '📈 A escola apresentou melhora no número de não conformidades entre as visitas comparadas.' : ncB > ncA ? '📉 A escola apresentou piora no número de não conformidades entre as visitas comparadas.' : 'Sem alteração no número de não conformidades entre as visitas comparadas.'}
      </div>`;
  };
  document.getElementById('cmpA').onchange = doCompare; document.getElementById('cmpB').onchange = doCompare;
  doCompare();
}
