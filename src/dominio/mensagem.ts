// =============================================================
// O texto da notificação de segunda.
//
// Vive aqui, e não dentro da Edge Function, porque é a parte que mais
// vai mudar de ideia — e a única maneira de julgar uma notificação é
// lendo as várias que ela pode virar, lado a lado, num teste.
//
// ZERO dependências: é copiada para a Edge Function (Deno) como os
// outros módulos de domínio.
// =============================================================

export type DadosSemana = {
  gasto: number
  gastoAnterior: number
  variacao: number | null
  topNome: string | null
  topValor: number | null
  venceValor: number
  venceQtd: number
}

export type Mensagem = { titulo: string; corpo: string }

/** Abaixo disto, comparar em porcentagem não diz nada. Ver descreverVariacao. */
const BASE_MINIMA = 5000   // R$ 50,00

/**
 * A comparação com a semana passada, em palavras.
 *
 * Porcentagem só funciona quando a base é razoável. Numa semana em que
 * saíram R$ 35, qualquer gasto normal vira "1223% a mais" — que numa tela
 * de bloqueio lê como alarme, não como informação. Então:
 *
 *   base minúscula      -> diz os dois valores e pronto
 *   dobrou ou mais      -> diz em vezes ("13x a semana passada")
 *   variação normal     -> porcentagem, que é o que a pessoa espera
 *
 * Devolve null quando não há o que comparar.
 */
export function descreverVariacao(gasto: number, anterior: number, variacao: number | null): string | null {
  if (variacao === null || anterior <= 0 || gasto <= 0) return null

  if (anterior < BASE_MINIMA) return `contra ${reais(anterior)} na passada`

  const pct = Math.round(Math.abs(variacao) * 100)
  if (pct === 0) return 'igual à semana passada'

  if (variacao >= 1) {
    const vezes = gasto / anterior
    const texto = vezes >= 10 ? String(Math.round(vezes)) : vezes.toFixed(1).replace('.', ',')
    return `${texto}x a semana passada`
  }

  return `${pct}% ${variacao > 0 ? 'a mais' : 'a menos'} que na passada`
}

/**
 * Regra: o TÍTULO diz o fato, o CORPO diz o que fazer com ele. Nada de
 * "Olá! 👋 Seu resumo chegou" — a pessoa lê o título na tela de bloqueio
 * e decide ali se abre. Um título sem número não vale a interrupção.
 */
export function montarMensagem(nome: string, d: DadosSemana): Mensagem {
  const primeiro = nome.trim().split(' ')[0] || 'Oi'

  if (d.gasto === 0 && d.venceQtd === 0) {
    return {
      titulo: `${primeiro}, semana sem movimento`,
      corpo: 'Nada saiu e nada vence nos próximos sete dias.',
    }
  }

  const titulo = d.gasto === 0
    ? `${primeiro}, nada saiu esta semana`
    : `Saíram ${reais(d.gasto)} nesta semana`

  const partes: string[] = []

  const comparacao = descreverVariacao(d.gasto, d.gastoAnterior, d.variacao)
  if (comparacao) partes.push(comparacao)

  if (d.topNome && d.topValor !== null && d.gasto > 0) {
    partes.push(`${d.topNome} levou ${reais(d.topValor)}`)
  }

  if (d.venceQtd > 0) {
    partes.push(`${reais(d.venceValor)} vencem em ${d.venceQtd === 1 ? '1 conta' : `${d.venceQtd} contas`}`)
  }

  return { titulo, corpo: maiuscula(partes.join(' · ')) }
}

function reais(centavos: number): string {
  const n = (centavos / 100).toFixed(2).replace('.', ',')
  return `R$ ${n.replace(/\B(?=(\d{3})+(?!\d),)/g, '.')}`
}

function maiuscula(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
