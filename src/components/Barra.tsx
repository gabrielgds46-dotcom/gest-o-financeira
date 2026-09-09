/** Barra de progresso consumo vs teto. Acima de 100% fica vermelha. */
export function Barra({ valor, maximo, cor }: { valor: number; maximo: number; cor?: string }) {
  const pct = maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 0
  const estourou = maximo > 0 && valor > maximo
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: estourou ? '#EF4444' : (cor ?? '#10B981') }} />
    </div>
  )
}
