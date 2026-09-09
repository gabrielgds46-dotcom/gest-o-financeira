import { describe, expect, it } from 'vitest'
import { calcularParcelas, dividirCentavos, type Parcela } from './parcelas'
import { descreverParcelamento } from './previa'

const soma = (ps: Parcela[]) => ps.reduce((s, p) => s + p.valorCentavos, 0)

describe('à vista', () => {
  it('competência = mês da compra, vencimento = data da compra, 1 parcela', () => {
    const ps = calcularParcelas({
      dataCompra: '2026-09-15', valorTotalCentavos: 12000, parcelasTotal: 1, metodo: 'a_vista',
    })
    expect(ps).toEqual([{ numero: 1, valorCentavos: 12000, competencia: '2026-09-01', vencimento: '2026-09-15' }])
  })

  it('não aceita parcelamento', () => {
    expect(() =>
      calcularParcelas({ dataCompra: '2026-09-15', valorTotalCentavos: 12000, parcelasTotal: 2, metodo: 'a_vista' }),
    ).toThrow(/à vista/)
  })

  it('ignora dias de cartão mesmo se informados', () => {
    const ps = calcularParcelas({
      dataCompra: '2026-09-29', valorTotalCentavos: 500, parcelasTotal: 1, metodo: 'a_vista',
      diaFechamento: 28, diaVencimento: 5,
    })
    expect(ps[0].competencia).toBe('2026-09-01')
    expect(ps[0].vencimento).toBe('2026-09-29')
  })
})

describe('crédito: fatura corrente vs seguinte', () => {
  const cartao = { diaFechamento: 28, diaVencimento: 5 } // fecha 28, vence 5 do mês seguinte

  it('compra antes do fechamento cai na fatura do mês corrente', () => {
    const [p] = calcularParcelas({
      dataCompra: '2026-09-10', valorTotalCentavos: 10000, parcelasTotal: 1, metodo: 'credito', ...cartao,
    })
    expect(p.competencia).toBe('2026-09-01')
    expect(p.vencimento).toBe('2026-10-05') // diaVencimento < diaFechamento => mês seguinte
  })

  it('compra exatamente no dia do fechamento cai na fatura corrente', () => {
    const [p] = calcularParcelas({
      dataCompra: '2026-09-28', valorTotalCentavos: 10000, parcelasTotal: 1, metodo: 'credito', ...cartao,
    })
    expect(p.competencia).toBe('2026-09-01')
  })

  it('compra um dia após o fechamento cai na fatura seguinte', () => {
    const [p] = calcularParcelas({
      dataCompra: '2026-09-29', valorTotalCentavos: 10000, parcelasTotal: 1, metodo: 'credito', ...cartao,
    })
    expect(p.competencia).toBe('2026-10-01')
    expect(p.vencimento).toBe('2026-11-05')
  })

  it('vencimento maior que fechamento vence no mesmo mês da competência', () => {
    const [p] = calcularParcelas({
      dataCompra: '2026-09-05', valorTotalCentavos: 10000, parcelasTotal: 1, metodo: 'credito',
      diaFechamento: 10, diaVencimento: 20,
    })
    expect(p.competencia).toBe('2026-09-01')
    expect(p.vencimento).toBe('2026-09-20')
  })

  it('vencimento igual ao fechamento vence no mesmo mês', () => {
    const [p] = calcularParcelas({
      dataCompra: '2026-09-05', valorTotalCentavos: 10000, parcelasTotal: 1, metodo: 'credito',
      diaFechamento: 15, diaVencimento: 15,
    })
    expect(p.vencimento).toBe('2026-09-15')
  })
})

