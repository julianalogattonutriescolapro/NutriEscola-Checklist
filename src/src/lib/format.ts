export function formatMoeda(valor: number | string | null | undefined): string {
  const numero = Number(valor || 0)
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatData(data: string | null | undefined): string {
  if (!data) return '—'
  const d = new Date(data.length > 10 ? data : data + 'T00:00:00')
  return d.toLocaleDateString('pt-BR')
}

export function formatDataHora(data: string | null | undefined): string {
  if (!data) return '—'
  const d = new Date(data)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function mesAtualISO(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
export const NOMES_MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function formatMesAno(chaveISO: string): string {
  if (!chaveISO) return ''
  const [ano, mes] = chaveISO.split('-')
  return `${NOMES_MESES_ABREV[Number(mes) - 1]}/${ano.slice(2)}`
}

export function diasAteVencimento(dataVencimento: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const venc = new Date(dataVencimento + 'T00:00:00')
  return Math.round((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}
