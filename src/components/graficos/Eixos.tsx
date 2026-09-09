import { formatarCompetencia } from '../../lib/datas'
import { VIZ } from '../../lib/viz'

/** Rótulo de mês do eixo X: 'set' em vez de 'set/2026' quando cabe. */
export function rotuloMes(competencia: string, comAno = false): string {
  const t = formatarCompetencia(competencia)
  return comAno ? t : t.split('/')[0]
}

/**
 * Valor curto no eixo Y, em reais: 280000 centavos -> '2,8k'.
 * Curto de propósito: num eixo de 52px no celular, 'mil' por extenso
 * é cortado.
 */
export function rotuloValor(centavos: number): string {
  const reais = centavos / 100
  const abs = Math.abs(reais)
  if (abs >= 1_000_000) return `${(reais / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (abs >= 1000) return `${(reais / 1000).toFixed(abs >= 10_000 ? 0 : 1).replace('.', ',')}k`
  return String(Math.round(reais))
}

/** Largura do eixo Y que comporta '999,9k' sem cortar. */
export const LARGURA_EIXO_Y = 46

export const EIXO = { stroke: VIZ.eixo, fontSize: 11 }
export const GRADE = { stroke: VIZ.grade, strokeDasharray: '3 3' }
