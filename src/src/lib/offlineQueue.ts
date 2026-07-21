import { supabase } from './supabaseClient'

const CHAVE = 'lff_fila_offline'

interface OperacaoPendente {
  table: string
  tipo: 'insert' | 'update' | 'delete'
  id?: string
  valores?: Record<string, unknown>
}

function lerFila(): OperacaoPendente[] {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? JSON.parse(bruto) : []
  } catch {
    return []
  }
}

function salvarFila(fila: OperacaoPendente[]) {
  localStorage.setItem(CHAVE, JSON.stringify(fila))
}

export function enfileirarOperacao(op: OperacaoPendente) {
  const fila = lerFila()
  fila.push(op)
  salvarFila(fila)
  window.dispatchEvent(new CustomEvent('lff:fila-atualizada', { detail: { tamanho: fila.length } }))
}

export function tamanhoFilaOffline(): number {
  return lerFila().length
}

/** Reenvia todas as operações pendentes ao Supabase, em ordem, e limpa a fila. */
export async function sincronizarFilaOffline(): Promise<{ sincronizadas: number; falhas: number }> {
  const fila = lerFila()
  if (fila.length === 0) return { sincronizadas: 0, falhas: 0 }

  let sincronizadas = 0
  let falhas = 0
  const restantes: OperacaoPendente[] = []

  for (const op of fila) {
    try {
      if (op.tipo === 'insert') {
        const { error } = await supabase.from(op.table).insert([op.valores || {}] as never)
        if (error) throw error
      } else if (op.tipo === 'update' && op.id) {
        const { error } = await supabase.from(op.table).update((op.valores || {}) as never).eq('id', op.id)
        if (error) throw error
      } else if (op.tipo === 'delete' && op.id) {
        const { error } = await supabase.from(op.table).delete().eq('id', op.id)
        if (error) throw error
      }
      sincronizadas++
    } catch {
      falhas++
      restantes.push(op)
    }
  }

  salvarFila(restantes)
  window.dispatchEvent(new CustomEvent('lff:sincronizado', { detail: { sincronizadas, falhas, restantes: restantes.length } }))
  return { sincronizadas, falhas }
}

/** Registra os listeners de sincronização automática ao voltar a conexão. Chame uma vez no App. */
export function iniciarSincronizacaoAutomatica() {
  window.addEventListener('online', () => {
    sincronizarFilaOffline()
  })
  if (navigator.onLine) sincronizarFilaOffline()
}
