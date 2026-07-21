import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import type { Usuario } from '../types/database'
import { RamoFolhas } from '../components/Decoracoes'

export default function Perfil() {
  const { user, updatePassword } = useAuth()
  const [perfil, setPerfil] = useState<Usuario | null>(null)
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const [novaSenha, setNovaSenha] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [mensagemSenha, setMensagemSenha] = useState('')

  useEffect(() => {
    async function carregar() {
      if (!user) return
      const { data } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
      if (data) { setPerfil(data as Usuario); setNome((data as Usuario).nome) }
    }
    carregar()
  }, [user])

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSalvando(true)
    setMensagem('')
    const { error } = await supabase.from('usuarios').update({ nome, updated_at: new Date().toISOString() }).eq('id', user.id)
    setSalvando(false)
    setMensagem(error ? error.message : 'Perfil atualizado com sucesso.')
  }

  async function alterarSenha(e: React.FormEvent) {
    e.preventDefault()
    setErroSenha('')
    setMensagemSenha('')
    if (novaSenha.length < 6) { setErroSenha('A senha precisa ter pelo menos 6 caracteres.'); return }
    const { error } = await updatePassword(novaSenha)
    if (error) { setErroSenha(error.message); return }
    setNovaSenha('')
    setMensagemSenha('Senha alterada com sucesso.')
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Meu perfil</h1>
          <p>Gerencie seus dados pessoais e sua senha.</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <RamoFolhas size={80} style={{ top: -14, right: -14 }} />
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Dados pessoais</h3>
          <form onSubmit={salvarPerfil}>
            <div className="field">
              <label>Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input value={perfil?.email || user?.email || ''} disabled />
            </div>
            {mensagem && <p style={{ fontSize: 13, color: 'var(--olive)', marginBottom: 12 }}>{mensagem}</p>}
            <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
          </form>
        </div>

        <div className="card">
          <RamoFolhas size={70} style={{ top: -12, right: -12 }} />
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Alterar senha</h3>
          <form onSubmit={alterarSenha}>
            <div className="field">
              <label>Nova senha</label>
              <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            {erroSenha && <div className="auth-error">{erroSenha}</div>}
            {mensagemSenha && <p style={{ fontSize: 13, color: 'var(--olive)', marginBottom: 12 }}>{mensagemSenha}</p>}
            <button className="btn btn-secondary" type="submit">Alterar senha</button>
          </form>
        </div>
      </div>
    </>
  )
}
