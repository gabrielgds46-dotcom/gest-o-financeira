import { useState, type KeyboardEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePerfil } from '../contexts/PerfilContext'
import { atualizarPerfil, criarCasa, entrarComCodigo, gerarConvite } from '../dados/perfil'
import { criarCartao, type Cartao, type DadosCartao } from '../dados/cartoes'
import { traduzErro } from '../lib/erros'
import { compartilharTexto } from '../lib/compartilhar'
import { Campo } from '../components/Campo'
import { CampoMoeda } from '../components/CampoMoeda'
import { CampoDia } from '../components/CampoDia'
import { Botao } from '../components/Botao'
import { Folha } from '../components/Folha'
import { FormCartao } from '../components/FormCartao'
import { ListaCartoes } from '../components/ListaCartoes'
import { Icone } from '../components/Icone'
import { Aviso, Carregando as _C } from './_shared'

type Etapa = 'escolha' | 'criar' | 'convite' | 'dados' | 'cartoes' | 'convidar'

export function Comecar() {
  const { user } = useAuth()
  const { perfil, carregando, recarregar } = usePerfil()
  const navigate = useNavigate()

  const [etapa, setEtapa] = useState<Etapa>('escolha')
  const [iniciado, setIniciado] = useState(false)
  const [entrouPorConvite, setEntrouPorConvite] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  // Etapa criar/convite
  const [nomeCasa, setNomeCasa] = useState('Nossa casa')
  const [codigo, setCodigo] = useState('')
  // Etapa dados
  const [salario, setSalario] = useState<number | null>(perfil?.salario_base || null)
  const [diaRecebimento, setDiaRecebimento] = useState<number | null>(perfil?.dia_recebimento ?? 5)
  const [diaContas, setDiaContas] = useState<number | null>(perfil?.dia_vencimento_contas ?? 10)
  // Etapa cartões
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [folhaCartao, setFolhaCartao] = useState(false)
  // Etapa convidar
  const [codigoGerado, setCodigoGerado] = useState<string | null>(null)
  const [avisoCompartilhar, setAvisoCompartilhar] = useState<string | null>(null)

  if (carregando) return <_C />
  // Já tem casa e não está no meio do fluxo: nada a fazer aqui.
  if (perfil?.household_id && !iniciado) return <Navigate to="/" replace />
  if (!user || !perfil) return <Navigate to="/entrar" replace />
  const userId = user.id

  async function executar(fn: () => Promise<void>) {
    if (ocupado) return
    setErro(null); setOcupado(true)
    try { await fn() } catch (e) { setErro(traduzErro((e as Error).message)) } finally { setOcupado(false) }
  }

  const criar = () => executar(async () => {
    const id = await criarCasa(nomeCasa)
    setHouseholdId(id); setIniciado(true); setEtapa('dados')
  })

  const entrar = () => executar(async () => {
    const limpo = codigo.trim().toUpperCase()
    if (limpo.length !== 6) throw new Error('O código tem 6 caracteres.')
    const id = await entrarComCodigo(limpo)
    setHouseholdId(id); setEntrouPorConvite(true); setIniciado(true); setEtapa('dados')
  })

  const salvarDados = () => executar(async () => {
    if (!salario) throw new Error('Informe seu salário líquido mensal.')
    if (!diaRecebimento || !diaContas) throw new Error('Informe os dias de recebimento e de vencimento.')
    await atualizarPerfil(userId, { salario_base: salario, dia_recebimento: diaRecebimento, dia_vencimento_contas: diaContas })
    setEtapa('cartoes')
  })

  async function adicionarCartao(dados: DadosCartao) {
    const c = await criarCartao(userId, dados)
    setCartoes((lista) => [...lista, c])
    setFolhaCartao(false)
  }

  const concluirCartoes = () => executar(async () => {
    if (entrouPorConvite) return concluir()
    const cod = await gerarConvite(householdId!)
    setCodigoGerado(cod); setEtapa('convidar')
  })

  async function concluir() {
    await recarregar()
    navigate('/', { replace: true })
  }

  async function compartilhar() {
    const r = await compartilharTexto(
      `Entre na nossa casa no app Finanças do Casal com o código ${codigoGerado}. Ele vale por 7 dias.`,
    )
    setAvisoCompartilhar(r === 'copiado' ? 'Código copiado.' : r === 'falhou' ? 'Não foi possível compartilhar. Copie o código manualmente.' : null)
  }

  const aoEnter = (fn: () => void) => (e: KeyboardEvent) => { if (e.key === 'Enter') fn() }

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col px-6 py-8">
      {etapa !== 'escolha' && etapa !== 'convidar' && (
        <Progresso atual={['criar', 'convite'].includes(etapa) ? 1 : etapa === 'dados' ? 2 : 3} total={3} />
      )}

      {etapa === 'escolha' && (
        <>
          <div className="mb-10 mt-6">
            <img src="/favicon.svg" alt="" className="mb-4 h-14 w-14" />
            <h1 className="text-3xl font-bold">Olá, {perfil.nome.split(' ')[0]}</h1>
            <p className="mt-2 text-zinc-400">
              O app funciona em dupla. Crie a casa do casal ou entre na que já existe com um código de convite.
            </p>
          </div>
          <div className="space-y-3">
            <BotaoGrande icone="casal" titulo="Criar nossa casa" descricao="Você configura e depois convida seu par" onClick={() => setEtapa('criar')} />
            <BotaoGrande icone="chave" titulo="Tenho um convite" descricao="Recebi um código de 6 letras" onClick={() => setEtapa('convite')} />
          </div>
        </>
      )}

      {etapa === 'criar' && (
        <Passo titulo="Nome da casa" descricao="Como vocês chamam o lar? Pode mudar depois." onVoltar={() => setEtapa('escolha')}>
          <div onKeyDown={aoEnter(criar)}>
            <Campo id="nomeCasa" rotulo="Nome" autoFocus value={nomeCasa} onChange={(e) => setNomeCasa(e.target.value)} />
          </div>
          {erro && <Aviso>{erro}</Aviso>}
          <Botao onClick={criar} ocupado={ocupado}>Criar casa</Botao>
        </Passo>
      )}

      {etapa === 'convite' && (
        <Passo titulo="Código de convite" descricao="Peça o código de 6 caracteres a quem criou a casa." onVoltar={() => setEtapa('escolha')}>
          <div onKeyDown={aoEnter(entrar)}>
            <Campo
              id="codigo" rotulo="Código" autoFocus autoCapitalize="characters" autoCorrect="off" spellCheck={false}
              maxLength={6} placeholder="ABC123" className="text-center text-2xl font-bold uppercase tracking-[0.3em]"
              value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            />
          </div>
          {erro && <Aviso>{erro}</Aviso>}
          <Botao onClick={entrar} ocupado={ocupado}>Entrar na casa</Botao>
        </Passo>
      )}

      {etapa === 'dados' && (
        <Passo titulo="Seus dados" descricao="Seu par vê o valor da sua renda. É o que permite o rateio proporcional. Seus gastos pessoais continuam privados.">
          <CampoMoeda rotulo="Salário líquido mensal" valor={salario} onChange={setSalario} autoFocus />
          <div className="grid grid-cols-2 gap-3">
            <CampoDia rotulo="Recebe dia" valor={diaRecebimento} onChange={setDiaRecebimento} />
            <CampoDia rotulo="Contas vencem dia" valor={diaContas} onChange={setDiaContas} ajuda="aluguel, luz, etc." />
          </div>
          {erro && <Aviso>{erro}</Aviso>}
          <Botao onClick={salvarDados} ocupado={ocupado}>Continuar</Botao>
        </Passo>
      )}

      {etapa === 'cartoes' && (
        <Passo titulo="Seus cartões de crédito" descricao="As datas de fechamento e vencimento definem em qual fatura cada compra cai. Dá para cadastrar depois no Perfil.">
          <ListaCartoes cartoes={cartoes} />
          <Botao variante="secundario" onClick={() => setFolhaCartao(true)}>+ Adicionar cartão</Botao>
          {erro && <Aviso>{erro}</Aviso>}
          <Botao onClick={concluirCartoes} ocupado={ocupado}>
            {cartoes.length ? 'Continuar' : 'Pular por agora'}
          </Botao>
          <Folha aberta={folhaCartao} titulo="Novo cartão" onFechar={() => setFolhaCartao(false)}>
            <FormCartao onSalvar={adicionarCartao} />
          </Folha>
        </Passo>
      )}

      {etapa === 'convidar' && (
        <Passo titulo="Convide seu par" descricao="Envie este código. Ele vale por 7 dias e só pode ser usado uma vez. Você também encontra o código no Perfil.">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 py-6 text-center">
            <p className="text-xs uppercase tracking-widest text-emerald-400">código de convite</p>
            <p className="mt-2 font-mono text-4xl font-bold tracking-[0.3em] text-emerald-300">{codigoGerado}</p>
          </div>
          <Botao onClick={compartilhar}>
            <Icone nome="compartilhar" className="mr-2" /> Compartilhar código
          </Botao>
          {avisoCompartilhar && <Aviso tipo="info">{avisoCompartilhar}</Aviso>}
          <Botao variante="secundario" onClick={() => void concluir()}>Concluir</Botao>
        </Passo>
      )}
    </main>
  )
}

