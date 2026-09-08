import { useState } from 'react'
import { Campo } from './Campo'
import { CampoDia } from './CampoDia'
import { CampoMoeda } from './CampoMoeda'
import { Botao } from './Botao'
import { Aviso } from './Tela'
import { traduzErro } from '../lib/erros'
import type { DadosCartao } from '../dados/cartoes'

type Props = {
  inicial?: DadosCartao
  onSalvar: (dados: DadosCartao) => Promise<void>
  onCancelar?: () => void
}

export function FormCartao({ inicial, onSalvar, onCancelar }: Props) {
  const [apelido, setApelido] = useState(inicial?.apelido ?? '')
  const [fechamento, setFechamento] = useState<number | null>(inicial?.dia_fechamento ?? null)
  const [vencimento, setVencimento] = useState<number | null>(inicial?.dia_vencimento ?? null)
  const [limite, setLimite] = useState<number | null>(inicial?.limite ?? null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar() {
    setErro(null)
    if (!apelido.trim()) return setErro('Dê um apelido ao cartão (ex.: Nubank).')
    if (!fechamento) return setErro('Informe o dia de fechamento da fatura.')
    if (!vencimento) return setErro('Informe o dia de vencimento da fatura.')
    setOcupado(true)
    try {
      await onSalvar({ apelido: apelido.trim(), dia_fechamento: fechamento, dia_vencimento: vencimento, limite })
    } catch (e) {
      setErro(traduzErro((e as Error).message))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-4">
      <Campo id="apelido" rotulo="Apelido" placeholder="Nubank, Itaú Gabriel…" autoFocus value={apelido} onChange={(e) => setApelido(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <CampoDia rotulo="Fecha dia" valor={fechamento} onChange={setFechamento} ajuda="último dia de compras da fatura" />
        <CampoDia rotulo="Vence dia" valor={vencimento} onChange={setVencimento} ajuda="dia do pagamento" />
      </div>
      {fechamento && vencimento && vencimento < fechamento && (
        <Aviso tipo="info">Vence antes de fechar: a fatura de um mês vence no mês seguinte. É o mais comum.</Aviso>
      )}
      <CampoMoeda rotulo="Limite (opcional, só você vê)" valor={limite} onChange={setLimite} />
      {erro && <Aviso>{erro}</Aviso>}
      <Botao onClick={salvar} ocupado={ocupado}>Salvar cartão</Botao>
      {onCancelar && <Botao variante="fantasma" onClick={onCancelar}>Cancelar</Botao>}
    </div>
  )
}
