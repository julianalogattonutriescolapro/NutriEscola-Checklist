import { FlorPequena } from './Decoracoes'

export default function Footer() {
  return (
    <footer
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '18px 12px 6px',
        marginTop: 40,
        borderTop: '1px solid var(--border)',
        color: 'var(--ink-faint)',
        fontSize: 11.5,
        letterSpacing: '0.03em',
        textAlign: 'center'
      }}
    >
      <FlorPequena size={13} cor="var(--gold)" />
      <span>
        Criado por <strong style={{ fontWeight: 600, color: 'var(--ink-muted)' }}>Juliana Logato Consultoria e Assessoria</strong>
      </span>
      <FlorPequena size={13} cor="var(--rose)" />
    </footer>
  )
}
