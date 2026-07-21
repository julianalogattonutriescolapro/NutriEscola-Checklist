import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { LogoMarca, RamoFolhas } from './Decoracoes'

// Ordem definida para refletir o fluxo de uso do dia a dia.
const links = [
  { to: '/', label: 'Calendário', icon: '📅' },
  { to: '/despesas', label: 'Despesas', icon: '💸' },
  { to: '/receitas', label: 'Receitas', icon: '💰' },
  { to: '/painel', label: 'Painel', icon: '📊' },
  { to: '/alertas', label: 'Alertas', icon: '🔔' },
  { to: '/relatorios', label: 'Relatórios', icon: '📑' },
  { to: '/pesquisa', label: 'Pesquisa', icon: '🔍' },
  { to: '/categorias', label: 'Categorias', icon: '🏷️' },
  { to: '/reserva', label: 'Reserva Financeira', icon: '🏦' }
]

export default function Sidebar() {
  const { signOut, user, isAdmin } = useAuth()
  const [pendentes, setPendentes] = useState(0)
  const [menuAberto, setMenuAberto] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    async function contar() {
      const { count } = await supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('status_aprovacao', 'pendente')
      setPendentes(count || 0)
    }
    contar()
    const intervalo = setInterval(contar, 60000)
    return () => clearInterval(intervalo)
  }, [isAdmin])

  // Fecha o menu automaticamente ao trocar de tela no celular
  function fecharMenuMobile() {
    setMenuAberto(false)
  }

  return (
    <>
      {/* Botão hambúrguer — só é exibido em telas de celular (ver CSS) */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMenuAberto(true)}
        aria-label="Abrir menu"
        aria-expanded={menuAberto}
      >
        <span /><span /><span />
      </button>

      {/* Camada escura atrás do menu quando aberto no celular */}
      {menuAberto && <div className="mobile-overlay" onClick={fecharMenuMobile} aria-hidden="true" />}

      <aside className={`sidebar${menuAberto ? ' sidebar-aberta' : ''}`}>
        <button className="mobile-close-btn" onClick={fecharMenuMobile} aria-label="Fechar menu">✕</button>

        <RamoFolhas size={110} style={{ top: -20, right: -30 }} />
        <div className="sidebar-brand">
          <LogoMarca tamanho={82} direcao="coluna" tituloTamanho={25} />
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, zIndex: 1 }} onClick={fecharMenuMobile}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
            >
              <span aria-hidden="true">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}

          {isAdmin && (
            <NavLink to="/aprovacoes" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              <span aria-hidden="true">✔️</span> Aprovações
              {pendentes > 0 && <span className="badge badge-gold" style={{ marginLeft: 'auto' }}>{pendentes}</span>}
            </NavLink>
          )}

          <NavLink to="/perfil" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
            <span aria-hidden="true">👤</span> Meu Perfil
          </NavLink>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)', zIndex: 1 }}>
          <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', padding: '4px 14px 8px', wordBreak: 'break-all' }}>
            {user?.email} {isAdmin && <span className="badge badge-sage" style={{ marginLeft: 4 }}>Admin</span>}
          </div>
          <button className="nav-link" style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }} onClick={signOut}>
            <span aria-hidden="true">⏻</span> Sair
          </button>
        </div>
      </aside>
    </>
  )
}
