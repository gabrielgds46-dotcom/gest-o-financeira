import type { TooltipProps } from 'recharts'
import { formatarMoeda } from '../../lib/moeda'
import { formatarCompetenciaLonga } from '../../lib/datas'

/** Tooltip padrão: mês por extenso e valores em R$, sempre em texto neutro. */
export function TooltipViz({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const titulo = typeof label === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(label) ? formatarCompetenciaLonga(label) : String(label ?? '')
  return (
    <div className="rounded-xl border border-s3 bg-bg/95 px-3 py-2 shadow-xl">
      {titulo && <p className="mb-1 text-xs capitalize text-ink-2">{titulo}</p>}
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-sm text-ink">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-ink-2">{p.name}</span>
          <b className="ml-auto tabular-nums">{formatarMoeda(Number(p.value ?? 0))}</b>
        </p>
      ))}
    </div>
  )
}
