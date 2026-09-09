import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePerfil } from '../contexts/PerfilContext'
import { useVisao, type Escopo } from '../contexts/VisaoContext'
import {
  aVencer, fecharMes, garantirSalario, gastoPorCategoria, marcarParcelaPaga, mesEstaFechado,
  reabrirMes, registrarAcerto, resumoMes, saldoCasal,
  type GastoCategoria, type ParcelaAVencer, type ResumoMes, type SaldoCasal,
} from '../dados/lancamentos'
import { gerarPendentes } from '../dados/recorrencias'
import { formatarMoeda } from '../lib/moeda'
import { formatarData, hojeLocal, primeiroDiaDoMes, compararDatas } from '../lib/datas'
import { traduzErro } from '../lib/erros'
import { Tela, Cartao, Aviso } from '../components/Tela'
import { SeletorMes } from '../components/SeletorMes'
import { Alternador } from '../components/Alternador'
import { Barra } from '../components/Barra'
import { Botao } from '../components/Botao'
import { Folha } from '../components/Folha'
import { CampoMoeda } from '../components/CampoMoeda'
import { Campo } from '../components/Campo'
import { Icone, type NomeIcone } from '../components/Icone'

const LIMITE_COMPROMETIMENTO = 0.3

export function Inicio() {
  const { user } = useAuth()
  const { perfil, casa, membros, parceiro } = usePerfil()
  const { competencia, escopo, setEscopo, ehMesAtual } = useVisao()

  const [resumo, setResumo] = useState<ResumoMes | null>(null)
  const [categorias, setCategorias] = useState<GastoCategoria[]>([])
  const [vencer, setVencer] = useState<ParcelaAVencer[]>([])
  const [saldos, setSaldos] = useState<SaldoCasal[]>([])
  const [fechado, setFechado] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [folhaAcerto, setFolhaAcerto] = useState(false)

  const hoje = hojeLocal()
  const householdId = perfil?.household_id ?? null

  const carregar = useCallback(async () => {
    if (!user || !perfil) return
    setErro(null)
    try {
      // Fallback do primeiro acesso do mês: gera salário e recorrências que o
      // cron ainda não gerou. Mesma RPC idempotente da Edge Function, então
      // rodar os dois nunca duplica.
      if (compararDatas(competencia, primeiroDiaDoMes(perfil.created_at.slice(0, 10))) >= 0) {
        await garantirSalario(competencia)
        await gerarPendentes(competencia)
      }
      const [r, c, v, f, s] = await Promise.all([
        resumoMes(escopo, competencia),
        gastoPorCategoria(escopo, competencia),
        aVencer(escopo, 7),
        mesEstaFechado(escopo, competencia, user.id, householdId),
        escopo === 'compartilhado' && householdId ? saldoCasal(householdId) : Promise.resolve([]),
      ])
      setResumo(r); setCategorias(c); setVencer(v); setFechado(f); setSaldos(s)
    } catch (e) {
      setErro(traduzErro((e as Error).message))
    } finally {
      setCarregando(false)
    }
  }, [user, perfil, competencia, escopo, householdId])

  useEffect(() => { void carregar() }, [carregar])

  async function pagar(p: ParcelaAVencer) {
    try { await marcarParcelaPaga(p.parcela_id, hoje); await carregar() } catch (e) { setErro(traduzErro((e as Error).message)) }
  }

  async function alternarFechamento() {
    if (!user) return
    try {
      if (fechado) await reabrirMes(escopo, competencia, user.id, householdId)
      else await fecharMes(escopo, competencia, user.id, householdId)
      await carregar()
    } catch (e) { setErro(traduzErro((e as Error).message)) }
  }

  const podeFechar = compararDatas(competencia, primeiroDiaDoMes(hoje)) < 0
  const comTeto = categorias.filter((c) => c.teto !== null || c.valor > 0)
  const nomePor = (id: string) => membros.find((m) => m.user_id === id)?.nome.split(' ')[0] ?? '?'

  // Saldo entre o casal: quem tem saldo negativo deve para quem tem positivo.
  const devedor = saldos.find((s) => s.saldo < 0)
  const credor = saldos.find((s) => s.saldo > 0)

  return (
    <Tela
      titulo={casa?.nome ?? 'Início'}
      acao={
        <Link to="/lancar" aria-label="Lançar" className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 active:scale-95">
          <Icone nome="mais" />
        </Link>
      }
    >
      <div className="space-y-4">
        <Alternador<Escopo>
          rotulo="Escopo"
          opcoes={[{ valor: 'pessoal', rotulo: 'Pessoal' }, { valor: 'compartilhado', rotulo: 'Compartilhado' }]}
          valor={escopo}
          onChange={setEscopo}
          desabilitados={parceiro ? [] : ['compartilhado']}
        />
        {!parceiro && <p className="text-xs text-zinc-500">O compartilhado ativa quando seu par entrar na casa.</p>}

        <SeletorMes />

        {erro && <Aviso>{erro}</Aviso>}

        {fechado && (
          <Aviso tipo="info">
            <span className="inline-flex items-center gap-2"><Icone nome="cadeado" tamanho={16} /> Mês fechado: somente leitura.</span>
          </Aviso>
        )}

        {/* ---------- KPIs ---------- */}
        <div className="grid grid-cols-2 gap-3">
          <Kpi rotulo="Renda" valor={resumo?.renda ?? 0} carregando={carregando} />
          <Kpi rotulo="Gasto" valor={resumo?.gasto ?? 0} carregando={carregando} negativo />
          <Kpi rotulo="Sobra" valor={resumo?.sobra ?? 0} carregando={carregando} destaque />
          <KpiTexto rotulo="Taxa de poupança" valor={formatarPct(resumo?.taxa_poupanca ?? 0)} sub={resumo ? `${formatarMoeda(resumo.reserva)} guardados` : ''} carregando={carregando} />
        </div>

        {resumo && resumo.comprometimento > LIMITE_COMPROMETIMENTO && (
          <Aviso>
            <span className="inline-flex items-center gap-2"><Icone nome="alerta" tamanho={16} /> Crédito compromete {formatarPct(resumo.comprometimento)} da renda do mês. Acima de 30%.</span>
          </Aviso>
        )}

        {/* ---------- Saldo do casal ---------- */}
        {escopo === 'compartilhado' && parceiro && (
          <Cartao>
            <h2 className="text-sm font-semibold text-zinc-300">Entre o casal</h2>
            {devedor && credor ? (
              <p className="mt-1 text-lg font-semibold">
                {nomePor(devedor.user_id)} deve <span className="text-emerald-400">{formatarMoeda(-devedor.saldo)}</span> a {nomePor(credor.user_id)}
              </p>
            ) : (
              <p className="mt-1 text-lg font-semibold text-zinc-300">Contas zeradas</p>
            )}
            {devedor && credor && (
              <Botao variante="secundario" className="mt-3" onClick={() => setFolhaAcerto(true)}>Registrar acerto</Botao>
            )}
          </Cartao>
        )}

        {/* ---------- A vencer ---------- */}
        <Cartao>
          <h2 className="text-sm font-semibold text-zinc-300">A vencer nos próximos 7 dias</h2>
          {vencer.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Nada pendente. {ehMesAtual ? '' : 'A lista sempre olha a partir de hoje.'}</p>
          ) : (
            <ul className="mt-2 divide-y divide-zinc-800">
              {vencer.map((p) => (
                <li key={p.parcela_id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: p.categoria_cor + '26', color: p.categoria_cor }}>
                    <Icone nome={p.categoria_icone as NomeIcone} tamanho={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.descricao || p.categoria_nome}</span>
                    <span className="block text-xs text-zinc-500">
                      {formatarData(p.vencimento)}
                      {p.parcelas_total > 1 && ` · ${p.numero}/${p.parcelas_total}`}
                      {p.cartao_apelido && ` · ${p.cartao_apelido}`}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-semibold tabular-nums">{formatarMoeda(p.valor)}</span>
                    <BadgeDias dias={p.dias_restantes} />
                  </span>
                  <button type="button" onClick={() => void pagar(p)} aria-label="Marcar como pago" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-emerald-400 active:bg-emerald-500/20">
                    <Icone nome="check" tamanho={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        {/* ---------- Orçamento ---------- */}
        <Cartao>
          <h2 className="text-sm font-semibold text-zinc-300">Orçamento do mês</h2>
          {comTeto.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">Sem gastos neste mês. Tetos por categoria ficam no Perfil.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {comTeto.map((c) => (
                <li key={c.categoria_id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2" style={{ color: c.cor }}>
                      <Icone nome={c.icone as NomeIcone} tamanho={16} /><span className="text-zinc-200">{c.nome}</span>
                    </span>
                    <span className="tabular-nums text-zinc-400">
                      <b className={'text-zinc-100 ' + (c.teto !== null && c.valor > c.teto ? 'text-red-400' : '')}>{formatarMoeda(c.valor)}</b>
                      {c.teto !== null && ` / ${formatarMoeda(c.teto)}`}
                    </span>
                  </div>
                  <Barra valor={c.valor} maximo={c.teto ?? Math.max(c.valor, 1)} cor={c.cor} />
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        {/* ---------- Fechamento ---------- */}
        {(podeFechar || fechado) && (
          <Botao variante="fantasma" onClick={() => void alternarFechamento()}>
            <Icone nome="cadeado" tamanho={18} className="mr-2" /> {fechado ? 'Reabrir mês' : 'Fechar mês'}
          </Botao>
        )}
      </div>

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

function Kpi({ rotulo, valor, carregando, negativo, destaque }: { rotulo: string; valor: number; carregando: boolean; negativo?: boolean; destaque?: boolean }) {
  const cor = destaque ? (valor < 0 ? 'text-red-400' : 'text-emerald-400') : negativo ? 'text-zinc-100' : 'text-zinc-100'
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs text-zinc-500">{rotulo}</p>
      <p className={'mt-1 truncate text-xl font-bold tabular-nums ' + cor}>{carregando ? '—' : formatarMoeda(valor)}</p>
    </div>
  )
}

function KpiTexto({ rotulo, valor, sub, carregando }: { rotulo: string; valor: string; sub: string; carregando: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs text-zinc-500">{rotulo}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{carregando ? '—' : valor}</p>
      {sub && !carregando && <p className="truncate text-[11px] text-zinc-500">{sub}</p>}
    </div>
  )
}

function BadgeDias({ dias }: { dias: number }) {
  const texto = dias < 0 ? `${-dias}d atrás` : dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `${dias} dias`
  const cor = dias <= 2 ? 'bg-red-500/15 text-red-300' : 'bg-zinc-800 text-zinc-400'
  return <span className={'mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ' + cor}>{texto}</span>
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
      <p className="text-sm text-zinc-400">{nomeDe} pagou a {nomePara}:</p>
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
