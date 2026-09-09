import { supabase } from '../lib/supabase'
import type { Tables } from '../tipos/supabase'
import { planejarRecorrencia, type RecorrenciaBase } from '../dominio/recorrencias'
import type { DataLocal } from '../lib/datas'
import type { Escopo } from './lancamentos'

export type Recorrencia = Tables<'recorrencias'>
export type Orcamento = Tables<'orcamentos'>

export type DadosRecorrencia = {
  tipo: 'despesa' | 'receita'
  escopo: Escopo
  categoria_id: string | null
  metodo: 'credito' | 'a_vista' | null
  cartao_id: string | null
  descricao: string
  valor: number
  dia_vencimento: number
  inicio: DataLocal
  fim: DataLocal | null
}

export async function listarRecorrencias(): Promise<Recorrencia[]> {
  const { data, error } = await supabase
    .from('recorrencias')
    .select('*')
    .order('ativo', { ascending: false })
    .order('dia_vencimento')
  if (error) throw error
  return data ?? []
}

export async function criarRecorrencia(ownerId: string, householdId: string | null, d: DadosRecorrencia): Promise<void> {
  const { error } = await supabase.from('recorrencias').insert({
    owner_id: ownerId,
    household_id: d.escopo === 'compartilhado' ? householdId : null,
    escopo: d.escopo, tipo: d.tipo, categoria_id: d.categoria_id, metodo: d.metodo,
    cartao_id: d.metodo === 'credito' ? d.cartao_id : null,
    descricao: d.descricao, valor: d.valor, dia_vencimento: d.dia_vencimento,
    inicio: d.inicio, fim: d.fim,
  })
  if (error) throw error
}

export async function atualizarRecorrencia(id: string, d: Partial<DadosRecorrencia> & { ativo?: boolean }): Promise<void> {
  const { error } = await supabase.from('recorrencias').update(d).eq('id', id)
  if (error) throw error
}

/**
 * Fallback do primeiro acesso do mês: gera o que a Edge Function ainda não gerou.
 * Usa o MESMO motor (planejarRecorrencia) e a MESMA RPC idempotente do cron,
 * então rodar os dois não duplica nada.
 */
export async function gerarPendentes(competencia: DataLocal): Promise<number> {
  const { data: pendentes, error } = await supabase.rpc('recorrencias_pendentes', { p_competencia: competencia })
  if (error) throw error
  if (!pendentes?.length) return 0

  const { data: cartoes } = await supabase.from('v_cartoes_household').select('id, dia_fechamento, dia_vencimento')
  const porCartao = new Map((cartoes ?? []).map((c) => [c.id!, { dia_fechamento: c.dia_fechamento!, dia_vencimento: c.dia_vencimento! }]))

  let geradas = 0
  for (const r of pendentes) {
    try {
      const base: RecorrenciaBase = {
        id: r.id, tipo: r.tipo, metodo: r.metodo, valor: r.valor,
        dia_vencimento: r.dia_vencimento, inicio: r.inicio, fim: r.fim,
      }
      const plano = planejarRecorrencia(base, competencia, r.cartao_id ? porCartao.get(r.cartao_id) ?? null : null)
      if (!plano) continue
      const p = plano.parcelas[0]
      const { data: id } = await supabase.rpc('gerar_recorrencia', {
        p_recorrencia_id: r.id,
        p_competencia: plano.competencia,
        p_data: plano.dataCompra,
        p_parcela: p ? { valor: p.valorCentavos, competencia: p.competencia, vencimento: p.vencimento } : {},
      })
      if (id) geradas++
    } catch {
      // Uma recorrência mal configurada (ex.: crédito sem cartão) não pode
      // impedir a geração das outras nem travar a tela.
    }
  }
  return geradas
}

// ---------------- Orçamentos ----------------

export async function listarOrcamentos(escopo: Escopo, competencia: DataLocal): Promise<Orcamento[]> {
  const { data, error } = await supabase
    .from('orcamentos')
    .select('*')
    .eq('escopo', escopo)
    .lte('vigente_desde', competencia)
    .order('vigente_desde', { ascending: false })
  if (error) throw error
  // Mantém apenas o mais recente por categoria (o teto vigente).
  const vistos = new Set<string>()
  return (data ?? []).filter((o) => (vistos.has(o.categoria_id) ? false : vistos.add(o.categoria_id) && true))
}

/**
 * Define o teto de uma categoria a partir da competência.
 * Um teto por categoria/escopo/mês (índice único), então o upsert atualiza
 * o do mês corrente e preserva o histórico dos meses anteriores.
 */
export async function definirTeto(
  ownerId: string, householdId: string | null, escopo: Escopo,
  categoriaId: string, valorMensal: number, vigenteDesde: DataLocal,
): Promise<void> {
  const existente = await supabase
    .from('orcamentos').select('id')
    .eq('escopo', escopo).eq('categoria_id', categoriaId).eq('vigente_desde', vigenteDesde)
    .eq(escopo === 'pessoal' ? 'owner_id' : 'household_id', (escopo === 'pessoal' ? ownerId : householdId) ?? '')
    .maybeSingle()

  if (existente.data) {
    const { error } = await supabase.from('orcamentos').update({ valor_mensal: valorMensal }).eq('id', existente.data.id)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('orcamentos').insert({
    owner_id: ownerId,
    household_id: escopo === 'compartilhado' ? householdId : null,
    escopo, categoria_id: categoriaId, valor_mensal: valorMensal, vigente_desde: vigenteDesde,
  })
  if (error) throw error
}

export async function removerTeto(id: string): Promise<void> {
  const { error } = await supabase.from('orcamentos').delete().eq('id', id)
  if (error) throw error
}
