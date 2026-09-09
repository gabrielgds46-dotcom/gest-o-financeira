import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePerfil } from '../contexts/PerfilContext'
import { useVisao, type Escopo } from '../contexts/VisaoContext'
import {
  buscarUltimoLancamento, criarLancamento, criarReceitaExtra, gastoPorCategoria, listarCartoesDaCasa,
  listarCategorias, sugerirCategoria, type CartaoDaCasa, type Categoria, type GastoCategoria, type Metodo, type Natureza,
} from '../dados/lancamentos'
import { calcularParcelas, PARCELAS_MAX, type Parcela } from '../dominio/parcelas'
import { descreverParcelamento } from '../dominio/previa'
import { hojeLocal, primeiroDiaDoMes, ehDataLocal, type DataLocal } from '../lib/datas'
import { formatarMoeda } from '../lib/moeda'
import { traduzErro } from '../lib/erros'
import { Tela, Aviso } from '../components/Tela'
import { CampoMoeda } from '../components/CampoMoeda'
import { Campo } from '../components/Campo'
import { Alternador } from '../components/Alternador'
import { GridCategorias } from '../components/GridCategorias'
import { Botao } from '../components/Botao'
import { Folha } from '../components/Folha'
import { Icone } from '../components/Icone'

export function Lancar() {
  const { user } = useAuth()
  const { perfil, parceiro } = usePerfil()
  const { escopo: escopoVisao } = useVisao()
  const navigate = useNavigate()

  // ---------- dados de apoio ----------
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cartoes, setCartoes] = useState<CartaoDaCasa[]>([])
  const [gastos, setGastos] = useState<GastoCategoria[]>([])

  // ---------- formulário ----------
  const [valor, setValor] = useState<number | null>(null)
  const [escopo, setEscopo] = useState<Escopo>(parceiro ? escopoVisao : 'pessoal')
  const [metodo, setMetodo] = useState<Metodo>('credito')
  const [cartaoId, setCartaoId] = useState<string | null>(null)
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [categoriaManual, setCategoriaManual] = useState(false)
  const [sugerida, setSugerida] = useState<string | null>(null)
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState<DataLocal>(hojeLocal())
  const [parcelasTotal, setParcelasTotal] = useState(1)
  const [pagoPor, setPagoPor] = useState<string>(user?.id ?? '')
  const [natureza, setNatureza] = useState<Natureza>('saida')

  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [folhaRenda, setFolhaRenda] = useState(false)

  useEffect(() => {
    Promise.all([listarCategorias(), listarCartoesDaCasa()])
      .then(([c, k]) => { setCategorias(c); setCartoes(k) })
      .catch((e) => setErro(traduzErro((e as Error).message)))
  }, [])

  // Cartões elegíveis: do pagador (no compartilhado, quem pagou pode ser o par).
  const cartoesDoPagador = useMemo(() => cartoes.filter((c) => c.owner_id === (escopo === 'compartilhado' ? pagoPor : user?.id)), [cartoes, escopo, pagoPor, user])
  useEffect(() => {
    if (metodo !== 'credito') return
    if (cartoesDoPagador.length === 1) setCartaoId(cartoesDoPagador[0].id)
    else if (!cartoesDoPagador.some((c) => c.id === cartaoId)) setCartaoId(null)
  }, [metodo, cartoesDoPagador, cartaoId])

  const cartao = cartoesDoPagador.find((c) => c.id === cartaoId) ?? null
  const categoria = categorias.find((c) => c.id === categoriaId) ?? null
  const ehReserva = categoria?.grupo === 'reserva'
  useEffect(() => { if (!ehReserva) setNatureza('saida') }, [ehReserva])

  // ---------- prévia das parcelas (motor puro) ----------
  const previa = useMemo<{ parcelas: Parcela[]; erro: string | null }>(() => {
    if (!valor) return { parcelas: [], erro: null }
    try {
      const parcelas = calcularParcelas({
        dataCompra: data,
        valorTotalCentavos: valor,
        parcelasTotal: metodo === 'credito' ? parcelasTotal : 1,
        metodo,
        diaFechamento: cartao?.dia_fechamento ?? undefined,
        diaVencimento: cartao?.dia_vencimento ?? undefined,
      })
      return { parcelas, erro: null }
    } catch (e) {
      return { parcelas: [], erro: (e as Error).message }
    }
  }, [valor, data, metodo, parcelasTotal, cartao])

  // ---------- alerta de orçamento (competência da 1ª parcela) ----------
  const competenciaAlvo = previa.parcelas[0]?.competencia ?? primeiroDiaDoMes(data)
  useEffect(() => {
    gastoPorCategoria(escopo, competenciaAlvo).then(setGastos).catch(() => setGastos([]))
  }, [escopo, competenciaAlvo])
  const alertaOrcamento = useMemo(() => {
    if (!categoriaId || !previa.parcelas.length || natureza === 'resgate') return null
    const g = gastos.find((x) => x.categoria_id === categoriaId)
    if (!g || g.teto === null) return null
    const novo = g.valor + previa.parcelas[0].valorCentavos
    return novo > g.teto ? { nome: g.nome, novo, teto: g.teto } : null
  }, [categoriaId, previa.parcelas, gastos, natureza])

  // ---------- sugestão de categoria pela descrição ----------
  const timer = useRef<number | null>(null)
  useEffect(() => {
    if (!user) return
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      const id = await sugerirCategoria(user.id, descricao)
      setSugerida(id)
      if (id && !categoriaManual) setCategoriaId(id)
    }, 300)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [descricao, user, categoriaManual])

  // ---------- ações ----------
  const limpar = useCallback(() => {
    setValor(null); setDescricao(''); setParcelasTotal(1); setCategoriaId(null); setCategoriaManual(false); setSugerida(null); setNatureza('saida')
  }, [])

  async function salvar() {
    if (ocupado || !user || !perfil) return
    setErro(null); setSucesso(null)
    if (!valor) return setErro('Informe o valor.')
    if (!categoriaId) return setErro('Escolha uma categoria.')
    if (!ehDataLocal(data)) return setErro('Data inválida.')
    if (metodo === 'credito' && !cartao) return setErro('Escolha o cartão.')
    if (previa.erro) return setErro(previa.erro)
    setOcupado(true)
    try {
      await criarLancamento({
        escopo, metodo, categoriaId, valorTotal: valor, dataCompra: data, descricao: descricao.trim(),
        parcelas: previa.parcelas, cartaoId: metodo === 'credito' ? cartaoId : null,
        pagoPor: escopo === 'compartilhado' ? pagoPor : user.id,
        natureza, householdId: escopo === 'compartilhado' ? perfil.household_id : null,
      })
      setSucesso(`${formatarMoeda(valor)} lançado em ${categoria?.nome}.`)
      limpar()
    } catch (e) {
      setErro(traduzErro((e as Error).message))
    } finally {
      setOcupado(false)
    }
  }

  async function repetirUltimo() {
    if (!user) return
    try {
      const u = await buscarUltimoLancamento(user.id)
      if (!u) return setErro('Você ainda não tem lançamentos.')
      setEscopo(parceiro ? u.escopo : 'pessoal'); setMetodo(u.metodo); setCartaoId(u.cartao_id)
      setCategoriaId(u.categoria_id); setCategoriaManual(true); setDescricao(u.descricao)
      setValor(u.valor_total); setParcelasTotal(u.parcelas_total); setPagoPor(u.pago_por); setNatureza(u.natureza)
      setSucesso(null); setErro(null)
    } catch (e) { setErro(traduzErro((e as Error).message)) }
  }

  const semCartao = metodo === 'credito' && cartoesDoPagador.length === 0

  return (
    <Tela
      titulo="Lançar"
      acao={
        <button type="button" onClick={() => void repetirUltimo()} className="flex h-11 items-center gap-1.5 rounded-full bg-zinc-800 px-3 text-sm font-medium text-zinc-200 active:bg-zinc-700">
          <Icone nome="repetir" tamanho={16} /> Repetir último
        </button>
      }
    >
      <div className="space-y-5">
        <CampoMoeda rotulo="Valor" valor={valor} onChange={setValor} autoFocus grande />

        <Alternador<Escopo>
          rotulo="Escopo"
          opcoes={[{ valor: 'pessoal', rotulo: 'Pessoal' }, { valor: 'compartilhado', rotulo: 'Compartilhado' }]}
          valor={escopo} onChange={setEscopo} desabilitados={parceiro ? [] : ['compartilhado']}
        />

        <Alternador<Metodo>
          rotulo="Método"
          opcoes={[{ valor: 'credito', rotulo: 'Cartão de crédito' }, { valor: 'a_vista', rotulo: 'Pix / Débito' }]}
          valor={metodo} onChange={setMetodo}
        />

        {escopo === 'compartilhado' && parceiro && user && (
          <div>
            <span className="mb-1.5 block text-sm font-medium text-zinc-300">Quem pagou</span>
            <Alternador
              rotulo="Quem pagou"
              opcoes={[{ valor: user.id, rotulo: perfil?.nome.split(' ')[0] ?? 'Eu' }, { valor: parceiro.user_id, rotulo: parceiro.nome.split(' ')[0] }]}
              valor={pagoPor} onChange={setPagoPor}
            />
          </div>
        )}

        {metodo === 'credito' && (
          semCartao ? (
            <Aviso tipo="info">
              {escopo === 'compartilhado' && pagoPor !== user?.id
                ? `${parceiro?.nome.split(' ')[0]} ainda não cadastrou cartão.`
                : <>Cadastre um cartão no <button type="button" className="font-semibold text-emerald-400" onClick={() => navigate('/perfil')}>Perfil</button> para lançar no crédito.</>}
            </Aviso>
          ) : cartoesDoPagador.length > 1 ? (
            <div>
              <span className="mb-1.5 block text-sm font-medium text-zinc-300">Cartão</span>
              <div className="flex flex-wrap gap-2">
                {cartoesDoPagador.map((c) => (
                  <button key={c.id} type="button" onClick={() => setCartaoId(c.id)}
                    className={'h-11 rounded-full border px-4 text-sm font-medium ' + (c.id === cartaoId ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-zinc-700 text-zinc-300')}>
                    {c.apelido}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Cartão: <b className="text-zinc-300">{cartao?.apelido}</b> · fecha dia {cartao?.dia_fechamento}, vence dia {cartao?.dia_vencimento}</p>
          )
        )}

        <div>
          <span className="mb-1.5 block text-sm font-medium text-zinc-300">Categoria</span>
          <GridCategorias categorias={categorias} valor={categoriaId} sugerida={sugerida} onChange={(id) => { setCategoriaId(id); setCategoriaManual(true) }} />
        </div>

        {ehReserva && (
          <Alternador<Natureza>
            rotulo="Natureza"
            opcoes={[{ valor: 'saida', rotulo: 'Guardar' }, { valor: 'resgate', rotulo: 'Resgatar' }]}
            valor={natureza} onChange={setNatureza}
          />
        )}

        <Campo id="descricao" rotulo="Descrição" placeholder="iFood, mercado, gasolina…" autoComplete="off" value={descricao} onChange={(e) => setDescricao(e.target.value)} />

        <div className="grid grid-cols-2 gap-3">
          <Campo id="data" rotulo="Data" type="date" value={data} max={undefined} onChange={(e) => setData(e.target.value)} />
          {metodo === 'credito' && (
            <div>
              <span className="mb-1.5 block text-sm font-medium text-zinc-300">Parcelas</span>
              <div className="flex h-12 items-center rounded-xl border border-zinc-800 bg-zinc-900">
                <button type="button" aria-label="Menos parcelas" onClick={() => setParcelasTotal((n) => Math.max(1, n - 1))} className="h-full w-12 text-xl text-zinc-300 active:bg-zinc-800">−</button>
                <input type="text" inputMode="numeric" aria-label="Número de parcelas" value={parcelasTotal}
                  onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, '')); setParcelasTotal(Math.min(PARCELAS_MAX, Math.max(1, n || 1))) }}
                  className="h-full w-full bg-transparent text-center text-base font-semibold outline-none" />
                <button type="button" aria-label="Mais parcelas" onClick={() => setParcelasTotal((n) => Math.min(PARCELAS_MAX, n + 1))} className="h-full w-12 text-xl text-zinc-300 active:bg-zinc-800">+</button>
              </div>
            </div>
          )}
        </div>

        {/* Prévia obrigatória */}
        {previa.parcelas.length > 0 && (
          <p className="rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-zinc-200" aria-live="polite">
            {descreverParcelamento(previa.parcelas)}
          </p>
        )}
        {previa.erro && valor && metodo === 'credito' && cartao && <Aviso>{previa.erro}</Aviso>}

        {alertaOrcamento && (
          <Aviso>
            <span className="inline-flex items-center gap-2"><Icone nome="alerta" tamanho={16} />
              Estoura o orçamento de {alertaOrcamento.nome}: {formatarMoeda(alertaOrcamento.novo)} de {formatarMoeda(alertaOrcamento.teto)}.
            </span>
          </Aviso>
        )}

        {erro && <Aviso>{erro}</Aviso>}
        {sucesso && (
          <Aviso tipo="ok">
            {sucesso} <button type="button" className="ml-1 font-semibold underline" onClick={() => navigate('/')}>Ver início</button>
          </Aviso>
        )}

        <Botao onClick={salvar} ocupado={ocupado} disabled={semCartao}>Lançar</Botao>
        <Botao variante="secundario" onClick={() => setFolhaRenda(true)}>+ Renda extra</Botao>
      </div>

      <Folha aberta={folhaRenda} titulo="Renda extra" onFechar={() => setFolhaRenda(false)}>
        {user && perfil && (
          <FormRendaExtra
            userId={user.id} householdId={perfil.household_id} temParceiro={!!parceiro}
            onSalvo={() => { setFolhaRenda(false); setSucesso('Renda extra registrada.') }}
          />
        )}
      </Folha>
    </Tela>
  )
}

