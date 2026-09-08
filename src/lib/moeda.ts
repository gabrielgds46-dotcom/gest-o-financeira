// Dinheiro é SEMPRE inteiro em centavos. Formatação só na borda da UI.

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** 123456 -> 'R$ 1.234,56' */
export function formatarMoeda(centavos: number): string {
  if (!Number.isInteger(centavos)) throw new Error(`Valor em centavos deve ser inteiro: ${centavos}`)
  // Intl usa espaço não separável (U+00A0) entre R$ e o número; normalizamos para
  // espaço comum, que é o que aparece na especificação e é mais fácil de testar.
  return fmt.format(centavos / 100).replace(/ /g, ' ')
}

/**
 * Interpreta o que o usuário digitou num campo de moeda. Aceita
 * 'R$ 1.234,56', '1234,56', '1234.56', '1234' e strings só com dígitos
 * (máscara de caixa: '123456' -> 1234,56). Retorna null se não parsear.
 */
export function interpretarMoeda(texto: string): number | null {
  const limpo = texto.replace(/[R$\s]/g, '')
  if (!limpo) return null
  if (/^\d+$/.test(limpo)) return Number(limpo) // máscara: tudo dígito => centavos
  // '1234.56' (ponto único, 1-2 casas, sem vírgula) é decimal no estilo teclado
  // numérico do iOS. Qualquer outro ponto é separador de milhar pt-BR.
  const normalizado = /^\d+\.\d{1,2}$/.test(limpo)
    ? limpo
    : limpo.replace(/\./g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null
  return Math.round(Number(normalizado) * 100)
}
