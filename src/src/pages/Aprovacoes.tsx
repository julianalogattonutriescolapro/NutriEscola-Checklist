import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { RamoFolhas } from '../components/Decoracoes'
import { formatDataHora } from '../lib/format'
import type { Usuario } from '../types/database'

export default function Aprovacoes() {
  const { user, isAdmin } = useAuth()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState<string | null>(null)

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('usuarios').select('*').order('created_at', { ascending: false })
    setUsuarios((data as Usuario[]) || [])
    setLoading(false)
  }

  useEffect(() => { if (isAdmin) carregar() }, [isAdmin])

  if (!isAdmin) return <Navigate to="/" replace />

  async function atualizarStatus(id: string, status: 'aprovado' | 'recusado') {
    setProcessando(id)
    await supabase.from('usuarios').update({ status_aprovacao: status, updated_at: new Date().toISOString() }).eq('id', id)
    await carregar()
    setProcessando(null)
  }

  const pendentes = usuarios.filter((u) => u.status_aprovacao === 'pendente' && u.id !== user?.id)
  const aprovados = usuarios.filter((u) => u.status_aprovacao === 'aprovado')
  const recusados = usuarios.filter((u) => u.status_aprovacao === 'recusado')

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Aprovações</h1>
          <p>Autorize quem pode usar o Logatto Flow Finance. Só você, como administradora, vê esta tela.</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--ink-muted)' }}>Carregando...</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <RamoFolhas size={80} style={{ top: -12, right: -12 }} />
            <h3 style={{ fontSize: 15, marginBottom: 14, color: 'var(--ink-muted)' }}>
              ✧ Aguardando aprovação {pendentes.length > 0 && <span className="badge badge-gold" style={{ marginLeft: 6 }}>{pendentes.length}</span>}
            </h3>
            {pendentes.length === 0 ? (
              <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Nenhum cadastro pendente no momento.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pendentes.map((u) => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--gold-soft)', flexWrap: 'wrap' }}>
                    <div>
                      <strong>{u.nome || 'Sem nome'}</strong>
                      <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{u.email}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Cadastrou-se em {formatDataHora(u.created_at)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" disabled={processando === u.id} style={{ padding: '7px 16px', fontSize: 13 }} onClick={() => atualizarStatus(u.id, 'aprovado')}>
                        {processando === u.id ? '...' : '✓ Aprovar'}
                      </button>
                      <button className="btn btn-danger" disabled={processando === u.id} style={{ padding: '7px 16px', fontSize: 13 }} onClick={() => atualizarStatus(u.id, 'recusado')}>
                        ✕ Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid-2">
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 14, color: 'var(--ink-muted)' }}>Aprovados ({aprovados.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {aprovados.map((u) => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', fontSize: 14 }}>
                    <span>{u.nome || u.email} {u.admin && <span className="badge badge-sage" style={{ marginLeft: 6 }}>Admin</span>}</span>
                    {!u.admin && u.id !== user?.id && (
                      <button className="icon-btn" onClick={() => atualizarStatus(u.id, 'recusado')} title="Revogar acesso">Revogar</button>
                    )}
                  </div>
                ))}
                {aprovados.length === 0 && <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Ninguém aprovado ainda.</p>}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 14, color: 'var(--ink-muted)' }}>Recusados ({recusados.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recusados.map((u) => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 4px', fontSize: 14 }}>
                    <span>{u.nome || u.email}</span>
                    <button className="icon-btn" onClick={() => atualizarStatus(u.id, 'aprovado')} title="Aprovar mesmo assim">Aprovar</button>
                  </div>
                ))}
                {recusados.length === 0 && <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Nenhum recusado.</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
