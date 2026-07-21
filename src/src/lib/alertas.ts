import { supabase } from './supabaseClient'
import type { Despesa, Receita, Alerta } from '../types/database'
import { calcularResumoMensal } from './inteligencia'
import { formatMoeda } from './format'

/** Horário em que os alertas de vencimento "nascem" (12h20 do dia anterior). */
const HORA_ALERTA = { horas: 12, minutos: 20 }

function dataComHorarioDoAlerta(dataBase: Date): string {
  const d = new Date(dataBase)
  d.setHours(HORA_ALERTA.horas, HORA_ALERTA.minutos, 0, 0)
  return d.toISOString()
}

/**
 * Analisa as despesas/receitas do usuário e monta a lista de alertas que
 * deveriam existir. Não grava nada — apenas calcula.
 */
export function montarAlertasSugeridos(userId: string, despesas: Despesa[], receitas: Receita[]): Omit<Alerta, 'id' | 'created_at'>[] {
  const sugeridos: Omit<Alerta, 'id' | 'created_at'>[] = []

  // 1) Vencimentos: um alerta às 12h20 do dia anterior ao vencimento de cada despesa pendente
  despesas
    .filter((d) => d.situacao === 'pendente' && d.data_vencimento)
    .forEach((d) => {
      const vencimento = new Date(d.data_vencimento + 'T00:00:00')
      const diaAnterior = new Date(vencimento)
      diaAnterior.setDate(diaAnterior.getDate() - 1)

      sugeridos.push({
        user_id: userId,
        tipo: 'vencimento',
        titulo: `Amanhã vence: ${d.descricao}`,
        mensagem: `A conta "${d.descricao}" no valor de ${formatMoeda(d.valor)} vence amanhã.`,
        referencia_id: d.id,
        disparar_em: dataComHorarioDoAlerta(diaAnterior),
        lido: false
      })
    })

  // 2) Resumo do mês / saldo baixo / contas pendentes — recalculados diariamente
  const resumo = calcularResumoMensal(receitas, despesas)
  const hoje = new Date()

  if (resumo.dinheiroRestante < 0) {
    sugeridos.push({
      user_id: userId,
      tipo: 'saldo_baixo',
      titulo: 'O dinheiro não será suficiente este mês',
      mensagem: `Suas despesas previstas (${formatMoeda(resumo.totalDespesasPagas + resumo.totalDespesasPendentes)}) superam suas receitas previstas (${formatMoeda(resumo.totalReceitasRecebidas + resumo.totalReceitasPrevistas)}).`,
      referencia_id: null,
      disparar_em: dataComHorarioDoAlerta(hoje),
      lido: false
    })
  } else if (resumo.totalReceitasRecebidas > 0 && resumo.totalDespesasPagas / resumo.totalReceitasRecebidas > 0.8) {
    sugeridos.push({
      user_id: userId,
      tipo: 'saldo_baixo',
      titulo: 'Você já usou grande parte da sua renda',
      mensagem: `Você já comprometeu ${Math.round((resumo.totalDespesasPagas / resumo.totalReceitasRecebidas) * 100)}% do que recebeu este mês.`,
      referencia_id: null,
      disparar_em: dataComHorarioDoAlerta(hoje),
      lido: false
    })
  }

  if (resumo.contasPendentes > 0) {
    sugeridos.push({
      user_id: userId,
      tipo: 'contas_pendentes',
      titulo: `${resumo.contasPendentes} conta(s) ainda não foram pagas`,
      mensagem: `Você tem ${resumo.contasPendentes} despesa(s) pendente(s) somando ${formatMoeda(resumo.totalDespesasPendentes)}.`,
      referencia_id: null,
      disparar_em: dataComHorarioDoAlerta(hoje),
      lido: false
    })
  }

  return sugeridos
}

/**
 * Garante que os alertas sugeridos existam no banco (evita duplicar pelos
 * mesmos tipo + referência + dia). Chame ao carregar o Painel/Alertas.
 */
export async function sincronizarAlertas(userId: string, despesas: Despesa[], receitas: Receita[]) {
  if (!navigator.onLine) return
  const sugeridos = montarAlertasSugeridos(userId, despesas, receitas)
  if (sugeridos.length === 0) return

  const { data: existentes } = await supabase
    .from('alertas')
    .select('tipo, referencia_id, disparar_em')
    .eq('user_id', userId)

  const chave = (a: { tipo: string; referencia_id: string | null; disparar_em: string }) =>
    `${a.tipo}|${a.referencia_id || ''}|${a.disparar_em.slice(0, 10)}`

  const existentesSet = new Set((existentes || []).map(chave))
  const novos = sugeridos.filter((s) => !existentesSet.has(chave(s)))

  if (novos.length > 0) {
    await supabase.from('alertas').insert(novos)
  }
}
