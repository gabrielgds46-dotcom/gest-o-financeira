import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buscarDetalhe, cancelarFuturas, desmarcarParcelaPaga, editarLancamento, excluirLancamento,
  listarCartoesDaCasa, listarCategorias, marcarParcelaPaga, restaurarLancamento, reverterCancelamento,
  type CartaoDaCasa, type Categoria, type DetalheLancamento, type Metodo, type Natureza, type ParcelaDetalhe,
} from '../dados/lancamentos'
import { calcularParcelas, PARCELAS_MAX, type Parcela } from '../dominio/parcelas'
import {
  casarComExistentes, podeExcluir, podeMudarValor, podeReplanejar, replanejarComPagas,
  type ParcelaExistente,
} from '../dominio/edicao'
import { descreverParcelamento } from '../dominio/previa'
import { formatarMoeda } from '../lib/moeda'
import { formatarData, hojeLocal, ehDataLocal, type DataLocal } from '../lib/datas'
import { traduzErro } from '../lib/erros'
import { Aviso } from './Tela'
import { Folha } from './Folha'
import { Botao } from './Botao'
import { Campo } from './Campo'
import { CampoMoeda } from './CampoMoeda'
import { GridCategorias } from './GridCategorias'
import { Alternador } from './Alternador'
import { Icone, type NomeIcone } from './Icone'
import type { PedidoDesfazer } from './Desfazer'

type Props = {
  lancamentoId: string | null
  onFechar: () => void
  /** Recarrega a tela de trás depois de qualquer mudança. */
  onMudou: () => Promise<void>
  onDesfazer: (p: PedidoDesfazer) => void
}

/**
 * Detalhe de um lançamento, com edição, cancelamento e exclusão.
 *
 * O que a tela impede, o banco também impede (011_edicao.sql). Aqui a regra
 * aparece como botão apagado e frase curta explicando o porquê; lá ela aparece
 * como exceção. Nunca só aqui.
 */
