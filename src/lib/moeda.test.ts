import { describe, expect, it } from 'vitest'
import { formatarMoeda, interpretarMoeda } from './moeda'

describe('formatarMoeda', () => {
  it('formata centavos em R$ pt-BR', () => {
    expect(formatarMoeda(123456)).toBe('R$ 1.234,56')
    expect(formatarMoeda(5)).toBe('R$ 0,05')
    expect(formatarMoeda(0)).toBe('R$ 0,00')
    expect(formatarMoeda(119999)).toBe('R$ 1.199,99')
    expect(formatarMoeda(100000000)).toBe('R$ 1.000.000,00')
  })
  it('rejeita não inteiro (float nunca entra no domínio)', () => {
    expect(() => formatarMoeda(12.5)).toThrow()
  })
})

describe('interpretarMoeda', () => {
  it('só dígitos vira centavos (máscara de caixa)', () => {
    expect(interpretarMoeda('123456')).toBe(123456)
    expect(interpretarMoeda('5')).toBe(5)
  })
  it('aceita formatos brasileiros e com ponto decimal', () => {
    expect(interpretarMoeda('R$ 1.234,56')).toBe(123456)
    expect(interpretarMoeda('1234,56')).toBe(123456)
    expect(interpretarMoeda('1234.56')).toBe(123456)
    expect(interpretarMoeda('0,1')).toBe(10)
  })
  it('rejeita lixo', () => {
    expect(interpretarMoeda('')).toBeNull()
    expect(interpretarMoeda('abc')).toBeNull()
    expect(interpretarMoeda('1,234')).toBeNull()
  })
})