function FormRendaExtra({ userId, householdId, temParceiro, onSalvo }: { userId: string; householdId: string | null; temParceiro: boolean; onSalvo: () => void }) {
  const [valor, setValor] = useState<number | null>(null)
  const [descricao, setDescricao] = useState('')
  const [escopo, setEscopo] = useState<Escopo>('pessoal')
  const [competencia, setCompetencia] = useState<DataLocal>(primeiroDiaDoMes(hojeLocal()))
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar() {
    if (!valor) return setErro('Informe o valor.')
    setOcupado(true); setErro(null)
    try {
      await criarReceitaExtra({ ownerId: userId, escopo, valor, competencia: primeiroDiaDoMes(competencia), descricao: descricao.trim() || 'Renda extra', householdId })
      onSalvo()
    } catch (e) { setErro(traduzErro((e as Error).message)) } finally { setOcupado(false) }
  }

  return (
    <div className="space-y-4">
      <CampoMoeda rotulo="Valor" valor={valor} onChange={setValor} autoFocus grande />
      <Campo id="descRenda" rotulo="Descrição" placeholder="Freela, bônus, venda…" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      <Alternador<Escopo>
        rotulo="Escopo"
        opcoes={[{ valor: 'pessoal', rotulo: 'Pessoal' }, { valor: 'compartilhado', rotulo: 'Compartilhado' }]}
        valor={escopo} onChange={setEscopo} desabilitados={temParceiro ? [] : ['compartilhado']}
      />
      <Campo id="mesRenda" rotulo="Mês de referência" type="date" value={competencia} onChange={(e) => setCompetencia(e.target.value)} />
      {erro && <Aviso>{erro}</Aviso>}
      <Botao onClick={salvar} ocupado={ocupado}>Registrar renda</Botao>
    </div>
  )
}
