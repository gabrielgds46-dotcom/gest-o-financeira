import { describe, expect, it } from 'vitest'
import { descreverVariacao, montarMensagem } from './mensagem'

const base = {
  gasto: 60000, gastoAnterior: 40000, variacao: 0.5,
  topNome: 'Alimentação', topValor: 50000, venceValor: 25000, venceQtd: 2,
}

describe('montarMensagem', () => {
  it('põe o número no título: sem número não vale a interrupção', () => {
    const m = montarMensagem('Gabriel', base)
    expect(m.titulo).toBe('Saíram R$ 600,00 nesta semana')
    expect(m.corpo).toBe('50% a mais que na passada · Alimentação levou R$ 500,00 · R$ 250,00 vencem em 2 contas')
  })

  it('separa milhar', () => {
    expect(montarMensagem('G', { ...base, gasto: 218000 }).titulo).toBe('Saíram R$ 2.180,00 nesta semana')
  })

  it('diz "a menos" quando gastou menos', () => {
    expect(montarMensagem('G', { ...base, variacao: -0.3 }).corpo).toContain('30% a menos que na passada')
  })

  it('omite a comparação quando não há semana anterior', () => {
    const m = montarMensagem('G', { ...base, variacao: null })
    expect(m.corpo).not.toContain('passada')
    expect(m.corpo).toContain('Alimentação')
  })

  it('reconhece o empate em vez de dizer "0% a mais"', () => {
    expect(montarMensagem('G', { ...base, variacao: 0 }).corpo).toContain('Igual à semana passada')
  })

  it('usa o primeiro nome, não o nome inteiro', () => {
    expect(montarMensagem('Gabriel dos Santos', { ...base, gasto: 0, venceQtd: 0, venceValor: 0 }).titulo)
      .toBe('Gabriel, semana sem movimento')
  })

  it('semana parada não finge que houve movimento', () => {
    const m = montarMensagem('Heloisa', { gasto: 0, gastoAnterior: 0, variacao: null, topNome: null, topValor: null, venceValor: 0, venceQtd: 0 })
    expect(m.titulo).toBe('Heloisa, semana sem movimento')
    expect(m.corpo).toBe('Nada saiu e nada vence nos próximos sete dias.')
  })

  it('nada saiu mas há contas à frente: avisa do que importa', () => {
    const m = montarMensagem('G', { gasto: 0, gastoAnterior: 0, variacao: null, topNome: null, topValor: null, venceValor: 12000, venceQtd: 1 })
    expect(m.titulo).toBe('G, nada saiu esta semana')
    expect(m.corpo).toBe('R$ 120,00 vencem em 1 conta')
  })

  it('não deixa corpo começando em minúscula', () => {
    const m = montarMensagem('G', { ...base, topNome: null, topValor: null })
    expect(m.corpo[0]).toBe(m.corpo[0].toUpperCase())
  })

  it('singular e plural das contas', () => {
    expect(montarMensagem('G', { ...base, venceQtd: 1 }).corpo).toContain('em 1 conta')
    expect(montarMensagem('G', { ...base, venceQtd: 5 }).corpo).toContain('em 5 contas')
  })
})

describe('descreverVariacao', () => {
  it('não vira porcentagem absurda quando a semana passada foi minúscula', () => {
    // O caso real que apareceu no disparo seco: R$ 35 -> R$ 463 dava "1223% a mais".
    expect(descreverVariacao(46300, 3500, 12.2286)).toBe('contra R$ 35,00 na passada')
  })

  it('a partir do dobro, fala em vezes em vez de porcentagem', () => {
    expect(descreverVariacao(40000, 10000, 3)).toBe('4,0x a semana passada')
    expect(descreverVariacao(20000, 10000, 1)).toBe('2,0x a semana passada')
    expect(descreverVariacao(150000, 10000, 14)).toBe('15x a semana passada')
  })

  it('variação normal continua em porcentagem', () => {
    expect(descreverVariacao(60000, 40000, 0.5)).toBe('50% a mais que na passada')
    expect(descreverVariacao(28000, 40000, -0.3)).toBe('30% a menos que na passada')
  })

  it('empate é empate', () => {
    expect(descreverVariacao(40000, 40000, 0)).toBe('igual à semana passada')
  })

  it('sem base, não há comparação', () => {
    expect(descreverVariacao(40000, 0, null)).toBeNull()
    expect(descreverVariacao(0, 40000, -1)).toBeNull()
  })

  it('a mensagem inteira usa a nova frase', () => {
    const m = montarMensagem('Gabriel', {
      gasto: 46300, gastoAnterior: 3500, variacao: 12.2286,
      topNome: 'Custos fixos', topValor: 45000, venceValor: 45000, venceQtd: 1,
    })
    expect(m.corpo).toBe('Contra R$ 35,00 na passada · Custos fixos levou R$ 450,00 · R$ 450,00 vencem em 1 conta')
    expect(m.corpo).not.toContain('%')
  })
})
