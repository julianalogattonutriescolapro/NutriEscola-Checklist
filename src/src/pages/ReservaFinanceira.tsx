import { useState } from 'react'
import { useEntity } from '../lib/useEntity'
import Modal from '../components/Modal'
import { RamoFolhas, FlorPequena } from '../components/Decoracoes'
import { formatMoeda } from '../lib/format'
import type { ReservaFinanceira as ReservaItem } from '../types/database'

const vazio = { nome: '', valor_guardado: '', objetivo: '', observacoes: '' }
const SUGESTOES = ['Cofre', 'Cofre Online', 'Caixa', 'Nubank', 'Inter', 'Mercado Pago', 'Banco do Brasil']

export default function ReservaFinanceira() {
  const { rows, loading, create, update, remove } = useEntity<ReservaItem>('reserva_financeira', { orderBy: 'created_at', ascending: false })

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<ReservaItem | null>(null)
  const [form, setForm] = useState(vazio)
  const [erro, setErro] = useState('')

  function abrirNovo(nomeSugerido = '') {
    setEditando(null)
    setForm({ ...vazio, nome: nomeSugerido })
    setErro('')
    setModalAberto(true)
  }

  function abrirEdicao(r: ReservaItem) {
    setEditando(r)
    setForm({ nome: r.nome, valor_guardado: String(r.valor_guardado), objetivo: r.objetivo || '', observacoes: r.observacoes || '' })
    setErro('')
    setModalAberto(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    const payload = { ...form, valor_guardado: Number(form.valor_guardado || 0) }
    const result = editando ? await update(editando.id, payload) : await create(payload)
    if (result.error) { setErro(result.error.message); return }
    setModalAberto(false)
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir este local de reserva?')) return
    await remove(id)
  }

  const total = rows.reduce((acc, r) => acc + Number(r.valor_guardado), 0)

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Reserva Financeira</h1>
          <p>Total guardado: <strong className="mono" style={{ color: 'var(--olive)' }}>{formatMoeda(total)}</strong></p>
        </div>
        <button className="btn btn-primary" onClick={() => abrirNovo()}>+ Adicionar local</button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--ink-muted)' }}>Carregando...</p>
      ) : rows.length === 0 ? (
        <div className="card empty-state">
          <RamoFolhas size={90} style={{ top: -10, right: -10 }} />
          <div className="display">Onde seu dinheiro está guardado?</div>
          <p style={{ marginBottom: 16 }}>Crie um item para cada lugar onde você guarda dinheiro — não é investimento, é só controle de onde está.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {SUGESTOES.map((s) => (
              <button key={s} className="btn btn-secondary" style={{ fontSize: 13, padding: '7px 14px' }} onClick={() => abrirNovo(s)}>{s}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="stat-grid">
          {rows.map((r) => (
            <div key={r.id} className="stat-card">
              <FlorPequena size={20} style={{ position: 'absolute', top: 16, right: 16 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 16 }}>{r.nome}</div>
              </div>
              <div className="value mono positive" style={{ marginBottom: 8 }}>{formatMoeda(r.valor_guardado)}</div>
              {r.objetivo && <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 10 }}>🎯 {r.objetivo}</div>}
              <span className="row-actions">
                <button className="icon-btn" onClick={() => abrirEdicao(r)} aria-label="Editar">✎ Editar</button>
                <button className="icon-btn" onClick={() => handleExcluir(r.id)} aria-label="Excluir">✕</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <Modal title={editando ? 'Editar local de reserva' : 'Novo local de reserva'} onClose={() => setModalAberto(false)}>
          {erro && <div className="auth-error">{erro}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Nome</label>
              <input required list="sugestoes-reserva" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Cofre, Nubank..." />
              <datalist id="sugestoes-reserva">{SUGESTOES.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="field">
              <label>Valor guardado (R$)</label>
              <input type="number" step="0.01" required value={form.valor_guardado} onChange={(e) => setForm({ ...form, valor_guardado: e.target.value })} />
            </div>
            <div className="field">
              <label>Objetivo (opcional)</label>
              <input value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} placeholder="Ex: Reserva de emergência" />
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
