import { describe, expect, it } from 'vitest'
import {
  compararDatas,
  diaNoMes,
  diasEntre,
  diasNoMes,
  ehDataLocal,
  formatarCompetencia,
  formatarCompetenciaLonga,
  formatarData,
  hojeLocal,
  paraDataLocal,
  primeiroDiaDoMes,
  somarMeses,
} from './datas'

describe('fuso horário (America/Sao_Paulo)', () => {
  it('23h00 do último dia do mês permanece naquele mês', () => {
    // 30/09/2026 23:00 em São Paulo = 01/10/2026 02:00 UTC
    expect(paraDataLocal(new Date('2026-09-30T23:00:00-03:00'))).toBe('2026-09-30')
    expect(paraDataLocal(new Date('2026-10-01T02:00:00Z'))).toBe('2026-09-30')
  })

  it('00h30 do dia 1º em São Paulo é dia 1º, mesmo sendo dia 30 em UTC-5', () => {
    expect(paraDataLocal(new Date('2026-10-01T00:30:00-03:00'))).toBe('2026-10-01')
  })

  it('hojeLocal usa o instante injetado', () => {
    expect(hojeLocal(new Date('2026-12-31T23:59:59-03:00'))).toBe('2026-12-31')
    expect(hojeLocal(new Date('2027-01-01T02:59:59Z'))).toBe('2026-12-31')
  })
})

describe('aritmética de datas', () => {
  it('dias no mês, incluindo bissexto', () => {
    expect(diasNoMes(2026, 2)).toBe(28)
    expect(diasNoMes(2028, 2)).toBe(29)
    expect(diasNoMes(2026, 4)).toBe(30)
    expect(diasNoMes(2026, 12)).toBe(31)
  })

  it('somarMeses cruza o ano nos dois sentidos', () => {
    expect(somarMeses(2026, 11, 2)).toEqual({ ano: 2027, mes: 1 })
    expect(somarMeses(2026, 12, 1)).toEqual({ ano: 2027, mes: 1 })
    expect(somarMeses(2026, 1, -1)).toEqual({ ano: 2025, mes: 12 })
    expect(somarMeses(2026, 6, 0)).toEqual({ ano: 2026, mes: 6 })
    expect(somarMeses(2026, 3, 24)).toEqual({ ano: 2028, mes: 3 })
  })

  it('diaNoMes encolhe dia inexistente para o último do mês', () => {
    expect(diaNoMes(2026, 2, 31)).toBe('2026-02-28')
    expect(diaNoMes(2028, 2, 31)).toBe('2028-02-29')
    expect(diaNoMes(2026, 4, 31)).toBe('2026-04-30')
    expect(diaNoMes(2026, 1, 31)).toBe('2026-01-31')
  })

  it('primeiroDiaDoMes, comparação e diferença', () => {
    expect(primeiroDiaDoMes('2026-09-30')).toBe('2026-09-01')
    expect(compararDatas('2026-09-30', '2026-10-01')).toBe(-1)
    expect(compararDatas('2026-10-01', '2026-10-01')).toBe(0)
    expect(diasEntre('2026-09-28', '2026-10-05')).toBe(7)
    expect(diasEntre('2026-10-05', '2026-09-28')).toBe(-7)
  })

  it('valida o formato e a existência da data', () => {
    expect(ehDataLocal('2026-02-28')).toBe(true)
    expect(ehDataLocal('2026-02-30')).toBe(false)
    expect(ehDataLocal('2026-13-01')).toBe(false)
    expect(ehDataLocal('30/09/2026')).toBe(false)
    expect(ehDataLocal(new Date())).toBe(false)
  })
})

describe('formatação pt-BR', () => {
  it('data dd/MM/yyyy', () => {
    expect(formatarData('2026-09-05')).toBe('05/09/2026')
  })
  it('competência abreviada e longa', () => {
    expect(formatarCompetencia('2026-09-01')).toBe('set/2026')
    expect(formatarCompetencia('2027-01-01')).toBe('jan/2027')
    expect(formatarCompetenciaLonga('2026-10-01')).toBe('outubro de 2026')
  })
})
