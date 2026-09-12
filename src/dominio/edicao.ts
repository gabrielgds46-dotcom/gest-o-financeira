// =============================================================
// Edição de um lançamento já existente.
//
// A regra que governa tudo: PARCELA PAGA É HISTÓRICO e nunca muda.
// Disso saem duas situações bem diferentes:
//
//   Nada pago  -> o lançamento é replanejado do zero com
//                 calcularParcelas(). Data, cartão, parcelas, tudo livre.
//
//   Algo pago  -> data de compra, cartão e número de parcelas ficam
//                 travados (mexer neles moveria a competência de uma
//                 parcela já quitada). Só o valor total muda, e a
//                 diferença é redistribuída entre as parcelas que
//                 ainda não venceram, mantendo competência e vencimento.
// =============================================================
import { dividirCentavos, type Parcela } from './parcelas'
import type { DataLocal } from './calendario'

export type StatusParcela = 'pendente' | 'pago' | 'cancelado'

export type ParcelaExistente = {
  id: string
  numero: number
  valorCentavos: number
  competencia: DataLocal
  vencimento: DataLocal
  status: StatusParcela
}

/** Parcela que já saiu do caixa: não se toca. */
export const ehIntocavel = (p: ParcelaExistente) => p.status === 'pago'

export const temCancelada = (parcelas: ParcelaExistente[]) => parcelas.some((p) => p.status === 'cancelado')

/**
 * Com parcela cancelada, o valor total fica travado.
 *
 * Não é regra de tela: o trigger fn_valida_soma_parcelas (001_schema.sql)
 * exige que a soma de TODAS as parcelas — canceladas inclusive — seja igual
 * a valor_total. Redistribuir só entre as pendentes deixaria o valor da
 * cancelada sobrando, e a transação seria recusada no commit.
 * Descrição, categoria e natureza continuam livres.
 */
export function podeMudarValor(parcelas: ParcelaExistente[]): boolean {
  return !temCancelada(parcelas)
}

export type PlanoEdicao = {
  /** Parcelas que precisam de UPDATE: id + novo valor. */
  ajustes: Array<{ id: string; valorCentavos: number }>
  /** Quanto foi redistribuído entre as pendentes. */
  restante: number
}

/**
 * Redistribui um novo valor total entre as parcelas ainda não pagas.
 * Lança se o novo total não cobre o que já foi pago.
 */
export function replanejarComPagas(parcelas: ParcelaExistente[], novoValorTotal: number): PlanoEdicao {
  if (!Number.isInteger(novoValorTotal) || novoValorTotal <= 0) {
    throw new Error('Valor total deve ser um inteiro positivo em centavos.')
  }

  const pagas = parcelas.filter(ehIntocavel)
  const abertas = parcelas.filter((p) => p.status === 'pendente').sort((a, b) => a.numero - b.numero)
  const somaPagas = pagas.reduce((s, p) => s + p.valorCentavos, 0)

  if (abertas.length === 0) {
    if (novoValorTotal !== somaPagas) {
      throw new Error('Todas as parcelas já foram pagas. O valor total não pode mudar.')
    }
    return { ajustes: [], restante: 0 }
  }

  const restante = novoValorTotal - somaPagas
  if (restante <= 0) {
    throw new Error(
      `O novo valor precisa ser maior que o já pago (${(somaPagas / 100).toFixed(2).replace('.', ',')}).`,
    )
  }

  const valores = dividirCentavos(restante, abertas.length)
  return {
    ajustes: abertas.map((p, i) => ({ id: p.id, valorCentavos: valores[i] })),
    restante,
  }
}

/** Só dá para apagar de vez enquanto nada saiu do caixa. */
export function podeExcluir(parcelas: ParcelaExistente[], mesFechado: boolean): boolean {
  return !mesFechado && !parcelas.some(ehIntocavel)
}

/**
 * Com parcela paga ou cancelada, mexer em data, cartão ou número de parcelas
 * moveria o passado. Só um lançamento inteiramente em aberto se replaneja.
 */
export function podeReplanejar(parcelas: ParcelaExistente[]): boolean {
  return !parcelas.some(ehIntocavel) && !temCancelada(parcelas)
}

/** Casa o plano novo (do motor) com as parcelas existentes, para o UPDATE. */
export function casarComExistentes(novas: Parcela[], existentes: ParcelaExistente[]): Array<{
  id: string | null
  numero: number
  valorCentavos: number
  competencia: DataLocal
  vencimento: DataLocal
}> {
  const porNumero = new Map(existentes.map((p) => [p.numero, p]))
  return novas.map((n) => ({
    id: porNumero.get(n.numero)?.id ?? null,
    numero: n.numero,
    valorCentavos: n.valorCentavos,
    competencia: n.competencia,
    vencimento: n.vencimento,
  }))
}
