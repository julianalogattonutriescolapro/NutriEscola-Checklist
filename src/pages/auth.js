import { sb, SUPABASE_URL } from '../lib/supabaseClient.js';
import { DB, state, toast } from '../state.js';
import { esc } from '../lib/utils.js';
import { loadAll, log } from '../services/dataService.js';
import { nav, render } from '../router.js';

let authMode = 'login';
let realtimeChannel = null;

export function renderLogin() {
  return `
  <div class="login-wrap">
    <div class="login-card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:22px;">
        <div class="brand-mark">
  <img src="/logo.png" alt="Nutri Escola Checklist">
</div>
        <div>
          <div class="brand-name">${esc(DB.settings.appName)}</div>
          <div class="brand-sub">Gestão de Alimentação Escolar</div>
        </div>
      </div>
      <h2 style="font-size:18px;margin-bottom:6px;">${authMode === 'login' ? 'Entrar' : 'Criar minha conta'}</h2>
      <p class="muted small" style="margin-bottom:18px;">${authMode === 'login' ? 'Acesse com seu e-mail e senha cadastrados no Supabase.' : 'Isso cria seu usuário no banco de dados real (Supabase Auth).'}</p>
      <div id="authError" class="small" style="color:var(--danger);margin-bottom:10px;"></div>
      ${authMode === 'signup' ? `<div class="field"><label class="label">Nome completo</label><input class="input" id="loginName" placeholder="Seu nome"></div>` : ''}
      <div class="field"><label class="label">E-mail</label><input type="email" class="input" id="loginEmail" placeholder="voce@email.com"></div>
      <div class="field"><label class="label">Senha</label><input type="password" class="input" id="loginPass" placeholder="••••••••"></div>
      <button class="btn btn-primary" id="btnLogin" style="width:100%;justify-content:center;">${authMode === 'login' ? 'Entrar' : 'Criar conta'}</button>
      <p class="small" style="margin-top:14px;text-align:center;">
        ${authMode === 'login' ? `Ainda não tem conta? <a class="link" id="toSignup">Criar conta</a>` : `Já tem conta? <a class="link" id="toLogin">Entrar</a>`}
      </p>
      <p class="small muted" style="margin-top:16px;line-height:1.5;">Login real via Supabase Auth — senha armazenada com hash/criptografia no servidor, nunca em texto simples. Novos cadastros entram como Nutricionista, aguardando aprovação da administradora.</p>
    </div>
  </div>`;
}

export function attachLoginEvents() {
  const go = (v) => { authMode = v; render(); };
  const su = document.getElementById('toSignup'); if (su) su.onclick = () => go('signup');
  const tl = document.getElementById('toLogin'); if (tl) tl.onclick = () => go('login');
  document.getElementById('btnLogin').onclick = async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    const errEl = document.getElementById('authError');
    errEl.textContent = '';
    if (!email || !pass) { errEl.textContent = 'Preencha e-mail e senha.'; return; }
    const btn = document.getElementById('btnLogin'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    try {
      if (authMode === 'login') {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        await afterAuth(data.user.id);
      } else {
        const name = document.getElementById('loginName').value.trim() || email;
        const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { name } } });
        if (error) throw error;
        if (!data.session) {
          errEl.style.color = 'var(--ok)';
          errEl.textContent = 'Conta criada! Verifique seu e-mail para confirmar o acesso, depois faça login.';
          authMode = 'login'; btn.disabled = false; btn.textContent = 'Entrar';
          return;
        }
        await afterAuth(data.user.id);
      }
    } catch (e) {
      errEl.style.color = 'var(--danger)';
      errEl.textContent = translateAuthError(e.message);
      btn.disabled = false; btn.textContent = authMode === 'login' ? 'Entrar' : 'Criar conta';
    }
  };
}

