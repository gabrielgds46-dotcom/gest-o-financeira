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

  if (d.variacao !== null && d.gasto > 0) {
    const pct = Math.round(Math.abs(d.variacao) * 100)
    if (pct === 0) partes.push('igual à semana passada')
    else partes.push(`${pct}% ${d.variacao > 0 ? 'a mais' : 'a menos'} que na passada`)
  }

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
