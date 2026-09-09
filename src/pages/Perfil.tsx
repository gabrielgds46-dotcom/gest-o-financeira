import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { usePerfil } from '../contexts/PerfilContext'
import { atualizarPerfil, definirRateio, gerarConvite, renomearCasa } from '../dados/perfil'
import { atualizarCartao, criarCartao, listarMeusCartoes, type Cartao as CartaoT, type DadosCartao } from '../dados/cartoes'
import { formatarMoeda } from '../lib/moeda'
import { traduzErro } from '../lib/erros'
import { compartilharTexto } from '../lib/compartilhar'
import { Tela, Cartao, Aviso } from '../components/Tela'
import { Botao } from '../components/Botao'
import { Campo } from '../components/Campo'
import { CampoMoeda } from '../components/CampoMoeda'
import { CampoDia } from '../components/CampoDia'
import { Folha } from '../components/Folha'
import { FormCartao } from '../components/FormCartao'
import { ListaCartoes } from '../components/ListaCartoes'
import { PainelRecorrencias } from '../components/PainelRecorrencias'
import { PainelOrcamentos } from '../components/PainelOrcamentos'
import { Icone } from '../components/Icone'

type Folhas = 'dados' | 'casa' | 'rateio' | 'convite' | 'novoCartao' | 'editarCartao' | 'recorrencias' | 'orcamentos' | null

