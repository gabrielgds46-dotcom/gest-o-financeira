import { useMemo, useState } from 'react'
import { lerFrase, type Cartao, type FraseLida } from '../dominio/frase'
import { hojeLocal } from '../lib/datas'
import { Icone } from './Icone'

/**
 * Lançar escrevendo a frase inteira.
 *
 * O que ele entendeu aparece EMBAIXO, em fichas, enquanto se digita — e
 * só entra no formulário quando a pessoa confirma. A barra preenche, ela
 * não salva: um parser que lança sozinho erra em silêncio, e erro em
 * silêncio num app de dinheiro é o pior tipo.
 */
export function BarraFrase({ cartoes, onPreencher }: {
  cartoes: Cartao[]
  onPreencher: (lida: FraseLida) => void
}) {
  const [texto, setTexto] = useState('')
  const hoje = hojeLocal()

  const lida = useMemo(() => (texto.trim() ? lerFrase(texto, hoje, cartoes) : null), [texto, hoje, cartoes])
  const util = !!lida && lida.reconhecido.length > 0

  function preencher() {
    if (!lida || !util) return
    onPreencher(lida)
    setTexto('')
  }

  return (
    <div className="space-y-2">
      <div className={'flex items-center gap-2 rounded-2xl border bg-s1 px-3 transition ' +
        (util ? 'border-acao/60' : 'border-line')}>
        <Icone nome="frase" tamanho={18} className={'shrink-0 ' + (util ? 'text-acao' : 'text-ink-3')} />
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); preencher() } }}
          placeholder="mercado 187,50 no débito"
          aria-label="Escreva o lançamento em uma frase"
          autoComplete="off"
          className="h-12 w-full bg-transparent text-base outline-none placeholder:text-ink-3"
        />
        {texto && (
          <button type="button" onClick={() => setTexto('')} aria-label="Limpar frase"
            className="-mr-1 flex h-11 w-9 shrink-0 items-center justify-center text-ink-3">
            <Icone nome="fechar" tamanho={16} />
          </button>
        )}
      </div>

      {lida && (
        util ? (
          <div className="space-y-2">
            <ul className="flex flex-wrap gap-1.5" aria-live="polite">
              {lida.reconhecido.map((r, i) => (
                <li key={i} className="rounded-full bg-acao/15 px-2.5 py-1 text-xs font-semibold text-acao">{r}</li>
              ))}
              {lida.descricao && (
                <li className="rounded-full bg-s2 px-2.5 py-1 text-xs font-medium text-ink-2">“{lida.descricao}”</li>
              )}
            </ul>
            <button
              type="button" onClick={preencher}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-s2 text-sm font-semibold text-ink"
            >
              <Icone nome="check" tamanho={16} /> Preencher o formulário
            </button>
          </div>
        ) : (
          <p className="px-1 text-xs text-ink-3" aria-live="polite">
            Não achei valor nem forma de pagamento aí. Tente “mercado 187,50 no débito” ou preencha abaixo.
          </p>
        )
      )}
    </div>
  )
}
