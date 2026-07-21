import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useEntity } from '../lib/useEntity'
import { RamoFolhas } from '../components/Decoracoes'
import { formatDataHora } from '../lib/format'
import { sincronizarAlertas } from '../lib/alertas'
import type { Alerta, Despesa, Receita } from '../types/database'

const ICONES: Record<string, string> = { vencimento: '⏰', saldo_baixo: '⚠', resumo_mes: '📊', contas_pendentes: '📌' }

export default function Alertas() {
  const { user } = useAuth()
  const { rows: alertas, loading, update } = useEntity<Alerta>('alertas', { orderBy: 'disparar_em', ascending: false })
  const { rows: despesas } = useEntity<Despesa>('despesas')
  const { rows: receitas } = useEntity<Receita>('receitas')

  useEffect(() => {
    if (user && (despesas.length > 0 || receitas.length > 0)) {
      sincronizarAlertas(user.id, despesas, receitas)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, despesas.length, receitas.length])

  const agora = new Date()
  const ativos = alertas.filter((a) => new Date(a.disparar_em) <= agora)
  const futuros = alertas.filter((a) => new Date(a.disparar_em) > agora)

  async function marcarLido(a: Alerta) {
    await update(a.id, { lido: true })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Alertas</h1>
          <p>Avisos inteligentes sobre vencimentos, saldo e contas pendentes.</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--ink-muted)' }}>Carregando...</p>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <RamoFolhas size={80} style={{ top: -12, right: -12 }} />
            <h3 style={{ fontSize: 15, marginBottom: 14, color: 'var(--ink-muted)' }}>Ativos agora</h3>
            {ativos.length === 0 ? (
              <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Nenhum alerta no momento. Tudo tranquilo!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ativos.map((a) => (
                  <div key={a.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
                    padding: '12px 14px', borderRadius: 12, background: a.lido ? 'var(--cream)' : 'var(--gold-soft)'
                  }}>
                    <div>
                      <strong>{ICONES[a.tipo]} {a.titulo}</strong>
                      <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 2 }}>{a.mensagem}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>{formatDataHora(a.disparar_em)}</div>
                    </div>
                    {!a.lido && <button className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px', whiteSpace: 'nowrap' }} onClick={() => marcarLido(a)}>Marcar lido</button>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {futuros.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 14, color: 'var(--ink-muted)' }}>Programados</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {futuros.map((a) => (
                  <div key={a.id} style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--cream)', fontSize: 13.5 }}>
                    <strong>{ICONES[a.tipo]} {a.titulo}</strong>
                    <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>Dispara em {formatDataHora(a.disparar_em)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
