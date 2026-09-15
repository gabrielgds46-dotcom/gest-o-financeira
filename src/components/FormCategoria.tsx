import { useState } from 'react'
import { criarCategoria, editarCategoria, type Categoria, type GrupoCategoria } from '../dados/categorias'
import { CORES_CATEGORIA, ICONES_CATEGORIA } from '../conteudo/catalogo'
import { traduzErro } from '../lib/erros'
import { Aviso } from './Tela'
import { Botao } from './Botao'
import { Campo } from './Campo'
import { Alternador } from './Alternador'
import { Icone, type NomeIcone } from './Icone'

type Props = {
  /** null cria uma nova; com valor, edita a existente. */
  categoria: Categoria | null
  onSalvo: () => Promise<void>
}

const LIMITE_NOME = 24

export function FormCategoria({ categoria, onSalvo }: Props) {
  const editando = !!categoria
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [icone, setIcone] = useState<NomeIcone>((categoria?.icone as NomeIcone) ?? ICONES_CATEGORIA[0])
  const [cor, setCor] = useState<string>(categoria?.cor ?? CORES_CATEGORIA[0])
  const [grupo, setGrupo] = useState<GrupoCategoria>(categoria?.grupo ?? 'despesa')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar() {
    const limpo = nome.trim()
    if (!limpo) return setErro('Dê um nome à categoria.')
    setOcupado(true); setErro(null)
    try {
      if (categoria) await editarCategoria({ id: categoria.id, nome: limpo, icone, cor })
      else await criarCategoria({ nome: limpo, icone, cor, grupo })
      await onSalvo()
    } catch (e) {
      setErro(traduzErro((e as Error).message))
    } finally { setOcupado(false) }
  }

  return (
    <div className="space-y-5">
      {/* Prévia: é exatamente o quadradinho que vai aparecer na grade de Lançar. */}
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-zinc-900 py-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: cor + '26', color: cor }}>
          <Icone nome={icone} tamanho={30} />
        </span>
        <span className="text-sm font-medium" style={{ color: cor }}>{nome.trim() || 'Sem nome'}</span>
      </div>

      <div>
        <Campo
          id="nomeCategoria" rotulo="Nome" autoFocus autoComplete="off"
          placeholder="Pets, Farmácia, Casamento…"
          maxLength={LIMITE_NOME}
          value={nome} onChange={(e) => setNome(e.target.value)}
        />
        <p className="mt-1 text-right text-xs text-zinc-500 tabular-nums">{nome.length}/{LIMITE_NOME}</p>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-zinc-300">Ícone</span>
        <div role="radiogroup" aria-label="Ícone" className="grid grid-cols-6 gap-2">
          {ICONES_CATEGORIA.map((n) => (
            <button
              key={n} type="button" role="radio" aria-checked={n === icone} aria-label={n}
              onClick={() => setIcone(n)}
              style={n === icone ? { backgroundColor: cor + '26', borderColor: cor, color: cor } : undefined}
              className={'flex h-12 items-center justify-center rounded-xl border transition active:scale-95 ' +
                (n === icone ? '' : 'border-zinc-800 bg-zinc-900 text-zinc-400')}
            >
              <Icone nome={n} tamanho={20} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-zinc-300">Cor</span>
        <div role="radiogroup" aria-label="Cor" className="grid grid-cols-6 gap-2">
          {CORES_CATEGORIA.map((c) => (
            <button
              key={c} type="button" role="radio" aria-checked={c === cor} aria-label={`Cor ${c}`}
              onClick={() => setCor(c)}
              className={'flex h-11 items-center justify-center rounded-xl border-2 transition active:scale-95 ' +
                (c === cor ? 'border-zinc-100' : 'border-transparent')}
              style={{ backgroundColor: c + '33' }}
            >
              <span className="h-5 w-5 rounded-full" style={{ backgroundColor: c }} />
            </button>
          ))}
        </div>
      </div>

      {/* O grupo decide se o dinheiro conta como gasto ou como guardado, e
          mudar isso depois reescreveria os meses já fechados. Por isso só
          na criação. */}
      {editando ? (
        <p className="text-xs text-zinc-500">
          Tipo: <b className="text-zinc-300">{grupo === 'reserva' ? 'Reserva' : 'Gasto'}</b>. Não muda depois de criada,
          porque isso mudaria os meses que já passaram.
        </p>
      ) : (
        <div>
          <Alternador<GrupoCategoria>
            rotulo="Tipo"
            opcoes={[{ valor: 'despesa', rotulo: 'Gasto' }, { valor: 'reserva', rotulo: 'Reserva' }]}
            valor={grupo} onChange={setGrupo}
          />
          <p className="mt-1.5 text-xs text-zinc-500">
            {grupo === 'reserva'
              ? 'Reserva é dinheiro guardado: entra na taxa de poupança e não conta como gasto.'
              : 'Gasto é dinheiro que sai: conta no orçamento e no total do mês.'}
          </p>
        </div>
      )}

      {erro && <Aviso>{erro}</Aviso>}

      <Botao onClick={() => void salvar()} ocupado={ocupado}>
        {editando ? 'Salvar' : 'Criar categoria'}
      </Botao>
    </div>
  )
}
