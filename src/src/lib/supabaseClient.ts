import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

/** Diagnóstico simples da configuração, usado para avisar o usuário antes de tentar logar. */
export function diagnosticarConfiguracao(): string[] {
  const problemas: string[] = []
  if (!supabaseUrl) problemas.push('VITE_SUPABASE_URL não está definida no .env.')
  else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(supabaseUrl)) problemas.push(`VITE_SUPABASE_URL parece incorreta: "${supabaseUrl}". Deve ser algo como https://xxxxxxxx.supabase.co (sem barra ou espaço extra).`)

  if (!supabaseAnonKey) problemas.push('VITE_SUPABASE_ANON_KEY não está definida no .env.')
  else if (!supabaseAnonKey.startsWith('sb_publishable_') && !supabaseAnonKey.startsWith('eyJ')) problemas.push('VITE_SUPABASE_ANON_KEY tem um formato inesperado — confira se copiou a chave "anon public" / "publishable" completa, sem cortar nenhum caractere.')

  return problemas
}

if (diagnosticarConfiguracao().length > 0) {
  console.warn('[Logatto Flow Finance] Problemas de configuração do Supabase:', diagnosticarConfiguracao())
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
})
