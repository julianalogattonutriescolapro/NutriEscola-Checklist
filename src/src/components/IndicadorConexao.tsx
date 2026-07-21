import { useConexao } from '../lib/useConexao'

export default function IndicadorConexao() {
  const { online, pendencias, ultimaSincronizacao } = useConexao()

  if (online && !ultimaSincronizacao) return null

  if (!online) {
    return (
      <div className="offline-banner offline-banner--aviso" role="status">
        <span aria-hidden="true">📴</span>
        Modo Offline — suas alterações serão sincronizadas ao reconectar
        {pendencias > 0 && <span className="badge badge-gold" style={{ marginLeft: 8 }}>{pendencias} pendente(s)</span>}
      </div>
    )
  }

  if (ultimaSincronizacao) {
    return (
      <div className="offline-banner offline-banner--sucesso" role="status">
        <span aria-hidden="true">✓</span>
        {ultimaSincronizacao.sincronizadas} alteração(ões) sincronizada(s) com sucesso
        {ultimaSincronizacao.falhas > 0 && ` — ${ultimaSincronizacao.falhas} ainda pendente(s)`}
      </div>
    )
  }

  return null
}
