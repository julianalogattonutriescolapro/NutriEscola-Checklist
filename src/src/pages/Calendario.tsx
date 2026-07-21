import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useEntity } from '../lib/useEntity'
import { formatMoeda, NOMES_MESES } from '../lib/format'
import type { Despesa, Receita } from '../types/database'

type EventoCalendario = { id: string; tipo: 'despesa' | 'receita'; descricao: string; data: string; valor: number; status: string }

export default function Calendario() {
  const { user } = useAuth()
  const { rows: despesas } = useEntity<Despesa>('despesas')
  const { rows: receitas } = useEntity<Receita>('receitas')
  const [referencia, setReferencia] = useState(new Date())

  const eventos: EventoCalendario[] = useMemo(() => {
    const lista: EventoCalendario[] = []
    despesas.forEach((d) => {
      const data = d.data_vencimento || d.data
      const status = d.situacao === 'paga' ? 'paga' : new Date(data + 'T00:00:00') < new Date(new Date().toDateString()) ? 'vencida' : 'a_vencer'
      lista.push({ id: d.id, tipo: 'despesa', descricao: d.descricao, data, valor: Number(d.valor), status })
    })
    receitas.forEach((r) => {
      lista.push({ id: r.id, tipo: 'receita', descricao: r.descricao, data: r.data, valor: Number(r.valor), status: r.status === 'recebido' ? 'recebida' : 'prevista' })
    })
    return lista
  }, [despesas, receitas])

  const ano = referencia.getFullYear()
  const mes = referencia.getMonth()
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay()
  const totalDias = new Date(ano, mes + 1, 0).getDate()

  const eventosPorDia = useMemo(() => {
    const mapa: Record<number, EventoCalendario[]> = {}
    eventos.forEach((ev) => {
      const d = new Date(ev.data + 'T00:00:00')
      if (d.getFullYear() === ano && d.getMonth() === mes) {
        const dia = d.getDate()
        if (!mapa[dia]) mapa[dia] = []
        mapa[dia].push(ev)
      }
    })
    return mapa
  }, [eventos, ano, mes])

  const celulas: (number | null)[] = [...Array(primeiroDiaSemana).fill(null), ...Array.from({ length: totalDias }, (_, i) => i + 1)]
  const hoje = new Date()
  const ehHoje = (dia: number) => hoje.getDate() === dia && hoje.getMonth() === mes && hoje.getFullYear() === ano

  function corStatus(status: string) {
    if (status === 'vencida') return '#B3505E'
    if (status === 'paga' || status === 'recebida') return 'var(--olive)'
    return 'var(--gold)'
  }

  if (!user) return null

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Calendário Financeiro</h1>
          <p>Contas a vencer, vencidas, receitas previstas e recebidas — tudo em um só lugar.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setReferencia(new Date(ano, mes - 1, 1))}>‹</button>
          <strong style={{ minWidth: 140, textAlign: 'center' }}>{NOMES_MESES[mes]} {ano}</strong>
          <button className="btn btn-secondary" onClick={() => setReferencia(new Date(ano, mes + 1, 1))}>›</button>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
            <div key={d} style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-faint)', textAlign: 'center', padding: 4 }}>{d}</div>
          ))}
        </div>
        <div className="calendario-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {celulas.map((dia, i) => (
            <div
              key={i}
              className="calendario-celula"
              style={{
                minHeight: 84, borderRadius: 12, padding: 6,
                background: dia && ehHoje(dia) ? 'var(--sage-soft)' : 'var(--cream)',
                border: dia && ehHoje(dia) ? '1px solid var(--olive)' : '1px solid var(--border)'
              }}
            >
              {dia && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: ehHoje(dia) ? 'var(--olive)' : 'var(--ink-muted)' }}>{dia}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(eventosPorDia[dia] || []).slice(0, 3).map((ev) => (
                      <div key={ev.id} title={`${ev.descricao} · ${formatMoeda(ev.valor)}`} style={{
                        fontSize: 10.5, padding: '2px 5px', borderRadius: 6, color: '#fff',
                        background: corStatus(ev.status), whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {ev.tipo === 'receita' ? '↗' : '↘'} {ev.descricao}
                      </div>
                    ))}
                    {(eventosPorDia[dia] || []).length > 3 && (
                      <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>+{(eventosPorDia[dia] || []).length - 3} mais</div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 18, marginTop: 18, fontSize: 12.5, color: 'var(--ink-muted)', flexWrap: 'wrap' }}>
          <Legenda cor="#B3505E" label="Vencida" />
          <Legenda cor="var(--gold)" label="A vencer / prevista" />
          <Legenda cor="var(--olive)" label="Paga / recebida" />
        </div>
      </div>
    </>
  )
}

function Legenda({ cor, label }: { cor: string; label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: cor, display: 'inline-block' }} /> {label}
    </span>
  )
}
