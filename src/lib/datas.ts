// =============================================================
// Datas de negócio.
//
// REGRA (ver docs/ESPECIFICACAO.md, "fuso horário"): o Supabase grava em
// UTC e o Brasil é UTC-3. Um lançamento às 22h do dia 30 vira dia 1º em
// UTC. Por isso datas de negócio NUNCA circulam como Date: circulam como
// string 'yyyy-MM-dd' (DataLocal), o mesmo formato do tipo `date` do
// Postgres. A conversão de instante -> DataLocal acontece em UM lugar,
// com fuso explícito. Aritmética de meses e dias é feita em inteiros,
// sem passar por Date, para não depender do fuso do dispositivo.
// =============================================================
import { formatInTimeZone } from 'date-fns-tz'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const FUSO = 'America/Sao_Paulo'

/** Data de negócio no formato 'yyyy-MM-dd'. */
export type DataLocal = string

const RE_DATA = /^(\d{4})-(\d{2})-(\d{2})$/

/** Converte um instante (Date) para a data civil em America/Sao_Paulo. */
export function paraDataLocal(instante: Date): DataLocal {
  return formatInTimeZone(instante, FUSO, 'yyyy-MM-dd')
}

/** Único ponto de origem de "hoje" no app. Injetável para testes. */
export function hojeLocal(agora: Date = new Date()): DataLocal {
  return paraDataLocal(agora)
}

export function ehDataLocal(valor: unknown): valor is DataLocal {
  if (typeof valor !== 'string') return false
  const m = RE_DATA.exec(valor)
  if (!m) return false
  const [, a, me, d] = m.map(Number)
  return me >= 1 && me <= 12 && d >= 1 && d <= diasNoMes(a, me)
}

export function partes(data: DataLocal): { ano: number; mes: number; dia: number } {
  const m = RE_DATA.exec(data)
  if (!m) throw new Error(`Data inválida: ${data}`)
  return { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) }
}

export function montar(ano: number, mes: number, dia: number): DataLocal {
  const mm = String(mes).padStart(2, '0')
  const dd = String(dia).padStart(2, '0')
  return `${ano}-${mm}-${dd}`
}

/** Quantidade de dias no mês (mes = 1..12). Sem Date local: usa UTC puro. */
export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

/** Dia 1 do mês da data. É o formato de `competencia` no banco. */
export function primeiroDiaDoMes(data: DataLocal): DataLocal {
  const { ano, mes } = partes(data)
  return montar(ano, mes, 1)
}

/**
 * Soma meses a uma competência (dia 1). Retorna {ano, mes} normalizados.
 * Ex.: (2026, 11) + 2 -> (2027, 1)
 */
export function somarMeses(ano: number, mes: number, delta: number): { ano: number; mes: number } {
  const total = ano * 12 + (mes - 1) + delta
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 }
}

/**
 * Aplica um "dia do mês" a um ano/mês, encolhendo para o último dia quando
 * o dia não existe (31 em abril -> 30; 31 em fevereiro -> 28/29).
 */
export function diaNoMes(ano: number, mes: number, dia: number): DataLocal {
  return montar(ano, mes, Math.min(dia, diasNoMes(ano, mes)))
}

/** Comparação lexicográfica funciona porque o formato é ISO com zero à esquerda. */
export function compararDatas(a: DataLocal, b: DataLocal): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Diferença b - a em dias (inteiro). */
export function diasEntre(a: DataLocal, b: DataLocal): number {
  const pa = partes(a)
  const pb = partes(b)
  const ua = Date.UTC(pa.ano, pa.mes - 1, pa.dia)
  const ub = Date.UTC(pb.ano, pb.mes - 1, pb.dia)
  return Math.round((ub - ua) / 86_400_000)
}

// ---------------- formatação pt-BR ----------------

/** '2026-09-30' -> '30/09/2026' */
export function formatarData(data: DataLocal): string {
  const { ano, mes, dia } = partes(data)
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`
}

/** Competência '2026-09-01' -> 'set/2026' */
export function formatarCompetencia(competencia: DataLocal): string {
  const { ano, mes } = partes(competencia)
  // Date local só para pegar o nome do mês; dia 15 evita qualquer borda de fuso.
  return format(new Date(ano, mes - 1, 15), 'MMM/yyyy', { locale: ptBR })
}

/** Competência '2026-09-01' -> 'setembro de 2026' */
export function formatarCompetenciaLonga(competencia: DataLocal): string {
  const { ano, mes } = partes(competencia)
  return format(new Date(ano, mes - 1, 15), "MMMM 'de' yyyy", { locale: ptBR })
}
