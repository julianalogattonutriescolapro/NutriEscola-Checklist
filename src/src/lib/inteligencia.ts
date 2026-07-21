import type { Receita, Despesa } from '../types/database'

export interface ResumoMensal {
  totalReceitasRecebidas: number
  totalReceitasPrevistas: number
  totalDespesasPagas: number
  totalDespesasPendentes: number
  saldoDisponivel: number
  dinheiroRestante: number
  contasPagas: number
  contasPendentes: number
  maiorGasto: Despesa | null
  categoriaQueMaisConsome: { nome: string; total: number } | null
  suficienteParaOMes: boolean
}

/** Calcula o resumo financeiro do mês corrente a partir de todas as receitas e despesas do usuário. */
export function calcularResumoMensal(
  receitas: Receita[],
  despesas: Despesa[],
  mesISO: string = new Date().toISOString().slice(0, 7)
): ResumoMensal {
  const receitasDoMes = receitas.filter((r) => r.data?.slice(0, 7) === mesISO)
  const despesasDoMes = despesas.filter((d) => d.data?.slice(0, 7) === mesISO)

  const totalReceitasRecebidas = receitasDoMes.filter((r) => r.status === 'recebido').reduce((a, r) => a + Number(r.valor), 0)
  const totalReceitasPrevistas = receitasDoMes.filter((r) => r.status === 'pendente').reduce((a, r) => a + Number(r.valor), 0)
  const totalDespesasPagas = despesasDoMes.filter((d) => d.situacao === 'paga').reduce((a, d) => a + Number(d.valor), 0)
  const totalDespesasPendentes = despesasDoMes.filter((d) => d.situacao === 'pendente').reduce((a, d) => a + Number(d.valor), 0)

  const saldoDisponivel = totalReceitasRecebidas - totalDespesasPagas
  const dinheiroRestante = totalReceitasRecebidas + totalReceitasPrevistas - totalDespesasPagas - totalDespesasPendentes

  const contasPagas = despesasDoMes.filter((d) => d.situacao === 'paga').length
  const contasPendentes = despesasDoMes.filter((d) => d.situacao === 'pendente').length

  const maiorGasto = despesasDoMes.length
    ? despesasDoMes.reduce((maior, atual) => (Number(atual.valor) > Number(maior.valor) ? atual : maior))
    : null

  const porCategoria: Record<string, { nome: string; total: number }> = {}
  despesasDoMes.forEach((d) => {
    const nome = d.categorias?.nome || 'Sem categoria'
    if (!porCategoria[nome]) porCategoria[nome] = { nome, total: 0 }
    porCategoria[nome].total += Number(d.valor)
  })
  const categoriaQueMaisConsome = Object.values(porCategoria).sort((a, b) => b.total - a.total)[0] || null

  const suficienteParaOMes = totalReceitasRecebidas + totalReceitasPrevistas >= totalDespesasPagas + totalDespesasPendentes

  return {
    totalReceitasRecebidas,
    totalReceitasPrevistas,
    totalDespesasPagas,
    totalDespesasPendentes,
    saldoDisponivel,
    dinheiroRestante,
    contasPagas,
    contasPendentes,
    maiorGasto,
    categoriaQueMaisConsome,
    suficienteParaOMes
  }
}

/** Retorna despesas pendentes com vencimento nos próximos `dias` dias (ou já vencidas). */
export function proximosVencimentos(despesas: Despesa[], dias = 7): Despesa[] {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const limite = new Date(hoje); limite.setDate(limite.getDate() + dias)
  return despesas
    .filter((d) => d.situacao === 'pendente' && d.data_vencimento)
    .filter((d) => new Date(d.data_vencimento + 'T00:00:00') <= limite)
    .sort((a, b) => (a.data_vencimento! < b.data_vencimento! ? -1 : 1))
}
