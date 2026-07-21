import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from '../context/AuthContext'
import { enfileirarOperacao } from './offlineQueue'
import { salvarCache, lerCache } from './offlineCache'

interface UseEntityOptions {
  select?: string
  orderBy?: string
  ascending?: boolean
}

export function useEntity<T extends { id: string }>(table: string, opts: UseEntityOptions = {}) {
  const { user } = useAuth()
  const { select = '*', orderBy = 'created_at', ascending = false } = opts

  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offline, setOffline] = useState(!navigator.onLine)

  const reload = useCallback(async () => {
    if (!user) return
    setLoading(true)

    if (!navigator.onLine) {
      // Sem internet: mostra a última versão conhecida em vez de deixar a tela vazia
      const cache = lerCache<T>(table, user.id)
      setRows(cache || [])
      setOffline(true)
      setLoading(false)
      return
    }

    setOffline(false)
    const { data, error: err } = await supabase
      .from(table)
      .select(select)
      .eq('user_id', user.id)
      .order(orderBy, { ascending })
    if (err) {
      setError(err.message)
      // Falhou mesmo "online" (ex: perdeu sinal no meio da requisição) — cai para o cache
      const cache = lerCache<T>(table, user.id)
      if (cache) setRows(cache)
    } else {
      const dados = (data as unknown as T[]) || []
      setRows(dados)
      salvarCache(table, user.id, dados)
    }
    setLoading(false)
  }, [table, select, orderBy, ascending, user])

  useEffect(() => {
    reload()
    const aoVoltarOnline = () => reload()
    const aoFicarOffline = () => setOffline(true)
    window.addEventListener('online', aoVoltarOnline)
    window.addEventListener('offline', aoFicarOffline)
    return () => {
      window.removeEventListener('online', aoVoltarOnline)
      window.removeEventListener('offline', aoFicarOffline)
    }
  }, [reload])

  async function create(values: Partial<T>) {
    if (!user) return { error: { message: 'Usuário não autenticado.' } }
    if (!navigator.onLine) {
      enfileirarOperacao({ table, tipo: 'insert', valores: { ...values, user_id: user.id } })
      const novasLinhas = [{ ...(values as T), id: 'offline-' + Date.now(), user_id: user.id } as unknown as T, ...rows]
      setRows(novasLinhas)
      salvarCache(table, user.id, novasLinhas)
      return { error: null }
    }
    const { error: err } = await supabase.from(table).insert([{ ...values, user_id: user.id }] as never)
    if (err) return { error: err }
    await reload()
    return { error: null }
  }

  async function update(id: string, values: Partial<T>) {
    if (!user) return { error: { message: 'Usuário não autenticado.' } }
    if (!navigator.onLine) {
      enfileirarOperacao({ table, tipo: 'update', id, valores: values as Record<string, unknown> })
      const novasLinhas = rows.map((r) => (r.id === id ? { ...r, ...values } : r))
      setRows(novasLinhas)
      salvarCache(table, user.id, novasLinhas)
      return { error: null }
    }
    const { error: err } = await supabase.from(table).update(values as never).eq('id', id).eq('user_id', user.id)
    if (err) return { error: err }
    await reload()
    return { error: null }
  }

  async function remove(id: string) {
    if (!user) return { error: { message: 'Usuário não autenticado.' } }
    if (!navigator.onLine) {
      enfileirarOperacao({ table, tipo: 'delete', id })
      const novasLinhas = rows.filter((r) => r.id !== id)
      setRows(novasLinhas)
      salvarCache(table, user.id, novasLinhas)
      return { error: null }
    }
    const { error: err } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id)
    if (err) return { error: err }
    await reload()
    return { error: null }
  }

  return { rows, loading, error, offline, reload, create, update, remove }
}
