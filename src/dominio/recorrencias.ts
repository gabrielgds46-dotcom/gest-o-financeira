// =============================================================
// Planejamento de uma recorrência para uma competência.
// Puro e sem dependências: usado pelo app (fallback no primeiro acesso
// do mês) e pela Edge Function (cron). A regra de competência do cartão
// continua em calcularParcelas(); aqui só se decide a data de compra.
// =============================================================
import { calcularParcelas, type Parcela } from './parcelas'
import { diaNoMes, partes, primeiroDiaDoMes, type DataLocal } from './calendario'

export type RecorrenciaBase = {
  id: string
  tipo: 'despesa' | 'receita'
  metodo: 'credito' | 'a_vista' | null
  valor: number
  dia_vencimento: number
  inicio: DataLocal
  fim: DataLocal | null
}

export type CartaoBase = { dia_fechamento: number; dia_vencimento: number }

export type PlanoRecorrencia = {
  competencia: DataLocal
  /** Data em que a conta "acontece" no mês: o dia de vencimento da recorrência. */
  dataCompra: DataLocal
  /** Uma única parcela (recorrência nunca parcela). Vazio para receita. */
  parcelas: Parcela[]
}

/**
 * Decide o que a recorrência gera na competência.
 * Retorna null se a recorrência não vale para o mês (antes do início ou depois do fim).
 */
export function planejarRecorrencia(r: RecorrenciaBase, competencia: DataLocal, cartao: CartaoBase | null): PlanoRecorrencia | null {
  const comp = primeiroDiaDoMes(competencia)
  const { ano, mes } = partes(comp)
  const dataCompra = diaNoMes(ano, mes, r.dia_vencimento)

  // Vigência: começa no mês de `inicio`, termina no mês de `fim` (inclusive).
  if (primeiroDiaDoMes(r.inicio) > comp) return null
  if (r.fim && primeiroDiaDoMes(r.fim) < comp) return null

  if (r.tipo === 'receita') return { competencia: comp, dataCompra, parcelas: [] }

  if (!r.metodo) throw new Error(`Recorrência ${r.id} de despesa sem método`)
  if (r.metodo === 'credito' && !cartao) throw new Error(`Recorrência ${r.id} no crédito sem cartão`)

  const parcelas = calcularParcelas({
    dataCompra,
    valorTotalCentavos: r.valor,
    parcelasTotal: 1,
    metodo: r.metodo,
    diaFechamento: cartao?.dia_fechamento,
    diaVencimento: cartao?.dia_vencimento,
  })
  return { competencia: comp, dataCompra, parcelas }
}
