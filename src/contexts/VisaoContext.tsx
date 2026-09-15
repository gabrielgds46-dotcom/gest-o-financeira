import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { hojeLocal, primeiroDiaDoMes, partes, somarMeses, montar, type DataLocal } from '../lib/datas'
import type { Database } from '../tipos/supabase'

export type Escopo = Database['public']['Enums']['escopo_t']

/**
 * O que a tela está olhando. 'consolidado' é o seu pessoal somado ao
 * compartilhado da casa — não é um escopo de lançamento, e por isso
 * quem cria lançamento (Lançar, recorrências, orçamentos) continua
 * usando `Escopo`, de dois valores.
 */
export type Visao = Escopo | 'consolidado'

type Estado = {
  /** Competência selecionada (dia 1). */
  competencia: DataLocal
  visao: Visao
  setVisao: (v: Visao) => void
  /** A visão reduzida a um escopo de escrita: consolidado vira pessoal. */
  escopoDeEscrita: Escopo
  mesAnterior: () => void
  mesSeguinte: () => void
  irParaHoje: () => void
  ehMesAtual: boolean
}

const VisaoContext = createContext<Estado | null>(null)
const CHAVE = 'financas.escopo'

function lerVisao(): Visao {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'compartilhado' || v === 'consolidado' ? v : 'pessoal'
  } catch {
    return 'pessoal'
  }
}

export function VisaoProvider({ children }: { children: ReactNode }) {
  const atual = primeiroDiaDoMes(hojeLocal())
  const [competencia, setCompetencia] = useState<DataLocal>(atual)
  const [visao, setVisaoState] = useState<Visao>(lerVisao)

  const setVisao = useCallback((v: Visao) => {
    setVisaoState(v)
    try { localStorage.setItem(CHAVE, v) } catch { /* sem storage: segue em memória */ }
  }, [])

  const mover = useCallback((delta: number) => {
    setCompetencia((c) => {
      const { ano, mes } = partes(c)
      const n = somarMeses(ano, mes, delta)
      return montar(n.ano, n.mes, 1)
    })
  }, [])

  const valor = useMemo<Estado>(() => ({
    competencia,
    visao,
    setVisao,
    escopoDeEscrita: visao === 'compartilhado' ? 'compartilhado' : 'pessoal',
    mesAnterior: () => mover(-1),
    mesSeguinte: () => mover(1),
    irParaHoje: () => setCompetencia(atual),
    ehMesAtual: competencia === atual,
  }), [competencia, visao, setVisao, mover, atual])

  return <VisaoContext.Provider value={valor}>{children}</VisaoContext.Provider>
}

export function useVisao(): Estado {
  const ctx = useContext(VisaoContext)
  if (!ctx) throw new Error('useVisao precisa estar dentro de <VisaoProvider>')
  return ctx
}
