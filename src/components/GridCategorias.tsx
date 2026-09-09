import { Icone, type NomeIcone } from './Icone'
import type { Categoria } from '../dados/lancamentos'

type Props = { categorias: Categoria[]; valor: string | null; onChange: (id: string) => void; sugerida?: string | null }

/** Grade de ícones, nunca dropdown. Reserva (investimento/poupança) aparece por último. */
export function GridCategorias({ categorias, valor, onChange, sugerida }: Props) {
  return (
    <div role="radiogroup" aria-label="Categoria" className="grid grid-cols-4 gap-2">
      {categorias.map((c) => {
        const ativo = c.id === valor
        const eh = sugerida === c.id && !ativo
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(c.id)}
            style={ativo ? { backgroundColor: c.cor + '26', borderColor: c.cor, color: c.cor } : undefined}
            className={
              'flex h-[72px] flex-col items-center justify-center gap-1 rounded-xl border text-[11px] font-medium transition active:scale-95 ' +
              (ativo ? '' : eh ? 'border-emerald-500/60 bg-zinc-900 text-zinc-200' : 'border-zinc-800 bg-zinc-900 text-zinc-400')
            }
          >
            <Icone nome={c.icone as NomeIcone} />
            <span className="truncate px-1">{c.nome}</span>
          </button>
        )
      })}
    </div>
  )
}