export function Perfil() {
  const { user, sair } = useAuth()
  const { perfil, casa, membros, parceiro, recarregar } = usePerfil()
  const [folha, setFolha] = useState<Folhas>(null)
  const [cartoes, setCartoes] = useState<CartaoT[]>([])
  const [cartaoEditando, setCartaoEditando] = useState<CartaoT | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const carregarCartoes = useCallback(async () => {
    if (!user) return
    try { setCartoes(await listarMeusCartoes(user.id)) } catch (e) { setErro(traduzErro((e as Error).message)) }
  }, [user])
  // Ao abrir a aba, recarrega casa/membros: o par pode ter acabado de entrar pelo convite.
  useEffect(() => { void carregarCartoes(); void recarregar() }, [carregarCartoes, recarregar])

  if (!user || !perfil) return null
  const eu = membros.find((m) => m.user_id === user.id)
  const fechar = () => { setFolha(null); setCartaoEditando(null) }

  async function salvarCartao(dados: DadosCartao) {
    if (cartaoEditando) await atualizarCartao(cartaoEditando.id, dados)
    else await criarCartao(user!.id, dados)
    await carregarCartoes(); fechar()
  }

  async function alternarAtivo() {
    if (!cartaoEditando) return
    await atualizarCartao(cartaoEditando.id, { ativo: !cartaoEditando.ativo })
    await carregarCartoes(); fechar()
  }

  return (
    <Tela titulo="Perfil">
      {erro && <Aviso>{erro}</Aviso>}

      <div className="space-y-4">
        {/* ---------- Meus dados ---------- */}
        <Cartao>
          <Cabecalho titulo={perfil.nome} subtitulo={user.email ?? ''} onEditar={() => setFolha('dados')} />
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Dado rotulo="Salário" valor={formatarMoeda(perfil.salario_base)} />
            <Dado rotulo="Recebe dia" valor={String(perfil.dia_recebimento)} />
            <Dado rotulo="Contas dia" valor={String(perfil.dia_vencimento_contas)} />
          </dl>
        </Cartao>

        {/* ---------- Nossa casa ---------- */}
        <Cartao>
          <Cabecalho titulo={casa?.nome ?? 'Nossa casa'} subtitulo={parceiro ? 'Casal completo' : 'Aguardando seu par'} onEditar={() => setFolha('casa')} />
          <ul className="mt-3 space-y-2">
            {membros.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between rounded-xl bg-zinc-950 px-3 py-2.5">
                <span className="font-medium">{m.nome}{m.user_id === user.id && <span className="text-zinc-500"> (você)</span>}</span>
                <span className="text-sm text-zinc-400">{formatarMoeda(m.salario_base)} · <b className="text-zinc-200">{formatarPct(m.percentual_rateio)}</b></span>
              </li>
            ))}
          </ul>
          {parceiro ? (
            <Botao variante="secundario" className="mt-3" onClick={() => setFolha('rateio')}>Ajustar rateio</Botao>
          ) : (
            <Botao variante="secundario" className="mt-3" onClick={() => setFolha('convite')}>
              <Icone nome="chave" className="mr-2" /> Convidar meu par
            </Botao>
          )}
        </Cartao>

        {/* ---------- Cartões ---------- */}
        <Cartao>
          <Cabecalho titulo="Cartões de crédito" subtitulo={`${cartoes.filter((c) => c.ativo).length} ativo(s)`} />
          <div className="mt-1">
            <ListaCartoes cartoes={cartoes} onEditar={(c) => { setCartaoEditando(c); setFolha('editarCartao') }} />
          </div>
          <Botao variante="secundario" className="mt-3" onClick={() => setFolha('novoCartao')}>+ Adicionar cartão</Botao>
        </Cartao>

        {/* ---------- Recorrências e orçamentos ---------- */}
        <Cartao>
          <button type="button" onClick={() => setFolha('recorrencias')} className="flex w-full items-center gap-3 py-1 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300"><Icone nome="repetir" /></span>
            <span className="flex-1">
              <span className="block font-semibold">Recorrências</span>
              <span className="block text-xs text-zinc-500">Aluguel, luz, faculdade, streaming</span>
            </span>
            <Icone nome="seta" className="text-zinc-600" />
          </button>
          <div className="my-1 h-px bg-zinc-800" />
          <button type="button" onClick={() => setFolha('orcamentos')} className="flex w-full items-center gap-3 py-1 text-left">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300"><Icone nome="analise" /></span>
            <span className="flex-1">
              <span className="block font-semibold">Orçamentos</span>
              <span className="block text-xs text-zinc-500">Teto mensal por categoria</span>
            </span>
            <Icone nome="seta" className="text-zinc-600" />
          </button>
        </Cartao>

        <Botao variante="fantasma" onClick={() => void sair()}>
          <Icone nome="sair" className="mr-2" /> Sair da conta
        </Botao>
      </div>

      {/* ---------- Folhas ---------- */}
      <Folha aberta={folha === 'dados'} titulo="Meus dados" onFechar={fechar}>
        <FormDados perfil={perfil} onSalvo={async () => { await recarregar(); fechar() }} />
      </Folha>

      <Folha aberta={folha === 'casa'} titulo="Nome da casa" onFechar={fechar}>
        <FormNomeCasa nome={casa?.nome ?? ''} householdId={casa?.id ?? ''} onSalvo={async () => { await recarregar(); fechar() }} />
      </Folha>

      <Folha aberta={folha === 'rateio'} titulo="Rateio do compartilhado" onFechar={fechar}>
        {eu && parceiro && <FormRateio eu={eu} parceiro={parceiro} onSalvo={async () => { await recarregar(); fechar() }} />}
      </Folha>

      <Folha aberta={folha === 'convite'} titulo="Convidar meu par" onFechar={fechar}>
        {casa && <PainelConvite householdId={casa.id} codigoAtual={casa.codigo_convite} expiraEm={casa.codigo_expira_em} onGerado={recarregar} />}
      </Folha>

      <Folha aberta={folha === 'recorrencias'} titulo="Recorrências" onFechar={fechar}>
        <PainelRecorrencias ownerId={user.id} householdId={perfil.household_id} temParceiro={!!parceiro} />
      </Folha>

      <Folha aberta={folha === 'orcamentos'} titulo="Orçamentos" onFechar={fechar}>
        <PainelOrcamentos ownerId={user.id} householdId={perfil.household_id} temParceiro={!!parceiro} />
      </Folha>

      <Folha aberta={folha === 'novoCartao'} titulo="Novo cartão" onFechar={fechar}>
        <FormCartao onSalvar={salvarCartao} />
      </Folha>

      <Folha aberta={folha === 'editarCartao'} titulo="Editar cartão" onFechar={fechar}>
        {cartaoEditando && (
          <>
            <FormCartao
              inicial={{ apelido: cartaoEditando.apelido, dia_fechamento: cartaoEditando.dia_fechamento, dia_vencimento: cartaoEditando.dia_vencimento, limite: cartaoEditando.limite }}
              onSalvar={salvarCartao}
            />
            <Botao variante="fantasma" className="mt-2" onClick={() => void alternarAtivo()}>
              {cartaoEditando.ativo ? 'Desativar cartão' : 'Reativar cartão'}
            </Botao>
          </>
        )}
      </Folha>
    </Tela>
  )
}

