import { supabase } from '../lib/supabase'
import type { Database } from '../tipos/supabase'
import type { Visao } from './lancamentos'
import type { DataLocal } from '../lib/datas'

export type ResumoSemana = Database['public']['Functions']['resumo_semanal']['Returns'][number]

export async function resumoSemanal(visao: Visao, ate: DataLocal | null = null): Promise<ResumoSemana | null> {
  const { data, error } = await supabase.rpc('resumo_semanal', { p_visao: visao, p_ate: ate })
  if (error) throw error
  return data?.[0] ?? null
}

// ---------------- Notificações ----------------

export type Inscricao = { endpoint: string; p256dh: string; auth: string; aparelho: string | null }

export async function salvarInscricao(userId: string, i: Inscricao): Promise<void> {
  // upsert pelo endpoint: reinstalar o app gera outro e o antigo morre sozinho
  // quando a Edge Function tomar 410 do serviço de push.
  const { error } = await supabase
    .from('push_inscricoes')
    .upsert({ user_id: userId, ...i, falhas: 0 }, { onConflict: 'endpoint' })
  if (error) throw error
}

export async function removerInscricao(endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_inscricoes').delete().eq('endpoint', endpoint)
  if (error) throw error
}

export async function temInscricao(endpoint: string): Promise<boolean> {
  const { data, error } = await supabase.from('push_inscricoes').select('id').eq('endpoint', endpoint).maybeSingle()
  if (error) return false
  return !!data
}
