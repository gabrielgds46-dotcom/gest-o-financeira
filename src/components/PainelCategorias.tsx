import { useCallback, useEffect, useState } from 'react'
import {
  ehEmbutida, listarTodasCategorias, removerCategoria, restaurarCategoria, type Categoria,
} from '../dados/categorias'
import { traduzErro } from '../lib/erros'
import { Aviso } from './Tela'
import { Botao } from './Botao'
import { Folha } from './Folha'
import { FormCategoria } from './FormCategoria'
import { Icone, type NomeIcone } from './Icone'
import type { PedidoDesfazer } from './Desfazer'

/**
 * Lista as categorias da casa, separando as embutidas (que ninguém mexe)
 * das criadas por vocês. Remover é reversível: some se ninguém usou,
 * arquiva se já tem lançamento — nos dois casos com faixa de desfazer.
 */
export function PainelCategorias({ onDesfazer }: { onDesfazer: (p: PedidoDesfazer) => void }) {
  const [todas, setTodas] = useState<Categoria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [folha, setFolha] = useState<{ categoria: Categoria | null } | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    setErro(null)
    try { setTodas(await listarTodasCategorias()) }
    catch (e) { setErro(traduzErro((e as Error).message)) }
    finally { setCarregando(false) }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const embutidas = todas.filter(ehEmbutida)
  const nossas = todas.filter((c) => !ehEmbutida(c))

  async function remover(c: Categoria) {
    if (ocupado) return
    setOcupado(true); setErro(null)
    try {
      const r = await removerCategoria(c.id)
      await carregar()
      onDesfazer({
        texto: r.acao === 'excluida'
          ? `“${c.nome}” excluída.`
          : `“${c.nome}” arquivada — os ${r.usos} lançamentos ficam no histórico.`,
        aoDesfazer: async () => { await restaurarCategoria(r.retrato); await carregar() },
      })
    } catch (e) {
      setErro(traduzErro((e as Error).message))
    } finally { setOcupado(false) }
  }

  return (
    <div className="space-y-5">
      {erro && <Aviso>{erro}</Aviso>}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">Nossas categorias</h3>
        {carregando ? (
          <p className="text-sm text-zinc-500">Carregando…</p>
        ) : nossas.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nenhuma ainda. Crie uma para o que vocês gastam e as oito de fábrica não cobrem.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
            {nossas.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: c.cor + '26', color: c.cor }}>
                  <Icone nome={c.icone as NomeIcone} tamanho={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={'block truncate text-sm font-medium ' + (c.ativo ? '' : 'text-zinc-500 line-through')}>
                    {c.nome}
                  </span>
                  <span className="block text-xs text-zinc-500">
                    {c.grupo === 'reserva' ? 'Reserva' : 'Gasto'}{!c.ativo && ' · arquivada'}
                  </span>
                </span>
                <button
                  type="button" disabled={ocupado} onClick={() => setFolha({ categoria: c })}
                  aria-label={`Editar ${c.nome}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-800 disabled:opacity-40"
                >
                  <Icone nome="editar" tamanho={17} />
                </button>
                <button
                  type="button" disabled={ocupado} onClick={() => void remover(c)}
                  aria-label={`Remover ${c.nome}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-800 disabled:opacity-40"
                >
                  <Icone nome="lixeira" tamanho={17} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Botao variante="secundario" className="mt-3" onClick={() => setFolha({ categoria: null })}>
          + Nova categoria
        </Botao>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-zinc-300">De fábrica</h3>
        <p className="mb-2 text-xs text-zinc-500">Vêm com o app e são iguais para todo mundo — não dá para mexer.</p>
        <ul className="grid grid-cols-4 gap-2">
          {embutidas.map((c) => (
            <li key={c.id}
              className="flex h-[72px] flex-col items-center justify-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900 px-1 text-center text-[11px] text-zinc-400">
              <Icone nome={c.icone as NomeIcone} tamanho={18} />
              <span className="w-full truncate">{c.nome}</span>
            </li>
          ))}
        </ul>
      </section>

      <Folha
        aberta={!!folha}
        titulo={folha?.categoria ? 'Editar categoria' : 'Nova categoria'}
        onFechar={() => setFolha(null)}
      >
        {folha && (
          <FormCategoria
            categoria={folha.categoria}
            onSalvo={async () => { setFolha(null); await carregar() }}
          />
        )}
      </Folha>
    </div>
  )
}
