import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { hojeLocal, primeiroDiaDoMes, partes, somarMeses, montar, type DataLocal } from '../lib/datas'
import type { Database } from '../tipos/supabase'

export type Escopo = Database['public']['Enums']['escopo_t']

type Visao = {
  /** Competência selecionada (dia 1). */
  competencia: DataLocal
  escopo: Escopo
  setEscopo: (e: Escopo) => void
  mesAnterior: () => void
  mesSeguinte: () => void
  irParaHoje: () => void
  ehMesAtual: boolean
}

const VisaoContext = createContext<Visao | null>(null)
const CHAVE = 'financas.escopo'

function lerEscopo(): Escopo {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'compartilhado' ? 'compartilhado' : 'pessoal'
  } catch {
    return 'pessoal'
  }
}

export function VisaoProvider({ children }: { children: ReactNode }) {
  const atual = primeiroDiaDoMes(hojeLocal())
  const [competencia, setCompetencia] = useState<DataLocal>(atual)
  const [escopo, setEscopoState] = useState<Escopo>(lerEscopo)

  const setEscopo = useCallback((e: Escopo) => {
    setEscopoState(e)
    try { localStorage.setItem(CHAVE, e) } catch { /* sem storage: segue em memória */ }
  }, [])

  const mover = useCallback((delta: number) => {
    setCompetencia((c) => {
      const { ano, mes } = partes(c)
      const n = somarMeses(ano, mes, delta)
      return montar(n.ano, n.mes, 1)
    })
  }, [])

  const valor = useMemo<Visao>(() => ({
    competencia,
    escopo,
    setEscopo,
    mesAnterior: () => mover(-1),
    mesSeguinte: () => mover(1),
    irParaHoje: () => setCompetencia(atual),
    ehMesAtual: competencia === atual,
  }), [competencia, escopo, setEscopo, mover, atual])

  return <VisaoContext.Provider value={valor}>{children}</VisaoContext.Provider>
}

export function useVisao(): Visao {
  const ctx = useContext(VisaoContext)
  if (!ctx) throw new Error('useVisao precisa estar dentro de <VisaoProvider>')
  return ctx
}
