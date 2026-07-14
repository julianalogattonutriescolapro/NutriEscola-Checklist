import { sb, uploadPhotoDataUrl } from '../lib/supabaseClient.js';
import { DB, state, toast } from '../state.js';
import { esc, uid, fmtDate, fileToCompressedDataURL } from '../lib/utils.js';
import { classify, computeClassificationFromChecklist, schoolById, visitById, log, loadAll } from '../services/dataService.js';
import { generateVisitAISummary } from '../lib/ai.js';
import { nav, render } from '../router.js';

export function viewHistorico(root) {
  let list = DB.visits.filter((v) => v.status === 'finalizada').sort((a, b) => b.date.localeCompare(a.date));
  if (state.params.schoolId) list = list.filter((v) => v.schoolId === state.params.schoolId);
  root.innerHTML = `<div class="card"><table><thead><tr><th>Escola</th><th>Data</th><th>Nutricionista</th><th>Classificação</th><th>Não Conf.</th><th></th></tr></thead>
    <tbody>${list.length ? list.map((v) => {
      const s = schoolById(v.schoolId); const c = classify(computeClassificationFromChecklist(v.checklist).pct);
      const nc = (v.checklist || []).filter((i) => i.status === 'nc').length;
      return `<tr><td>${esc(s ? s.name : '—')}</td><td>${fmtDate(v.date)}</td><td>${esc(v.nutritionist)}</td><td><span class="pill ${c.cls}">${c.dot} ${c.label}</span></td><td>${nc}</td><td><button class="btn btn-ghost btn-sm" data-open="${v.id}">Ver relatório →</button></td></tr>`;
    }).join('') : `<tr><td colspan="6"><div class="empty">Nenhuma visita registrada.</div></td></tr>`}</tbody></table></div>`;
  root.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => nav('relatorioDetalhe', { visitId: b.dataset.open })));
}

export function viewRelatorios(root) {
  let list = DB.visits.filter((v) => v.status === 'finalizada').sort((a, b) => b.date.localeCompare(a.date));
  if (state.params.schoolId) list = list.filter((v) => v.schoolId === state.params.schoolId);
  root.innerHTML = `<div class="card">
    ${list.length ? `<table><thead><tr><th>Escola</th><th>Data</th><th>Classificação</th><th></th></tr></thead><tbody>
    ${list.map((v) => { const s = schoolById(v.schoolId); const c = classify(computeClassificationFromChecklist(v.checklist).pct);
      return `<tr><td>${esc(s ? s.name : '—')}</td><td>${fmtDate(v.date)}</td><td><span class="pill ${c.cls}">${c.dot} ${c.label}</span></td><td><button class="btn btn-secondary btn-sm" data-open="${v.id}">Abrir Relatório</button></td></tr>`;
    }).join('')}</tbody></table>` : '<div class="empty">Nenhum relatório gerado ainda. Finalize uma visita para gerar o primeiro relatório automaticamente.</div>'}
  </div>`;
  root.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => nav('relatorioDetalhe', { visitId: b.dataset.open })));
}

let reportHeaderOverride = null;

