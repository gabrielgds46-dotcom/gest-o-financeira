import { useCallback, useEffect, useState } from 'react'
import { resumoSemanal, type ResumoSemana } from '../dados/semana'
import type { Visao } from '../dados/lancamentos'
import { formatarMoeda } from '../lib/moeda'
import { formatarData } from '../lib/datas'
import { traduzErro } from '../lib/erros'
import { Folha } from './Folha'
import { Aviso } from './Tela'
import { Vazio } from './Vazio'
import { Icone, type NomeIcone } from './Icone'

/**
 * O resumo da semana.
 *
 * Responde quatro perguntas nessa ordem: quanto saiu, se foi mais ou menos
 * que na semana passada, em quê, e o que vem pela frente. Um número solto
 * ("você gastou R$ 600") não diz se foi bom ou ruim — é a comparação que
 * transforma o dado em informação.
 */
export function FolhaSemana({ aberta, visao, onFechar }: { aberta: boolean; visao: Visao; onFechar: () => void }) {
  const [r, setR] = useState<ResumoSemana | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true); setErro(null)
    try { setR(await resumoSemanal(visao)) }
    catch (e) { setErro(traduzErro((e as Error).message)) }
    finally { setCarregando(false) }
  }, [visao])

  useEffect(() => { if (aberta) void carregar() }, [aberta, carregar])

  return (
    <Folha aberta={aberta} titulo="A semana de vocês" onFechar={onFechar}>
      {erro && <Aviso>{erro}</Aviso>}
      {carregando && !r && <p className="py-6 text-center text-sm text-ink-3">Carregando…</p>}

      {r && (r.gasto > 0 || r.vence_valor > 0 ? (
        <div className="space-y-4">
          <p className="text-xs text-ink-3">Sete dias até {formatarData(r.ate)}</p>

          {/* ---------- Quanto saiu, e a comparação ---------- */}
          <div className="rounded-2xl border border-line bg-s1 p-4">
            <p className="text-xs font-semibold text-ink-2">Saiu nesta semana</p>
            <p className="tnum mt-0.5 text-[34px] font-bold leading-tight tracking-[-0.03em]">{formatarMoeda(r.gasto)}</p>
            <Comparacao variacao={r.variacao} anterior={r.gasto_anterior} />
          </div>

          {/* ---------- Em quê ---------- */}
          {r.top_nome && r.top_valor !== null && (
            <Bloco titulo="O que mais pesou">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: (r.top_cor ?? '#888') + '24', color: r.top_cor ?? '#888' }}>
                  <Icone nome={(r.top_icone ?? 'receipt') as NomeIcone} tamanho={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{r.top_nome}</span>
                  <span className="block text-xs text-ink-3">
                    {Math.round((r.top_valor / Math.max(r.gasto, 1)) * 100)}% de tudo que saiu
                  </span>
                </span>
                <span className="tnum shrink-0 text-sm font-semibold">{formatarMoeda(r.top_valor)}</span>
              </div>
            </Bloco>
          )}

          {r.maior_nome && r.maior_valor !== null && (
            <Bloco titulo="A maior sozinha">
              <p className="text-sm">
                <b className="font-semibold">{r.maior_nome}</b>
                <span className="tnum text-ink-2">, {formatarMoeda(r.maior_valor)}</span>
              </p>
            </Bloco>
          )}

          {/* ---------- O que vem ---------- */}
          <Bloco titulo="Nos próximos sete dias">
            {r.vence_qtd === 0 ? (
              <p className="text-sm text-ink-2">Nada vence. Semana tranquila.</p>
            ) : (
              <p className="text-sm">
                <b className="tnum font-semibold">{formatarMoeda(r.vence_valor)}</b>
                <span className="text-ink-2"> em {r.vence_qtd === 1 ? '1 conta' : `${r.vence_qtd} contas`}.</span>
              </p>
            )}
          </Bloco>
        </div>
      ) : (
        <Vazio
          icone="calendario"
          titulo="Semana sem movimento"
          texto="Nada saiu nem vence por aqui. Quando houver lançamentos, este resumo compara a semana com a anterior."
        />
      ))}
    </Folha>
  )
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.04em] text-ink-2">{titulo}</h3>
      <div className="rounded-2xl border border-line bg-s1 p-3.5">{children}</div>
    </section>
  )
}

/**
 * Gastar menos é bom, então a seta para baixo é a verde. O contrário do
 * que se faz num gráfico de vendas — aqui o eixo moral é invertido.
 */
function Comparacao({ variacao, anterior }: { variacao: number | null; anterior: number }) {
  if (variacao === null) {
    return <p className="mt-1 text-xs text-ink-3">Primeira semana com movimento: ainda não há com o que comparar.</p>
  }
  const pct = Math.round(Math.abs(variacao) * 100)
  if (pct === 0) {
    return <p className="mt-1 text-xs text-ink-2">Igualzinho à semana passada ({formatarMoeda(anterior)}).</p>
  }
  const subiu = variacao > 0
  return (
    <p className={'mt-1 inline-flex items-center gap-1 text-xs font-medium ' + (subiu ? 'text-atencao' : 'text-acao')}>
      <span className={subiu ? '' : 'rotate-180'}>▲</span>
      {pct}% {subiu ? 'a mais' : 'a menos'} que na semana passada
      <span className="tnum font-normal text-ink-3">({formatarMoeda(anterior)})</span>
    </p>
  )
}