function translateAuthError(msg) {
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return 'Não foi possível conectar ao servidor (Failed to fetch). Verifique sua internet ou se o projeto Supabase não está pausado, e tente novamente.';
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/already registered|already exists/i.test(msg)) return 'Este e-mail já possui cadastro. Tente entrar.';
  if (/password.*at least/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.';
  return msg;
}

export async function afterAuth(userId) {
  const { data: profile } = await sb.from('profiles').select('*').eq('id', userId).single();
  if (!profile) { toast('Perfil não encontrado. Tente novamente em instantes.', true); return; }
  if (profile.status === 'pendente') {
    await sb.auth.signOut();
    state.blocked = 'Seu cadastro está aguardando aprovação da administradora.';
    render(); return;
  }
  if (profile.status === 'desativado') {
    await sb.auth.signOut();
    state.blocked = 'Seu acesso foi desativado pela administradora.';
    render(); return;
  }
  state.user = { id: profile.id, name: profile.name, role: profile.role, status: profile.status };
  await loadAll();
  await log('login', state.user.name);
  if (state.user.role === 'admin') subscribeRealtime();
  nav(state.user.role === 'nutricionista' ? 'novaVisita' : 'dashboard');
}

export function renderBlocked() {
  return `
  <div class="login-wrap">
    <div class="login-card" style="text-align:center;">
      <div class="brand-mark" style="margin:0 auto 16px;">NV</div>
      <h2 style="font-size:17px;margin-bottom:10px;">${esc(DB.settings.appName)}</h2>
      <p style="font-size:14px;line-height:1.6;">${esc(state.blocked)}</p>
      <button class="btn btn-secondary" id="btnBackToLogin" style="margin-top:20px;">Voltar</button>
    </div>
  </div>`;
}
export function attachBlockedEvents() {
  document.getElementById('btnBackToLogin').onclick = () => { state.blocked = null; authMode = 'login'; render(); };
}

export function renderConnectionError() {
  return `
  <div class="login-wrap">
    <div class="login-card" style="max-width:480px;">
      <div class="brand-mark" style="margin-bottom:16px;background:linear-gradient(155deg,var(--danger),#8a3229);">!</div>
      <h2 style="font-size:17px;margin-bottom:10px;">Não foi possível conectar ao banco de dados</h2>
      <p class="small" style="line-height:1.6;margin-bottom:14px;">O navegador não conseguiu falar com <code>${esc(SUPABASE_URL)}</code> ("Failed to fetch"). As causas mais comuns são:</p>
      <ul class="small" style="line-height:1.8;padding-left:18px;margin-bottom:16px;">
        <li><b>Projeto pausado no Supabase</b> — projetos gratuitos pausam sozinhos após um tempo sem uso. Verifique em supabase.com/dashboard.</li>
        <li><b>Sem internet ou bloqueio de rede/firewall/VPN</b> no computador ou rede atual.</li>
        <li><b>URL do projeto incorreta</b> — confirme em Supabase → Project Settings → API.</li>
      </ul>
      <button class="btn btn-primary" id="btnRetryConn" style="width:100%;justify-content:center;">Tentar novamente</button>
    </div>
  </div>`;
}
export function attachConnectionErrorEvents(retryFn) {
  document.getElementById('btnRetryConn').onclick = async () => {
    const btn = document.getElementById('btnRetryConn'); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
    await retryFn();
  };
}

export async function doLogout() {
  if (realtimeChannel) { sb.removeChannel(realtimeChannel); realtimeChannel = null; }
  await sb.auth.signOut();
  state.user = null;
  render();
}

/** Realtime: a administradora vê novas visitas/checklists aparecerem automaticamente. */
function subscribeRealtime() {
  if (realtimeChannel) return;
  let t;
  const debouncedRefresh = () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      await loadAll();
      if (['dashboard', 'historico', 'relatorios', 'indicadores'].includes(state.view)) render();
      else toast('Nova visita sincronizada.');
    }, 600);
  };
  realtimeChannel = sb
    .channel('admin-visits-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, debouncedRefresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_items' }, debouncedRefresh)
    .subscribe();
}
