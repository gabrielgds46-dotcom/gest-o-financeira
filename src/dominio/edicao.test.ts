import { describe, expect, it } from 'vitest'
import { calcularParcelas } from './parcelas'
import {
  casarComExistentes, podeExcluir, podeMudarValor, podeReplanejar, replanejarComPagas,
  temCancelada, type ParcelaExistente,
} from './edicao'

const p = (numero: number, valorCentavos: number, status: ParcelaExistente['status']): ParcelaExistente => ({
  id: `p${numero}`, numero, valorCentavos, status,
  competencia: `2026-${String(8 + numero).padStart(2, '0')}-01`,
  vencimento: `2026-${String(8 + numero).padStart(2, '0')}-05`,
})

describe('replanejarComPagas', () => {
  it('redistribui só entre as pendentes e preserva as pagas', () => {
    const parcelas = [p(1, 10000, 'pago'), p(2, 10000, 'pago'), p(3, 10000, 'pendente'), p(4, 10000, 'pendente')]
    const { ajustes, restante } = replanejarComPagas(parcelas, 50000)
    expect(restante).toBe(30000)
    expect(ajustes).toEqual([{ id: 'p3', valorCentavos: 15000 }, { id: 'p4', valorCentavos: 15000 }])
  })

  it('a soma final bate exatamente com o novo total', () => {
    const parcelas = [p(1, 10000, 'pago'), p(2, 0, 'pendente'), p(3, 0, 'pendente'), p(4, 0, 'pendente')]
    const { ajustes } = replanejarComPagas(parcelas, 40001)
    const soma = 10000 + ajustes.reduce((s, a) => s + a.valorCentavos, 0)
    expect(soma).toBe(40001)
    // diferença de no máximo 1 centavo entre as pendentes
    const v = ajustes.map((a) => a.valorCentavos)
    expect(Math.max(...v) - Math.min(...v)).toBeLessThanOrEqual(1)
  })

  it('rejeita novo valor menor ou igual ao já pago', () => {
    const parcelas = [p(1, 30000, 'pago'), p(2, 10000, 'pendente')]
    expect(() => replanejarComPagas(parcelas, 30000)).toThrow(/maior que o já pago/)
    expect(() => replanejarComPagas(parcelas, 25000)).toThrow(/maior que o já pago/)
  })

  it('com tudo pago, o total não pode mudar', () => {
    const parcelas = [p(1, 10000, 'pago'), p(2, 10000, 'pago')]
    expect(replanejarComPagas(parcelas, 20000).ajustes).toEqual([])
    expect(() => replanejarComPagas(parcelas, 25000)).toThrow(/já foram pagas/)
  })

  it('ignora parcelas canceladas na redistribuição', () => {
    const parcelas = [p(1, 10000, 'pago'), p(2, 10000, 'cancelado'), p(3, 10000, 'pendente')]
    const { ajustes } = replanejarComPagas(parcelas, 25000)
    expect(ajustes).toEqual([{ id: 'p3', valorCentavos: 15000 }])
  })

  it('rejeita valor inválido', () => {
    const parcelas = [p(1, 10000, 'pendente')]
    expect(() => replanejarComPagas(parcelas, 0)).toThrow(/centavos/)
    expect(() => replanejarComPagas(parcelas, 10.5)).toThrow(/centavos/)
  })
})

describe('o que a edição permite', () => {
  it('excluir só sem parcela paga e com o mês aberto', () => {
    expect(podeExcluir([p(1, 100, 'pendente')], false)).toBe(true)
    expect(podeExcluir([p(1, 100, 'pendente')], true)).toBe(false)
    expect(podeExcluir([p(1, 100, 'pago')], false)).toBe(false)
    expect(podeExcluir([p(1, 100, 'cancelado')], false)).toBe(true)
  })

  it('replanejar data e cartão só sem parcela paga', () => {
    expect(podeReplanejar([p(1, 100, 'pendente'), p(2, 100, 'pendente')])).toBe(true)
    expect(podeReplanejar([p(1, 100, 'pago'), p(2, 100, 'pendente')])).toBe(false)
    // Cancelada também trava: o valor dela continua somando no valor_total.
    expect(podeReplanejar([p(1, 100, 'cancelado'), p(2, 100, 'pendente')])).toBe(false)
  })
})

describe('casarComExistentes', () => {
  it('reaproveita o id quando o número já existe e marca null para os novos', () => {
    const novas = calcularParcelas({
      dataCompra: '2026-09-10', valorTotalCentavos: 30000, parcelasTotal: 3,
      metodo: 'credito', diaFechamento: 28, diaVencimento: 5,
    })
    const casadas = casarComExistentes(novas, [p(1, 10000, 'pendente'), p(2, 10000, 'pendente')])
    expect(casadas.map((c) => c.id)).toEqual(['p1', 'p2', null])
    expect(casadas[2].competencia).toBe('2026-11-01')
  })
})

describe('podeMudarValor', () => {
  it('libera o valor quando não há parcela cancelada', () => {
    expect(podeMudarValor([p(1, 5000, 'pago'), p(2, 5000, 'pendente')])).toBe(true)
    expect(temCancelada([p(1, 5000, 'pago'), p(2, 5000, 'pendente')])).toBe(false)
  })

  it('trava o valor quando há parcela cancelada', () => {
    // O trigger do banco soma TODAS as parcelas contra valor_total. Com uma
    // cancelada no meio, redistribuir só entre as pendentes quebra a soma.
    const parcelas = [p(1, 5000, 'pago'), p(2, 5000, 'cancelado'), p(3, 5000, 'pendente')]
    expect(podeMudarValor(parcelas)).toBe(false)
    expect(temCancelada(parcelas)).toBe(true)
  })
})
