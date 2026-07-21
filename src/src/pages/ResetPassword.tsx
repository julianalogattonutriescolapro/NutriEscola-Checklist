import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoMarca, RamoFolhas } from '../components/Decoracoes'
import Footer from '../components/Footer'

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return }
    if (senha !== confirmarSenha) { setErro('As senhas não coincidem.'); return }

    setCarregando(true)
    const { error } = await updatePassword(senha)
    setCarregando(false)
    if (error) { setErro(error.message); return }
    navigate('/')
  }

  return (
    <div className="auth-shell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
      <div className="auth-card entra-suave">
        <RamoFolhas size={125} style={{ top: -22, left: -26 }} />
        <div className="auth-brand" style={{ display: 'flex', justifyContent: 'center' }}>
          <LogoMarca tamanho={72} direcao="coluna" />
        </div>
        <div className="auth-sub">Defina sua nova senha.</div>

        {erro && <div className="auth-error">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="senha">Nova senha</label>
            <input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="field">
            <label htmlFor="confirmar">Confirmar nova senha</label>
            <input id="confirmar" type="password" required value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={carregando} style={{ width: '100%', justifyContent: 'center' }}>
            {carregando ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  )
}
