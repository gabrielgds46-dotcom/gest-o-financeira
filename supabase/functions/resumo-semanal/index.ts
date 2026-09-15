// =============================================================
// resumo-semanal  ·  Edge Function (Deno)
//
// Roda no cron de segunda de manhã. Para cada aparelho inscrito, monta o
// resumo da semana do dono e manda um Web Push.
//
// O texto vem de ./dominio/mensagem.ts, copiado do app e guardado por um
// teste de sincronia — a mesma disciplina de gerar-recorrencias.
//
// A chave privada VAPID vem dos secrets e nunca sai daqui.
// =============================================================
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { montarMensagem } from './dominio/mensagem.ts'

type Destinatario = { user_id: string; nome: string; endpoint: string; p256dh: string; auth: string }

type Resposta = {
  destinatarios: number
  enviadas: number
  removidas: number
  erros: Array<{ endpoint: string; motivo: string }>
}

Deno.serve(async (req: Request) => {
  const url = Deno.env.get('SUPABASE_URL')
  const chave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const vapidPub = Deno.env.get('VAPID_PUBLICA')
  const vapidPriv = Deno.env.get('VAPID_PRIVADA')
  const contato = Deno.env.get('VAPID_CONTATO') ?? 'mailto:financas@exemplo.com'

  if (!url || !chave) return json({ erro: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes' }, 500)
  if (!vapidPub || !vapidPriv) return json({ erro: 'VAPID_PUBLICA/VAPID_PRIVADA ausentes' }, 500)

  webpush.setVapidDetails(contato, vapidPub, vapidPriv)

  // Visão e data podem vir no corpo, para testar sem esperar a segunda.
  let visao = 'consolidado'
  let ate: string | null = null
  let seco = false
  if (req.method === 'POST') {
    try {
      const corpo = await req.json()
      if (typeof corpo?.visao === 'string') visao = corpo.visao
      if (typeof corpo?.ate === 'string') ate = corpo.ate
      seco = corpo?.seco === true   // monta as mensagens e devolve, sem enviar
    } catch { /* corpo vazio: usa os padrões */ }
  }

  const sb = createClient(url, chave, { auth: { persistSession: false } })
  const resposta: Resposta = { destinatarios: 0, enviadas: 0, removidas: 0, erros: [] }
  const previa: Array<{ nome: string; titulo: string; corpo: string }> = []

  const { data: destinos, error } = await sb.rpc('push_destinatarios')
  if (error) return json({ erro: `push_destinatarios: ${error.message}` }, 500)
  resposta.destinatarios = (destinos ?? []).length

  // Um resumo por PESSOA, reaproveitado entre os aparelhos dela.
  const porPessoa = new Map<string, { titulo: string; corpo: string }>()

  for (const d of (destinos ?? []) as Destinatario[]) {
    try {
      if (!porPessoa.has(d.user_id)) {
        const { data, error: e } = await sb.rpc('fn_resumo_semanal', {
          p_user: d.user_id, p_visao: visao, p_ate: ate,
        })
        if (e) throw new Error(e.message)
        const r = data?.[0]
        if (!r) { porPessoa.set(d.user_id, { titulo: '', corpo: '' }) }
        else {
          porPessoa.set(d.user_id, montarMensagem(d.nome ?? '', {
            gasto: Number(r.gasto), gastoAnterior: Number(r.gasto_anterior),
            variacao: r.variacao === null ? null : Number(r.variacao),
            topNome: r.top_nome, topValor: r.top_valor === null ? null : Number(r.top_valor),
            venceValor: Number(r.vence_valor), venceQtd: Number(r.vence_qtd),
          }))
        }
      }

      const msg = porPessoa.get(d.user_id)!
      if (!msg.titulo) continue

      if (seco) { previa.push({ nome: d.nome, ...msg }); continue }

      await webpush.sendNotification(
        { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
        JSON.stringify({ titulo: msg.titulo, corpo: msg.corpo, tag: 'resumo-semana', url: '/?semana=1' }),
      )
      resposta.enviadas++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      // 404/410 = o navegador desinstalou ou limpou os dados. A inscrição
      // morreu e insistir nela é gastar chamada para sempre.
      if (status === 404 || status === 410) {
        await sb.rpc('push_marcar_falha', { p_endpoint: d.endpoint })
        resposta.removidas++
      } else {
        await sb.rpc('push_marcar_falha', { p_endpoint: d.endpoint })
        resposta.erros.push({ endpoint: encurtar(d.endpoint), motivo: (e as Error).message })
      }
    }
  }

  if (seco) return json({ ...resposta, previa })
  return json(resposta, resposta.erros.length ? 207 : 200)
})

function encurtar(endpoint: string): string {
  return endpoint.length > 40 ? `${endpoint.slice(0, 30)}…${endpoint.slice(-6)}` : endpoint
}

function json(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}
