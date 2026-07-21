import { useState } from 'react'
import { useEntity } from '../lib/useEntity'
import Modal from '../components/Modal'
import { formatMoeda, formatData, diasAteVencimento } from '../lib/format'
import type { Despesa, Categoria, FormaPagamento, SituacaoDespesa } from '../types/database'

const SELECT = '*, categorias(nome,cor)'

const FORMAS: { valor: FormaPagamento; label: string }[] = [
  { valor: 'dinheiro', label: 'Dinheiro (digital)' },
  { valor: 'dinheiro_fisico', label: 'Dinheiro físico' },
  { valor: 'pix', label: 'PIX' },
  { valor: 'debito', label: 'Débito' },
  { valor: 'credito', label: 'Crédito' },
  { valor: 'transferencia', label: 'Transferência' },
  { valor: 'outro', label: 'Outro' }
]

const vazio = {
  descricao: '', valor: '', data: new Date().toISOString().slice(0, 10), data_vencimento: '',
  categoria_id: '', situacao: 'pendente' as SituacaoDespesa, forma_pagamento: 'pix' as FormaPagamento,
  cartao_nome: '', cartao_vencimento: '', recorrente: false, observacoes: ''
}

export default function Despesas() {
  const { rows, loading, create, update, remove } = useEntity<Despesa>('despesas', { select: SELECT, orderBy: 'data', ascending: false })
  const { rows: categorias } = useEntity<Categoria>('categorias', { orderBy: 'nome', ascending: true })
  const categoriasDespesa = categorias.filter((c) => c.tipo === 'despesa')

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Despesa | null>(null)
  const [form, setForm] = useState(vazio)
  const [erro, setErro] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('todos')

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setErro('')
    setModalAberto(true)
  }

  function abrirEdicao(d: Despesa) {
    setEditando(d)
    setForm({
      descricao: d.descricao, valor: String(d.valor), data: d.data, data_vencimento: d.data_vencimento || '',
      categoria_id: d.categoria_id || '', situacao: d.situacao, forma_pagamento: d.forma_pagamento,
      cartao_nome: d.cartao_nome || '', cartao_vencimento: d.cartao_vencimento || '',
      recorrente: d.recorrente, observacoes: d.observacoes || ''
    })
    setErro('')
    setModalAberto(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    const ehCredito = form.forma_pagamento === 'credito'
    const payload = {
      ...form,
      valor: Number(form.valor),
      categoria_id: form.categoria_id || null,
      data_vencimento: form.data_vencimento || null,
      cartao_nome: ehCredito ? form.cartao_nome || null : null,
      cartao_vencimento: ehCredito ? form.cartao_vencimento || null : null
    }
    const result = editando ? await update(editando.id, payload) : await create(payload)
    if (result.error) { setErro(result.error.message); return }
    setModalAberto(false)
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir esta despesa?')) return
    await remove(id)
  }

  const filtradas = filtroSituacao === 'todos' ? rows : rows.filter((d) => d.situacao === filtroSituacao)

  const totalMes = rows
    .filter((d) => d.data?.slice(0, 7) === new Date().toISOString().slice(0, 7) && d.situacao === 'paga')
    .reduce((acc, d) => acc + Number(d.valor), 0)

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Despesas</h1>
          <p>Pago este mês: <strong className="mono" style={{ color: '#B3505E' }}>{formatMoeda(totalMes)}</strong></p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Nova despesa</button>
      </div>

      <div className="filtros-mobile-full" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['todos', 'pendente', 'paga'].map((s) => (
          <button key={s} className={filtroSituacao === s ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setFiltroSituacao(s)} style={{ padding: '7px 16px', fontSize: 13 }}>
            {s === 'todos' ? 'Todas' : s === 'pendente' ? 'Pendentes' : 'Pagas'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color: 'var(--ink-muted)' }}>Carregando...</p>
        ) : filtradas.length === 0 ? (
          <div className="empty-state">
            <div className="display">Nenhuma despesa encontrada</div>
            <p>Registre seus gastos para saber para onde seu dinheiro está indo.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Descrição</th><th>Categoria</th><th>Pagamento</th><th>Vencimento</th><th>Situação</th><th style={{ textAlign: 'right' }}>Valor</th><th /></tr></thead>
                <tbody>
                  {filtradas.map((d) => {
                    const dias = d.data_vencimento && d.situacao === 'pendente' ? diasAteVencimento(d.data_vencimento) : null
                    return (
                      <tr key={d.id}>
                        <td>{d.descricao} {d.recorrente && <span className="badge badge-gold" style={{ marginLeft: 6 }}>Recorrente</span>}</td>
                        <td>{d.categorias?.nome ? <span className="badge" style={{ background: `${d.categorias.cor}22`, color: d.categorias.cor }}>{d.categorias.nome}</span> : '—'}</td>
                        <td>
                          {FORMAS.find((f) => f.valor === d.forma_pagamento)?.label}
                          {d.forma_pagamento === 'credito' && d.cartao_nome && <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{d.cartao_nome}</div>}
                        </td>
                        <td>
                          {formatData(d.data_vencimento)}
                          {dias !== null && dias <= 3 && <div style={{ fontSize: 11, color: dias < 0 ? '#B3505E' : 'var(--gold)' }}>{dias < 0 ? 'Vencida' : dias === 0 ? 'Vence hoje' : `Vence em ${dias}d`}</div>}
                        </td>
                        <td><span className={`badge ${d.situacao === 'paga' ? 'badge-sage' : 'badge-gold'}`}>{d.situacao === 'paga' ? 'Paga' : 'Pendente'}</span></td>
                        <td style={{ textAlign: 'right' }} className="mono">{formatMoeda(d.valor)}</td>
                        <td>
                          <span className="row-actions">
                            <button className="icon-btn" onClick={() => abrirEdicao(d)} aria-label="Editar">✎</button>
                            <button className="icon-btn" onClick={() => handleExcluir(d.id)} aria-label="Excluir">✕</button>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Versão em cartões, exibida só no celular (ver .mobile-card-list no CSS) */}
            <div className="mobile-card-list">
              {filtradas.map((d) => {
                const dias = d.data_vencimento && d.situacao === 'pendente' ? diasAteVencimento(d.data_vencimento) : null
                return (
                  <div key={d.id} className="mov-card">
                    <div className="mov-card-top">
                      <span className="mov-card-descricao">{d.descricao}</span>
                      <span className="mov-card-valor" style={{ color: '#B3505E' }}>{formatMoeda(d.valor)}</span>
                    </div>
                    <div className="mov-card-bottom">
                      {d.categorias?.nome && <span className="badge" style={{ background: `${d.categorias.cor}22`, color: d.categorias.cor }}>{d.categorias.nome}</span>}
                      <span>{FORMAS.find((f) => f.valor === d.forma_pagamento)?.label}</span>
                      <span className={`badge ${d.situacao === 'paga' ? 'badge-sage' : 'badge-gold'}`}>{d.situacao === 'paga' ? 'Paga' : 'Pendente'}</span>
                      {dias !== null && dias <= 3 && <span style={{ color: dias < 0 ? '#B3505E' : 'var(--gold)' }}>{dias < 0 ? 'Vencida' : dias === 0 ? 'Vence hoje' : `${dias}d`}</span>}
                      <span className="mov-card-acoes">
                        <button className="icon-btn" onClick={() => abrirEdicao(d)} aria-label="Editar">✎</button>
                        <button className="icon-btn" onClick={() => handleExcluir(d.id)} aria-label="Excluir">✕</button>
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {modalAberto && (
        <Modal title={editando ? 'Editar despesa' : 'Nova despesa'} onClose={() => setModalAberto(false)}>
          {erro && <div className="auth-error">{erro}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Descrição</label>
              <input required value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Conta de energia" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Valor (R$)</label>
                <input type="number" step="0.01" required value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </div>
              <div className="field">
                <label>Data</label>
                <input type="date" required value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label>Data de vencimento</label>
              <input type="date" value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} />
            </div>
            <div className="field">
              <label>Categoria</label>
              <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                <option value="">Selecione...</option>
                {categoriasDespesa.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Forma de pagamento</label>
              <select value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value as FormaPagamento })}>
                {FORMAS.map((f) => <option key={f.valor} value={f.valor}>{f.label}</option>)}
              </select>
            </div>
            {form.forma_pagamento === 'credito' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Nome do cartão</label>
                  <input value={form.cartao_nome} onChange={(e) => setForm({ ...form, cartao_nome: e.target.value })} placeholder="Ex: Nubank" />
                </div>
                <div className="field">
                  <label>Vencimento da fatura</label>
                  <input type="date" value={form.cartao_vencimento} onChange={(e) => setForm({ ...form, cartao_vencimento: e.target.value })} />
                </div>
              </div>
            )}
            <div className="field">
              <label>Situação</label>
              <select value={form.situacao} onChange={(e) => setForm({ ...form, situacao: e.target.value as 'paga' | 'pendente' })}>
                <option value="pendente">Pendente</option>
                <option value="paga">Paga</option>
              </select>
            </div>
            <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" style={{ width: 'auto' }} id="recorrente" checked={form.recorrente} onChange={(e) => setForm({ ...form, recorrente: e.target.checked })} />
              <label htmlFor="recorrente" style={{ margin: 0 }}>Despesa recorrente (todo mês)</label>
            </div>
            <div className="field">
              <label>Observações</label>
              <textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModalAberto(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary">{editando ? 'Salvar' : 'Criar'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
