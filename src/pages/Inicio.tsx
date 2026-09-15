import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePerfil } from '../contexts/PerfilContext'
import { useVisao, type Visao } from '../contexts/VisaoContext'
import {
  desmarcarParcelaPaga, fecharMes, garantirSalario, gastoPorCategoria, lancamentosDoMes,
  marcarParcelaPaga, mesEstaFechado, reabrirMes, registrarAcerto, resumoMes, saldoCasal,
  type GastoCategoria, type LancamentoDoMes, type ResumoMes, type SaldoCasal,
} from '../dados/lancamentos'
import { gerarPendentes } from '../dados/recorrencias'
import { formatarMoeda } from '../lib/moeda'
import { hojeLocal, primeiroDiaDoMes, compararDatas, partes, diasNoMes, diasEntre } from '../lib/datas'
import { traduzErro } from '../lib/erros'
import { useTempoReal } from '../lib/tempoReal'
import { Tela, Aviso } from '../components/Tela'
import { SeletorMes } from '../components/SeletorMes'
import { Alternador } from '../components/Alternador'
import { Botao } from '../components/Botao'
import { Folha } from '../components/Folha'
import { CampoMoeda } from '../components/CampoMoeda'
import { Campo } from '../components/Campo'
import { Icone, type NomeIcone } from '../components/Icone'
import { Hero } from '../components/Hero'
import { Vazio } from '../components/Vazio'
import { FolhaLancamento } from '../components/FolhaLancamento'
import { FolhaSemana } from '../components/FolhaSemana'
import { Desfazer, type PedidoDesfazer } from '../components/Desfazer'

const LIMITE_COMPROMETIMENTO = 0.3

/** Uma linha da lista, vinda do "a vencer" ou do mês inteiro. */
type Linha = {
  parcelaId: string
  lancamentoId: string
  titulo: string
  subtitulo: string
  valor: number
  vencimento: string
  cor: string
  icone: string
  pago: boolean
  diasRestantes: number | null
}

