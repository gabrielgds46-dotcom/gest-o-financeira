// =============================================================
// Motor de competência. Coração do app.
//
// Função PURA: não lê relógio, não lê banco, não conhece React.
// A regra vive só aqui (nunca reimplementar em PL/pgSQL — o SQL apenas
// persiste o que esta função calcula; ver 004_rpc.sql).
// =============================================================
import {
  type DataLocal,
  compararDatas,
  dataLocalDe,
  diaNoMes,
  ehDataLocal,
  montar,
  partes,
  somarMeses,
} from './calendario.ts'

export type Metodo = 'credito' | 'a_vista'

export type EntradaParcelas = {
  /** Instante (Date) ou data civil 'yyyy-MM-dd'. Date é convertido em America/Sao_Paulo. */
  dataCompra: Date | DataLocal
  valorTotalCentavos: number
  parcelasTotal: number
  metodo: Metodo
  diaFechamento?: number
  diaVencimento?: number
}

export type Parcela = {
  numero: number
  valorCentavos: number
  /** Dia 1 do mês da fatura, 'yyyy-MM-dd'. */
  competencia: DataLocal
  vencimento: DataLocal
}

export const PARCELAS_MAX = 60

/**
 * Divide `total` em `n` inteiros cuja soma é EXATAMENTE `total`.
 * As primeiras `resto` parcelas levam 1 centavo a mais.
 * 119.999 em 12x -> 11 × 10.000 + 1 × 9.999.
 */
export function dividirCentavos(total: number, n: number): number[] {
  const base = Math.floor(total / n)
  const resto = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0))
}

export function calcularParcelas(entrada: EntradaParcelas): Parcela[] {
  const { valorTotalCentavos, parcelasTotal, metodo } = entrada

  if (!Number.isInteger(valorTotalCentavos) || valorTotalCentavos <= 0) {
    throw new Error('Valor total deve ser um inteiro positivo em centavos.')
  }
  if (!Number.isInteger(parcelasTotal) || parcelasTotal < 1 || parcelasTotal > PARCELAS_MAX) {
    throw new Error(`Número de parcelas deve estar entre 1 e ${PARCELAS_MAX}.`)
  }

  const dataCompra: DataLocal =
    entrada.dataCompra instanceof Date ? dataLocalDe(entrada.dataCompra) : entrada.dataCompra
  if (!ehDataLocal(dataCompra)) throw new Error(`Data de compra inválida: ${String(entrada.dataCompra)}`)

  const { ano, mes } = partes(dataCompra)

  // ---------- À vista: sai na hora, sempre 1 parcela ----------
  if (metodo === 'a_vista') {
    if (parcelasTotal !== 1) throw new Error('Pagamento à vista não pode ser parcelado.')
    return [{ numero: 1, valorCentavos: valorTotalCentavos, competencia: montar(ano, mes, 1), vencimento: dataCompra }]
  }

  // ---------- Crédito ----------
  const { diaFechamento, diaVencimento } = entrada
  if (!ehDiaDoMes(diaFechamento) || !ehDiaDoMes(diaVencimento)) {
    throw new Error('Cartão de crédito exige dia de fechamento e de vencimento (1 a 31).')
  }

  // Fechamento do mês da compra, encolhido se o dia não existir (31 em fev -> 28).
  const fechamento = diaNoMes(ano, mes, diaFechamento)
  // Compra até o fechamento (inclusive) cai na fatura corrente; depois, na seguinte.
  const base = compararDatas(dataCompra, fechamento) <= 0 ? { ano, mes } : somarMeses(ano, mes, 1)

  const valores = dividirCentavos(valorTotalCentavos, parcelasTotal)

  return valores.map((valorCentavos, i) => {
    const comp = somarMeses(base.ano, base.mes, i)
    // Fecha 28 / vence 5: a fatura de setembro vence em 05/10.
    const venc = diaVencimento < diaFechamento ? somarMeses(comp.ano, comp.mes, 1) : comp
    return {
      numero: i + 1,
      valorCentavos,
      competencia: montar(comp.ano, comp.mes, 1),
      vencimento: diaNoMes(venc.ano, venc.mes, diaVencimento),
    }
  })
}

function ehDiaDoMes(v: unknown): v is number {
  return Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 31
}
