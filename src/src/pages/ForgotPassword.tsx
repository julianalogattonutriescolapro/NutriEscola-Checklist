import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoMarca, RamoFolhas } from '../components/Decoracoes'
import Footer from '../components/Footer'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const { error } = await resetPassword(email)
    setCarregando(false)
    if (error) { setErro(error.message); return }
    setEnviado(true)
  }

  return (
    <div className="auth-shell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
      <div className="auth-card entra-suave">
        <RamoFolhas size={125} style={{ top: -22, left: -26 }} />
        <div className="auth-brand" style={{ display: 'flex', justifyContent: 'center' }}>
          <LogoMarca tamanho={72} direcao="coluna" />
        </div>
        <div className="auth-sub">Vamos te ajudar a recuperar o acesso à sua conta.</div>

        {erro && <div className="auth-error">{erro}</div>}
        {enviado && <div className="auth-success">Enviamos um link de redefinição para {email}. Verifique sua caixa de entrada.</div>}

        {!enviado && (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">E-mail cadastrado</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            </div>
            <button className="btn btn-primary" type="submit" disabled={carregando} style={{ width: '100%', justifyContent: 'center' }}>
              {carregando ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>
        )}

        <div className="auth-switch">
          <Link to="/login">Voltar para o login</Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
