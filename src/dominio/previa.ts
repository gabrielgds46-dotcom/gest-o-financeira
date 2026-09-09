import type { Parcela } from './parcelas'
import { formatarCompetencia, formatarMoeda } from './formatos'

/**
 * Texto da prévia obrigatória na tela Lançar:
 * "12x de R$ 99,99 — de out/2026 a set/2027"
 * "1x de R$ 120,00 — set/2026"
 * Quando as parcelas não são iguais (ajuste de centavo), mostra a faixa.
 */
export function descreverParcelamento(parcelas: Parcela[]): string {
  if (parcelas.length === 0) return ''
  const primeira = parcelas[0]
  const ultima = parcelas[parcelas.length - 1]
  const n = parcelas.length
  const valores = new Set(parcelas.map((p) => p.valorCentavos))
  const valor =
    valores.size === 1
      ? formatarMoeda(primeira.valorCentavos)
      : `${formatarMoeda(Math.min(...valores))} a ${formatarMoeda(Math.max(...valores))}`
  const periodo =
    n === 1
      ? formatarCompetencia(primeira.competencia)
      : `de ${formatarCompetencia(primeira.competencia)} a ${formatarCompetencia(ultima.competencia)}`
  return `${n}x de ${valor} — ${periodo}`
}
