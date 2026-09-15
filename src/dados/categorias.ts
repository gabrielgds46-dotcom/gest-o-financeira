import { supabase } from '../lib/supabase'
import type { Database, Tables } from '../tipos/supabase'

type Fn = Database['public']['Functions']
export type Categoria = Tables<'categorias'>
export type GrupoCategoria = Database['public']['Enums']['grupo_categoria_t']

/** Embutida: vem do seed, vale para todo mundo e ninguém edita. */
export const ehEmbutida = (c: Categoria) => c.household_id === null

/**
 * Tudo que a casa enxerga, arquivadas inclusive — é a lista do painel
 * do Perfil. Para escolher categoria num lançamento use listarCategorias(),
 * que só traz as ativas.
 */
export async function listarTodasCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from('categorias').select('*').order('ordem')
  if (error) throw error
  return data ?? []
}

export async function criarCategoria(dados: {
  nome: string; icone: string; cor: string; grupo: GrupoCategoria
}): Promise<string> {
  const { data, error } = await supabase.rpc('criar_categoria', {
    p_nome: dados.nome, p_icone: dados.icone, p_cor: dados.cor, p_grupo: dados.grupo,
  })
  if (error) throw error
  return data
}

export async function editarCategoria(dados: {
  id: string; nome: string; icone: string; cor: string
}): Promise<void> {
  const { error } = await supabase.rpc('editar_categoria', {
    p_id: dados.id, p_nome: dados.nome, p_icone: dados.icone, p_cor: dados.cor,
  })
  if (error) throw error
}

export type RemocaoCategoria = { acao: 'excluida' | 'arquivada'; usos?: number }

/**
 * Some se ninguém usou; vira arquivada se já tem lançamento. O retorno
 * diz qual dos dois aconteceu (para a frase do desfazer) e serve de
 * retrato para restaurarCategoria().
 */
export async function removerCategoria(id: string): Promise<RemocaoCategoria & { retrato: unknown }> {
  const { data, error } = await supabase.rpc('remover_categoria', { p_id: id })
  if (error) throw error
  const r = data as unknown as RemocaoCategoria
  return { ...r, retrato: data }
}

export async function restaurarCategoria(retrato: unknown): Promise<string> {
  const { data, error } = await supabase.rpc('restaurar_categoria', { p_snapshot: retrato as never })
  if (error) throw error
  return data
}

export type { Fn }
