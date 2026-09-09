// =============================================================
// Geração de CSV para Excel/Google Sheets em pt-BR.
//
// Decisões: separador ";" (o Excel em pt-BR usa vírgula como decimal),
// BOM UTF-8 (sem ele o Excel quebra acentos) e valores com vírgula
// decimal. Números continuam inteiros em centavos até aqui.
// =============================================================

export const SEPARADOR = ';'

/** 123456 -> '1234,56' (sem símbolo, para a planilha somar) */
export function centavosParaPlanilha(centavos: number): string {
  const sinal = centavos < 0 ? '-' : ''
  const abs = Math.abs(centavos)
  return `${sinal}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}

/** '2026-09-30' -> '30/09/2026'; vazio vira ''. */
export function dataParaPlanilha(data: string | null): string {
  if (!data) return ''
  const [a, m, d] = data.split('-')
  return `${d}/${m}/${a}`
}

/**
 * Escapa um campo: envolve em aspas se contiver separador, aspas ou
 * quebra de linha, e duplica as aspas internas (RFC 4180).
 */
export function escapar(valor: string): string {
  if (!/[";\r\n]/.test(valor)) return valor
  return `"${valor.replace(/"/g, '""')}"`
}

export function montarCsv(cabecalho: string[], linhas: string[][]): string {
  const corpo = [cabecalho, ...linhas]
    .map((l) => l.map(escapar).join(SEPARADOR))
    .join('\r\n')
  return '﻿' + corpo   // BOM: Excel só reconhece UTF-8 com ele
}
