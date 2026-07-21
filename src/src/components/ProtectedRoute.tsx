import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { LogoMarca } from './Decoracoes'
import AguardandoAprovacao from '../pages/AguardandoAprovacao'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, loadingPerfil, isAdmin, isAprovado } = useAuth()

  if (loading || (user && loadingPerfil)) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', gap: 14 }}>
        <LogoMarca tamanho={108} variante="simbolo" />
        <span style={{ color: 'var(--ink-muted)', fontSize: 14 }}>Carregando...</span>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  // Só a administradora e usuários já aprovados podem acessar o app
  if (!isAdmin && !isAprovado) return <AguardandoAprovacao />

  return <>{children}</>
}
