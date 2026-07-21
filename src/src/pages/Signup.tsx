import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoMarca, RamoFolhas } from '../components/Decoracoes'
import Footer from '../components/Footer'
import { traduzirErroAuth } from '../lib/authErrors'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    setCarregando(true)
    const { error, needsConfirmation } = await signUp({ email, password: senha, nome })
    setCarregando(false)

    if (error) {
      console.error('[Signup] Falha ao criar conta:', error)
      setErro(traduzirErroAuth(error.message))
      return
    }

    if (needsConfirmation) setSucesso(true)
    else navigate('/')
  }

  if (sucesso) {
    return (
      <div className="auth-shell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
        <div className="auth-card entra-suave">
          <RamoFolhas size={125} style={{ top: -22, left: -26 }} />
          <div className="auth-brand" style={{ display: 'flex', justifyContent: 'center' }}>
            <LogoMarca tamanho={72} direcao="coluna" />
          </div>
          <div className="auth-success">
            Conta criada! {' '}
            {`Verifique seu e-mail para confirmar o cadastro. `}
            Depois disso, sua conta ficará <strong>aguardando aprovação da administradora (Juliana Logato)</strong> antes
            de você poder acessar o aplicativo.
          </div>
          <div className="auth-switch">
            <Link to="/login">Ir para o login</Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="auth-shell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
      <div className="auth-card entra-suave">
        <RamoFolhas size={125} style={{ top: -22, left: -26 }} />
        <RamoFolhas size={100} style={{ bottom: -22, right: -22, transform: 'rotate(180deg)' }} />
        <div className="auth-brand" style={{ display: 'flex', justifyContent: 'center' }}>
          <LogoMarca tamanho={72} direcao="coluna" />
        </div>
        <div className="auth-sub">Crie sua conta e comece a organizar suas finanças com leveza.</div>

        {erro && <div className="auth-error">{erro}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="nome">Nome</label>
            <input id="nome" type="text" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={carregando} style={{ width: '100%', justifyContent: 'center' }}>
            {carregando ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <div className="auth-switch">
          Já tem conta? <Link to="/login">Entrar</Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