describe('crédito: casos de borda obrigatórios', () => {
  it('fechamento 31 em fevereiro usa o último dia do mês', () => {
    // fev/2026 tem 28 dias: fechamento efetivo 28/02
    const [antes] = calcularParcelas({
      dataCompra: '2026-02-28', valorTotalCentavos: 1000, parcelasTotal: 1, metodo: 'credito',
      diaFechamento: 31, diaVencimento: 10,
    })
    expect(antes.competencia).toBe('2026-02-01')
    const [depois] = calcularParcelas({
      dataCompra: '2026-03-01', valorTotalCentavos: 1000, parcelasTotal: 1, metodo: 'credito',
      diaFechamento: 31, diaVencimento: 10,
    })
    expect(depois.competencia).toBe('2026-03-01')
    // bissexto: 29/02/2028 ainda é "até o fechamento"
    const [bissexto] = calcularParcelas({
      dataCompra: '2028-02-29', valorTotalCentavos: 1000, parcelasTotal: 1, metodo: 'credito',
      diaFechamento: 31, diaVencimento: 10,
    })
    expect(bissexto.competencia).toBe('2028-02-01')
  })

  it('divisão de centavos: 119.999 em 12x => 11 × 10.000 e a última 9.999', () => {
    const ps = calcularParcelas({
      dataCompra: '2026-09-26', valorTotalCentavos: 119999, parcelasTotal: 12, metodo: 'credito',
      diaFechamento: 28, diaVencimento: 5,
    })
    expect(ps).toHaveLength(12)
    expect(ps.slice(0, 11).every((p) => p.valorCentavos === 10000)).toBe(true)
    expect(ps[11].valorCentavos).toBe(9999)
    expect(soma(ps)).toBe(119999)
  })

  it('a soma das parcelas é SEMPRE exatamente o total', () => {
    const casos: Array<[number, number]> = [
      [1, 1], [100, 3], [1000, 7], [119999, 12], [99999, 60], [1, 60], [333333, 9], [7, 5],
    ]
    for (const [total, n] of casos) {
      const ps = calcularParcelas({
        dataCompra: '2026-01-15', valorTotalCentavos: total, parcelasTotal: n, metodo: 'credito',
        diaFechamento: 20, diaVencimento: 27,
      })
      expect(ps).toHaveLength(n)
      expect(soma(ps)).toBe(total)
      // diferença máxima de 1 centavo entre parcelas
      const vals = ps.map((p) => p.valorCentavos)
      expect(Math.max(...vals) - Math.min(...vals)).toBeLessThanOrEqual(1)
      // numeração 1..n
      expect(ps.map((p) => p.numero)).toEqual(Array.from({ length: n }, (_, i) => i + 1))
    }
  })

  it('dividirCentavos com total menor que n gera zeros no fim', () => {
    expect(dividirCentavos(7, 5)).toEqual([2, 2, 1, 1, 1])
    expect(dividirCentavos(3, 5)).toEqual([1, 1, 1, 0, 0])
  })

  it('compra às 23h do último dia do mês permanece no mês (Date com fuso)', () => {
    // 30/09/2026 23:00 -03:00 == 01/10/2026 02:00 UTC. Cartão fecha dia 30.
    const [p] = calcularParcelas({
      dataCompra: new Date('2026-09-30T23:00:00-03:00'), valorTotalCentavos: 5000, parcelasTotal: 1,
      metodo: 'credito', diaFechamento: 30, diaVencimento: 7,
    })
    expect(p.competencia).toBe('2026-09-01')
    expect(p.vencimento).toBe('2026-10-07')
  })

  it('vencimento dia 31 num mês de 30 dias encolhe para 30', () => {
    const [p] = calcularParcelas({
      dataCompra: '2026-04-02', valorTotalCentavos: 5000, parcelasTotal: 1, metodo: 'credito',
      diaFechamento: 25, diaVencimento: 31,
    })
    expect(p.competencia).toBe('2026-04-01')
    expect(p.vencimento).toBe('2026-04-30')
    // e em fevereiro
    const [f] = calcularParcelas({
      dataCompra: '2026-02-02', valorTotalCentavos: 5000, parcelasTotal: 1, metodo: 'credito',
      diaFechamento: 25, diaVencimento: 31,
    })
    expect(f.vencimento).toBe('2026-02-28')
  })

  it('parcelamento cruza o ano: nov/2026 em 6x vai até abr/2027', () => {
    const ps = calcularParcelas({
      dataCompra: '2026-11-10', valorTotalCentavos: 60000, parcelasTotal: 6, metodo: 'credito',
      diaFechamento: 20, diaVencimento: 27,
    })
    expect(ps.map((p) => p.competencia)).toEqual([
      '2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01', '2027-03-01', '2027-04-01',
    ])
    expect(ps.map((p) => p.vencimento)).toEqual([
      '2026-11-27', '2026-12-27', '2027-01-27', '2027-02-27', '2027-03-27', '2027-04-27',
    ])
  })

  it('compra após fechamento em dezembro começa em janeiro do ano seguinte', () => {
    const ps = calcularParcelas({
      dataCompra: '2026-12-29', valorTotalCentavos: 30000, parcelasTotal: 3, metodo: 'credito',
      diaFechamento: 28, diaVencimento: 5,
    })
    expect(ps.map((p) => p.competencia)).toEqual(['2027-01-01', '2027-02-01', '2027-03-01'])
    expect(ps.map((p) => p.vencimento)).toEqual(['2027-02-05', '2027-03-05', '2027-04-05'])
  })
})

