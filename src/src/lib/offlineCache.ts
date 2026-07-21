const PREFIXO = 'lff_cache_'

function chave(table: string, userId: string) {
  return `${PREFIXO}${table}_${userId}`
}

/** Salva a última lista de linhas conhecida de uma tabela, para leitura offline. */
export function salvarCache<T>(table: string, userId: string, rows: T[]) {
  try {
    localStorage.setItem(chave(table, userId), JSON.stringify(rows))
  } catch {
    // localStorage cheio ou indisponível — falha silenciosa, não é crítico
  }
}

/** Lê a última lista conhecida de uma tabela (usado quando o app está offline). */
export function lerCache<T>(table: string, userId: string): T[] | null {
  try {
    const bruto = localStorage.getItem(chave(table, userId))
    return bruto ? (JSON.parse(bruto) as T[]) : null
  } catch {
    return null
  }
}
