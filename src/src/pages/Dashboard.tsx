import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useEntity } from '../lib/useEntity'
import { supabase } from '../lib/supabaseClient'
import StatCard from '../components/StatCard'
import { RamoFolhas } from '../components/Decoracoes'
import { formatMoeda, formatData, NOMES_MESES_ABREV } from '../lib/format'
import { calcularResumoMensal, proximosVencimentos } from '../lib/inteligencia'
import { sincronizarAlertas } from '../lib/alertas'
import type { Receita, Despesa, Alerta } from '../types/database'

const CORES_CATEGORIA = ['#A8C3A0', '#C9A66B', '#E8B4B8', '#8B9574', '#B79FD6', '#7BAFC4', '#D4A5A5']

export default function Dashboard() {
  const { user, isAdmin } = useAuth()
  const [pendentesAdmin, setPendentesAdmin] = useState(0)
  const { rows: receitas, loading: loadingR } = useEntity<Receita>('receitas', { select: '*, categorias(nome,cor)', orderBy: 'data', ascending: false })
  const { rows: despesas, loading: loadingD } = useEntity<Despesa>('despesas', { select: '*, categorias(nome,cor)', orderBy: 'data', ascending: false })
  const { rows: alertas } = useEntity<Alerta>('alertas', { orderBy: 'disparar_em', ascending: false })

  useEffect(() => {
    if (user && receitas.length + despesas.length > 0) {
      sincronizarAlertas(user.id, despesas, receitas)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, receitas.length, despesas.length])

  useEffect(() => {
    if (!isAdmin) return
    supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('status_aprovacao', 'pendente')
      .then(({ count }) => setPendentesAdmin(count || 0))
  }, [isAdmin])

  const resumo = useMemo(() => calcularResumoMensal(receitas, despesas), [receitas, despesas])
  const vencimentos = useMemo(() => proximosVencimentos(despesas, 7), [despesas])
  const alertasNaoLidos = alertas.filter((a) => !a.lido && new Date(a.disparar_em) <= new Date()).slice(0, 5)

  const dadosPizzaDespesas = useMemo(() => {
    const mesAtual = new Date().toISOString().slice(0, 7)
    const porCategoria: Record<string, number> = {}
    despesas.filter((d) => d.data?.slice(0, 7) === mesAtual).forEach((d) => {
      const nome = d.categorias?.nome || 'Sem categoria'
      porCategoria[nome] = (porCategoria[nome] || 0) + Number(d.valor)
    })
    return Object.entries(porCategoria).map(([nome, valor], i) => ({ nome, valor, cor: CORES_CATEGORIA[i % CORES_CATEGORIA.length] }))
  }, [despesas])

  const evolucao6Meses = useMemo(() => {
    const hoje = new Date()
    const meses = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const receitasDoMes = receitas.filter((r) => r.data?.slice(0, 7) === chave && r.status === 'recebido').reduce((a, r) => a + Number(r.valor), 0)
      const despesasDoMes = despesas.filter((x) => x.data?.slice(0, 7) === chave && x.situacao === 'paga').reduce((a, x) => a + Number(x.valor), 0)
      meses.push({ mes: NOMES_MESES_ABREV[d.getMonth()], Receitas: receitasDoMes, Despesas: despesasDoMes })
    }
    return meses
  }, [receitas, despesas])

  const movimentacoesRecentes = useMemo(() => {
    type Mov = { id: string; tipo: 'receita' | 'despesa'; descricao: string; data: string; valor: number; status: string }
    const r: Mov[] = receitas.map((x) => ({ id: x.id, tipo: 'receita', descricao: x.descricao, data: x.data, valor: Number(x.valor), status: x.status }))
    const d: Mov[] = despesas.map((x) => ({ id: x.id, tipo: 'despesa', descricao: x.descricao, data: x.data, valor: Number(x.valor), status: x.situacao }))
    return [...r, ...d].sort((a, b) => (a.data < b.data ? 1 : -1)).slice(0, 8)
  }, [receitas, despesas])

  const loading = loadingR || loadingD

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Painel</h1>
          <p>Resumo geral da sua vida financeira — {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.</p>
        </div>
      </div>

      {isAdmin && pendentesAdmin > 0 && (
        <Link to="/aprovacoes" style={{ textDecoration: 'none' }}>
          <div className="card" style={{ marginBottom: 20, background: 'var(--gold-soft)', borderColor: 'var(--gold)', cursor: 'pointer' }}>
            <strong style={{ color: 'var(--ink)' }}>✧ {pendentesAdmin} pessoa(s) aguardando sua aprovação</strong>
            <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 2 }}>Clique aqui para autorizar ou recusar novos cadastros.</div>
          </div>
        </Link>
      )}

      <div className="stat-grid">
        <StatCard label="Saldo Atual" value={formatMoeda(resumo.saldoDisponivel)} tone={resumo.saldoDisponivel >= 0 ? 'positive' : 'negative'} />
        <StatCard label="Receitas do mês" value={formatMoeda(resumo.totalReceitasRecebidas)} tone="positive" />
        <StatCard label="Despesas do mês" value={formatMoeda(resumo.totalDespesasPagas)} tone="negative" />
        <StatCard label="Valor disponível" value={formatMoeda(resumo.dinheiroRestante)} tone={resumo.dinheiroRestante >= 0 ? 'positive' : 'negative'} />
      </div>

      {!resumo.suficienteParaOMes && (
        <div className="card auth-error" style={{ marginBottom: 20 }}>
          O dinheiro previsto pode não ser suficiente para pagar todas as contas deste mês.
        </div>
      )}

      <h2 className="section-title">Gráfico financeiro</h2>
      <div className="grid-2" style={{ marginBottom: 28 }}>
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 14, color: 'var(--ink-muted)' }}>Onde estou gastando mais</h3>
          {loading ? <p style={{ color: 'var(--ink-muted)' }}>Carregando...</p> : dadosPizzaDespesas.length === 0 ? (
            <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Nenhuma despesa neste mês.</p>
          ) : (
            <div className="grafico-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <Pie data={dadosPizzaDespesas} dataKey="valor" nameKey="nome" innerRadius={45} outerRadius={78} paddingAngle={2}>
                    {dadosPizzaDespesas.map((e, i) => <Cell key={i} fill={e.cor} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E9E2D3', borderRadius: 10, fontSize: 13 }} formatter={(v: number) => formatMoeda(v)} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#5B6555' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 14, color: 'var(--ink-muted)' }}>Receitas x Despesas — 6 meses</h3>
          <div className="grafico-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolucao6Meses} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#E9E2D3" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" stroke="#5B6555" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#5B6555" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E9E2D3', borderRadius: 10, fontSize: 13 }} formatter={(v: number) => formatMoeda(v)} />
                <Bar dataKey="Receitas" fill="#A8C3A0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#E8B4B8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <h2 className="section-title">Movimentações recentes</h2>
      <div className="card" style={{ marginBottom: 28 }}>
        <RamoFolhas size={70} style={{ top: -12, right: -12 }} />
        {movimentacoesRecentes.length === 0 ? (
          <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Nenhuma movimentação lançada ainda.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {movimentacoesRecentes.map((m) => (
              <div key={`${m.tipo}-${m.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 4px', borderBottom: '1px solid var(--border)', gap: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span aria-hidden="true" style={{ color: m.tipo === 'receita' ? 'var(--olive)' : '#A84A56', fontSize: 16 }}>{m.tipo === 'receita' ? '↗' : '↘'}</span>
                  <span>
                    {m.descricao}
                    <span style={{ color: 'var(--ink-faint)', marginLeft: 8, fontSize: 12.5 }}>{formatData(m.data)}</span>
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`badge ${m.status === 'pendente' ? 'badge-gold' : 'badge-sage'}`}>{m.status === 'pendente' ? 'Pendente' : m.tipo === 'receita' ? 'Recebido' : 'Pago'}</span>
                  <span className="mono" style={{ minWidth: 90, textAlign: 'right' }}>{formatMoeda(m.valor)}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 14, marginBottom: 10, color: 'var(--ink-muted)' }}>✧ Alertas</h3>
          {alertasNaoLidos.length === 0 ? (
            <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Nenhum alerta no momento.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {alertasNaoLidos.slice(0, 3).map((a) => (
                <div key={a.id} style={{ fontSize: 13, padding: '7px 9px', background: 'var(--gold-soft)', borderRadius: 9 }}>
                  <strong>{a.titulo}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 14, marginBottom: 10, color: 'var(--ink-muted)' }}>Próximos vencimentos</h3>
          {vencimentos.length === 0 ? (
            <p style={{ color: 'var(--ink-faint)', fontSize: 13 }}>Nada nos próximos 7 dias.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {vencimentos.slice(0, 3).map((d) => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 2px' }}>
                  <span>{d.descricao}</span>
                  <span className="mono">{formatMoeda(d.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
