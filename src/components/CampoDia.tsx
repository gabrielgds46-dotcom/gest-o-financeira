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
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{rotulo}</span>
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
          'h-12 w-full rounded-xl border bg-s1 px-4 text-base text-ink outline-none ' +
          'placeholder:text-ink-3 focus:border-acao focus:ring-2 focus:ring-acao/30 ' +
          (erro ? 'border-perigo' : 'border-s2')
        }
      />
      {ajuda && !erro && <span className="mt-1 block text-xs text-ink-3">{ajuda}</span>}
      {erro && <span className="mt-1 block text-sm text-perigo">{erro}</span>}
    </label>
  )
}
