import { sb } from '../lib/supabaseClient.js';
import { DB, toast } from '../state.js';
import { esc, todayISO, fileToCompressedDataURL } from '../lib/utils.js';
import { uploadPhotoDataUrl } from '../lib/supabaseClient.js';
import { log, loadAll } from '../services/dataService.js';
import { render } from '../router.js';

export function viewAdmin(root) {
  const pending = DB.users.filter((u) => u.status === 'pendente');
  const others = DB.users.filter((u) => u.status !== 'pendente');
  root.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <h3 style="font-size:14px;margin-bottom:12px;">Solicitações de acesso ${pending.length ? `<span class="pill pill-warn">${pending.length}</span>` : ''}</h3>
      ${pending.length ? `<table><thead><tr><th>Nome</th><th>E-mail</th><th>Data do cadastro</th><th></th></tr></thead><tbody>
        ${pending.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '—'}</td>
          <td class="tag-row"><button class="btn btn-primary btn-sm" data-approve="${u.id}">Aprovar</button><button class="btn btn-danger btn-sm" data-deactivate="${u.id}">Desativar</button></td></tr>`).join('')}
        </tbody></table>` : '<p class="muted small">Nenhuma solicitação pendente.</p>'}
    </div>
    <div class="grid g2">
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:12px;">Usuários</h3>
        <table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th></th></tr></thead><tbody>
        ${others.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.role === 'admin' ? 'Administradora' : 'Nutricionista'}</td>
          <td><span class="pill ${u.status === 'aprovado' ? 'pill-ok' : 'pill-danger'}">${u.status === 'aprovado' ? 'Aprovado' : 'Desativado'}</span></td>
          <td>${u.role !== 'admin' ? `<button class="btn btn-ghost btn-sm" data-${u.status === 'aprovado' ? 'deactivate' : 'approve'}="${u.id}">${u.status === 'aprovado' ? 'Desativar' : 'Reativar'}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="5"><div class="empty">Nenhum outro usuário ainda.</div></td></tr>`}
        </tbody></table>
        <div class="divider"></div>
        <p class="small muted" style="line-height:1.5;">Novas contas são criadas pela própria pessoa em "Criar conta" na tela de login, e entram automaticamente como <b>Pendente</b> até você aprovar aqui. Checklists de usuários desativados continuam preservados no histórico.</p>
      </div>
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:12px;">Configurações Gerais</h3>
        <div class="field"><label class="label">Nome do aplicativo</label><input class="input" id="cfg_name" value="${esc(DB.settings.appName)}"></div>
        <div class="field"><label class="label">Município</label><input class="input" id="cfg_muni" value="${esc(DB.settings.municipio)}"></div>
        <div class="field"><label class="label">Secretaria de Educação</label><input class="input" id="cfg_sec" value="${esc(DB.settings.secretaria)}"></div>
        <div class="field"><label class="label">Responsável Técnico</label><input class="input" id="cfg_resp" value="${esc(DB.settings.responsavel)}"></div>
        <button class="btn btn-primary btn-sm" id="btnSaveCfg">Salvar Configurações</button>
        <div class="divider"></div>
        <label class="label">Logomarca — rodapé "Criado por Juliana Logatto"</label>
        ${DB.settings.julianaLogo ? `<img src="${DB.settings.julianaLogo}" style="height:36px;display:block;margin-bottom:8px;">` : '<p class="small muted">Nenhuma logo enviada ainda.</p>'}
        <label class="mic-btn" style="display:inline-flex;cursor:pointer;">🖼 Enviar logo<input type="file" accept="image/*" id="julianaLogoFile" style="display:none;"></label>
      </div>
    </div>
    <div class="grid g2" style="margin-top:16px;">
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:12px;">Backup</h3>
        <p class="muted small" style="margin-bottom:10px;">Os dados já ficam salvos permanentemente no banco de dados (Supabase), com backups automáticos gerenciados pela própria plataforma. Você também pode baixar uma cópia de leitura a qualquer momento.</p>
        <div class="tag-row"><button class="btn btn-secondary btn-sm" id="btnBackup">⬇ Baixar cópia dos dados (.json)</button></div>
        <p class="small muted" style="margin-top:10px;">Restauração completa de um backup deve ser feita pelo painel do Supabase (Database → Backups), para preservar a integridade dos relacionamentos entre as tabelas.</p>
      </div>
      <div class="card">
        <h3 style="font-size:14px;margin-bottom:12px;">Log de Auditoria (últimos eventos)</h3>
        <div style="max-height:220px;overflow-y:auto;">
        ${DB.auditLogs.slice(0, 20).map((l) => `<div class="small" style="padding:6px 0;border-bottom:1px solid var(--gray-100);"><b>${esc(l.action)}</b> — ${esc(l.details || '')} <span class="muted">· ${esc(l.user)} · ${new Date(l.at).toLocaleString('pt-BR')}</span></div>`).join('') || '<p class="muted small">Sem eventos.</p>'}
        </div>
      </div>
    </div>`;

  root.querySelectorAll('[data-approve]').forEach((b) => (b.onclick = async () => {
    const u = DB.users.find((x) => x.id === b.dataset.approve);
    const { error } = await sb.from('profiles').update({ status: 'aprovado' }).eq('id', u.id);
    if (error) { toast('Erro ao aprovar: ' + error.message, true); return; }
    await log('approve_user', u.name); toast('Usuário aprovado.'); await loadAll(); render();
  }));
  root.querySelectorAll('[data-deactivate]').forEach((b) => (b.onclick = async () => {
    const u = DB.users.find((x) => x.id === b.dataset.deactivate);
    const { error } = await sb.from('profiles').update({ status: 'desativado' }).eq('id', u.id);
    if (error) { toast('Erro ao desativar: ' + error.message, true); return; }
    await log('deactivate_user', u.name); toast('Usuário desativado.'); await loadAll(); render();
  }));
  document.getElementById('btnSaveCfg').onclick = async () => {
    const payload = { app_name: document.getElementById('cfg_name').value || 'NutriEscola Checklist', municipio: document.getElementById('cfg_muni').value, secretaria: document.getElementById('cfg_sec').value, responsavel_tecnico: document.getElementById('cfg_resp').value };
    const { error } = await sb.from('settings').update(payload).eq('id', 1);
    if (error) { toast('Erro ao salvar configurações: ' + error.message, true); return; }
    await loadAll(); await log('update_settings', payload.app_name); toast('Configurações salvas.'); render();
  };
  document.getElementById('julianaLogoFile').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    toast('Enviando logo...');
    const dataUrl = await fileToCompressedDataURL(file, 300, 0.85);
    const url = await uploadPhotoDataUrl(dataUrl, `branding/juliana_logo.jpg`);
    const { error } = await sb.from('settings').update({ juliana_logo_url: url }).eq('id', 1);
    if (error) { toast('Erro ao salvar logo: ' + error.message, true); return; }
    await loadAll(); toast('Logo salva.'); render();
  };
  document.getElementById('btnBackup').onclick = () => {
    const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `backup_nutriescola_${todayISO()}.json`; a.click(); URL.revokeObjectURL(url);
  };
}
