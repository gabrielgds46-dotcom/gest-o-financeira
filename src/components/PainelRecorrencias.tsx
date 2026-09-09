import { useCallback, useEffect, useState } from 'react'
import { Botao } from './Botao'
import { Folha } from './Folha'
import { Aviso } from './Tela'
import { Icone } from './Icone'
import { FormRecorrencia } from './FormRecorrencia'
import { traduzErro } from '../lib/erros'
import { formatarMoeda } from '../lib/moeda'
import { atualizarRecorrencia, criarRecorrencia, listarRecorrencias, type DadosRecorrencia, type Recorrencia } from '../dados/recorrencias'

export function PainelRecorrencias({ ownerId, householdId, temParceiro }: { ownerId: string; householdId: string | null; temParceiro: boolean }) {
  const [lista, setLista] = useState<Recorrencia[]>([])
  const [folha, setFolha] = useState<'nova' | Recorrencia | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try { setLista(await listarRecorrencias()) } catch (e) { setErro(traduzErro((e as Error).message)) }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  async function salvar(d: DadosRecorrencia) {
    if (folha && folha !== 'nova') await atualizarRecorrencia(folha.id, d)
    else await criarRecorrencia(ownerId, householdId, d)
    setFolha(null); await carregar()
  }

  async function alternarAtivo(r: Recorrencia) {
    await atualizarRecorrencia(r.id, { ativo: !r.ativo })
    setFolha(null); await carregar()
  }

  const paraDados = (r: Recorrencia): DadosRecorrencia => ({
    tipo: r.tipo, escopo: r.escopo, categoria_id: r.categoria_id, metodo: r.metodo,
    cartao_id: r.cartao_id, descricao: r.descricao, valor: r.valor,
    dia_vencimento: r.dia_vencimento, inicio: r.inicio, fim: r.fim,
  })

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-400">Contas que se repetem todo mês. São geradas sozinhas na virada, com o valor esperado, e ficam editáveis quando a conta real chega.</p>
      {erro && <Aviso>{erro}</Aviso>}
      {lista.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma recorrência cadastrada.</p>
      ) : (
        <ul className="divide-y divide-zinc-800">
          {lista.map((r) => (
            <li key={r.id}>
              <button type="button" onClick={() => setFolha(r)} className="flex w-full items-center gap-3 py-3 text-left">
                <span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + (r.ativo ? (r.tipo === 'receita' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-300') : 'bg-zinc-900 text-zinc-600')}>
                  <Icone nome={r.tipo === 'receita' ? 'trending-up' : 'repetir'} tamanho={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={'block truncate font-medium ' + (r.ativo ? '' : 'text-zinc-500 line-through')}>{r.descricao}</span>
                  <span className="block text-xs text-zinc-500">
                    dia {r.dia_vencimento} · {r.escopo === 'compartilhado' ? 'compartilhado' : 'pessoal'}
                    {r.fim && ' · até ' + r.fim.slice(0, 7).split('-').reverse().join('/')}
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums">{formatarMoeda(r.valor)}</span>
                <Icone nome="seta" className="text-zinc-600" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Botao variante="secundario" onClick={() => setFolha('nova')}>+ Nova recorrência</Botao>

      <Folha aberta={folha === 'nova'} titulo="Nova recorrência" onFechar={() => setFolha(null)}>
        <FormRecorrencia temParceiro={temParceiro} onSalvar={salvar} />
      </Folha>
      <Folha aberta={!!folha && folha !== 'nova'} titulo="Editar recorrência" onFechar={() => setFolha(null)}>
        {folha && folha !== 'nova' && (
          <FormRecorrencia
            inicial={paraDados(folha)} temParceiro={temParceiro} ativo={folha.ativo}
            onSalvar={salvar} onDesativar={() => alternarAtivo(folha)}
          />
        )}
      </Folha>
    </div>
  )
}
