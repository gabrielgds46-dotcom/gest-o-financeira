import { supabase } from '../lib/supabase'
import type { Tables, TablesUpdate } from '../tipos/supabase'

export type Perfil = Tables<'profiles'>
export type Casa = Tables<'households'>

export type Membro = {
  user_id: string
  percentual_rateio: number
  nome: string
  salario_base: number
}

export async function buscarPerfil(userId: string): Promise<Perfil | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function atualizarPerfil(
  userId: string,
  dados: Pick<TablesUpdate<'profiles'>, 'nome' | 'salario_base' | 'dia_recebimento' | 'dia_vencimento_contas'>,
): Promise<void> {
  const { error } = await supabase.from('profiles').update(dados).eq('id', userId)
  if (error) throw error
}

export async function buscarCasa(householdId: string): Promise<Casa | null> {
  const { data, error } = await supabase.from('households').select('*').eq('id', householdId).maybeSingle()
  if (error) throw error
  return data
}

/** Membros do household com nome e renda (o RLS de profiles libera para o parceiro). */
export async function buscarMembros(householdId: string): Promise<Membro[]> {
  const { data, error } = await supabase
    .from('household_members')
    .select('user_id, percentual_rateio, profiles(nome, salario_base)')
    .eq('household_id', householdId)
    .order('created_at')
  if (error) throw error
  return (data ?? []).map((m) => ({
    user_id: m.user_id,
    percentual_rateio: Number(m.percentual_rateio),
    nome: m.profiles?.nome ?? '',
    salario_base: m.profiles?.salario_base ?? 0,
  }))
}

// ---------------- RPCs de onboarding ----------------

export async function criarCasa(nome: string): Promise<string> {
  const { data, error } = await supabase.rpc('criar_household', { p_nome: nome })
  if (error) throw error
  return data
}

export async function entrarComCodigo(codigo: string): Promise<string> {
  const { data, error } = await supabase.rpc('entrar_household', { p_codigo: codigo })
  if (error) throw error
  return data
}

export async function gerarConvite(householdId: string): Promise<string> {
  const { data, error } = await supabase.rpc('gerar_codigo_convite', { p_household_id: householdId })
  if (error) throw error
  return data
}

export async function definirRateio(meuPercentual: number): Promise<void> {
  const { error } = await supabase.rpc('definir_rateio', { p_meu_percentual: meuPercentual })
  if (error) throw error
}

export async function renomearCasa(householdId: string, nome: string): Promise<void> {
  const { error } = await supabase.from('households').update({ nome }).eq('id', householdId)
  if (error) throw error
}