function Progresso({ atual, total }: { atual: number; total: number }) {
  return (
    <div className="mb-6 flex gap-1.5" aria-label={`Etapa ${atual} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={'h-1 flex-1 rounded-full ' + (i < atual ? 'bg-emerald-500' : 'bg-zinc-800')} />
      ))}
    </div>
  )
}

function Passo({ titulo, descricao, onVoltar, children }: { titulo: string; descricao: string; onVoltar?: () => void; children: React.ReactNode }) {
  return (
    <>
      {onVoltar && (
        <button type="button" onClick={onVoltar} className="-ml-2 mb-2 flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-900" aria-label="Voltar">
          <Icone nome="voltar" />
        </button>
      )}
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <p className="mb-6 mt-1 text-zinc-400">{descricao}</p>
      <div className="space-y-4">{children}</div>
    </>
  )
}

function BotaoGrande({ icone, titulo, descricao, onClick }: { icone: 'casal' | 'chave'; titulo: string; descricao: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left active:bg-zinc-800">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
        <Icone nome={icone} />
      </span>
      <span className="flex-1">
        <span className="block font-semibold">{titulo}</span>
        <span className="block text-sm text-zinc-400">{descricao}</span>
      </span>
      <Icone nome="seta" className="text-zinc-600" />
    </button>
  )
}
