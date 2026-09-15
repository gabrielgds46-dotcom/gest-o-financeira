import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { Icone } from './Icone'

/**
 * Tour guiado: acende um pedaço da tela por vez.
 *
 * Um passo que não encontra o seu alvo é PULADO, não mostrado vazio. A tela
 * muda conforme o mês, o escopo e o que já foi lançado — um tour que aponta
 * para um cartão inexistente ensina a desconfiar do app.
 */
export type PassoTour = {
  /** Elemento a acender. `null` = passo de texto, centralizado. */
  alvo: string | null
  titulo: string
  texto: string
}

type Caixa = { top: number; left: number; width: number; height: number }

const MARGEM = 8

export function Tour({ passos, onFim }: { passos: PassoTour[]; onFim: () => void }) {
  const [i, setI] = useState(0)
  const [caixa, setCaixa] = useState<Caixa | null>(null)

  // Descarta na entrada os passos cujo alvo não existe nesta tela.
  const [visiveis] = useState(() => passos.filter((p) => !p.alvo || document.querySelector(p.alvo)))
  const passo = visiveis[i]

  const medir = useCallback(() => {
    if (!passo?.alvo) return setCaixa(null)
    const el = document.querySelector(passo.alvo)
    if (!el) return setCaixa(null)
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const r = el.getBoundingClientRect()
    setCaixa({ top: r.top - MARGEM, left: r.left - MARGEM, width: r.width + MARGEM * 2, height: r.height + MARGEM * 2 })
  }, [passo])

  useLayoutEffect(() => { medir() }, [medir])
  useEffect(() => {
    // O scrollIntoView é suave: remede depois que ele assenta.
    const t = window.setTimeout(medir, 350)
    window.addEventListener('resize', medir)
    return () => { window.clearTimeout(t); window.removeEventListener('resize', medir) }
  }, [medir])

  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFim()
      if (e.key === 'ArrowRight' || e.key === 'Enter') setI((n) => (n + 1 >= visiveis.length ? (onFim(), n) : n + 1))
    }
    window.addEventListener('keydown', tecla)
    return () => { document.body.style.overflow = anterior; window.removeEventListener('keydown', tecla) }
  }, [onFim, visiveis.length])

  if (!passo) return null

  const ultimo = i === visiveis.length - 1
  // A cartela vai para o lado oposto do recorte, para não tapar o que acende.
  const emCima = caixa ? caixa.top + caixa.height / 2 > window.innerHeight / 2 : false

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Tour, passo ${i + 1} de ${visiveis.length}`}>
      {/* O recorte é feito com uma sombra gigante: sem SVG, sem máscara. */}
      {caixa ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-acao transition-all duration-200"
          style={{
            top: caixa.top, left: caixa.left, width: caixa.width, height: caixa.height,
            boxShadow: '0 0 0 9999px rgba(5,7,6,0.82)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(5,7,6,0.82)]" />
      )}

      {/* Toque fora avança, como em qualquer tour. */}
      <button
        type="button" aria-label="Próximo passo" onClick={() => (ultimo ? onFim() : setI(i + 1))}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <div
        className={'safe-bottom absolute inset-x-4 mx-auto max-w-sm rounded-2xl border border-line bg-s1 p-4 shadow-2xl ' +
          (emCima ? 'top-6' : 'bottom-24')}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span className="tnum text-[11px] font-bold uppercase tracking-wider text-acao">
            {i + 1} de {visiveis.length}
          </span>
          <button type="button" onClick={onFim} aria-label="Sair do tour"
            className="-my-2 -mr-2 ml-auto flex h-11 w-11 items-center justify-center rounded-full text-ink-3 active:bg-s2">
            <Icone nome="fechar" tamanho={16} />
          </button>
        </div>
        <h3 className="text-base font-bold">{passo.titulo}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{passo.texto}</p>
        <div className="mt-3 flex gap-2">
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)}
              className="flex h-11 flex-1 items-center justify-center rounded-xl bg-s2 text-sm font-semibold text-ink-2">
              Voltar
            </button>
          )}
          <button type="button" onClick={() => (ultimo ? onFim() : setI(i + 1))}
            className="flex h-11 flex-[2] items-center justify-center rounded-xl bg-acao text-sm font-bold text-bg">
            {ultimo ? 'Entendi' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
