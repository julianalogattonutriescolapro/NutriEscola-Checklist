import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoMarca, RamoFolhas } from '../components/Decoracoes'
import Footer from '../components/Footer'
import { traduzirErroAuth } from '../lib/authErrors'
import { diagnosticarConfiguracao } from '../lib/supabaseClient'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [erroTecnico, setErroTecnico] = useState('')
  const [carregando, setCarregando] = useState(false)
  const problemasConfig = diagnosticarConfiguracao()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setErroTecnico('')

    if (!navigator.onLine) {
      setErro('offline')
      return
    }

    setCarregando(true)
    const { error } = await signIn({ email, password: senha })
    setCarregando(false)
    if (error) {
      console.error('[Login] Falha ao entrar:', error)
      setErro(traduzirErroAuth(error.message))
      setErroTecnico(error.message)
      return
    }
    navigate('/')
  }

  return (
    <div className="auth-shell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
      <div className="auth-card entra-suave">
        <RamoFolhas size={125} style={{ top: -22, left: -26 }} />
        <RamoFolhas size={100} style={{ bottom: -22, right: -22, transform: 'rotate(180deg)' }} />
        <div className="auth-brand" style={{ display: 'flex', justifyContent: 'center' }}>
          <LogoMarca tamanho={72} direcao="coluna" />
        </div>
        <div className="auth-sub">Entre para acompanhar sua vida financeira.</div>

        {problemasConfig.length > 0 && (
          <div className="auth-error">
            <strong>Configuração do Supabase incompleta:</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {problemasConfig.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
        )}

        {erro === 'offline' ? (
          <div className="offline-banner offline-banner--aviso" style={{ borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
            📴 Sem conexão com a internet. Conecte-se para entrar na primeira vez — depois disso, o app funciona offline normalmente.
          </div>
        ) : erro && (
          <div className="auth-error">
            {erro}
            {erroTecnico && erroTecnico !== erro && (
              <div style={{ marginTop: 6, fontSize: 11, opacity: 0.75 }}>({erroTecnico})</div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="auth-link-row">
            <Link to="/esqueci-senha">Esqueci minha senha</Link>
          </div>
          <button className="btn btn-primary" type="submit" disabled={carregando} style={{ width: '100%', justifyContent: 'center' }}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="auth-switch">
          Ainda não tem conta? <Link to="/cadastro">Criar conta</Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
