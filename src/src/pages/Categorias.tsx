import { useState } from 'react'
import { useEntity } from '../lib/useEntity'
import Modal from '../components/Modal'
import { RamoFolhas } from '../components/Decoracoes'
import type { Categoria } from '../types/database'

const CORES = ['#A8C3A0', '#C9A66B', '#E8B4B8', '#8B9574', '#B79FD6', '#7BAFC4']

export default function Categorias() {
  const { rows, loading, create, update, remove } = useEntity<Categoria>('categorias', { orderBy: 'nome', ascending: true })
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [form, setForm] = useState({ nome: '', tipo: 'despesa' as 'receita' | 'despesa', cor: CORES[0] })
  const [erro, setErro] = useState('')

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', tipo: 'despesa', cor: CORES[0] })
    setErro('')
    setModalAberto(true)
  }

  function abrirEdicao(cat: Categoria) {
    setEditando(cat)
    setForm({ nome: cat.nome, tipo: cat.tipo, cor: cat.cor })
    setErro('')
    setModalAberto(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    const result = editando ? await update(editando.id, form) : await create(form)
    if (result.error) { setErro(result.error.message); return }
    setModalAberto(false)
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir esta categoria? Lançamentos vinculados perderão a categoria.')) return
    await remove(id)
  }

  const receitas = rows.filter((r) => r.tipo === 'receita')
  const despesas = rows.filter((r) => r.tipo === 'despesa')

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Categorias</h1>
          <p>Organize receitas e despesas para relatórios mais claros. Suas 3 categorias de receita iniciais já vêm criadas.</p>
        </div>
        <button className="btn btn-primary" onClick={abrirNovo}>+ Nova categoria</button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--ink-muted)' }}>Carregando...</p>
      ) : (
        <div className="grid-2">
          <Grupo titulo="Receitas" itens={receitas} onEditar={abrirEdicao} onExcluir={handleExcluir} />
          <Grupo titulo="Despesas" itens={despesas} onEditar={abrirEdicao} onExcluir={handleExcluir} />
        </div>
      )}

      {modalAberto && (
        <Modal title={editando ? 'Editar categoria' : 'Nova categoria'} onClose={() => setModalAberto(false)}>
          {erro && <div className="auth-error">{erro}</div>}
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Nome</label>
              <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Alimentação" />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as 'receita' | 'despesa' })}>
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </div>
            <div className="field">
              <label>Cor</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {CORES.map((cor) => (
                  <button
                    type="button"
                    key={cor}
                    onClick={() => setForm({ ...form, cor })}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: cor, border: form.cor === cor ? '2px solid var(--ink)' : '2px solid transparent' }}
                    aria-label={`Selecionar cor ${cor}`}
                  />
                ))}
              </div>
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

function Grupo({ titulo, itens, onEditar, onExcluir }: { titulo: string; itens: Categoria[]; onEditar: (c: Categoria) => void; onExcluir: (id: string) => void }) {
  return (
    <div className="card">
      <RamoFolhas size={70} style={{ top: -12, right: -12 }} />
      <h3 style={{ fontSize: 16, marginBottom: 14, color: 'var(--ink-muted)' }}>{titulo}</h3>
      {itens.length === 0 ? (
        <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Nenhuma categoria.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {itens.map((cat) => (
            <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.cor, display: 'inline-block' }} />
                {cat.nome}
              </span>
              <span className="row-actions">
                <button className="icon-btn" onClick={() => onEditar(cat)} aria-label="Editar">✎</button>
                <button className="icon-btn" onClick={() => onExcluir(cat.id)} aria-label="Excluir">✕</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
