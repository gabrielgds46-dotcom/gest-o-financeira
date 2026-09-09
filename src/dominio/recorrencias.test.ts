import { describe, expect, it } from 'vitest'
import { planejarRecorrencia, type RecorrenciaBase } from './recorrencias'

const base: RecorrenciaBase = { id: 'r1', tipo: 'despesa', metodo: 'a_vista', valor: 89000, dia_vencimento: 10, inicio: '2026-01-15', fim: null }

describe('planejarRecorrencia', () => {
  it('à vista: uma parcela no próprio mês, vencendo no dia da recorrência', () => {
    const p = planejarRecorrencia(base, '2026-10-01', null)!
    expect(p.dataCompra).toBe('2026-10-10')
    expect(p.parcelas).toEqual([{ numero: 1, valorCentavos: 89000, competencia: '2026-10-01', vencimento: '2026-10-10' }])
  })

  it('crédito: usa o cartão para decidir a fatura', () => {
    const p = planejarRecorrencia({ ...base, metodo: 'credito', dia_vencimento: 29 }, '2026-09-01', { dia_fechamento: 28, dia_vencimento: 5 })!
    expect(p.dataCompra).toBe('2026-09-29')
    expect(p.parcelas[0].competencia).toBe('2026-10-01') // passou do fechamento
    expect(p.parcelas[0].vencimento).toBe('2026-11-05')
  })

  it('dia 31 em mês curto encolhe', () => {
    const p = planejarRecorrencia({ ...base, dia_vencimento: 31 }, '2026-02-01', null)!
    expect(p.dataCompra).toBe('2026-02-28')
  })

  it('respeita início e fim (mês inclusive)', () => {
    expect(planejarRecorrencia(base, '2025-12-01', null)).toBeNull()
    expect(planejarRecorrencia(base, '2026-01-01', null)).not.toBeNull()
    const comFim = { ...base, fim: '2026-06-20' }
    expect(planejarRecorrencia(comFim, '2026-06-01', null)).not.toBeNull()
    expect(planejarRecorrencia(comFim, '2026-07-01', null)).toBeNull()
  })

  it('receita não gera parcelas', () => {
    const p = planejarRecorrencia({ ...base, tipo: 'receita', metodo: null }, '2026-03-01', null)!
    expect(p.parcelas).toEqual([])
    expect(p.dataCompra).toBe('2026-03-10')
  })

  it('crédito sem cartão é erro', () => {
    expect(() => planejarRecorrencia({ ...base, metodo: 'credito' }, '2026-03-01', null)).toThrow(/cartão/)
  })
})
