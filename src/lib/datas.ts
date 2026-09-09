// =============================================================
// Datas: a aritmética pura vive em dominio/calendario.ts (compartilhada
// com a Edge Function). Aqui ficam o "hoje" injetável e a formatação
// pt-BR com date-fns, que só a UI usa.
// =============================================================
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { dataLocalDe, partes, type DataLocal } from '../dominio/calendario'

export {
  FUSO, type DataLocal, ehDataLocal, partes, montar, diasNoMes, primeiroDiaDoMes,
  somarMeses, diaNoMes, compararDatas, diasEntre,
} from '../dominio/calendario'

/** Converte um instante (Date) para a data civil em America/Sao_Paulo. */
export const paraDataLocal = dataLocalDe

/** Único ponto de origem de "hoje" no app. Injetável para testes. */
export function hojeLocal(agora: Date = new Date()): DataLocal {
  return dataLocalDe(agora)
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
