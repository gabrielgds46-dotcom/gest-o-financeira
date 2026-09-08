import { useEffect, type ReactNode } from 'react'
import { Icone } from './Icone'

type Props = { aberta: boolean; titulo: string; onFechar: () => void; children: ReactNode }

/** Folha inferior (bottom sheet): o padrão de modal no celular. */
export function Folha({ aberta, titulo, onFechar, children }: Props) {
  useEffect(() => {
    if (!aberta) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = anterior; window.removeEventListener('keydown', esc) }
  }, [aberta, onFechar])

  if (!aberta) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-zinc-950 px-5 pt-3 pb-6 shadow-2xl"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-zinc-700" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-800">
            <Icone nome="fechar" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
