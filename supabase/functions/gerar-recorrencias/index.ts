// =============================================================
// gerar-recorrencias  ·  Edge Function (Deno)
//
// Roda no cron da virada do mês. Para cada recorrência ativa ainda não
// gerada na competência, aplica o MESMO motor do app (planejarRecorrencia
// -> calcularParcelas, copiados em ./dominio) e chama gerar_recorrencia().
//
// Idempotente por construção: o índice único (recorrencia_id, competencia)
// faz a segunda tentativa virar no-op. O fallback do app no primeiro
// acesso do mês usa exatamente o mesmo caminho.
// =============================================================
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { planejarRecorrencia } from './dominio/recorrencias.ts'
import { dataLocalDe, primeiroDiaDoMes, type DataLocal } from './dominio/calendario.ts'

type Resposta = {
  competencia: DataLocal
  salarios: number
  geradas: number
  ignoradas: number
  erros: Array<{ recorrencia: string; motivo: string }>
}

Deno.serve(async (req: Request) => {
  const url = Deno.env.get('SUPABASE_URL')
  const chave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !chave) {
    return json({ erro: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes' }, 500)
  }

  // Competência: a do corpo (para reprocessar um mês) ou o mês corrente em SP.
  let competencia = primeiroDiaDoMes(dataLocalDe(new Date()))
  if (req.method === 'POST') {
    try {
      const corpo = await req.json()
      if (typeof corpo?.competencia === 'string') competencia = primeiroDiaDoMes(corpo.competencia)
    } catch { /* corpo vazio: usa o mês corrente */ }
  }

  const sb = createClient(url, chave, { auth: { persistSession: false } })
  const resposta: Resposta = { competencia, salarios: 0, geradas: 0, ignoradas: 0, erros: [] }

  // 1) Salário do mês de cada perfil (receita única por mês, editável).
  const { data: salarios, error: erroSal } = await sb.rpc('gerar_salarios', { p_competencia: competencia })
  if (erroSal) return json({ erro: `gerar_salarios: ${erroSal.message}` }, 500)
  resposta.salarios = salarios ?? 0

  // 2) Recorrências ainda não geradas nesta competência.
  const { data: pendentes, error: erroPend } = await sb.rpc('recorrencias_pendentes', { p_competencia: competencia })
  if (erroPend) return json({ erro: `recorrencias_pendentes: ${erroPend.message}` }, 500)

  // Cartões (fechamento/vencimento) para o motor de competência.
  const { data: cartoes } = await sb.from('cartoes').select('id, dia_fechamento, dia_vencimento')
  const porCartao = new Map((cartoes ?? []).map((c) => [c.id, c]))

  for (const r of pendentes ?? []) {
    try {
      const plano = planejarRecorrencia(
        { id: r.id, tipo: r.tipo, metodo: r.metodo, valor: r.valor, dia_vencimento: r.dia_vencimento, inicio: r.inicio, fim: r.fim },
        competencia,
        r.cartao_id ? porCartao.get(r.cartao_id) ?? null : null,
      )
      if (!plano) { resposta.ignoradas++; continue }

      const p = plano.parcelas[0]
      const { data: id, error } = await sb.rpc('gerar_recorrencia', {
        p_recorrencia_id: r.id,
        p_competencia: plano.competencia,
        p_data: plano.dataCompra,
        p_parcela: p ? { valor: p.valorCentavos, competencia: p.competencia, vencimento: p.vencimento } : {},
      })
      if (error) throw new Error(error.message)
      if (id) resposta.geradas++
      else resposta.ignoradas++   // já existia: idempotência
    } catch (e) {
      resposta.erros.push({ recorrencia: r.id, motivo: (e as Error).message })
    }
  }

  return json(resposta, resposta.erros.length ? 207 : 200)
})

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}
