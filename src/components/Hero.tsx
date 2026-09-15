import { formatarMoeda } from '../lib/moeda'
import type { ResumoMes } from '../dados/lancamentos'

/**
 * O número do topo do Início.
 *
 * Antes era "Livre para gastar", e a conta estava certa — mas no dia 11 ela
 * já descontava contas que ainda nem saíram da conta corrente. Quem lia
 * achava que aquele dinheiro estava no banco.
 *
 * A correção não foi mudar a conta, foi mudar o que a tela mostra: o mesmo
 * número com nome honesto ("Livre depois das contas do mês") e, embaixo, a
 * renda inteira decomposta. Os quatro pedaços somam 100% da renda — se não
 * somassem, a barra seria enfeite.
 */
type Pedaco = { rotulo: string; valor: number; cor: string; contorno?: boolean }

export function Hero({ resumo, carregando }: { resumo: ResumoMes | null; carregando: boolean }) {
  const r = resumo
  const base = Math.max((r?.renda ?? 0) + (r?.resgate ?? 0), 1)

  const pago = Math.max((r?.gasto ?? 0) - (r?.a_vencer_mes ?? 0), 0)
  const pedacos: Pedaco[] = [
    { rotulo: 'Pago', valor: pago, cor: 'var(--color-ink-2)' },
    { rotulo: 'Guardado', valor: r?.reserva ?? 0, cor: 'var(--color-acao)' },
    { rotulo: 'A vencer', valor: r?.a_vencer_mes ?? 0, cor: 'var(--color-atencao)' },
    // "Livre" é o trilho vazio: de propósito não tem cor própria na barra.
    // Só que aí o ponto da legenda sumia — daí o contorno.
    { rotulo: 'Livre', valor: Math.max(r?.sobra ?? 0, 0), cor: 'var(--color-s3)', contorno: true },
  ]

  const sobra = r?.sobra ?? 0
  const negativo = sobra < 0
  const [inteiros, centavos] = formatarMoeda(sobra).split(',')

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-line bg-gradient-to-br from-[#1b2320] via-s1 to-[#121716] px-5 pb-4 pt-5">
      <p className="text-xs font-semibold text-ink-2">
        {negativo ? 'Faltam, depois das contas do mês' : 'Livre depois das contas do mês'}
      </p>

      <p className={'tnum mt-0.5 text-[42px] font-bold leading-[1.08] tracking-[-0.035em] ' + (negativo ? 'text-perigo' : '')}>
        {carregando ? '—' : <>{inteiros}<span className="text-[25px] text-ink-2">,{centavos}</span></>}
      </p>

      {!carregando && r && (
        <>
          <p className="mt-1 text-xs leading-relaxed text-ink-3">
            {r.a_vencer_mes > 0
              ? <>Já descontei os <b className="tnum font-semibold text-ink-2">{formatarMoeda(r.a_vencer_mes)}</b> que ainda vencem neste mês.</>
              : 'Tudo o que vencia neste mês já foi pago.'}
          </p>

          <div
            className="mt-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-s3"
            role="img"
            aria-label={pedacos.map((p) => `${p.rotulo} ${formatarMoeda(p.valor)}`).join(', ')}
          >
            {pedacos.map((p) => (
              <i key={p.rotulo} className="block h-full" style={{ width: `${(p.valor / base) * 100}%`, backgroundColor: p.cor }} />
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-3.5 gap-y-1.5">
            {pedacos.map((p) => (
              <div key={p.rotulo} className="flex items-center gap-1.5 text-[11.5px] text-ink-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: p.cor, boxShadow: p.contorno ? '0 0 0 1px var(--color-ink-3)' : undefined }}
                />
                {p.rotulo}
                <b className="tnum ml-auto font-semibold text-ink">{formatarMoeda(p.valor)}</b>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