export function Inicio() {
  const { user } = useAuth()
  const { perfil, casa, membros, parceiro } = usePerfil()
  const { competencia, visao, setVisao, ehMesAtual } = useVisao()

  const [resumo, setResumo] = useState<ResumoMes | null>(null)
  const [categorias, setCategorias] = useState<GastoCategoria[]>([])
  const [lista, setLista] = useState<LancamentoDoMes[]>([])
  const [saldos, setSaldos] = useState<SaldoCasal[]>([])
  const [fechado, setFechado] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [folhaAcerto, setFolhaAcerto] = useState(false)
  const [detalheId, setDetalheId] = useState<string | null>(null)
  const [pedido, setPedido] = useState<PedidoDesfazer | null>(null)
  const [verTudo, setVerTudo] = useState(false)
  // ?semana=1 é para onde a notificação de segunda aponta.
  const [params, setParams] = useSearchParams()
  const folhaSemana = params.get('semana') === '1'

  const hoje = hojeLocal()
  const householdId = perfil?.household_id ?? null

  const carregar = useCallback(async () => {
    if (!user || !perfil) return
    setErro(null)
    try {
      if (compararDatas(competencia, primeiroDiaDoMes(perfil.created_at.slice(0, 10))) >= 0) {
        await garantirSalario(competencia)
        await gerarPendentes(competencia)
      }
      // Uma consulta só para as duas listas. A de "ainda vence" é a mesma do
      // mês, filtrada por status — separá-las em duas RPCs deixava a segunda
      // presa ao mês corrente enquanto o seletor apontava para outro.
      const [r, c, f, s, l] = await Promise.all([
        resumoMes(visao, competencia),
        gastoPorCategoria(visao, competencia),
        // Fechar mês é por escopo: no consolidado a pergunta não existe.
        visao === 'consolidado' ? Promise.resolve(false) : mesEstaFechado(visao, competencia, user.id, householdId),
        visao !== 'pessoal' && householdId ? saldoCasal(householdId) : Promise.resolve([]),
        lancamentosDoMes(visao, competencia),
      ])
      setResumo(r); setCategorias(c); setFechado(f); setSaldos(s); setLista(l)
    } catch (e) {
      setErro(traduzErro((e as Error).message))
    } finally {
      setCarregando(false)
    }
  }, [user, perfil, competencia, visao, householdId])

  useEffect(() => { void carregar() }, [carregar])
  useTempoReal(['lancamentos', 'parcelas', 'receitas', 'acertos', 'meses_fechados', 'orcamentos'], carregar)

  // Marcar pago é um toque só, e o toque errado é fácil. Em vez de confirmar
  // antes, o app deixa voltar atrás depois.
  async function pagar(parcelaId: string, titulo: string) {
    try {
      await marcarParcelaPaga(parcelaId, hoje)
      await carregar()
      setPedido({
        texto: `${titulo} marcado como pago.`,
        aoDesfazer: async () => { await desmarcarParcelaPaga(parcelaId); await carregar() },
      })
    } catch (e) { setErro(traduzErro((e as Error).message)) }
  }

  async function alternarFechamento() {
    if (!user || visao === 'consolidado') return
    try {
      if (fechado) await reabrirMes(visao, competencia, user.id, householdId)
      else await fecharMes(visao, competencia, user.id, householdId)
      await carregar()
    } catch (e) { setErro(traduzErro((e as Error).message)) }
  }

  const linhas = useMemo<Linha[]>(() => (
    lista
      .filter((l) => verTudo || l.status === 'pendente')
      .map((l) => ({
        parcelaId: l.parcela_id, lancamentoId: l.lancamento_id,
        titulo: l.descricao || l.categoria_nome,
        subtitulo: [
          l.parcelas_total > 1 ? `${l.numero}/${l.parcelas_total}` : '',
          l.cartao_apelido ?? (l.metodo === 'a_vista' ? 'Pix / Débito' : ''),
        ].filter(Boolean).join(' · '),
        valor: l.valor, vencimento: l.vencimento, cor: l.categoria_cor, icone: l.categoria_icone,
        pago: l.status === 'pago',
        // A contagem de dias só quer dizer algo no mês corrente.
        diasRestantes: l.status === 'pendente' && ehMesAtual ? diasEntre(hoje, l.vencimento) : null,
      }))
  ), [verTudo, lista, ehMesAtual, hoje])

  const podeFechar = compararDatas(competencia, primeiroDiaDoMes(hoje)) < 0
  const comTeto = categorias.filter((c) => c.teto !== null || c.valor > 0)
  const nomePor = (id: string) => membros.find((m) => m.user_id === id)?.nome.split(' ')[0] ?? '?'
  const devedor = saldos.find((s) => s.saldo < 0)
  const credor = saldos.find((s) => s.saldo > 0)

  // "dia 11 de 30": quanto de mês ainda falta. Só no mês corrente — nos outros
  // não quer dizer nada.
  const progresso = ehMesAtual ? `dia ${partes(hoje).dia} de ${diasNoMes(partes(hoje).ano, partes(hoje).mes)}` : null

  return (
    <Tela
      titulo={casa?.nome ?? 'Início'}
      subtitulo={progresso ?? undefined}
      acao={
        <Link to="/lancar" aria-label="Lançar" data-tour="lancar" className="flex h-11 w-11 items-center justify-center rounded-full bg-acao text-bg active:scale-95">
          <Icone nome="mais" />
        </Link>
      }
    >
      <div className="space-y-4">
        <div data-tour="visao">
          <Alternador<Visao>
            rotulo="Visão"
            opcoes={[
              { valor: 'pessoal', rotulo: 'Meu' },
              { valor: 'compartilhado', rotulo: 'Casal' },
              { valor: 'consolidado', rotulo: 'Tudo' },
            ]}
            valor={visao}
            onChange={setVisao}
            desabilitados={parceiro ? [] : ['compartilhado', 'consolidado']}
          />
        </div>
        {!parceiro && <p className="text-xs text-ink-3">Casal e Tudo ativam quando seu par entrar na casa.</p>}
        {visao === 'consolidado' && (
          <p className="text-xs text-ink-3">
            Seu pessoal mais o compartilhado da casa. A renda aqui é a sua mais a da casa — não entra o
            salário do seu par, senão o número ficaria otimista.
          </p>
        )}

        <div data-tour="mes"><SeletorMes /></div>

        {erro && <Aviso>{erro}</Aviso>}
        {fechado && (
          <Aviso tipo="info">
            <span className="inline-flex items-center gap-2"><Icone nome="cadeado" tamanho={16} /> Mês fechado: somente leitura.</span>
          </Aviso>
        )}

        <div data-tour="hero"><Hero resumo={resumo} carregando={carregando} /></div>

        <button
          type="button"
          onClick={() => setParams({ semana: '1' })}
          className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-line bg-s1 px-4 text-left active:bg-s2"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-s2 text-ink-2">
            <Icone nome="calendario" tamanho={16} />
          </span>
          <span className="flex-1 text-sm font-semibold">Resumo da semana</span>
          <Icone nome="seta" tamanho={16} className="shrink-0 text-ink-3" />
        </button>

        {resumo && resumo.comprometimento > LIMITE_COMPROMETIMENTO && (
          <Aviso>
            <span className="inline-flex items-center gap-2"><Icone nome="alerta" tamanho={16} /> Crédito compromete {formatarPct(resumo.comprometimento)} da renda do mês. Acima de 30%.</span>
          </Aviso>
        )}

        {/* ---------- Lista do mês ---------- */}
        <Secao
          titulo={verTudo ? 'Tudo deste mês' : 'Ainda vence este mês'}
          acao={
            <button type="button" onClick={() => setVerTudo((v) => !v)} className="-my-3 flex min-h-[44px] items-center px-1 text-xs font-semibold text-acao">
              {verTudo ? 'Só o que vence' : 'Ver tudo'}
            </button>
          }
        >
          {carregando ? (
            <p className="py-2 text-sm text-ink-3">Carregando…</p>
          ) : linhas.length === 0 ? (
            verTudo ? (
              <Vazio
                icone="receipt"
                titulo="Nenhum lançamento neste mês"
                texto={ehMesAtual
                  ? 'Assim que você lançar o primeiro gasto ele aparece aqui, junto com as parcelas que caem neste mês.'
                  : 'Este mês não teve movimento. Use as setas acima para olhar outro.'}
                acao={ehMesAtual ? <Link to="/lancar" className="flex h-12 w-full items-center justify-center rounded-xl bg-acao text-base font-semibold text-bg">Lançar o primeiro</Link> : undefined}
              />
            ) : (
              <Vazio
                icone="check"
                titulo={lista.length === 0 ? 'Nada lançado ainda' : 'Tudo pago'}
                texto={lista.length === 0
                  ? 'Quando houver contas neste mês, as que ainda não foram pagas ficam aqui.'
                  : 'Nenhuma conta em aberto neste mês. Toque em “Ver tudo” para rever o que já foi pago.'}
              />
            )
          ) : (
            <ul data-tour="lista">
              {linhas.map((l) => (
                <li key={l.parcelaId} className="border-t border-line first:border-t-0">
                  <div className={'flex items-center gap-2.5 ' + (l.pago ? 'opacity-[0.42]' : '')}>
                    <button
                      type="button" onClick={() => setDetalheId(l.lancamentoId)}
                      className="flex min-h-[62px] flex-1 items-center gap-2.5 rounded-xl px-1 text-left active:bg-s1"
                    >
                      <Dia vencimento={l.vencimento} dias={l.diasRestantes} />
                      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]"
                        style={{ backgroundColor: l.cor + '24', color: l.cor }}>
                        <Icone nome={l.icone as NomeIcone} tamanho={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14.5px] font-semibold">{l.titulo}</span>
                        {l.subtitulo && <span className="block truncate text-[11.5px] text-ink-3">{l.subtitulo}</span>}
                      </span>
                      <span className="tnum shrink-0 text-[15px] font-semibold tracking-[-0.02em]">{formatarMoeda(l.valor)}</span>
                    </button>
                    {l.pago ? (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center text-acao" aria-label="Pago">
                        <Icone nome="check" tamanho={18} />
                      </span>
                    ) : (
                      <button
                        type="button" onClick={() => void pagar(l.parcelaId, l.titulo)}
                        aria-label={`Marcar ${l.titulo} como pago`}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-3 active:bg-s2"
                      >
                        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-line">
                          <Icone nome="check" tamanho={16} />
                        </span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        {/* ---------- Orçamento ---------- */}
        <Secao titulo="Orçamento">
          {comTeto.length === 0 ? (
            <Vazio
              icone="analise"
              titulo="Sem gastos neste mês"
              texto="Conforme você lançar, cada categoria aparece aqui com o quanto já foi. Tetos mensais são opcionais e ficam em Perfil, Orçamentos."
            />
          ) : (
            <ul className="space-y-3.5" data-tour="orcamento">
              {comTeto.map((c) => {
                const estourou = c.teto !== null && c.valor > c.teto
                return (
                  <li key={c.categoria_id}>
                    <div className="mb-1.5 flex items-center gap-2 text-[13px]">
                      <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: c.cor + '24', color: c.cor }}>
                        <Icone nome={c.icone as NomeIcone} tamanho={14} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                      <span className="tnum shrink-0 text-ink-2">
                        <b className={estourou ? 'text-perigo' : 'text-ink'}>{formatarMoeda(c.valor)}</b>
                        {c.teto !== null && ` / ${formatarMoeda(c.teto)}`}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-s2">
                      <i className="block h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (c.valor / Math.max(c.teto ?? c.valor, 1)) * 100)}%`,
                          backgroundColor: estourou ? 'var(--color-perigo)' : c.cor,
                        }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Secao>

        {/* ---------- Entre vocês ---------- */}
        {visao !== 'pessoal' && parceiro && user && (
          <Secao titulo="Entre vocês">
            <div className="rounded-[20px] border border-line bg-s1 p-4">
              <div className="mb-3 flex flex-wrap gap-2.5">
                {membros.map((m, i) => (
                  <Pessoa key={m.user_id} nome={m.nome} pct={m.percentual_rateio} indice={i} />
                ))}
              </div>
              {devedor && credor ? (
                <p className="text-[17px] font-semibold tracking-[-0.02em]">
                  <span className={devedor.user_id === user.id ? 'text-p1' : 'text-p2'}>{nomePor(devedor.user_id)}</span>
                  {' '}deve <b className="tnum">{formatarMoeda(-devedor.saldo)}</b> a {nomePor(credor.user_id)}
                </p>
              ) : (
                <p className="text-[17px] font-semibold tracking-[-0.02em] text-ink-2">Contas zeradas</p>
              )}
              {devedor && credor && (
                <Botao variante="secundario" className="mt-3" onClick={() => setFolhaAcerto(true)}>Registrar acerto</Botao>
              )}
            </div>
          </Secao>
        )}

        {visao !== 'consolidado' && (podeFechar || fechado) && (
          <Botao variante="fantasma" onClick={() => void alternarFechamento()}>
            <Icone nome="cadeado" tamanho={18} className="mr-2" /> {fechado ? 'Reabrir mês' : 'Fechar mês'}
          </Botao>
        )}
      </div>

      <FolhaLancamento
        lancamentoId={detalheId}
        onFechar={() => setDetalheId(null)}
        onMudou={carregar}
        onDesfazer={setPedido}
      />

      <FolhaSemana aberta={folhaSemana} visao={visao} onFechar={() => setParams({})} />

      <Desfazer pedido={pedido} onFim={() => setPedido(null)} />

      <Folha aberta={folhaAcerto} titulo="Registrar acerto" onFechar={() => setFolhaAcerto(false)}>
        {devedor && credor && householdId && (
          <FormAcerto
            householdId={householdId}
            de={devedor.user_id} para={credor.user_id}
            nomeDe={nomePor(devedor.user_id)} nomePara={nomePor(credor.user_id)}
            sugestao={-devedor.saldo}
            onSalvo={async () => { setFolhaAcerto(false); await carregar() }}
          />
        )}
      </Folha>
    </Tela>
  )
}

function Secao({ titulo, acao, children }: { titulo: string; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="pt-2">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.04em] text-ink-2">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  )
}

/**
 * Selo do dia. Substitui o "em 4 dias" solto por uma âncora visual: a data
 * é o que se procura ao correr o olho por uma lista de contas.
 */
function Dia({ vencimento, dias }: { vencimento: string; dias: number | null }) {
  const { dia } = partes(vencimento)
  const urgente = dias !== null && dias <= 2
  const texto = dias === null ? mesCurto(vencimento)
    : dias < 0 ? `${-dias}d atrás`
    : dias === 0 ? 'hoje'
    : dias === 1 ? 'amanhã'
    : `${dias} dias`
  return (
    <span className={'flex w-[52px] shrink-0 flex-col items-center justify-center rounded-[10px] px-0.5 py-1.5 leading-tight ' +
      (urgente ? 'bg-perigo/15 text-perigo' : 'bg-s2')}>
      <b className="tnum text-base font-bold">{String(dia).padStart(2, '0')}</b>
      <span className={'text-[10px] ' + (urgente ? '' : 'text-ink-3')}>{texto}</span>
    </span>
  )
}

/** Azul e âmbar, não verde e vermelho: sobrevivem ao daltonismo. */
function Pessoa({ nome, pct, indice }: { nome: string; pct: number; indice: number }) {
  const p1 = indice === 0
  return (
    <span className={'flex items-center gap-1.5 text-xs ' + (p1 ? 'text-p1' : 'text-p2')}>
      <i className={'flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11px] font-extrabold not-italic ' +
        (p1 ? 'bg-p1/20' : 'bg-p2/20')}>
        {nome.trim().charAt(0).toUpperCase()}
      </i>
      <span className="text-ink-2">{nome.split(' ')[0]} {Math.round(pct)}%</span>
    </span>
  )
}

function mesCurto(data: string): string {
  const { mes } = partes(data)
  return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][mes - 1]
}

function FormAcerto({ householdId, de, para, nomeDe, nomePara, sugestao, onSalvo }: { householdId: string; de: string; para: string; nomeDe: string; nomePara: string; sugestao: number; onSalvo: () => Promise<void> }) {
  const [valor, setValor] = useState<number | null>(sugestao)
  const [descricao, setDescricao] = useState('Pix')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  async function salvar() {
    if (!valor) return setErro('Informe o valor.')
    setOcupado(true); setErro(null)
    try {
      await registrarAcerto({ householdId, de, para, valor, data: hojeLocal(), descricao })
      await onSalvo()
    } catch (e) { setErro(traduzErro((e as Error).message)) } finally { setOcupado(false) }
  }
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-2">{nomeDe} pagou a {nomePara}:</p>
      <CampoMoeda rotulo="Valor" valor={valor} onChange={setValor} autoFocus grande />
      <Campo id="descAcerto" rotulo="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      {erro && <Aviso>{erro}</Aviso>}
      <Botao onClick={salvar} ocupado={ocupado}>Registrar</Botao>
    </div>
  )
}

function formatarPct(v: number): string {
  return `${Math.round(v * 100)}%`
}
