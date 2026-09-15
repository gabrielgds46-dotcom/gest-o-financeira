import { useMemo, useState, type ReactNode } from 'react'
import { usePerfil } from '../contexts/PerfilContext'
import { SECOES_AJUDA, buscarSecoes, comNomeDoPar } from '../conteudo/ajuda'
import { Folha } from './Folha'
import { Botao } from './Botao'
import { Icone, type NomeIcone } from './Icone'

/**
 * Ajuda em sanfona, com busca.
 *
 * Sanfona e não páginas: a pessoa que abre a ajuda já tem uma dúvida
 * específica e quer varrer os títulos com o polegar, não navegar.
 */
export function FolhaAjuda({ aberta, onFechar, onTour }: { aberta: boolean; onFechar: () => void; onTour: () => void }) {
  const { parceiro } = usePerfil()
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState<string | null>('lancar')

  const nomeDoPar = parceiro?.nome ?? null
  const achadas = useMemo(() => buscarSecoes(SECOES_AJUDA, busca), [busca])

  return (
    <Folha aberta={aberta} titulo="Como usar" onFechar={onFechar}>
      <div className="space-y-3">
        <label className="flex h-12 items-center gap-2.5 rounded-xl border border-line bg-s1 px-4">
          <Icone nome="busca" tamanho={17} className="shrink-0 text-ink-3" />
          <input
            type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="parcela, rateio, fatura…"
            aria-label="Buscar na ajuda"
            className="h-full w-full bg-transparent text-base outline-none placeholder:text-ink-3"
          />
        </label>

        <Botao onClick={onTour}>
          <Icone nome="tour" tamanho={18} className="mr-2" /> Fazer o tour guiado
        </Botao>
        <p className="-mt-1 text-center text-[11.5px] text-ink-3">Acende cada parte da tela enquanto explica.</p>

        {achadas.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-3">
            Nada sobre “{busca.trim()}”. Tente “parcela”, “rateio” ou “cartão”.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {achadas.map((s) => {
              const escancarada = aberto === s.id || (busca.trim().length >= 2 && achadas.length <= 3)
              const titulo = comNomeDoPar(s.titulo, nomeDoPar)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-expanded={escancarada}
                    onClick={() => setAberto(escancarada && aberto === s.id ? null : s.id)}
                    className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: s.cor + '24', color: s.cor }}>
                      <Icone nome={s.icone as NomeIcone} tamanho={16} />
                    </span>
                    <span className="flex-1 text-sm font-semibold">{titulo}</span>
                    <Icone nome="seta" tamanho={15} className={'shrink-0 text-ink-3 transition ' + (escancarada ? 'rotate-90' : '')} />
                  </button>
                  {escancarada && (
                    <ol className="space-y-2.5 px-3 pb-4 pt-0.5">
                      {s.passos.map((p, i) => (
                        <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-2">
                          <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-s2 text-[11px] font-bold text-ink-3">
                            {i + 1}
                          </span>
                          <span>{negrito(comNomeDoPar(p, nomeDoPar))}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Folha>
  )
}

/** `*assim*` vira negrito. Formato mínimo para o conteúdo seguir sendo dado. */
function negrito(texto: string): ReactNode {
  return texto.split(/(\*[^*]+\*)/g).map((parte, i) =>
    parte.startsWith('*') && parte.endsWith('*') && parte.length > 2
      ? <b key={i} className="font-semibold text-ink">{parte.slice(1, -1)}</b>
      : <span key={i}>{parte}</span>,
  )
}
