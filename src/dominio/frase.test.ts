import { describe, expect, it } from 'vitest'
import { lerDinheiro, lerFrase } from './frase'

const HOJE = '2026-09-14'   // segunda-feira
const CARTOES = [{ id: 'c1', apelido: 'Nubank' }, { id: 'c2', apelido: 'Itaú' }]
const ler = (t: string) => lerFrase(t, HOJE, CARTOES)

describe('lerDinheiro', () => {
  it('lê os formatos que se digita em pt-BR', () => {
    expect(lerDinheiro('187,50')).toBe(18750)
    expect(lerDinheiro('1.500,00')).toBe(150000)
    expect(lerDinheiro('R$ 1.234,56')).toBe(123456)
    expect(lerDinheiro('45')).toBe(4500)
    expect(lerDinheiro('45,9')).toBe(4590)
    expect(lerDinheiro('0,50')).toBe(50)
  })

  it('trata ponto como milhar, que é o costume daqui', () => {
    expect(lerDinheiro('1.500')).toBe(150000)
    expect(lerDinheiro('12.000')).toBe(1200000)
  })

  it('abre exceção para o ponto de teclado de computador', () => {
    // '12.34' só pode ser doze e trinta e quatro: milhar não tem 2 dígitos.
    expect(lerDinheiro('12.34')).toBe(1234)
  })

  it('devolve null quando não há dinheiro na frase', () => {
    expect(lerDinheiro('mercado no débito')).toBeNull()
    expect(lerDinheiro('')).toBeNull()
  })
})

describe('lerFrase', () => {
  it('lê a frase do exemplo', () => {
    const r = ler('mercado 187,50 no débito')
    expect(r.valorCentavos).toBe(18750)
    expect(r.descricao).toBe('mercado')
    expect(r.metodo).toBe('a_vista')
    expect(r.parcelas).toBeNull()
  })

  it('não confunde as parcelas com o valor', () => {
    const r = ler('geladeira 2400 em 12x no Nubank')
    expect(r.valorCentavos).toBe(240000)
    expect(r.parcelas).toBe(12)
    expect(r.cartaoId).toBe('c1')
    expect(r.descricao).toBe('geladeira')
  })

  it('deduz crédito a partir do cartão, sem a palavra', () => {
    const r = ler('gasolina 200 Itaú')
    expect(r.metodo).toBe('credito')
    expect(r.cartaoId).toBe('c2')
  })

  it('deduz crédito a partir do parcelamento', () => {
    expect(ler('tênis 399 em 3x').metodo).toBe('credito')
  })

  it('não deduz crédito de 1x', () => {
    expect(ler('café 12 1x').metodo).toBeNull()
  })

  it('entende datas relativas sem consultar o relógio', () => {
    expect(ler('uber 32,90 ontem').data).toBe('2026-09-13')
    expect(ler('feira 80 anteontem').data).toBe('2026-09-12')
    expect(ler('almoço 45 hoje').data).toBe(HOJE)
  })

  it('entende dia do mês e data escrita', () => {
    expect(ler('aluguel 1500 dia 5').data).toBe('2026-09-05')
    expect(ler('remédio 89,90 12/08').data).toBe('2026-08-12')
    expect(ler('curso 300 05/01/2027').data).toBe('2027-01-05')
  })

  it('encolhe o dia que não existe no mês', () => {
    // 31 de fevereiro não existe; vira o último dia.
    expect(lerFrase('conta 100 31/02', HOJE, []).data).toBe('2026-02-28')
  })

  it('lê o escopo', () => {
    expect(ler('mercado 300 nosso').escopo).toBe('compartilhado')
    expect(ler('cinema 60 meu').escopo).toBe('pessoal')
    expect(ler('cinema 60').escopo).toBeNull()
  })

  it('tira as palavras de ligação da descrição', () => {
    expect(ler('paguei 45 de gasolina no pix').descricao).toBe('gasolina')
  })

  it('não inventa: sem número, não há valor', () => {
    const r = ler('mercado no débito')
    expect(r.valorCentavos).toBeNull()
    expect(r.metodo).toBe('a_vista')
    expect(r.descricao).toBe('mercado')
  })

  it('devolve tudo nulo para frase vazia, sem quebrar', () => {
    const r = lerFrase('', HOJE, [])
    expect(r.valorCentavos).toBeNull()
    expect(r.descricao).toBe('')
    expect(r.reconhecido).toEqual([])
  })

  it('o que não reconhece vira descrição, em vez de sumir', () => {
    const r = ler('presente de aniversário da Heloisa 250 no Nubank 2x')
    expect(r.valorCentavos).toBe(25000)
    expect(r.parcelas).toBe(2)
    expect(r.cartaoId).toBe('c1')
    expect(r.descricao).toBe('presente aniversário Heloisa')
  })

  it('lista o que entendeu, para a tela mostrar', () => {
    const r = ler('mercado 187,50 no débito ontem')
    expect(r.reconhecido).toContain('R$ 187,50')
    expect(r.reconhecido).toContain('Pix / Débito')
    expect(r.reconhecido).toContain('ontem')
  })

  it('casa o cartão sem depender do acento', () => {
    expect(ler('jantar 120 itau').cartaoId).toBe('c2')
    expect(ler('jantar 120 ITAÚ').cartaoId).toBe('c2')
  })

  it('ignora parcelamento absurdo em vez de aceitar', () => {
    expect(ler('algo 100 em 99x').parcelas).toBeNull()
  })

  it('é determinístico: a mesma frase dá o mesmo resultado', () => {
    const a = ler('mercado 187,50 no débito ontem')
    const b = ler('mercado 187,50 no débito ontem')
    expect(a).toEqual(b)
  })
})
