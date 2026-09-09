import { useCallback, useEffect, useState } from 'react'
import { CampoMoeda } from './CampoMoeda'
import { Alternador } from './Alternador'
import { Botao } from './Botao'
import { Aviso } from './Tela'
import { Icone, type NomeIcone } from './Icone'
import { traduzErro } from '../lib/erros'
import { formatarMoeda } from '../lib/moeda'
import { hojeLocal, primeiroDiaDoMes } from '../lib/datas'
import { listarCategorias, type Categoria, type Escopo } from '../dados/lancamentos'
import { definirTeto, listarOrcamentos, removerTeto, type Orcamento } from '../dados/recorrencias'

/** Tetos por categoria, no escopo escolhido, valendo do mês corrente em diante. */
export function PainelOrcamentos({ ownerId, householdId, temParceiro }: { ownerId: string; householdId: string | null; temParceiro: boolean }) {
  const competencia = primeiroDiaDoMes(hojeLocal())
  const [escopo, setEscopo] = useState<Escopo>('pessoal')
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [tetos, setTetos] = useState<Orcamento[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [valor, setValor] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const [c, o] = await Promise.all([listarCategorias(), listarOrcamentos(escopo, competencia)])
      setCategorias(c); setTetos(o)
    } catch (e) { setErro(traduzErro((e as Error).message)) }
  }, [escopo, competencia])
  useEffect(() => { void carregar() }, [carregar])

  const tetoDe = (categoriaId: string) => tetos.find((t) => t.categoria_id === categoriaId) ?? null

  async function salvar(categoriaId: string) {
    setOcupado(true); setErro(null)
    try {
      const atual = tetoDe(categoriaId)
      if (!valor && atual) await removerTeto(atual.id)
      else if (valor) await definirTeto(ownerId, householdId, escopo, categoriaId, valor, competencia)
      setEditando(null); setValor(null)
      await carregar()
    } catch (e) { setErro(traduzErro((e as Error).message)) } finally { setOcupado(false) }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">Teto mensal por categoria. Vale a partir deste mês; meses anteriores mantêm o teto que tinham.</p>
      <Alternador<Escopo>
        rotulo="Escopo"
        opcoes={[{ valor: 'pessoal', rotulo: 'Pessoal' }, { valor: 'compartilhado', rotulo: 'Compartilhado' }]}
        valor={escopo} onChange={setEscopo} desabilitados={temParceiro ? [] : ['compartilhado']}
      />
      {erro && <Aviso>{erro}</Aviso>}
      <ul className="divide-y divide-zinc-800">
        {categorias.filter((c) => c.grupo === 'despesa').map((c) => {
          const teto = tetoDe(c.id)
          const emEdicao = editando === c.id
          return (
            <li key={c.id} className="py-2">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: c.cor + '26', color: c.cor }}>
                  <Icone nome={c.icone as NomeIcone} tamanho={18} />
                </span>
                <span className="flex-1 text-sm font-medium">{c.nome}</span>
                {!emEdicao && (
                  <button type="button" onClick={() => { setEditando(c.id); setValor(teto?.valor_mensal ?? null) }}
                    className="h-11 rounded-lg px-3 text-sm tabular-nums text-zinc-300 active:bg-zinc-800">
                    {teto ? formatarMoeda(teto.valor_mensal) : <span className="text-zinc-600">definir</span>}
                  </button>
                )}
              </div>
              {emEdicao && (
                <div className="mt-2 space-y-2">
                  <CampoMoeda rotulo={`Teto de ${c.nome}`} valor={valor} onChange={setValor} autoFocus />
                  <div className="flex gap-2">
                    <Botao onClick={() => void salvar(c.id)} ocupado={ocupado}>{valor ? 'Salvar' : 'Remover teto'}</Botao>
                    <Botao variante="fantasma" onClick={() => { setEditando(null); setValor(null) }}>Cancelar</Botao>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