// ---------------- sub-formulários ----------------

function FormDados({ perfil, onSalvo }: { perfil: { id: string; nome: string; salario_base: number; dia_recebimento: number; dia_vencimento_contas: number }; onSalvo: () => Promise<void> }) {
  const [nome, setNome] = useState(perfil.nome)
  const [salario, setSalario] = useState<number | null>(perfil.salario_base || null)
  const [rec, setRec] = useState<number | null>(perfil.dia_recebimento)
  const [contas, setContas] = useState<number | null>(perfil.dia_vencimento_contas)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar() {
    setErro(null)
    if (!nome.trim()) return setErro('Informe seu nome.')
    if (!rec || !contas) return setErro('Informe os dias.')
    setOcupado(true)
    try {
      await atualizarPerfil(perfil.id, { nome: nome.trim(), salario_base: salario ?? 0, dia_recebimento: rec, dia_vencimento_contas: contas })
      await onSalvo()
    } catch (e) { setErro(traduzErro((e as Error).message)) } finally { setOcupado(false) }
  }

  return (
    <div className="space-y-4">
      <Campo id="nome" rotulo="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      <CampoMoeda rotulo="Salário líquido mensal" valor={salario} onChange={setSalario} />
      <div className="grid grid-cols-2 gap-3">
        <CampoDia rotulo="Recebe dia" valor={rec} onChange={setRec} />
        <CampoDia rotulo="Contas vencem dia" valor={contas} onChange={setContas} />
      </div>
      <p className="text-xs text-zinc-500">Mudar o salário aqui altera a base dos próximos meses. Meses já lançados não mudam.</p>
      {erro && <Aviso>{erro}</Aviso>}
      <Botao onClick={salvar} ocupado={ocupado}>Salvar</Botao>
    </div>
  )
}

function FormNomeCasa({ nome: inicial, householdId, onSalvo }: { nome: string; householdId: string; onSalvo: () => Promise<void> }) {
  const [nome, setNome] = useState(inicial)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  async function salvar() {
    if (!nome.trim()) return setErro('Informe um nome.')
    setOcupado(true)
    try { await renomearCasa(householdId, nome.trim()); await onSalvo() } catch (e) { setErro(traduzErro((e as Error).message)) } finally { setOcupado(false) }
  }
  return (
    <div className="space-y-4">
      <Campo id="nomeCasa" rotulo="Nome" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} />
      {erro && <Aviso>{erro}</Aviso>}
      <Botao onClick={salvar} ocupado={ocupado}>Salvar</Botao>
    </div>
  )
}

