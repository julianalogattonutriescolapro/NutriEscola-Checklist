import { useAuth } from '../context/AuthContext'
import { LogoMarca, RamoFolhas } from '../components/Decoracoes'
import Footer from '../components/Footer'

export default function AguardandoAprovacao() {
  const { signOut, perfil, statusAprovacao, recarregarPerfil } = useAuth()

  const recusado = statusAprovacao === 'recusado'

  return (
    <div className="auth-shell" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
      <div className="auth-card entra-suave" style={{ textAlign: 'center' }}>
        <RamoFolhas size={125} style={{ top: -22, left: -26 }} />
        <RamoFolhas size={100} style={{ bottom: -22, right: -22, transform: 'rotate(180deg)' }} />
        <div className="auth-brand" style={{ display: 'flex', justifyContent: 'center' }}>
          <LogoMarca tamanho={72} direcao="coluna" />
        </div>

        {recusado ? (
          <>
            <div className="auth-error" style={{ marginTop: 20 }}>
              Seu acesso não foi autorizado pela administradora.
            </div>
            <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>
              Se você acredita que isso é um engano, entre em contato com Juliana Logato Consultoria e Assessoria.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40, margin: '18px 0 4px' }}>⏳</div>
            <h2 style={{ marginBottom: 10 }}>Aguardando aprovação</h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 4 }}>
              Olá{perfil?.nome ? `, ${perfil.nome}` : ''}! Sua conta foi criada com sucesso.
            </p>
            <p style={{ color: 'var(--ink-muted)', fontSize: 14, marginBottom: 20 }}>
              Antes de acessar o aplicativo, a administradora <strong>Juliana Logato</strong> precisa autorizar seu
              cadastro. Você receberá acesso assim que ela aprovar.
            </p>
            <button className="btn btn-secondary" onClick={() => recarregarPerfil()}>Já fui aprovado(a)? Verificar novamente</button>
          </>
        )}

        <div style={{ marginTop: 22 }}>
          <button className="btn btn-ghost" onClick={signOut}>Sair</button>
        </div>
      </div>
      <Footer />
    </div>
  )
}
