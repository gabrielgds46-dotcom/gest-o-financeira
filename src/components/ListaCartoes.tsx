import { Icone } from './Icone'
import { formatarMoeda } from '../lib/moeda'
import type { Cartao } from '../dados/cartoes'

export function ListaCartoes({ cartoes, onEditar }: { cartoes: Cartao[]; onEditar?: (c: Cartao) => void }) {
  if (cartoes.length === 0) return <p className="text-sm text-ink-3">Nenhum cartão cadastrado.</p>
  return (
    <ul className="divide-y divide-s2">
      {cartoes.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => onEditar?.(c)}
            disabled={!onEditar}
            className="flex w-full items-center gap-3 py-3 text-left disabled:cursor-default"
          >
            <span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + (c.ativo ? 'bg-acao/15 text-acao' : 'bg-s2 text-ink-3')}>
              <Icone nome="cartao" />
            </span>
            <span className="min-w-0 flex-1">
              <span className={'block truncate font-medium ' + (c.ativo ? '' : 'text-ink-3 line-through')}>{c.apelido}</span>
              <span className="block text-xs text-ink-3">
                fecha dia {c.dia_fechamento} · vence dia {c.dia_vencimento}
                {c.limite !== null && ` · limite ${formatarMoeda(c.limite)}`}
              </span>
            </span>
            {onEditar && <Icone nome="seta" className="text-ink-3" />}
          </button>
        </li>
      ))}
    </ul>
  )
}
