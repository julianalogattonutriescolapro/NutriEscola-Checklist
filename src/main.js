import './style.css';
import { sb, testConnection } from './lib/supabaseClient.js';
import { state } from './state.js';
import { loadSettingsOnly } from './services/dataService.js';
import { afterAuth } from './pages/auth.js';
import { render } from './router.js';

(async function init() {
  const ok = await testConnection();
  if (!ok) {
    state.connectionError = true;
    await render();
    return;
  }
  state.connectionError = false;

  try {
    await loadSettingsOnly();
  } catch (e) {
    console.error(e);
    state.connectionError = true;
    await render();
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    await afterAuth(session.user.id);
  } else {
    await render();
  }

  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
      state.user = null;
      render();
    }
  });
})();
