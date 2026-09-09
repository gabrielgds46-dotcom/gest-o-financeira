import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { usePerfil } from '../contexts/PerfilContext'
import { useVisao } from '../contexts/VisaoContext'
import {
  analiseCategorias, analiseMetodo, comprometimentoFuturo, evolucaoMensal,
  limitePorCartao, linhasParaExportar,
  type CategoriaAnalise, type LimiteCartao, type PontoEvolucao, type PontoFuturo, type Visao,
} from '../dados/analise'
import { resumoMes, type ResumoMes } from '../dados/lancamentos'
import { montarCsvLancamentos, nomeArquivo } from '../dominio/exportacao'
import { baixarArquivo } from '../lib/baixar'
import { formatarMoeda } from '../lib/moeda'
import { montar, partes, primeiroDiaDoMes } from '../lib/datas'
import { traduzErro } from '../lib/erros'
import { VIZ } from '../lib/viz'
import { Tela, Cartao, Aviso } from '../components/Tela'
import { SeletorMes } from '../components/SeletorMes'
import { Alternador } from '../components/Alternador'
import { Barra } from '../components/Barra'
import { Botao } from '../components/Botao'
import { Folha } from '../components/Folha'
import { Icone, type NomeIcone } from '../components/Icone'
import { TooltipViz } from '../components/graficos/Tooltip'
import { EIXO, GRADE, LARGURA_EIXO_Y, rotuloMes, rotuloValor } from '../components/graficos/Eixos'

