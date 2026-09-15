import { useVisao } from '../contexts/VisaoContext'
import { formatarCompetenciaLonga } from '../lib/datas'
import { Icone } from './Icone'

export function SeletorMes() {
  const { competencia, mesAnterior, mesSeguinte, irParaHoje, ehMesAtual } = useVisao()
  const bruto = formatarCompetenciaLonga(competencia)
  const rotulo = bruto.charAt(0).toUpperCase() + bruto.slice(1)
  return (
    <div className="flex items-center justify-between">
      <button type="button" onClick={mesAnterior} aria-label="Mês anterior" className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 active:bg-s2">
        <Icone nome="esquerda" />
      </button>
      <button type="button" onClick={irParaHoje} className="flex h-11 items-center gap-2 rounded-full px-3 text-base font-semibold active:bg-s2" aria-label="Voltar ao mês atual">
        {rotulo}
        {!ehMesAtual && <span className="rounded-full bg-s2 px-2 py-0.5 text-[10px] font-medium uppercase text-ink-2">hoje</span>}
      </button>
      <button type="button" onClick={mesSeguinte} aria-label="Mês seguinte" className="flex h-11 w-11 items-center justify-center rounded-full text-ink-2 active:bg-s2">
        <Icone nome="direita" />
      </button>
    </div>
  )
}
