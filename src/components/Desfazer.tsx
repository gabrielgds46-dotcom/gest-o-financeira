import { useEffect, useRef, useState } from 'react'
import { Icone } from './Icone'

/**
 * Faixa de desfazer.
 *
 * Troca o "tem certeza?" pelo caminho contrário: a ação acontece na hora e
 * fica reversível por alguns segundos. Um diálogo de confirmação pede atenção
 * sempre, inclusive nas 99 vezes em que a pessoa acertou; a faixa só cobra
 * atenção quando errou. Por isso toda RPC destrutiva de 011_edicao.sql devolve
 * o que é preciso para voltar atrás.
 */
export type PedidoDesfazer = {
  /** O que acabou de acontecer, no passado: "Lançamento excluído". */
  texto: string
  aoDesfazer: () => Promise<void>
}

const SEGUNDOS = 6

export function Desfazer({ pedido, onFim }: { pedido: PedidoDesfazer | null; onFim: () => void }) {
  const [restante, setRestante] = useState(SEGUNDOS)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const fim = useRef(onFim)
  fim.current = onFim

  useEffect(() => {
    if (!pedido) return
    setRestante(SEGUNDOS); setOcupado(false); setErro(null)
    const t = window.setInterval(() => {
      setRestante((s) => {
        if (s <= 1) { window.clearInterval(t); fim.current(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(t)
  }, [pedido])

  if (!pedido) return null

  async function desfazer() {
    if (!pedido || ocupado) return
    setOcupado(true); setErro(null)
    try {
      await pedido.aoDesfazer()
      fim.current()
    } catch (e) {
      setErro((e as Error).message)
      setOcupado(false)
    }
  }

  return (
    // Acima da barra de abas (bottom-20) para não tapar a navegação.
    <div className="safe-bottom pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800 pl-4 shadow-2xl"
      >
        <p className="min-w-0 flex-1 py-3 text-sm text-zinc-100">
          {erro ? <span className="text-red-300">Não deu para desfazer: {erro}</span> : pedido.texto}
        </p>
        <button
          type="button"
          onClick={() => void desfazer()}
          disabled={ocupado}
          className="flex h-12 shrink-0 items-center gap-1.5 border-l border-zinc-700 px-4 text-sm font-bold text-emerald-400 active:bg-zinc-700 disabled:opacity-50"
        >
          <Icone nome="desfazer" tamanho={16} />
          Desfazer
          <span className="tabular-nums text-xs font-normal text-zinc-400">{restante}s</span>
        </button>
      </div>
    </div>
  )
}
