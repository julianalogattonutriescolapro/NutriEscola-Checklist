export type TipoCategoria = 'receita' | 'despesa'

export interface Categoria {
  id: string
  user_id: string
  nome: string
  tipo: TipoCategoria
  cor: string
  created_at: string
}

export type StatusReceita = 'recebido' | 'pendente'

export interface Receita {
  id: string
  user_id: string
  categoria_id: string | null
  descricao: string
  valor: number
  data: string
  recorrente: boolean
  status: StatusReceita
  observacoes: string | null
  created_at: string
  categorias?: Pick<Categoria, 'nome' | 'cor'> | null
}

export type SituacaoDespesa = 'paga' | 'pendente'
export type FormaPagamento =
  | 'dinheiro'
  | 'dinheiro_fisico'
  | 'pix'
  | 'debito'
  | 'credito'
  | 'transferencia'
  | 'outro'

export interface Despesa {
  id: string
  user_id: string
  categoria_id: string | null
  descricao: string
  valor: number
  data: string
  data_vencimento: string | null
  observacoes: string | null
  recorrente: boolean
  situacao: SituacaoDespesa
  forma_pagamento: FormaPagamento
  cartao_nome: string | null
  cartao_vencimento: string | null
  created_at: string
  categorias?: Pick<Categoria, 'nome' | 'cor'> | null
}

export interface ReservaFinanceira {
  id: string
  user_id: string
  nome: string
  valor_guardado: number
  objetivo: string | null
  observacoes: string | null
  created_at: string
}

export type TipoAlerta = 'vencimento' | 'saldo_baixo' | 'resumo_mes' | 'contas_pendentes'

export interface Alerta {
  id: string
  user_id: string
  tipo: TipoAlerta
  titulo: string
  mensagem: string
  referencia_id: string | null
  disparar_em: string
  lido: boolean
  created_at: string
}

export type StatusAprovacao = 'pendente' | 'aprovado' | 'recusado'

export interface Usuario {
  id: string
  nome: string
  email: string
  avatar_url: string | null
  admin: boolean
  status_aprovacao: StatusAprovacao
  created_at: string
  updated_at: string
}
