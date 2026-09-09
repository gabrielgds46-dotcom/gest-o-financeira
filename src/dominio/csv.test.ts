import { describe, expect, it } from 'vitest'
import { centavosParaPlanilha, dataParaPlanilha, escapar, montarCsv } from './csv'

describe('centavosParaPlanilha', () => {
  it('usa vírgula decimal e sempre duas casas', () => {
    expect(centavosParaPlanilha(123456)).toBe('1234,56')
    expect(centavosParaPlanilha(5)).toBe('0,05')
    expect(centavosParaPlanilha(100)).toBe('1,00')
    expect(centavosParaPlanilha(0)).toBe('0,00')
    expect(centavosParaPlanilha(-2550)).toBe('-25,50')
  })
  it('não usa separador de milhar (a planilha precisa somar)', () => {
    expect(centavosParaPlanilha(100000000)).toBe('1000000,00')
  })
})

describe('dataParaPlanilha', () => {
  it('converte para dd/MM/yyyy', () => {
    expect(dataParaPlanilha('2026-09-30')).toBe('30/09/2026')
    expect(dataParaPlanilha(null)).toBe('')
  })
})

describe('escapar', () => {
  it('deixa passar o que não tem caractere especial', () => {
    expect(escapar('iFood')).toBe('iFood')
  })
  it('protege ponto e vírgula, aspas e quebra de linha', () => {
    expect(escapar('Mercado; feira')).toBe('"Mercado; feira"')
    expect(escapar('Diz "oi"')).toBe('"Diz ""oi"""')
    expect(escapar('linha1\nlinha2')).toBe('"linha1\nlinha2"')
  })
})

describe('montarCsv', () => {
  it('começa com BOM e separa com ponto e vírgula', () => {
    const csv = montarCsv(['Data', 'Valor'], [['30/09/2026', '1234,56']])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toBe('﻿Data;Valor\r\n30/09/2026;1234,56')
  })
  it('uma descrição com ponto e vírgula não desloca colunas', () => {
    const csv = montarCsv(['Descricao', 'Valor'], [['Padaria; pão', '500']])
    const linha = csv.split('\r\n')[1]
    expect(linha).toBe('"Padaria; pão";500')
    expect(linha.split(';').length).toBe(3) // dentro das aspas, mas o parser respeita
  })
})

// ---------------- exportação de lançamentos ----------------
import { montarCsvLancamentos, nomeArquivo, type LinhaExportacao } from './exportacao'

const linha: LinhaExportacao = {
  competencia: '2026-09-01', vencimento: '2026-10-05', data_compra: '2026-09-26',
  descricao: 'Freezer; da cozinha', categoria: 'Alimentação', grupo: 'despesa',
  escopo: 'compartilhado', metodo: 'credito', natureza: 'saida', cartao: 'Nubank',
  parcela: '1/12', valor: 10000, status: 'pendente', pago_em: null, pago_por: 'Gabriel',
}

describe('montarCsvLancamentos', () => {
  it('traduz os enums e formata datas e valores em pt-BR', () => {
    const csv = montarCsvLancamentos([linha])
    const [cab, l1] = csv.replace('﻿', '').split('\r\n')
    expect(cab.split(';')[0]).toBe('Competência')
    expect(l1).toContain('01/09/2026;05/10/2026;26/09/2026')
    expect(l1).toContain('"Freezer; da cozinha"')   // separador dentro do texto, protegido
    expect(l1).toContain('Cartão de crédito')
    expect(l1).toContain('Compartilhado')
    expect(l1).toContain('1/12;100,00;Pendente;;Gabriel')
  })
  it('tem uma linha por parcela mais o cabeçalho', () => {
    const csv = montarCsvLancamentos([linha, { ...linha, parcela: '2/12' }])
    expect(csv.split('\r\n')).toHaveLength(3)
  })
})

describe('nomeArquivo', () => {
  it('usa o mês quando é um mês só, e o ano quando é um intervalo', () => {
    expect(nomeArquivo('pessoal', '2026-09-01', '2026-09-01')).toBe('financas-pessoal-2026-09.csv')
    expect(nomeArquivo('consolidado', '2026-01-01', '2026-12-01')).toBe('financas-consolidado-2026.csv')
  })
})