export function viewRelatorioDetalhe(root) {
  const v = visitById(state.params.visitId);
  if (!v) { root.innerHTML = '<div class="empty">Relatório não encontrado.</div>'; return; }
  const s = schoolById(v.schoolId);
  const cls = computeClassificationFromChecklist(v.checklist);
  const canEdit = state.user.role === 'admin';
  const groups = {}; v.checklist.forEach((it) => (groups[it.section] = groups[it.section] || []).push(it));
  const ai = v.ai;
  if (!reportHeaderOverride || reportHeaderOverride._visitId !== v.id) {
    reportHeaderOverride = { _visitId: v.id, prefeituraNome: DB.settings.prefeituraNome, prefeituraLogo: DB.settings.prefeituraLogo, secretariaNome: DB.settings.secretariaNome, secretariaLogo: DB.settings.secretariaLogo };
  }
  const h = reportHeaderOverride;
  const plans = DB.actionPlans.filter((a) => a.visitId === v.id);

  root.innerHTML = `
    <div class="no-print" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <button class="btn btn-ghost btn-sm" id="btnBack">← Voltar</button>
      <div class="tag-row">
        <button class="btn btn-secondary btn-sm" id="btnPrint">🖨 Imprimir / Salvar PDF</button>
        <button class="btn btn-secondary btn-sm" id="btnShareWhats">Compartilhar WhatsApp</button>
        <button class="btn btn-secondary btn-sm" id="btnShareMail">Compartilhar E-mail</button>
        ${canEdit ? `<button class="btn btn-secondary btn-sm" id="btnRegenAI">🤖 Regenerar Análise IA</button>` : ''}
      </div>
    </div>
    ${canEdit ? `
    <div class="card no-print" style="margin-bottom:16px;">
      <h3 style="font-size:13px;margin-bottom:10px;">Personalizar cabeçalho deste relatório</h3>
      <div class="grid g2">
        <div class="field">
          <label class="label">Nome da Prefeitura</label>
          <input class="input" id="h_prefNome" value="${esc(h.prefeituraNome)}" placeholder="Ex.: Prefeitura Municipal de...">
          <label class="mic-btn" style="display:inline-flex;cursor:pointer;margin-top:6px;">🖼 Logo da Prefeitura<input type="file" accept="image/*" id="h_prefLogoFile" style="display:none;"></label>
          ${h.prefeituraLogo ? `<img src="${h.prefeituraLogo}" style="height:30px;margin-left:8px;vertical-align:middle;">` : ''}
        </div>
        <div class="field">
          <label class="label">Nome da Secretaria</label>
          <input class="input" id="h_secNome" value="${esc(h.secretariaNome)}" placeholder="Ex.: Secretaria Municipal de Educação">
          <label class="mic-btn" style="display:inline-flex;cursor:pointer;margin-top:6px;">🖼 Logo da Secretaria<input type="file" accept="image/*" id="h_secLogoFile" style="display:none;"></label>
          ${h.secretariaLogo ? `<img src="${h.secretariaLogo}" style="height:30px;margin-left:8px;vertical-align:middle;">` : ''}
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" id="btnSaveHeaderDefault">Salvar como padrão para todos os relatórios</button>
    </div>` : ''}
    <div class="card" id="printArea">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;border-bottom:2px solid var(--green-600);padding-bottom:14px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          ${h.prefeituraLogo ? `<img src="${h.prefeituraLogo}" style="height:40px;">` : ''}
          ${h.secretariaLogo ? `<img src="${h.secretariaLogo}" style="height:40px;">` : ''}
        </div>
        <div style="text-align:center;flex:1;">
          <h2 style="font-size:18px;letter-spacing:.02em;">RELATÓRIO DE VISITA TÉCNICA DO PNAE</h2>
          ${h.prefeituraNome ? `<p class="small muted">${esc(h.prefeituraNome)}${h.secretariaNome ? ' · ' + esc(h.secretariaNome) : ''}</p>` : ''}
        </div>
        <span class="pill ${cls.cls}" style="font-size:13px;white-space:nowrap;">${cls.dot} ${cls.label}</span>
      </div>
      <div class="grid g3" style="margin-bottom:16px;">
        <div><span class="label">Escola</span>${esc(s ? s.name : '—')}</div>
        <div><span class="label">Data</span>${fmtDate(v.date)}</div>
        <div><span class="label">Nutricionista Responsável</span>${esc(v.nutritionist)}</div>
        <div><span class="label">Início / Término</span>${v.startTime || '—'} – ${v.endTime || '—'}</div>
        <div><span class="label">Cardápio previsto</span>${esc(v.plannedMenu || '—')}</div>
        <div><span class="label">Preparação realizada</span>${esc(v.executedMenu || '—')}</div>
      </div>
      ${ai ? `
        <div class="section-title">Resumo Técnico</div><p class="small" style="line-height:1.6;">${esc(ai.resumoTecnico || '')}</p>
        <div class="section-title">Conclusão</div><p class="small" style="line-height:1.6;">${esc(ai.conclusao || '')}</p>
        <div class="grid g2">
          <div><div class="section-title">Principais Não Conformidades</div><ul class="small">${(ai.principaisNaoConformidades || []).map((x) => `<li>${esc(x)}</li>`).join('') || '<li class="muted">Nenhuma</li>'}</ul></div>
          <div><div class="section-title">Recomendações Técnicas</div><ul class="small">${(ai.recomendacoes || []).map((x) => `<li>${esc(x)}</li>`).join('') || '<li class="muted">—</li>'}</ul></div>
        </div>
        <p class="small"><b>Prioridade de retorno:</b> ${esc(ai.prioridadeRetorno || '—')}</p>
      ` : `<div class="no-print"><p class="muted small">Análise por IA ainda não gerada.</p>${canEdit ? '<button class="btn btn-secondary btn-sm" id="btnGenAI">Gerar Análise com IA</button>' : ''}</div>`}
      <div class="section-title">Checklist</div>
      ${Object.entries(groups).map(([section, items]) => `
        <h4 style="font-size:12.5px;margin:12px 0 6px;color:var(--gray-700);">${esc(section)}</h4>
        <table><tbody>${items.map((it) => `<tr>
          <td style="width:46%;">${esc(it.text)}</td>
          <td style="width:14%;">${it.status === 'ok' ? '<span class="pill pill-ok">✔ Conforme</span>' : it.status === 'nc' ? '<span class="pill pill-danger">✘ Não Conforme</span>' : '<span class="pill pill-gray">➖ N/A</span>'}</td>
          <td>${esc(it.obs || '—')}${it.photos.length ? `<div class="photo-row">${it.photos.map((p) => `<img class="photo-thumb" src="${p.src}">`).join('')}</div>` : ''}</td>
        </tr>`).join('')}</tbody></table>`).join('')}
      <div class="section-title">Plano de Ação</div>
      ${plans.length ? `<table><thead><tr><th>Problema</th><th>Recomendação</th><th>Responsável</th><th>Prazo</th><th>Situação</th></tr></thead><tbody>
        ${plans.map((p) => `<tr><td>${esc(p.problem)}</td><td>${esc(p.recommendation || '—')}</td><td>${esc(p.responsible || '—')}</td><td>${p.deadline ? fmtDate(p.deadline) : '—'}</td><td>${esc(p.status)}</td></tr>`).join('')}
      </tbody></table>` : '<p class="small muted">Nenhuma não conformidade registrada nesta visita.</p>'}
      <div class="section-title">Assinaturas</div>
      <div class="grid g3">
        ${['nutritionist', 'director', 'schoolResponsible'].map((k, i) => {
          const labels = ['Nutricionista', 'Diretor(a)', 'Responsável pela Escola'];
          return `<div><p class="small muted">${labels[i]}</p>${v.signatures[k] ? `<img src="${v.signatures[k]}" style="max-width:100%;border-bottom:1px solid var(--gray-300);">` : '<p class="small muted">Não assinado</p>'}</div>`;
        }).join('')}
      </div>
      <p class="small muted" style="margin-top:20px;">Documento gerado automaticamente em ${new Date().toLocaleString('pt-BR')}.</p>
      <div style="text-align:center;margin-top:26px;padding-top:14px;border-top:1px solid var(--gray-100);">
        ${DB.settings.julianaLogo ? `<img src="${DB.settings.julianaLogo}" style="max-width:56px;max-height:34px;display:block;margin:0 auto 6px;">` : ''}
        <p style="font-size:10px;color:var(--gray-500);line-height:1.5;margin:0;">Criado por<br><span style="font-weight:700;">Juliana Logatto Consultoria e Assessoria</span></p>
        <p style="font-size:9px;color:var(--gray-500);margin-top:4px;">${esc(DB.settings.appName)}</p>
      </div>
    </div>`;

  document.getElementById('btnBack').onclick = () => nav('relatorios', { schoolId: v.schoolId });
  document.getElementById('btnPrint').onclick = () => window.print();
  document.getElementById('btnShareWhats').onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(`Relatório técnico — ${s ? s.name : ''} — ${fmtDate(v.date)} — Classificação: ${cls.label}`)}`, '_blank');
  document.getElementById('btnShareMail').onclick = () => {
    const subject = encodeURIComponent(`Relatório Técnico — ${s ? s.name : ''} — ${fmtDate(v.date)}`);
    const body = encodeURIComponent(`Segue relatório técnico da visita realizada em ${fmtDate(v.date)}.\nClassificação: ${cls.label}\n\n(Recomenda-se anexar o PDF exportado via botão Imprimir.)`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const genBtn = document.getElementById('btnGenAI') || document.getElementById('btnRegenAI');
  if (genBtn) genBtn.onclick = async () => {
    genBtn.disabled = true; genBtn.innerHTML = '<span class="spinner"></span> Analisando...';
    const prevVisit = DB.visits.filter((vv) => vv.schoolId === v.schoolId && vv.status === 'finalizada' && vv.id !== v.id).sort((a, b) => b.date.localeCompare(a.date))[0];
    const ai2 = await generateVisitAISummary(v, s, prevVisit);
    if (ai2) { await sb.from('visits').update({ ai_summary: ai2 }).eq('id', v.id); await log('regenerate_ai', s ? s.name : ''); await loadAll(); toast('Análise gerada.'); render(); }
    else { toast('Não foi possível gerar a análise agora.', true); genBtn.disabled = false; }
  };

  if (canEdit) {
    const pn = document.getElementById('h_prefNome'); if (pn) pn.oninput = () => (h.prefeituraNome = pn.value);
    const sn = document.getElementById('h_secNome'); if (sn) sn.oninput = () => (h.secretariaNome = sn.value);
    const pf = document.getElementById('h_prefLogoFile');
    if (pf) pf.onchange = async (e) => { const file = e.target.files[0]; if (!file) return; toast('Enviando logo...'); const dataUrl = await fileToCompressedDataURL(file, 300, 0.85); h.prefeituraLogo = await uploadPhotoDataUrl(dataUrl, `branding/prefeitura_${v.id}_${uid()}.jpg`); render(); };
    const sf = document.getElementById('h_secLogoFile');
    if (sf) sf.onchange = async (e) => { const file = e.target.files[0]; if (!file) return; toast('Enviando logo...'); const dataUrl = await fileToCompressedDataURL(file, 300, 0.85); h.secretariaLogo = await uploadPhotoDataUrl(dataUrl, `branding/secretaria_${v.id}_${uid()}.jpg`); render(); };
    const btnDef = document.getElementById('btnSaveHeaderDefault');
    if (btnDef) btnDef.onclick = async () => {
      const { error } = await sb.from('settings').update({ prefeitura_nome: h.prefeituraNome, prefeitura_logo_url: h.prefeituraLogo, secretaria_nome: h.secretariaNome, secretaria_logo_url: h.secretariaLogo }).eq('id', 1);
      if (error) { toast('Erro ao salvar: ' + error.message, true); return; }
      await loadAll(); toast('Cabeçalho salvo como padrão para todos os relatórios.');
    };
  }
}
