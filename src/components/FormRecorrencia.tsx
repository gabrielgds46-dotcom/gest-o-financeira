import { useEffect, useState } from 'react'
import { Campo } from './Campo'
import { CampoDia } from './CampoDia'
import { CampoMoeda } from './CampoMoeda'
import { Alternador } from './Alternador'
import { GridCategorias } from './GridCategorias'
import { Botao } from './Botao'
import { Aviso } from './Tela'
import { traduzErro } from '../lib/erros'
import { hojeLocal, primeiroDiaDoMes, type DataLocal } from '../lib/datas'
import { listarCartoesDaCasa, listarCategorias, type CartaoDaCasa, type Categoria, type Escopo, type Metodo } from '../dados/lancamentos'
import type { DadosRecorrencia } from '../dados/recorrencias'

type Props = {
  inicial?: DadosRecorrencia
  temParceiro: boolean
  onSalvar: (d: DadosRecorrencia) => Promise<void>
  onDesativar?: () => Promise<void>
  ativo?: boolean
}

export function FormRecorrencia({ inicial, temParceiro, onSalvar, onDesativar, ativo }: Props) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cartoes, setCartoes] = useState<CartaoDaCasa[]>([])
  const [tipo, setTipo] = useState<'despesa' | 'receita'>(inicial?.tipo ?? 'despesa')
  const [escopo, setEscopo] = useState<Escopo>(inicial?.escopo ?? 'pessoal')
  const [metodo, setMetodo] = useState<Metodo>(inicial?.metodo ?? 'a_vista')
  const [cartaoId, setCartaoId] = useState<string | null>(inicial?.cartao_id ?? null)
  const [categoriaId, setCategoriaId] = useState<string | null>(inicial?.categoria_id ?? null)
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')
  const [valor, setValor] = useState<number | null>(inicial?.valor ?? null)
  const [dia, setDia] = useState<number | null>(inicial?.dia_vencimento ?? null)
  const [temFim, setTemFim] = useState(!!inicial?.fim)
  const [fim, setFim] = useState<DataLocal>(inicial?.fim ?? hojeLocal())
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    Promise.all([listarCategorias(), listarCartoesDaCasa()])
      .then(([c, k]) => { setCategorias(c); setCartoes(k) })
      .catch(() => { /* sem catálogo: a validação abaixo bloqueia o salvamento */ })
  }, [])

  useEffect(() => { if (metodo === 'credito' && cartoes.length === 1) setCartaoId(cartoes[0].id) }, [metodo, cartoes])

  async function salvar() {
    setErro(null)
    if (!descricao.trim()) return setErro('Dê um nome (aluguel, luz, faculdade…).')
    if (!valor) return setErro('Informe o valor esperado.')
    if (!dia) return setErro('Informe o dia do vencimento.')
    if (tipo === 'despesa' && !categoriaId) return setErro('Escolha a categoria.')
    if (tipo === 'despesa' && metodo === 'credito' && !cartaoId) return setErro('Escolha o cartão.')
    setOcupado(true)
    try {
      await onSalvar({
        tipo, escopo,
        categoria_id: tipo === 'despesa' ? categoriaId : null,
        metodo: tipo === 'despesa' ? metodo : null,
        cartao_id: tipo === 'despesa' && metodo === 'credito' ? cartaoId : null,
        descricao: descricao.trim(), valor, dia_vencimento: dia,
        inicio: inicial?.inicio ?? primeiroDiaDoMes(hojeLocal()),
        fim: temFim ? fim : null,
      })
    } catch (e) { setErro(traduzErro((e as Error).message)) } finally { setOcupado(false) }
  }

  return (
    <div className="space-y-4">
      <Alternador
        rotulo="Tipo"
        opcoes={[{ valor: 'despesa' as const, rotulo: 'Despesa' }, { valor: 'receita' as const, rotulo: 'Receita' }]}
        valor={tipo} onChange={setTipo}
      />
      <Campo id="descRec" rotulo="Nome" placeholder="Aluguel, luz, faculdade…" autoFocus value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      <CampoMoeda rotulo="Valor esperado" valor={valor} onChange={setValor} />
      <CampoDia rotulo="Vence todo dia" valor={dia} onChange={setDia} ajuda="o valor real é editável quando a conta chega" />

      <Alternador<Escopo>
        rotulo="Escopo"
        opcoes={[{ valor: 'pessoal', rotulo: 'Pessoal' }, { valor: 'compartilhado', rotulo: 'Compartilhado' }]}
        valor={escopo} onChange={setEscopo} desabilitados={temParceiro ? [] : ['compartilhado']}
      />

      {tipo === 'despesa' && (
        <>
          <Alternador<Metodo>
            rotulo="Método"
            opcoes={[{ valor: 'a_vista', rotulo: 'Pix / Débito' }, { valor: 'credito', rotulo: 'Cartão' }]}
            valor={metodo} onChange={setMetodo}
          />
          {metodo === 'credito' && cartoes.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {cartoes.map((c) => (
                <button key={c.id} type="button" onClick={() => setCartaoId(c.id)}
                  className={'h-11 rounded-full border px-4 text-sm font-medium ' + (c.id === cartaoId ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-zinc-700 text-zinc-300')}>
                  {c.apelido}
                </button>
              ))}
            </div>
          )}
          {metodo === 'credito' && cartoes.length === 0 && <Aviso tipo="info">Cadastre um cartão antes de usar o crédito.</Aviso>}
          <div>
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">Categoria</span>
            <GridCategorias categorias={categorias} valor={categoriaId} onChange={setCategoriaId} />
          </div>
        </>
      )}

      <label className="flex items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3">
        <input type="checkbox" checked={temFim} onChange={(e) => setTemFim(e.target.checked)} className="h-5 w-5 accent-emerald-500" />
        <span className="text-sm text-zinc-300">Tem data para acabar</span>
      </label>
      {temFim && <Campo id="fimRec" rotulo="Último mês" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />}

      {erro && <Aviso>{erro}</Aviso>}
      <Botao onClick={salvar} ocupado={ocupado}>Salvar</Botao>
      {onDesativar && (
        <Botao variante="fantasma" onClick={() => void onDesativar()}>{ativo ? 'Desativar' : 'Reativar'}</Botao>
      )}
    </div>
  )
}
