/**
 * Traduz as mensagens de erro que o Supabase Auth devolve (em inglês) para
 * um português claro e acionável, para exibir na caixa de erro do login/cadastro.
 */
export function traduzirErroAuth(mensagem: string): string {
  const m = (mensagem || '').toLowerCase().trim()

  // Resposta vazia/malformada do servidor (ex: "{}") — quase sempre é URL ou chave erradas no .env
  if (m === '{}' || m === '' || m === 'null' || m === 'undefined') {
    return 'O Supabase respondeu, mas sem informação de erro (resposta vazia). Isso quase sempre significa que a URL ou a chave do Supabase no arquivo .env estão erradas, incompletas, ou que o servidor "npm run dev" precisa ser reiniciado depois de editar o .env. Confira VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em Project Settings → API no painel do Supabase.'
  }

  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Este e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e spam) e clique no link de confirmação antes de entrar.'
  if (m.includes('user already registered')) return 'Já existe uma conta com este e-mail. Tente entrar em vez de criar uma nova conta.'
  if (m.includes('invalid api key') || m.includes('invalid apikey') || m.includes('no api key')) return 'Erro de configuração: a chave do Supabase (VITE_SUPABASE_ANON_KEY) está ausente ou incorreta no arquivo .env. Confira em Project Settings → API.'
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')) return 'Não foi possível conectar ao servidor. Verifique sua internet e se a URL do Supabase (VITE_SUPABASE_URL) no .env está correta.'
  if (m.includes('too many requests') || m.includes('rate limit')) return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.'
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (m.includes('user not found')) return 'Não encontramos uma conta com este e-mail.'
  if (m.includes('signup') && m.includes('disabled')) return 'O cadastro de novos usuários está desativado neste projeto Supabase (Authentication → Providers → Email).'

  return mensagem
}
