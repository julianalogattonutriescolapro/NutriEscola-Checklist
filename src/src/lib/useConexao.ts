import { useEffect, useState } from 'react'
import { tamanhoFilaOffline } from './offlineQueue'

interface StatusSincronizacao {
  sincronizadas: number
  falhas: number
}

export function useConexao() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pendencias, setPendencias] = useState(tamanhoFilaOffline())
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<StatusSincronizacao | null>(null)

  useEffect(() => {
    function aoFicarOnline() { setOnline(true) }
    function aoFicarOffline() { setOnline(false) }
    function aoAtualizarFila(e: Event) {
      const detalhe = (e as CustomEvent<{ tamanho: number }>).detail
      setPendencias(detalhe?.tamanho ?? tamanhoFilaOffline())
    }
    function aoSincronizar(e: Event) {
      const detalhe = (e as CustomEvent<StatusSincronizacao & { restantes: number }>).detail
      setPendencias(detalhe?.restantes ?? 0)
      if (detalhe && detalhe.sincronizadas > 0) {
        setUltimaSincronizacao({ sincronizadas: detalhe.sincronizadas, falhas: detalhe.falhas })
        setTimeout(() => setUltimaSincronizacao(null), 5000)
      }
    }

    window.addEventListener('online', aoFicarOnline)
    window.addEventListener('offline', aoFicarOffline)
    window.addEventListener('lff:fila-atualizada', aoAtualizarFila)
    window.addEventListener('lff:sincronizado', aoSincronizar)

    return () => {
      window.removeEventListener('online', aoFicarOnline)
      window.removeEventListener('offline', aoFicarOffline)
      window.removeEventListener('lff:fila-atualizada', aoAtualizarFila)
      window.removeEventListener('lff:sincronizado', aoSincronizar)
    }
  }, [])

  return { online, pendencias, ultimaSincronizacao }
}
