import { supabase } from '../lib/supabase'
import type { Tables } from '../tipos/supabase'

export type Cartao = Tables<'cartoes'>
/** Cartão do parceiro visto pela view: sem limite. */
export type CartaoDaCasa = Tables<'v_cartoes_household'>

export type DadosCartao = {
  apelido: string
  dia_fechamento: number
  dia_vencimento: number
  limite: number | null // centavos
}

export async function listarMeusCartoes(userId: string): Promise<Cartao[]> {
  const { data, error } = await supabase
    .from('cartoes')
    .select('*')
    .eq('owner_id', userId)
    .order('ativo', { ascending: false })
    .order('created_at')
  if (error) throw error
  return data ?? []
}

export async function criarCartao(userId: string, dados: DadosCartao): Promise<Cartao> {
  const { data, error } = await supabase
    .from('cartoes')
    .insert({ owner_id: userId, ...dados })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function atualizarCartao(id: string, dados: Partial<DadosCartao> & { ativo?: boolean }): Promise<void> {
  const { error } = await supabase.from('cartoes').update(dados).eq('id', id)
  if (error) throw error
}
