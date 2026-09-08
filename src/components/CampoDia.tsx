import { useId } from 'react'

type Props = {
  rotulo: string
  valor: number | null
  onChange: (dia: number | null) => void
  ajuda?: string
  erro?: string
}

/** Dia do mês, 1 a 31, teclado numérico. */
export function CampoDia({ rotulo, valor, onChange, ajuda, erro }: Props) {
  const id = useId()
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-300">{rotulo}</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        placeholder="dia"
        value={valor ?? ''}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, '')
          if (!d) return onChange(null)
          onChange(Math.min(31, Math.max(1, Number(d))))
        }}
        className={
          'h-12 w-full rounded-xl border bg-zinc-900 px-4 text-base text-zinc-100 outline-none ' +
          'placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 ' +
          (erro ? 'border-red-500' : 'border-zinc-800')
        }
      />
      {ajuda && !erro && <span className="mt-1 block text-xs text-zinc-500">{ajuda}</span>}
      {erro && <span className="mt-1 block text-sm text-red-400">{erro}</span>}
    </label>
  )
}
