import { useMemo, useState } from 'react'
import { useEntity } from '../lib/useEntity'
import { formatMoeda, formatData } from '../lib/format'
import type { Receita, Despesa, Categoria } from '../types/database'

type Resultado = {
  id: string
  tipo: 'receita' | 'despesa'
  descricao: string
  categoria: string
  data: string
  valor: number
  status: string
  formaPagamento?: string
}

export default function Pesquisa() {
  const { rows: receitas } = useEntity<Receita>('receitas', { select: '*, categorias(nome,cor)' })
  const { rows: despesas } = useEntity<Despesa>('despesas', { select: '*, categorias(nome,cor)' })
  const { rows: categorias } = useEntity<Categoria>('categorias')

  const [texto, setTexto] = useState('')
  const [tipo, setTipo] = useState<'todos' | 'receita' | 'despesa'>('todos')
  const [categoriaId, setCategoriaId] = useState('')
  const [status, setStatus] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [mes, setMes] = useState('')
  const [ano, setAno] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [valorMin, setValorMin] = useState('')
  const [valorMax, setValorMax] = useState('')

  const todos: Resultado[] = useMemo(() => {
    const r: Resultado[] = receitas.map((x) => ({
      id: x.id, tipo: 'receita', descricao: x.descricao, categoria: x.categorias?.nome || '', data: x.data, valor: Number(x.valor), status: x.status
    }))
    const d: Resultado[] = despesas.map((x) => ({
      id: x.id, tipo: 'despesa', descricao: x.descricao, categoria: x.categorias?.nome || '', data: x.data, valor: Number(x.valor), status: x.situacao, formaPagamento: x.forma_pagamento
    }))
    return [...r, ...d].sort((a, b) => (a.data < b.data ? 1 : -1))
  }, [receitas, despesas])

  const resultados = todos.filter((item) => {
    if (tipo !== 'todos' && item.tipo !== tipo) return false
    if (texto && !item.descricao.toLowerCase().includes(texto.toLowerCase())) return false
    if (categoriaId) {
      const cat = categorias.find((c) => c.id === categoriaId)
      if (!cat || item.categoria !== cat.nome) return false
    }
    if (status && item.status !== status) return false
    if (formaPagamento && item.formaPagamento !== formaPagamento) return false
    if (mes && item.data.slice(5, 7) !== mes) return false
    if (ano && item.data.slice(0, 4) !== ano) return false
    if (dataInicio && item.data < dataInicio) return false
    if (dataFim && item.data > dataFim) return false
    if (valorMin && item.valor < Number(valorMin)) return false
    if (valorMax && item.valor > Number(valorMax)) return false
    return true
  })

  const total = resultados.reduce((acc, r) => acc + (r.tipo === 'receita' ? r.valor : -r.valor), 0)

  function limparFiltros() {
    setTexto(''); setTipo('todos'); setCategoriaId(''); setStatus(''); setFormaPagamento('')
    setMes(''); setAno(''); setDataInicio(''); setDataFim(''); setValorMin(''); setValorMax('')
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Pesquisa</h1>
          <p>Encontre qualquer movimentação por descrição, categoria, valor, forma de pagamento, situação, mês, ano ou período.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="field">
          <label>Descrição</label>
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por descrição..." />
        </div>

        <div className="grid-4">
          <div className="field">
            <label>Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as 'todos' | 'receita' | 'despesa')}>
              <option value="todos">Todos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </select>
          </div>
          <div className="field">
            <label>Categoria</label>
            <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">Todas</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Situação</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todas</option>
              <option value="recebido">Recebido</option>
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
            </select>
          </div>
          <div className="field">
            <label>Forma de pagamento</label>
            <select value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)}>
              <option value="">Todas</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="dinheiro_fisico">Dinheiro físico</option>
              <option value="pix">PIX</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
              <option value="transferencia">Transferência</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>

        <div className="grid-4">
          <div className="field">
            <label>Mês</label>
            <select value={mes} onChange={(e) => setMes(e.target.value)}>
              <option value="">Todos</option>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Ano</label>
            <input type="number" value={ano} onChange={(e) => setAno(e.target.value)} placeholder="2026" />
          </div>
          <div className="field">
            <label>Valor mínimo</label>
            <input type="number" step="0.01" value={valorMin} onChange={(e) => setValorMin(e.target.value)} />
          </div>
          <div className="field">
            <label>Valor máximo</label>
            <input type="number" step="0.01" value={valorMax} onChange={(e) => setValorMax(e.target.value)} />
          </div>
        </div>

        <div className="grid-2" style={{ gap: 12 }}>
          <div className="field">
            <label>Período — de</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="field">
            <label>Período — até</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-ghost" onClick={limparFiltros}>Limpar filtros</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, color: 'var(--ink-muted)' }}>{resultados.length} resultado(s)</h3>
          <strong className={`mono ${total >= 0 ? 'value positive' : 'value negative'}`} style={{ fontSize: 15 }}>{formatMoeda(total)}</strong>
        </div>
        {resultados.length === 0 ? (
          <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Nenhum resultado com esses filtros.</p>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Data</th><th>Situação</th><th style={{ textAlign: 'right' }}>Valor</th></tr></thead>
                <tbody>
                  {resultados.map((r) => (
                    <tr key={`${r.tipo}-${r.id}`}>
                      <td><span className={`badge ${r.tipo === 'receita' ? 'badge-sage' : 'badge-rose'}`}>{r.tipo === 'receita' ? 'Receita' : 'Despesa'}</span></td>
                      <td>{r.descricao}</td>
                      <td>{r.categoria || '—'}</td>
                      <td>{formatData(r.data)}</td>
                      <td>{r.status}</td>
                      <td style={{ textAlign: 'right' }} className="mono">{formatMoeda(r.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-card-list">
              {resultados.map((r) => (
                <div key={`${r.tipo}-${r.id}`} className="mov-card">
                  <div className="mov-card-top">
                    <span className="mov-card-descricao">{r.descricao}</span>
                    <span className="mov-card-valor" style={{ color: r.tipo === 'receita' ? 'var(--olive)' : '#B3505E' }}>{formatMoeda(r.valor)}</span>
                  </div>
                  <div className="mov-card-bottom">
                    <span className={`badge ${r.tipo === 'receita' ? 'badge-sage' : 'badge-rose'}`}>{r.tipo === 'receita' ? 'Receita' : 'Despesa'}</span>
                    {r.categoria && <span>{r.categoria}</span>}
                    <span>{formatData(r.data)}</span>
                    <span>{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
