import { centavosParaPlanilha, dataParaPlanilha, montarCsv } from './csv'

export type LinhaExportacao = {
  competencia: string
  vencimento: string
  data_compra: string
  descricao: string
  categoria: string
  grupo: string
  escopo: string
  metodo: string
  natureza: string
  cartao: string | null
  parcela: string
  valor: number
  status: string
  pago_em: string | null
  pago_por: string | null
}

const CABECALHO = [
  'Competência', 'Vencimento', 'Data da compra', 'Descrição', 'Categoria', 'Grupo',
  'Escopo', 'Método', 'Natureza', 'Cartão', 'Parcela', 'Valor', 'Status', 'Pago em', 'Pago por',
]

const ROTULO: Record<string, string> = {
  pessoal: 'Pessoal', compartilhado: 'Compartilhado',
  credito: 'Cartão de crédito', a_vista: 'Pix / Débito',
  saida: 'Saída', resgate: 'Resgate',
  despesa: 'Despesa', reserva: 'Reserva',
  pendente: 'Pendente', pago: 'Pago', cancelado: 'Cancelado',
}
const rotular = (v: string) => ROTULO[v] ?? v

/** Converte as linhas do banco no CSV pt-BR pronto para Excel/Sheets. */
export function montarCsvLancamentos(linhas: LinhaExportacao[]): string {
  return montarCsv(
    CABECALHO,
    linhas.map((l) => [
      dataParaPlanilha(l.competencia),
      dataParaPlanilha(l.vencimento),
      dataParaPlanilha(l.data_compra),
      l.descricao,
      l.categoria,
      rotular(l.grupo),
      rotular(l.escopo),
      rotular(l.metodo),
      rotular(l.natureza),
      l.cartao ?? '',
      l.parcela,
      centavosParaPlanilha(l.valor),
      rotular(l.status),
      dataParaPlanilha(l.pago_em),
      l.pago_por ?? '',
    ]),
  )
}

/** financas-pessoal-2026-09.csv | financas-consolidado-2026.csv */
export function nomeArquivo(visao: string, de: string, ate: string): string {
  const mesmoMes = de === ate
  const periodo = mesmoMes ? de.slice(0, 7) : de.slice(0, 4)
  return `financas-${visao}-${periodo}.csv`
}
