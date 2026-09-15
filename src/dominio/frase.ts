// =============================================================
// Lançar escrevendo a frase inteira: "mercado 187,50 no débito".
//
// Função PURA, como o motor de parcelas: não lê relógio nem banco. O
// "hoje" e a lista de cartões entram por parâmetro, então o mesmo texto
// dá sempre o mesmo resultado e o teste não depende do dia.
//
// O parser é DELIBERADAMENTE burro. Ele não adivinha: o que não
// reconhece vira descrição, e o que reconhece vira um campo preenchido
// que a pessoa ainda vê e confere antes de salvar. Errar para o lado de
// "não entendi" é barato; errar para o lado de "achei que era 3x" custa
// um lançamento errado que ninguém percebe.
// =============================================================
import { diaNoMes, montar, partes, somarMeses, type DataLocal } from './calendario'

export type Metodo = 'credito' | 'a_vista'
export type Escopo = 'pessoal' | 'compartilhado'

export type Cartao = { id: string; apelido: string }

export type FraseLida = {
  /** null quando a frase não tem nenhum número que pareça dinheiro. */
  valorCentavos: number | null
  descricao: string
  metodo: Metodo | null
  parcelas: number | null
  data: DataLocal | null
  cartaoId: string | null
  escopo: Escopo | null
  /** O que o parser reconheceu, para a tela mostrar o que entendeu. */
  reconhecido: string[]
}

const PALAVRAS_A_VISTA = ['pix', 'debito', 'débito', 'dinheiro', 'especie', 'espécie', 'avista', 'vista']
const PALAVRAS_CREDITO = ['credito', 'crédito', 'cartao', 'cartão', 'fatura', 'parcelado']
const PALAVRAS_COMPARTILHADO = ['nosso', 'nossa', 'casal', 'compartilhado', 'dividido', 'juntos']
const PALAVRAS_PESSOAL = ['meu', 'minha', 'pessoal']
/** Palavras de ligação que sobrariam na descrição. */
const RUIDO = ['no', 'na', 'em', 'de', 'do', 'da', 'com', 'por', 'pra', 'para', 'r$', 'reais', 'real', 'foi', 'gastei', 'paguei', 'lancar', 'lançar']

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Lê a frase. `hoje` é obrigatório de propósito: data relativa ("ontem")
 * sem um "hoje" explícito é a porta de entrada de bug de fuso.
 */
