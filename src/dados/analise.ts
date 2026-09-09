import { supabase } from '../lib/supabase'
import type { Database } from '../tipos/supabase'
import type { DataLocal } from '../lib/datas'

type Fn = Database['public']['Functions']
export type Visao = 'pessoal' | 'compartilhado' | 'consolidado'
export type CategoriaAnalise = Fn['analise_categorias']['Returns'][number]
export type PontoEvolucao = Fn['evolucao_mensal']['Returns'][number]
export type PontoFuturo = Fn['comprometimento_futuro']['Returns'][number]
export type LimiteCartao = Fn['limite_por_cartao']['Returns'][number]
export type LinhaExport = Fn['exportar_lancamentos']['Returns'][number]

export async function analiseCategorias(visao: Visao, competencia: DataLocal): Promise<CategoriaAnalise[]> {
  const { data, error } = await supabase.rpc('analise_categorias', { p_visao: visao, p_competencia: competencia })
  if (error) throw error
  return data ?? []
}

export async function analiseMetodo(visao: Visao, competencia: DataLocal): Promise<{ credito: number; a_vista: number }> {
  const { data, error } = await supabase.rpc('analise_metodo', { p_visao: visao, p_competencia: competencia })
  if (error) throw error
  return data[0] ?? { credito: 0, a_vista: 0 }
}

export async function evolucaoMensal(visao: Visao, competencia: DataLocal, meses = 6): Promise<PontoEvolucao[]> {
  const { data, error } = await supabase.rpc('evolucao_mensal', { p_visao: visao, p_competencia: competencia, p_meses: meses })
  if (error) throw error
  return data ?? []
}

export async function comprometimentoFuturo(visao: Visao, competencia: DataLocal, meses = 12): Promise<PontoFuturo[]> {
  const { data, error } = await supabase.rpc('comprometimento_futuro', { p_visao: visao, p_competencia: competencia, p_meses: meses })
  if (error) throw error
  return data ?? []
}

export async function limitePorCartao(competencia: DataLocal): Promise<LimiteCartao[]> {
  const { data, error } = await supabase.rpc('limite_por_cartao', { p_competencia: competencia })
  if (error) throw error
  return data ?? []
}

export async function linhasParaExportar(visao: Visao, de: DataLocal, ate: DataLocal): Promise<LinhaExport[]> {
  const { data, error } = await supabase.rpc('exportar_lancamentos', { p_visao: visao, p_de: de, p_ate: ate })
  if (error) throw error
  return data ?? []
}
