type Opcao<T extends string> = { valor: T; rotulo: string }

type Props<T extends string> = {
  opcoes: Opcao<T>[]
  valor: T
  onChange: (v: T) => void
  rotulo?: string
  desabilitados?: T[]
}

/** Toggle segmentado, alvo de toque grande. */
export function Alternador<T extends string>({ opcoes, valor, onChange, rotulo, desabilitados = [] }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="flex rounded-xl bg-zinc-900 p-1">
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        const off = desabilitados.includes(o.valor)
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            disabled={off}
            onClick={() => onChange(o.valor)}
            className={
              'h-11 flex-1 rounded-lg text-sm font-semibold transition ' +
              (ativo ? 'bg-zinc-700 text-zinc-50 shadow' : off ? 'text-zinc-600' : 'text-zinc-400 active:bg-zinc-800')
            }
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