function FormRateio({ eu, parceiro, onSalvo }: { eu: { nome: string; salario_base: number; percentual_rateio: number }; parceiro: { nome: string; salario_base: number }; onSalvo: () => Promise<void> }) {
  const [meu, setMeu] = useState(Math.round(eu.percentual_rateio))
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const rendaTotal = eu.salario_base + parceiro.salario_base
  const proporcional = rendaTotal > 0 ? Math.round((eu.salario_base / rendaTotal) * 100) : 50

  async function salvar() {
    setOcupado(true); setErro(null)
    try { await definirRateio(meu); await onSalvo() } catch (e) { setErro(traduzErro((e as Error).message)) } finally { setOcupado(false) }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-400">Quanto cada um paga dos gastos compartilhados. A soma é sempre 100%.</p>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-zinc-900 p-3"><p className="text-xs text-zinc-500">{eu.nome}</p><p className="text-3xl font-bold text-emerald-400">{meu}%</p></div>
        <div className="rounded-xl bg-zinc-900 p-3"><p className="text-xs text-zinc-500">{parceiro.nome}</p><p className="text-3xl font-bold">{100 - meu}%</p></div>
      </div>
      <input type="range" min={0} max={100} step={1} value={meu} onChange={(e) => setMeu(Number(e.target.value))} className="w-full accent-emerald-500" aria-label={`Percentual de ${eu.nome}`} />
      <div className="grid grid-cols-2 gap-3">
        <Botao variante="secundario" onClick={() => setMeu(50)}>Meio a meio</Botao>
        <Botao variante="secundario" onClick={() => setMeu(proporcional)} disabled={rendaTotal === 0}>Proporcional à renda</Botao>
      </div>
      {rendaTotal > 0 && (
        <p className="text-xs text-zinc-500">
          Proporcional: {eu.nome} ganha {formatarMoeda(eu.salario_base)} de {formatarMoeda(rendaTotal)}, ou seja {proporcional}%.
        </p>
      )}
      {erro && <Aviso>{erro}</Aviso>}
      <Botao onClick={salvar} ocupado={ocupado}>Salvar rateio</Botao>
    </div>
  )
}

function PainelConvite({ householdId, codigoAtual, expiraEm, onGerado }: { householdId: string; codigoAtual: string | null; expiraEm: string | null; onGerado: () => Promise<void> }) {
  const valido = !!codigoAtual && !!expiraEm && new Date(expiraEm) > new Date()
  const [codigo, setCodigo] = useState<string | null>(valido ? codigoAtual : null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function gerar() {
    setOcupado(true); setErro(null)
    try { setCodigo(await gerarConvite(householdId)); await onGerado() } catch (e) { setErro(traduzErro((e as Error).message)) } finally { setOcupado(false) }
  }
  async function compartilhar() {
    const r = await compartilharTexto(`Entre na nossa casa no app Finanças do Casal com o código ${codigo}. Ele vale por 7 dias.`)
    setAviso(r === 'copiado' ? 'Código copiado.' : r === 'falhou' ? 'Não foi possível compartilhar.' : null)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">O código vale por 7 dias e só pode ser usado uma vez. Seu par digita em "Tenho um convite" ao entrar no app.</p>
      {codigo ? (
        <>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-6 text-center">
            <p className="font-mono text-4xl font-bold tracking-[0.3em] text-emerald-300">{codigo}</p>
          </div>
          <Botao onClick={compartilhar}><Icone nome="compartilhar" className="mr-2" /> Compartilhar</Botao>
          {aviso && <Aviso tipo="info">{aviso}</Aviso>}
          <Botao variante="fantasma" onClick={gerar} ocupado={ocupado}>Gerar outro código</Botao>
        </>
      ) : (
        <Botao onClick={gerar} ocupado={ocupado}>Gerar código de convite</Botao>
      )}
      {erro && <Aviso>{erro}</Aviso>}
    </div>
  )
}

// ---------------- pedaços ----------------

function Cabecalho({ titulo, subtitulo, onEditar }: { titulo: string; subtitulo: string; onEditar?: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <h2 className="truncate font-semibold">{titulo}</h2>
        <p className="truncate text-xs text-zinc-500">{subtitulo}</p>
      </div>
      {onEditar && (
        <button type="button" onClick={onEditar} aria-label={`Editar ${titulo}`} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-800">
          <Icone nome="editar" tamanho={18} />
        </button>
      )}
    </div>
  )
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-zinc-950 px-2 py-2">
      <dt className="text-[11px] text-zinc-500">{rotulo}</dt>
      <dd className="truncate text-sm font-semibold tabular-nums">{valor}</dd>
    </div>
  )
}

function formatarPct(v: number): string {
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`
}