export function lerFrase(texto: string, hoje: DataLocal, cartoes: Cartao[] = []): FraseLida {
  const reconhecido: string[] = []
  // `resto` vai perdendo os pedaços já entendidos; o que sobrar é a descrição.
  let resto = ` ${texto.trim()} `

  const consumir = (re: RegExp, rotulo?: string): RegExpMatchArray | null => {
    const m = resto.match(re)
    if (!m) return null
    resto = resto.replace(m[0], ' ')
    if (rotulo) reconhecido.push(rotulo)
    return m
  }

  // ---------- parcelas: "3x", "em 3 vezes" ----------
  // Antes do valor, senão o "3" de "3x" viraria dinheiro.
  let parcelas: number | null = null
  const mParc = consumir(/\b(?:em\s+)?(\d{1,2})\s*(?:x|vezes)\b/i)
  if (mParc) {
    const n = Number(mParc[1])
    if (n >= 1 && n <= 60) { parcelas = n; reconhecido.push(`${n}x`) }
  }

  // ---------- data ----------
  let data: DataLocal | null = null
  if (consumir(/\bhoje\b/i)) { data = hoje; reconhecido.push('hoje') }
  else if (consumir(/\bontem\b/i)) { data = somarDias(hoje, -1); reconhecido.push('ontem') }
  else if (consumir(/\banteontem\b/i)) { data = somarDias(hoje, -2); reconhecido.push('anteontem') }
  else {
    // "12/09" ou "12/09/2026"
    const mData = consumir(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
    if (mData) {
      const dia = Number(mData[1]), mes = Number(mData[2])
      let ano = mData[3] ? Number(mData[3]) : partes(hoje).ano
      if (ano < 100) ano += 2000
      if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
        data = diaNoMes(ano, mes, dia)
        reconhecido.push(formatarCurta(data))
      }
    } else {
      // "dia 5" — o mês é o corrente; se já passou, ainda é este mês
      // (quem escreve "dia 5" no dia 20 está lançando algo do dia 5).
      const mDia = consumir(/\bdia\s+(\d{1,2})\b/i)
      if (mDia) {
        const dia = Number(mDia[1])
        if (dia >= 1 && dia <= 31) {
          const { ano, mes } = partes(hoje)
          data = diaNoMes(ano, mes, dia)
          reconhecido.push(formatarCurta(data))
        }
      }
    }
  }

  // ---------- valor ----------
  const valorCentavos = lerDinheiro(resto)
  if (valorCentavos !== null) {
    resto = resto.replace(RE_DINHEIRO, ' ')
    reconhecido.unshift(formatarReais(valorCentavos))
  }

  // ---------- cartão pelo apelido ----------
  let cartaoId: string | null = null
  for (const c of cartoes) {
    const alvo = semAcento(c.apelido).trim()
    if (!alvo) continue
    const re = new RegExp(`\\b${alvo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (re.test(semAcento(resto))) {
      // Remove do texto original respeitando o acento que a pessoa escreveu.
      resto = tirarSemAcento(resto, alvo)
      cartaoId = c.id
      reconhecido.push(c.apelido)
      break
    }
  }

  // ---------- método ----------
  let metodo: Metodo | null = null
  for (const p of PALAVRAS_A_VISTA) {
    if (contem(resto, p)) { metodo = 'a_vista'; resto = tirarSemAcento(resto, semAcento(p)); reconhecido.push('Pix / Débito'); break }
  }
  if (!metodo) {
    for (const p of PALAVRAS_CREDITO) {
      if (contem(resto, p)) { metodo = 'credito'; resto = tirarSemAcento(resto, semAcento(p)); reconhecido.push('Crédito'); break }
    }
  }
  // Cartão ou parcelamento nomeado implica crédito, mesmo sem a palavra.
  if (!metodo && (cartaoId || (parcelas !== null && parcelas > 1))) { metodo = 'credito'; reconhecido.push('Crédito') }

  // ---------- escopo ----------
  let escopo: Escopo | null = null
  for (const p of PALAVRAS_COMPARTILHADO) {
    if (contem(resto, p)) { escopo = 'compartilhado'; resto = tirarSemAcento(resto, semAcento(p)); reconhecido.push('Compartilhado'); break }
  }
  if (!escopo) {
    for (const p of PALAVRAS_PESSOAL) {
      if (contem(resto, p)) { escopo = 'pessoal'; resto = tirarSemAcento(resto, semAcento(p)); reconhecido.push('Pessoal'); break }
    }
  }

  // ---------- o que sobrou é a descrição ----------
  const descricao = resto
    .split(/\s+/)
    .filter((p) => p && !RUIDO.includes(semAcento(p)))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  return { valorCentavos, descricao, metodo, parcelas, data, cartaoId, escopo, reconhecido }
}

// -------------------------------------------------------------
// Dinheiro em pt-BR
// -------------------------------------------------------------
const RE_DINHEIRO = /(?:r\$\s*)?\b\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?\b|(?:r\$\s*)?\b\d+(?:[.,]\d{1,2})?\b/i

/**
 * '1.500,00' -> 150000 · '187,50' -> 18750 · '45' -> 4500
 *
 * Ponto é separador de milhar, que é o costume daqui. A exceção é
 * ponto seguido de exatamente 2 dígitos sem nenhuma vírgula na frase
 * ('12.34'), que é teclado de computador e vira centavos — '1.500'
 * continua sendo mil e quinhentos porque tem 3 dígitos depois do ponto.
 */
export function lerDinheiro(texto: string): number | null {
  const m = texto.match(RE_DINHEIRO)
  if (!m) return null
  let bruto = m[0].replace(/r\$\s*/i, '').trim()

  if (bruto.includes(',')) {
    bruto = bruto.replace(/\./g, '').replace(',', '.')
  } else if (/^\d+\.\d{2}$/.test(bruto)) {
    // '12.34' -> 12,34
  } else {
    bruto = bruto.replace(/\./g, '')
  }

  const n = Number(bruto)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100)
}

// -------------------------------------------------------------
function contem(texto: string, palavra: string): boolean {
  return new RegExp(`\\b${semAcento(palavra)}\\b`, 'i').test(semAcento(texto))
}

/** Remove a palavra comparando sem acento, preservando o resto do texto. */
function tirarSemAcento(texto: string, alvoSemAcento: string): string {
  const palavras = texto.split(/(\s+)/)
  const alvos = alvoSemAcento.split(/\s+/)
  const saida: string[] = []
  for (let i = 0; i < palavras.length; i++) {
    const limpa = semAcento(palavras[i]).replace(/[^\p{L}\p{N}]/gu, '')
    if (limpa === alvos[0] && alvos.length === 1) { saida.push(' '); continue }
    saida.push(palavras[i])
  }
  return saida.join('')
}

function somarDias(data: DataLocal, delta: number): DataLocal {
  const { ano, mes, dia } = partes(data)
  const d = new Date(Date.UTC(ano, mes - 1, dia + delta))
  return montar(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

function formatarCurta(data: DataLocal): string {
  const { mes, dia } = partes(data)
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`
}

function formatarReais(centavos: number): string {
  return `R$ ${(centavos / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

export { somarMeses }