describe('validações', () => {
  const base = { dataCompra: '2026-09-10', valorTotalCentavos: 1000, parcelasTotal: 1 } as const

  it('crédito exige dias de fechamento e vencimento', () => {
    expect(() => calcularParcelas({ ...base, metodo: 'credito' })).toThrow(/fechamento/)
    expect(() => calcularParcelas({ ...base, metodo: 'credito', diaFechamento: 0, diaVencimento: 5 })).toThrow()
    expect(() => calcularParcelas({ ...base, metodo: 'credito', diaFechamento: 28, diaVencimento: 32 })).toThrow()
  })

  it('valor precisa ser inteiro positivo em centavos', () => {
    expect(() => calcularParcelas({ ...base, valorTotalCentavos: 0, metodo: 'a_vista' })).toThrow(/centavos/)
    expect(() => calcularParcelas({ ...base, valorTotalCentavos: 10.5, metodo: 'a_vista' })).toThrow(/centavos/)
    expect(() => calcularParcelas({ ...base, valorTotalCentavos: -1, metodo: 'a_vista' })).toThrow(/centavos/)
  })

  it('parcelas entre 1 e 60', () => {
    const c = { metodo: 'credito' as const, diaFechamento: 28, diaVencimento: 5 }
    expect(() => calcularParcelas({ ...base, ...c, parcelasTotal: 0 })).toThrow(/parcelas/)
    expect(() => calcularParcelas({ ...base, ...c, parcelasTotal: 61 })).toThrow(/parcelas/)
    expect(() => calcularParcelas({ ...base, ...c, parcelasTotal: 1.5 })).toThrow(/parcelas/)
    expect(calcularParcelas({ ...base, ...c, parcelasTotal: 60 })).toHaveLength(60)
  })

  it('data de compra inválida', () => {
    expect(() => calcularParcelas({ ...base, dataCompra: '2026-02-30', metodo: 'a_vista' })).toThrow(/Data/)
    expect(() => calcularParcelas({ ...base, dataCompra: 'ontem', metodo: 'a_vista' })).toThrow(/Data/)
  })
})

describe('descreverParcelamento (prévia da tela Lançar)', () => {
  it('parcelas iguais', () => {
    const ps = calcularParcelas({
      dataCompra: '2026-09-29', valorTotalCentavos: 119988, parcelasTotal: 12, metodo: 'credito',
      diaFechamento: 28, diaVencimento: 5,
    })
    expect(descreverParcelamento(ps)).toBe('12x de R$ 99,99 — de out/2026 a set/2027')
  })

  it('parcelas com ajuste de centavo mostram a faixa', () => {
    const ps = calcularParcelas({
      dataCompra: '2026-09-26', valorTotalCentavos: 119999, parcelasTotal: 12, metodo: 'credito',
      diaFechamento: 28, diaVencimento: 5,
    })
    expect(descreverParcelamento(ps)).toBe('12x de R$ 99,99 a R$ 100,00 — de set/2026 a ago/2027')
  })

  it('parcela única', () => {
    const ps = calcularParcelas({
      dataCompra: '2026-09-15', valorTotalCentavos: 12000, parcelasTotal: 1, metodo: 'a_vista',
    })
    expect(descreverParcelamento(ps)).toBe('1x de R$ 120,00 — set/2026')
    expect(descreverParcelamento([])).toBe('')
  })
})
