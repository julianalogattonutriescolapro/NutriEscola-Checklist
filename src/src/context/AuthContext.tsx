import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import type { Usuario } from '../types/database'
import { salvarCache, lerCache } from '../lib/offlineCache'

interface AuthResult {
  error: { message: string } | null
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  perfil: Usuario | null
  loading: boolean
  loadingPerfil: boolean
  isAdmin: boolean
  isAprovado: boolean
  statusAprovacao: Usuario['status_aprovacao'] | null
  recarregarPerfil: () => Promise<void>
  signUp: (params: { email: string; password: string; nome: string }) => Promise<AuthResult & { needsConfirmation: boolean }>
  signIn: (params: { email: string; password: string }) => Promise<AuthResult>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<AuthResult>
  updatePassword: (novaSenha: string) => Promise<AuthResult>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [loadingPerfil, setLoadingPerfil] = useState(true)

  const carregarPerfil = useCallback(async (userId: string) => {
    setLoadingPerfil(true)

    if (!navigator.onLine) {
      // Sem internet: usa o último perfil conhecido (evita jogar um usuário
      // já aprovado/logado para a tela de espera só por falta de conexão)
      const cache = lerCache<Usuario>('usuarios', userId)
      setPerfil(cache?.[0] || null)
      setLoadingPerfil(false)
      return
    }

    const { data, error } = await supabase.from('usuarios').select('*').eq('id', userId).single()
    if (error) {
      // Falhou mesmo com sinal de "online" (ex: instabilidade) — cai para o cache
      const cache = lerCache<Usuario>('usuarios', userId)
      setPerfil(cache?.[0] || null)
    } else if (data) {
      setPerfil(data as Usuario)
      salvarCache('usuarios', userId, [data as Usuario])
    }
    setLoadingPerfil(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session?.user) carregarPerfil(data.session.user.id)
      else setLoadingPerfil(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) carregarPerfil(newSession.user.id)
      else { setPerfil(null); setLoadingPerfil(false) }
    })

    return () => listener.subscription.unsubscribe()
  }, [carregarPerfil])

  async function recarregarPerfil() {
    if (session?.user) await carregarPerfil(session.user.id)
  }

  async function signUp({ email, password, nome }: { email: string; password: string; nome: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } }
    })
    return { error, needsConfirmation: !error && !data.session }
  }

  async function signIn({ email, password }: { email: string; password: string }) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setPerfil(null)
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`
    })
    return { error }
  }

  async function updatePassword(novaSenha: string) {
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    return { error }
  }

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    perfil,
    loading,
    loadingPerfil,
    isAdmin: !!perfil?.admin,
    isAprovado: perfil?.status_aprovacao === 'aprovado',
    statusAprovacao: perfil?.status_aprovacao ?? null,
    recarregarPerfil,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