export function Analise() {
  const { user } = useAuth()
  const { parceiro } = usePerfil()
  const { competencia, escopo } = useVisao()

  // A Análise tem uma visão própria (inclui Consolidado), semeada pelo escopo
  // das outras abas para não parecer que o app "esqueceu" onde o usuário estava.
  const [visao, setVisao] = useState<Visao>(escopo)
  const [resumo, setResumo] = useState<ResumoMes | null>(null)
  const [categorias, setCategorias] = useState<CategoriaAnalise[]>([])
  const [metodo, setMetodo] = useState({ credito: 0, a_vista: 0 })
  const [evolucao, setEvolucao] = useState<PontoEvolucao[]>([])
  const [futuro, setFuturo] = useState<PontoFuturo[]>([])
  const [cartoes, setCartoes] = useState<LimiteCartao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [folhaExport, setFolhaExport] = useState(false)

  useEffect(() => { if (!parceiro && visao !== 'pessoal') setVisao('pessoal') }, [parceiro, visao])

  const carregar = useCallback(async () => {
    setErro(null)
    try {
      const [r, c, m, e, f, k] = await Promise.all([
        resumoMes(visao === 'consolidado' ? 'compartilhado' : visao, competencia),
        analiseCategorias(visao, competencia),
        analiseMetodo(visao, competencia),
        evolucaoMensal(visao, competencia, 6),
        comprometimentoFuturo(visao, competencia, 12),
        limitePorCartao(competencia),
      ])
      setResumo(r); setCategorias(c); setMetodo(m); setEvolucao(e); setFuturo(f); setCartoes(k)
    } catch (err) {
      setErro(traduzErro((err as Error).message))
    } finally {
      setCarregando(false)
    }
  }, [visao, competencia])
  useEffect(() => { void carregar() }, [carregar])

  // % por categoria: só o grupo despesa entra no denominador (reserva é guardar,
  // não gastar). Ordenado do maior para o menor.
  const despesas = useMemo(
    () => categorias.filter((c) => c.grupo === 'despesa' && c.valor > 0).sort((a, b) => b.valor - a.valor),
    [categorias],
  )
  const totalDespesa = despesas.reduce((s, c) => s + c.valor, 0)
  const reservas = categorias.filter((c) => c.grupo === 'reserva' && c.valor > 0)

  const totalMetodo = metodo.credito + metodo.a_vista
  const rendaMes = resumo?.renda ?? 0
  // A linha da renda só entra quando fica perto das barras. Se a renda é
  // muito maior que as parcelas, ela achataria o gráfico e esconderia a
  // variação entre os meses, que é o que importa aqui.
  const maiorFuturo = Math.max(0, ...futuro.map((f) => f.valor))
  const mostrarLinhaRenda = rendaMes > 0 && maiorFuturo > 0 && rendaMes <= maiorFuturo * 1.6

  return (
    <Tela
      titulo="Análise"
      acao={
        <button type="button" onClick={() => setFolhaExport(true)} className="flex h-11 items-center gap-1.5 rounded-full bg-zinc-800 px-3 text-sm font-medium text-zinc-200 active:bg-zinc-700">
          <Icone nome="compartilhar" tamanho={16} /> CSV
        </button>
      }
    >
      <div className="space-y-4">
        <Alternador<Visao>
          rotulo="Visão"
          opcoes={[
            { valor: 'pessoal', rotulo: 'Pessoal' },
            { valor: 'compartilhado', rotulo: 'Casal' },
            { valor: 'consolidado', rotulo: 'Tudo' },
          ]}
          valor={visao} onChange={setVisao}
          desabilitados={parceiro ? [] : ['compartilhado', 'consolidado']}
        />
        {visao === 'consolidado' && parceiro && (
          <p className="text-xs text-zinc-500">
            Renda da casa inteira e os gastos que você vê. Os gastos pessoais de {parceiro.nome.split(' ')[0]} são privados e não entram.
          </p>
        )}

        <SeletorMes />
        {erro && <Aviso>{erro}</Aviso>}

        {/* ---------- Comprometimento futuro: o indicador mais importante ---------- */}
        <Cartao>
          <h2 className="text-sm font-semibold text-zinc-300">Comprometimento futuro</h2>
          <p className="mb-3 text-xs text-zinc-500">Parcelas já assumidas nos próximos 12 meses. É quanto do salário futuro já foi vendido.</p>
          {futuro.some((f) => f.valor > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={futuro} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid {...GRADE} vertical={false} />
                  <XAxis dataKey="competencia" tickFormatter={(v) => rotuloMes(v)} tickLine={false} axisLine={false} tick={EIXO} interval={0} />
                  <YAxis tickFormatter={rotuloValor} tickLine={false} axisLine={false} tick={EIXO} width={LARGURA_EIXO_Y} />
                  {mostrarLinhaRenda && (
                    <ReferenceLine y={rendaMes} stroke={VIZ.alerta} strokeDasharray="4 4" ifOverflow="extendDomain"
                      label={{ value: 'renda do mês', position: 'insideTopRight', fill: VIZ.alerta, fontSize: 10 }} />
                  )}
                  <Tooltip content={<TooltipViz />} cursor={{ fill: '#ffffff10' }} />
                  <Bar dataKey="valor" name="Parcelas" fill={VIZ.futuro} radius={[4, 4, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
              <dl className="mt-2 flex justify-between text-xs">
                <div><dt className="text-zinc-500">Total assumido</dt>
                  <dd className="text-sm font-semibold tabular-nums">{formatarMoeda(futuro.reduce((s, f) => s + f.valor, 0))}</dd></div>
                <div className="text-right"><dt className="text-zinc-500">Maior mês</dt>
                  <dd className="text-sm font-semibold tabular-nums">{formatarMoeda(Math.max(...futuro.map((f) => f.valor)))}</dd></div>
              </dl>
            </>
          ) : <Vazio carregando={carregando} texto="Nenhuma parcela pendente à frente." />}
        </Cartao>

        {/* ---------- Por categoria ---------- */}
        <Cartao>
          <h2 className="text-sm font-semibold text-zinc-300">Por categoria</h2>
          <p className="mb-3 text-xs text-zinc-500">Percentual sobre o gasto do mês. Reservas ficam fora da conta.</p>
          {despesas.length ? (
            <ul className="space-y-3">
              {despesas.map((c) => {
                const pct = Math.round((c.valor / totalDespesa) * 100)
                return (
                  <li key={c.categoria_id}>
                    <div className="mb-1 flex items-center gap-2 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: c.cor + '26', color: c.cor }}>
                        <Icone nome={c.icone as NomeIcone} tamanho={14} />
                      </span>
                      <span className="flex-1 truncate text-zinc-200">{c.nome}</span>
                      <span className="tabular-nums text-zinc-400">{formatarMoeda(c.valor)}</span>
                      <span className="w-9 text-right font-semibold tabular-nums">{pct}%</span>
                    </div>
                    <Barra valor={c.valor} maximo={totalDespesa} cor={c.cor} />
                  </li>
                )
              })}
              <li className="flex justify-between border-t border-zinc-800 pt-2 text-sm">
                <span className="text-zinc-400">Total</span>
                <b className="tabular-nums">{formatarMoeda(totalDespesa)}</b>
              </li>
              {reservas.length > 0 && (
                <li className="text-xs text-zinc-500">
                  Fora da conta: {reservas.map((r) => `${r.nome} ${formatarMoeda(r.valor)}`).join(' · ')}
                </li>
              )}
            </ul>
          ) : <Vazio carregando={carregando} texto="Nenhum gasto neste mês." />}
        </Cartao>

        {/* ---------- Crédito vs à vista ---------- */}
        <Cartao>
          <h2 className="text-sm font-semibold text-zinc-300">Como você pagou</h2>
          {totalMetodo > 0 ? (
            <>
              <div className="mt-3 flex h-4 gap-0.5 overflow-hidden rounded-full">
                <div style={{ width: `${(metodo.credito / totalMetodo) * 100}%`, backgroundColor: VIZ.credito }} />
                <div style={{ width: `${(metodo.a_vista / totalMetodo) * 100}%`, backgroundColor: VIZ.aVista }} />
              </div>
              <ul className="mt-3 space-y-1.5 text-sm">
                <LinhaMetodo cor={VIZ.credito} nome="Cartão de crédito" valor={metodo.credito} total={totalMetodo} />
                <LinhaMetodo cor={VIZ.aVista} nome="Pix / Débito" valor={metodo.a_vista} total={totalMetodo} />
              </ul>
            </>
          ) : <Vazio carregando={carregando} texto="Nenhum gasto neste mês." />}
        </Cartao>

        {/* ---------- Evolução ---------- */}
        <Cartao>
          <h2 className="text-sm font-semibold text-zinc-300">Renda e gasto, 6 meses</h2>
          {evolucao.some((e) => e.renda > 0 || e.gasto > 0) ? (
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={evolucao} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid {...GRADE} vertical={false} />
                <XAxis dataKey="competencia" tickFormatter={(v) => rotuloMes(v)} tickLine={false} axisLine={false} tick={EIXO} />
                <YAxis tickFormatter={rotuloValor} tickLine={false} axisLine={false} tick={EIXO} width={LARGURA_EIXO_Y} />
                <Tooltip content={<TooltipViz />} />
                <Legend verticalAlign="top" height={28} iconType="plainline" wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                <Line type="monotone" dataKey="renda" name="Renda" stroke={VIZ.renda} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: VIZ.renda }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="gasto" name="Gasto" stroke={VIZ.gasto} strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: VIZ.gasto }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Vazio carregando={carregando} texto="Ainda não há histórico." />}
        </Cartao>

        {/* ---------- Limite por cartão ---------- */}
        {cartoes.length > 0 && (
          <Cartao>
            <h2 className="text-sm font-semibold text-zinc-300">Limite comprometido</h2>
            <p className="mb-3 text-xs text-zinc-500">Parcelas pendentes deste mês em diante. Só os seus cartões.</p>
            <ul className="space-y-3">
              {cartoes.map((c) => (
                <li key={c.cartao_id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 text-zinc-200"><Icone nome="cartao" tamanho={16} />{c.apelido}</span>
                    <span className="tabular-nums text-zinc-400">
                      <b className="text-zinc-100">{formatarMoeda(c.comprometido)}</b>
                      {c.limite !== null && ` / ${formatarMoeda(c.limite)}`}
                    </span>
                  </div>
                  {c.limite !== null
                    ? <Barra valor={c.comprometido} maximo={c.limite} />
                    : <p className="text-xs text-zinc-600">Sem limite cadastrado.</p>}
                </li>
              ))}
            </ul>
          </Cartao>
        )}
      </div>

      <Folha aberta={folhaExport} titulo="Exportar CSV" onFechar={() => setFolhaExport(false)}>
        {user && <FormExport visao={visao} competencia={competencia} onPronto={() => setFolhaExport(false)} />}
      </Folha>
    </Tela>
  )
}

function LinhaMetodo({ cor, nome, valor, total }: { cor: string; nome: string; valor: number; total: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
      <span className="flex-1 text-zinc-300">{nome}</span>
      <span className="tabular-nums text-zinc-400">{formatarMoeda(valor)}</span>
      <span className="w-9 text-right font-semibold tabular-nums">{Math.round((valor / total) * 100)}%</span>
    </li>
  )
}

function Vazio({ carregando, texto }: { carregando: boolean; texto: string }) {
  return <p className="py-4 text-center text-sm text-zinc-600">{carregando ? '—' : texto}</p>
}

function FormExport({ visao, competencia, onPronto }: { visao: Visao; competencia: string; onPronto: () => void }) {
  const [periodo, setPeriodo] = useState<'mes' | 'ano'>('mes')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const { ano } = partes(competencia)

  async function exportar() {
    setOcupado(true); setErro(null); setAviso(null)
    try {
      const de = periodo === 'mes' ? primeiroDiaDoMes(competencia) : montar(ano, 1, 1)
      const ate = periodo === 'mes' ? primeiroDiaDoMes(competencia) : montar(ano, 12, 1)
      const linhas = await linhasParaExportar(visao, de, ate)
      if (!linhas.length) { setErro('Nenhum lançamento no período.'); return }
      const r = await baixarArquivo(nomeArquivo(visao, de, ate), montarCsvLancamentos(linhas))
      if (r === 'falhou') setErro('Não foi possível gerar o arquivo.')
      else { setAviso(`${linhas.length} linha(s) exportada(s).`); setTimeout(onPronto, 1200) }
    } catch (e) {
      setErro(traduzErro((e as Error).message))
    } finally { setOcupado(false) }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">Uma linha por parcela, com data, categoria, valor e status. Abre no Excel e no Google Sheets.</p>
      <Alternador
        rotulo="Período"
        opcoes={[{ valor: 'mes' as const, rotulo: 'Este mês' }, { valor: 'ano' as const, rotulo: `Ano de ${ano}` }]}
        valor={periodo} onChange={setPeriodo}
      />
      {erro && <Aviso>{erro}</Aviso>}
      {aviso && <Aviso tipo="ok">{aviso}</Aviso>}
      <Botao onClick={exportar} ocupado={ocupado}>Exportar</Botao>
    </div>
  )
}
