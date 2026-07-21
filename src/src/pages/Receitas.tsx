import { useState } from 'react'
import { useEntity } from '../lib/useEntity'
import Modal from '../components/Modal'
import { formatMoeda, formatData } from '../lib/format'
import type { Receita, Categoria, StatusReceita } from '../types/database'

const SELECT = '*, categorias(nome,cor)'

const vazio = { descricao: '', valor: '', data: new Date().toISOString().slice(0, 10), categoria_id: '', status: 'recebido' as StatusReceita, recorrente: false, observacoes: '' }

export default function Receitas() {
  const { rows, loading, create, update, remove } = useEntity<Receita>('receitas', { select: SELECT, orderBy: 'data', ascending: false })
  const { rows: categorias } = useEntity<Categoria>('categorias', { orderBy: 'nome', ascending: true })
  const categoriasReceita = categorias.filter((c) => c.tipo === 'receita')

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Receita | null>(null)
  const [form, setForm] = useState(vazio)
  const [erro, setErro] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setErro('')
    setModalAberto(true)
  }

  function abrirEdicao(r: Receita) {
    setEditando(r)
    setForm({
      descricao: r.descricao, valor: String(r.valor), data: r.data,
      categoria_id: r.categoria_id || '', status: r.status, recorrente: r.recorrente, observacoes: r.observacoes || ''
    })
    setErro('')
    setModalAberto(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    const payload = { ...form, valor: Number(form.valor), categoria_id: form.categoria_id || null }
    const result = editando ? await update(editando.id, payload) : await create(payload)
    if (result.error) { setErro(result.error.message); return }
    setModalAberto(false)
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir esta receita?')) return
    await remove(id)
  }

  const filtradas = filtroStatus === 'todos' ? rows : rows.filter((r) => r.status === filtroStatus)

  const totalMes = rows
    .filter((r) => r.data?.slice(0, 7) === new Date().toISOString().slice(0, 7) && r.status === 'recebido')
    .reduce((acc, r) => acc + Number(r.valor), 0)

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Receitas</h1>
          <p>Recebido este mês: <strong className="mono" style={{ color: 'var(--olive)' }}>{formatMoeda(totalMes)}</strong></p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Nova receita</button>
      </div>

      <div className="filtros-mobile-full" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['todos', 'recebido', 'pendente'].map((s) => (
          <button key={s} className={filtroStatus === s ? 'btn btn-primary' : 'btn btn-secondary'} onClick={() => setFiltroStatus(s)} style={{ padding: '7px 16px', fontSize: 13 }}>
            {s === 'todos' ? 'Todas' : s === 'recebido' ? 'Recebidas' : 'Pendentes'}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color: 'var(--ink-muted)' }}>Carregando...</p>
        ) : filtradas.length === 0 ? (
          <div className="empty-state">
            <div className="display">Nenhuma receita encontrada</div>
            <p>Registre seus recebimentos para acompanhar sua entrada de dinheiro.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Status</th><th style={{ textAlign: 'right' }}>Valor</th><th /></tr></thead>
                <tbody>
                  {filtradas.map((r) => (
                    <tr key={r.id}>
                      <td>{r.descricao} {r.recorrente && <span className="badge badge-gold" style={{ marginLeft: 6 }}>Recorrente</span>}</td>
                      <td>{r.categorias?.nome ? <span className="badge" style={{ background: `${r.categorias.cor}22`, color: r.categorias.cor }}>{r.categorias.nome}</span> : '—'}</td>
                      <td>{formatData(r.data)}</td>
                      <td><span className={`badge ${r.status === 'recebido' ? 'badge-sage' : 'badge-gold'}`}>{r.status === 'recebido' ? 'Recebido' : 'Pendente'}</span></td>
                      <td style={{ textAlign: 'right' }} className="mono">{formatMoeda(r.valor)}</td>
                      <td>
                        <span className="row-actions">
                          <button className="icon-btn" onClick={() => abrirEdicao(r)} aria-label="Editar">✎</button>
                          <button className="icon-btn" onClick={() => handleExcluir(r.id)} aria-label="Excluir">✕</button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Versão em cartões, exibida só no celular */}
            <div className="mobile-card-list">
              {filtradas.map((r) => (
                <div key={r.id} className="mov-card">
                  <div className="mov-card-top">
                    <span className="mov-card-descricao">{r.descricao}</span>
                    <span className="mov-card-valor" style={{ color: 'var(--olive)' }}>{formatMoeda(r.valor)}</span>
                  </div>
                  <div className="mov-card-bottom">
                    {r.categorias?.nome && <span className="badge" style={{ background: `${r.categorias.cor}22`, color: r.categorias.cor }}>{r.categorias.nome}</span>}
                    <span>{formatData(r.data)}</span>
                    <span className={`badge ${r.status === 'recebido' ? 'badge-sage' : 'badge-gold'}`}>{r.status === 'recebido' ? 'Recebido' : 'Pendente'}</span>
                    <span className="mov-card-acoes">
                      <button className="icon-btn" onClick={() => abrirEdicao(r)} aria-label="Editar">✎</button>
                      <button className="icon-btn" onClick={() => handleExcluir(r.id)} aria-label="Excluir">✕</button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalAberto && (
        <Modal title={editando ? 'Editar receita' : 'Nova receita'} onClose={() => setModalAberto(false)}>
          {erro && <div className="auth-error">{erro}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Descrição</label>
              <input required value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Salário" />
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
              <label>Categoria</label>
              <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                <option value="">Selecione...</option>
                {categoriasReceita.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'recebido' | 'pendente' })}>
                <option value="recebido">Recebido</option>
                <option value="pendente">Pendente</option>
              </select>
            </div>
            <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" style={{ width: 'auto' }} id="recorrente" checked={form.recorrente} onChange={(e) => setForm({ ...form, recorrente: e.target.checked })} />
              <label htmlFor="recorrente" style={{ margin: 0 }}>Receita recorrente (todo mês)</label>
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