export function FolhaLancamento({ lancamentoId, onFechar, onMudou, onDesfazer }: Props) {
  const [detalhe, setDetalhe] = useState<DetalheLancamento | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    if (!lancamentoId) return
    setCarregando(true); setErro(null)
    try { setDetalhe(await buscarDetalhe(lancamentoId)) }
    catch (e) { setErro(traduzErro((e as Error).message)) }
    finally { setCarregando(false) }
  }, [lancamentoId])

  useEffect(() => { setEditando(false); void carregar() }, [carregar])

  const parcelas: ParcelaExistente[] = useMemo(
    () => (detalhe?.parcelas ?? []).map((p) => ({
      id: p.id, numero: p.numero, valorCentavos: p.valor,
      competencia: p.competencia, vencimento: p.vencimento, status: p.status,
    })),
    [detalhe],
  )

  async function comErro(acao: () => Promise<void>) {
    setOcupado(true); setErro(null)
    try { await acao() } catch (e) { setErro(traduzErro((e as Error).message)) } finally { setOcupado(false) }
  }

  async function alternarPago(p: ParcelaDetalhe) {
    await comErro(async () => {
      if (p.status === 'pago') await desmarcarParcelaPaga(p.id)
      else await marcarParcelaPaga(p.id, hojeLocal())
      await carregar(); await onMudou()
    })
  }

  async function cancelar() {
    if (!detalhe) return
    await comErro(async () => {
      const ids = await cancelarFuturas(detalhe.id)
      onFechar(); await onMudou()
      onDesfazer({
        texto: ids.length === 1 ? '1 parcela cancelada.' : `${ids.length} parcelas canceladas.`,
        aoDesfazer: async () => { await reverterCancelamento(ids); await onMudou() },
      })
    })
  }

  async function excluir() {
    if (!detalhe) return
    await comErro(async () => {
      const retrato = await excluirLancamento(detalhe.id)
      onFechar(); await onMudou()
      onDesfazer({
        texto: 'Lançamento excluído.',
        aoDesfazer: async () => { await restaurarLancamento(retrato); await onMudou() },
      })
    })
  }

  const mesFechado = detalhe?.mes_fechado ?? false
  const daRecorrencia = !!detalhe?.recorrencia_id
  const excluivel = detalhe ? podeExcluir(parcelas, mesFechado) && !daRecorrencia : false
  const temPendente = parcelas.some((p) => p.status === 'pendente')

  return (
    <Folha aberta={!!lancamentoId} titulo={editando ? 'Editar lançamento' : 'Lançamento'} onFechar={onFechar}>
      {carregando && !detalhe && <p className="py-6 text-center text-sm text-zinc-500">Carregando…</p>}
      {erro && <div className="mb-4"><Aviso>{erro}</Aviso></div>}

      {detalhe && !editando && (
        <div className="space-y-4">
          {/* ---------- Cabeçalho ---------- */}
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: detalhe.categoria_cor + '26', color: detalhe.categoria_cor }}>
              <Icone nome={detalhe.categoria_icone as NomeIcone} tamanho={24} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">{detalhe.descricao || detalhe.categoria}</p>
              <p className="text-sm text-zinc-400">{detalhe.categoria}</p>
            </div>
            <p className="shrink-0 text-lg font-bold tabular-nums">{formatarMoeda(detalhe.valor_total)}</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm">
            <Linha rotulo="Data" valor={formatarData(detalhe.data_compra)} />
            <Linha rotulo="Método" valor={detalhe.metodo === 'credito' ? (detalhe.cartao ?? 'Crédito') : 'Pix / Débito'} />
            <Linha rotulo="Escopo" valor={detalhe.escopo === 'pessoal' ? 'Pessoal' : 'Compartilhado'} />
            {detalhe.escopo === 'compartilhado' && detalhe.pago_por_nome && (
              <Linha rotulo="Quem pagou" valor={detalhe.pago_por_nome.split(' ')[0]} />
            )}
            {detalhe.natureza === 'resgate' && <Linha rotulo="Natureza" valor="Resgate" />}
          </dl>

          {/* ---------- Parcelas ---------- */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-300">
              {detalhe.parcelas.length > 1 ? `${detalhe.parcelas.length} parcelas` : 'Parcela'}
            </h3>
            <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800">
              {detalhe.parcelas.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-10 shrink-0 text-xs text-zinc-500 tabular-nums">
                    {detalhe.parcelas.length > 1 ? `${p.numero}/${detalhe.parcelas.length}` : '—'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium tabular-nums">{formatarMoeda(p.valor)}</span>
                    <span className="block text-xs text-zinc-500">
                      vence {formatarData(p.vencimento)}
                      {p.status === 'pago' && p.pago_em && ` · pago em ${formatarData(p.pago_em)}`}
                      {p.status === 'cancelado' && ' · cancelada'}
                    </span>
                  </span>
                  {p.status === 'cancelado' ? (
                    <span className="flex h-11 w-11 items-center justify-center text-zinc-600"><Icone nome="bloqueado" tamanho={18} /></span>
                  ) : (
                    <button
                      type="button" disabled={ocupado || p.mes_fechado}
                      onClick={() => void alternarPago(p)}
                      aria-label={p.status === 'pago' ? `Desmarcar parcela ${p.numero} como paga` : `Marcar parcela ${p.numero} como paga`}
                      className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border disabled:opacity-40 ' +
                        (p.status === 'pago'
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-zinc-700 text-zinc-500 active:bg-zinc-800')}
                    >
                      <Icone nome="check" tamanho={18} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {mesFechado && <Aviso tipo="info">Mês fechado: só leitura. Reabra o mês no Início para mexer aqui.</Aviso>}
          {daRecorrencia && <Aviso tipo="info">Veio de uma recorrência. Para parar de vez, desative a recorrência no Perfil.</Aviso>}

          {/* ---------- Ações ---------- */}
          <div className="space-y-2 pt-1">
            <Botao variante="secundario" disabled={mesFechado || ocupado} onClick={() => setEditando(true)}>
              <Icone nome="editar" tamanho={18} className="mr-2" /> Editar
            </Botao>
            {temPendente && (
              <Botao variante="fantasma" disabled={mesFechado || ocupado} onClick={() => void cancelar()}>
                <Icone nome="bloqueado" tamanho={18} className="mr-2" /> Cancelar o que falta
              </Botao>
            )}
            <Botao
              variante="fantasma" ocupado={ocupado} disabled={!excluivel}
              onClick={() => void excluir()}
              className={excluivel ? 'text-red-400' : ''}
            >
              <Icone nome="lixeira" tamanho={18} className="mr-2" /> Excluir
            </Botao>
            {!excluivel && !mesFechado && !daRecorrencia && (
              <p className="px-1 text-center text-xs text-zinc-500">
                Tem parcela paga: o histórico fica. Use “Cancelar o que falta”.
              </p>
            )}
          </div>
        </div>
      )}

      {detalhe && editando && (
        <FormEdicao
          detalhe={detalhe}
          parcelas={parcelas}
          onCancelar={() => setEditando(false)}
          onSalvo={async () => { setEditando(false); await carregar(); await onMudou() }}
        />
      )}
    </Folha>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <>
      <dt className="text-zinc-500">{rotulo}</dt>
      <dd className="text-right font-medium text-zinc-200">{valor}</dd>
    </>
  )
}

// =============================================================
// Formulário de edição
//
// Dois caminhos, decididos por podeReplanejar():
//   nada pago -> replaneja do zero com calcularParcelas(), o mesmo motor
//                da tela Lançar. Data, cartão e nº de parcelas livres.
//   algo pago -> só o valor muda, redistribuído entre as pendentes por
//                replanejarComPagas(). O resto fica travado na tela e no banco.
// =============================================================
function FormEdicao({ detalhe, parcelas, onCancelar, onSalvo }: {
  detalhe: DetalheLancamento
  parcelas: ParcelaExistente[]
  onCancelar: () => void
  onSalvo: () => Promise<void>
}) {
  const livre = podeReplanejar(parcelas)
  const valorTravado = !podeMudarValor(parcelas)

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cartoes, setCartoes] = useState<CartaoDaCasa[]>([])
  const [valor, setValor] = useState<number | null>(detalhe.valor_total)
  const [categoriaId, setCategoriaId] = useState(detalhe.categoria_id)
  const [descricao, setDescricao] = useState(detalhe.descricao)
  const [data, setData] = useState<DataLocal>(detalhe.data_compra)
  const [metodo, setMetodo] = useState<Metodo>(detalhe.metodo)
  const [cartaoId, setCartaoId] = useState<string | null>(detalhe.cartao_id)
  const [natureza, setNatureza] = useState<Natureza>(detalhe.natureza)
  const [quantas, setQuantas] = useState(parcelas.filter((p) => p.status !== 'cancelado').length)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    Promise.all([listarCategorias(), listarCartoesDaCasa()])
      .then(([c, k]) => { setCategorias(c); setCartoes(k) })
      .catch((e) => setErro(traduzErro((e as Error).message)))
  }, [])

  const cartao = cartoes.find((c) => c.id === cartaoId) ?? null
  const categoria = categorias.find((c) => c.id === categoriaId) ?? null
  const ehReserva = categoria?.grupo === 'reserva'
  useEffect(() => { if (!ehReserva) setNatureza('saida') }, [ehReserva])

  // Caminho livre: prévia igual à da tela Lançar, com o mesmo motor.
  const previa = useMemo<{ parcelas: Parcela[]; erro: string | null }>(() => {
    if (!livre || !valor) return { parcelas: [], erro: null }
    try {
      return {
        parcelas: calcularParcelas({
          dataCompra: data, valorTotalCentavos: valor,
          parcelasTotal: metodo === 'credito' ? quantas : 1, metodo,
          diaFechamento: cartao?.dia_fechamento ?? detalhe.dia_fechamento ?? undefined,
          diaVencimento: cartao?.dia_vencimento ?? detalhe.dia_vencimento ?? undefined,
        }),
        erro: null,
      }
    } catch (e) { return { parcelas: [], erro: (e as Error).message } }
  }, [livre, valor, data, metodo, quantas, cartao, detalhe])

  // Caminho travado: só redistribui o restante entre as pendentes.
  const redistribuicao = useMemo(() => {
    if (livre || !valor) return null
    try { return { plano: replanejarComPagas(parcelas, valor), erro: null } }
    catch (e) { return { plano: null, erro: (e as Error).message } }
  }, [livre, valor, parcelas])

  async function salvar() {
    if (ocupado) return
    setErro(null)
    if (!valor) return setErro('Informe o valor.')
    if (!categoriaId) return setErro('Escolha uma categoria.')
    if (!ehDataLocal(data)) return setErro('Data inválida.')
    if (livre && metodo === 'credito' && !cartaoId) return setErro('Escolha o cartão.')

    let payload: Array<{ id: string | null; numero: number; valorCentavos: number; competencia: DataLocal; vencimento: DataLocal }>
    if (livre) {
      if (previa.erro) return setErro(previa.erro)
      // Só as não canceladas entram no casamento por número: uma cancelada
      // reaproveitada continuaria cancelada e sumiria do mês.
      payload = casarComExistentes(previa.parcelas, parcelas.filter((p) => p.status !== 'cancelado'))
    } else {
      if (redistribuicao?.erro) return setErro(redistribuicao.erro)
      const plano = redistribuicao?.plano
      if (!plano) return setErro('Não foi possível redistribuir o valor.')
      const porId = new Map(parcelas.map((p) => [p.id, p]))
      payload = plano.ajustes.map((a) => {
        const p = porId.get(a.id)!
        return { id: p.id, numero: p.numero, valorCentavos: a.valorCentavos, competencia: p.competencia, vencimento: p.vencimento }
      })
    }

    setOcupado(true)
    try {
      await editarLancamento({
        lancamentoId: detalhe.id, valorTotal: valor, categoriaId, descricao: descricao.trim(),
        dataCompra: livre ? data : detalhe.data_compra,
        metodo: livre ? metodo : detalhe.metodo,
        cartaoId: livre ? cartaoId : detalhe.cartao_id,
        natureza, parcelas: payload,
      })
      await onSalvo()
    } catch (e) {
      setErro(traduzErro((e as Error).message))
    } finally { setOcupado(false) }
  }

  const somaPagas = parcelas.filter((p) => p.status === 'pago').reduce((s, p) => s + p.valorCentavos, 0)

  return (
    <div className="space-y-4">
      {!livre && (
        <Aviso tipo="info">
          {formatarMoeda(somaPagas)} já saiu do caixa. Data, método e parcelas ficam como estão; a diferença é
          redistribuída entre as que ainda não venceram.
        </Aviso>
      )}
      {valorTravado && (
        <Aviso tipo="info">
          Este lançamento tem parcela cancelada, então o valor não muda mais. Dá para ajustar descrição e categoria.
        </Aviso>
      )}

      <CampoMoeda rotulo="Valor" valor={valor} onChange={setValor} grande id="editValor"
        erro={valorTravado && valor !== detalhe.valor_total ? 'Valor travado por parcela cancelada.' : undefined} />

      <div>
        <span className="mb-1.5 block text-sm font-medium text-zinc-300">Categoria</span>
        <GridCategorias categorias={categorias} valor={categoriaId} onChange={setCategoriaId} />
      </div>

      {ehReserva && (
        <Alternador<Natureza>
          rotulo="Natureza"
          opcoes={[{ valor: 'saida', rotulo: 'Guardar' }, { valor: 'resgate', rotulo: 'Resgatar' }]}
          valor={natureza} onChange={setNatureza}
        />
      )}

      <Campo id="editDescricao" rotulo="Descrição" autoComplete="off" value={descricao} onChange={(e) => setDescricao(e.target.value)} />

      {livre ? (
        <>
          <Alternador<Metodo>
            rotulo="Método"
            opcoes={[{ valor: 'credito', rotulo: 'Cartão de crédito' }, { valor: 'a_vista', rotulo: 'Pix / Débito' }]}
            valor={metodo} onChange={setMetodo}
          />
          {metodo === 'credito' && cartoes.length > 0 && (
            <div>
              <span className="mb-1.5 block text-sm font-medium text-zinc-300">Cartão</span>
              <div className="flex flex-wrap gap-2">
                {cartoes.map((c) => (
                  <button key={c.id} type="button" onClick={() => setCartaoId(c.id)}
                    className={'h-11 rounded-full border px-4 text-sm font-medium ' +
                      (c.id === cartaoId ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-zinc-700 text-zinc-300')}>
                    {c.apelido}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Campo id="editData" rotulo="Data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
            {metodo === 'credito' && (
              <div>
                <span className="mb-1.5 block text-sm font-medium text-zinc-300">Parcelas</span>
                <div className="flex h-12 items-center rounded-xl border border-zinc-800 bg-zinc-900">
                  <button type="button" aria-label="Menos parcelas" onClick={() => setQuantas((n) => Math.max(1, n - 1))} className="h-full w-12 text-xl text-zinc-300 active:bg-zinc-800">−</button>
                  <input type="text" inputMode="numeric" aria-label="Número de parcelas" value={quantas}
                    onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, '')); setQuantas(Math.min(PARCELAS_MAX, Math.max(1, n || 1))) }}
                    className="h-full w-full bg-transparent text-center text-base font-semibold outline-none" />
                  <button type="button" aria-label="Mais parcelas" onClick={() => setQuantas((n) => Math.min(PARCELAS_MAX, n + 1))} className="h-full w-12 text-xl text-zinc-300 active:bg-zinc-800">+</button>
                </div>
              </div>
            )}
          </div>
          {previa.parcelas.length > 0 && (
            <p className="rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-zinc-200" aria-live="polite">
              {descreverParcelamento(previa.parcelas)}
            </p>
          )}
          {previa.erro && valor && <Aviso>{previa.erro}</Aviso>}
        </>
      ) : (
        redistribuicao?.plano && (
          <p className="rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-zinc-200" aria-live="polite">
            {redistribuicao.plano.ajustes.length === 0
              ? 'Nada a redistribuir: tudo já foi pago.'
              : `${formatarMoeda(redistribuicao.plano.restante)} divididos em ${redistribuicao.plano.ajustes.length}x`}
          </p>
        )
      )}
      {redistribuicao?.erro && <Aviso>{redistribuicao.erro}</Aviso>}

      {erro && <Aviso>{erro}</Aviso>}

      <div className="flex gap-3 pt-1">
        <Botao variante="fantasma" onClick={onCancelar}>Voltar</Botao>
        <Botao onClick={() => void salvar()} ocupado={ocupado} disabled={valorTravado && valor !== detalhe.valor_total}>
          Salvar
        </Botao>
      </div>
    </div>
  )
}
