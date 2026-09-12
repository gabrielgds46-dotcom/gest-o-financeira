import { supabase } from '../lib/supabase'
import type { Database, Tables } from '../tipos/supabase'
import type { Parcela } from '../dominio/parcelas'
import type { DataLocal } from '../lib/datas'

type Fn = Database['public']['Functions']
export type Escopo = Database['public']['Enums']['escopo_t']
export type Metodo = Database['public']['Enums']['metodo_t']
export type Natureza = Database['public']['Enums']['natureza_t']
export type Categoria = Tables<'categorias'>
export type CartaoDaCasa = Tables<'v_cartoes_household'>
export type ResumoMes = Fn['resumo_mes']['Returns'][number]
export type GastoCategoria = Fn['gasto_por_categoria']['Returns'][number]
export type ParcelaAVencer = Fn['a_vencer']['Returns'][number]
export type SaldoCasal = Fn['saldo_casal']['Returns'][number]

export async function listarCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase.from('categorias').select('*').order('ordem')
  if (error) throw error
  return data ?? []
}

/** Cartões ativos de todo o casal, sem limite (vem da view). */
export async function listarCartoesDaCasa(): Promise<CartaoDaCasa[]> {
  const { data, error } = await supabase.from('v_cartoes_household').select('*').eq('ativo', true).order('apelido')
  if (error) throw error
  return data ?? []
}

export type NovoLancamento = {
  escopo: Escopo
  metodo: Metodo
  categoriaId: string
  valorTotal: number
  dataCompra: DataLocal
  descricao: string
  parcelas: Parcela[]
  cartaoId?: string | null
  pagoPor?: string | null
  natureza?: Natureza
  householdId?: string | null
}

export async function criarLancamento(n: NovoLancamento): Promise<string> {
  const { data, error } = await supabase.rpc('criar_lancamento', {
    p_escopo: n.escopo,
    p_metodo: n.metodo,
    p_categoria_id: n.categoriaId,
    p_valor_total: n.valorTotal,
    p_data_compra: n.dataCompra,
    p_parcelas_total: n.parcelas.length,
    p_descricao: n.descricao,
    p_parcelas: n.parcelas.map((p) => ({ numero: p.numero, valor: p.valorCentavos, competencia: p.competencia, vencimento: p.vencimento })),
    p_cartao_id: n.cartaoId ?? undefined,
    p_pago_por: n.pagoPor ?? undefined,
    p_natureza: n.natureza ?? 'saida',
    p_household_id: n.householdId ?? undefined,
  })
  if (error) throw error
  return data
}

export type UltimoLancamento = Pick<Tables<'lancamentos'>, 'escopo' | 'metodo' | 'cartao_id' | 'categoria_id' | 'descricao' | 'valor_total' | 'parcelas_total' | 'pago_por' | 'natureza'>

export async function buscarUltimoLancamento(userId: string): Promise<UltimoLancamento | null> {
  const { data, error } = await supabase
    .from('lancamentos')
    .select('escopo, metodo, cartao_id, categoria_id, descricao, valor_total, parcelas_total, pago_por, natureza')
    .eq('owner_id', userId)
    .is('recorrencia_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Sugestão de categoria por prefixo da descrição no histórico (sem IA). */
export async function sugerirCategoria(userId: string, texto: string): Promise<string | null> {
  const t = texto.trim()
  if (t.length < 3) return null
  const { data, error } = await supabase
    .from('lancamentos')
    .select('categoria_id')
    .eq('owner_id', userId)
    .ilike('descricao', `${t.replace(/[%_]/g, '')}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data?.categoria_id ?? null
}

export async function criarReceitaExtra(dados: {
  ownerId: string; escopo: Escopo; valor: number; competencia: DataLocal; descricao: string; householdId: string | null
}): Promise<void> {
  const { error } = await supabase.from('receitas').insert({
    owner_id: dados.ownerId,
    escopo: dados.escopo,
    tipo: 'extra',
    valor: dados.valor,
    competencia: dados.competencia,
    descricao: dados.descricao,
    household_id: dados.escopo === 'compartilhado' ? dados.householdId : null,
  })
  if (error) throw error
}

// ---------------- Início ----------------

export async function garantirSalario(competencia: DataLocal): Promise<void> {
  const { error } = await supabase.rpc('garantir_salario', { p_competencia: competencia })
  if (error) throw error
}

export async function resumoMes(escopo: Escopo, competencia: DataLocal): Promise<ResumoMes> {
  const { data, error } = await supabase.rpc('resumo_mes', { p_escopo: escopo, p_competencia: competencia })
  if (error) throw error
  return data[0] ?? { renda: 0, gasto: 0, reserva: 0, resgate: 0, credito: 0, sobra: 0, taxa_poupanca: 0, comprometimento: 0 }
}

export async function gastoPorCategoria(escopo: Escopo, competencia: DataLocal): Promise<GastoCategoria[]> {
  const { data, error } = await supabase.rpc('gasto_por_categoria', { p_escopo: escopo, p_competencia: competencia })
  if (error) throw error
  return data ?? []
}

export async function aVencer(escopo: Escopo, dias = 7): Promise<ParcelaAVencer[]> {
  const { data, error } = await supabase.rpc('a_vencer', { p_escopo: escopo, p_dias: dias })
  if (error) throw error
  return data ?? []
}

export async function marcarParcelaPaga(parcelaId: string, pagoEm: DataLocal): Promise<void> {
  const { error } = await supabase.from('parcelas').update({ status: 'pago', pago_em: pagoEm }).eq('id', parcelaId)
  if (error) throw error
}

export async function saldoCasal(householdId: string): Promise<SaldoCasal[]> {
  const { data, error } = await supabase.rpc('saldo_casal', { p_household_id: householdId })
  if (error) throw error
  return data ?? []
}

export async function registrarAcerto(dados: { householdId: string; de: string; para: string; valor: number; data: DataLocal; descricao: string }): Promise<void> {
  const { error } = await supabase.from('acertos').insert({
    household_id: dados.householdId, de_user_id: dados.de, para_user_id: dados.para,
    valor: dados.valor, data: dados.data, descricao: dados.descricao,
  })
  if (error) throw error
}

// ---------------- Fechamento ----------------

export async function mesEstaFechado(escopo: Escopo, competencia: DataLocal, userId: string, householdId: string | null): Promise<boolean> {
  let q = supabase.from('meses_fechados').select('id').eq('escopo', escopo).eq('competencia', competencia)
  q = escopo === 'pessoal' ? q.eq('owner_id', userId) : q.eq('household_id', householdId ?? '')
  const { data, error } = await q.maybeSingle()
  if (error) throw error
  return !!data
}

export async function fecharMes(escopo: Escopo, competencia: DataLocal, userId: string, householdId: string | null): Promise<void> {
  const { error } = await supabase.from('meses_fechados').insert({
    escopo, competencia, fechado_por: userId,
    owner_id: escopo === 'pessoal' ? userId : null,
    household_id: escopo === 'compartilhado' ? householdId : null,
  })
  if (error) throw error
}

export async function reabrirMes(escopo: Escopo, competencia: DataLocal, userId: string, householdId: string | null): Promise<void> {
  let q = supabase.from('meses_fechados').delete().eq('escopo', escopo).eq('competencia', competencia)
  q = escopo === 'pessoal' ? q.eq('owner_id', userId) : q.eq('household_id', householdId ?? '')
  const { error } = await q
  if (error) throw error
}

// ---------------- Detalhe, edição e exclusão ----------------
//
// Toda ação destrutiva devolve o necessário para voltar atrás em 5 segundos
// (ver components/Desfazer.tsx). É por isso que cancelar devolve os ids que
// ELE cancelou e excluir devolve um retrato completo do lançamento.

export type LancamentoDoMes = Fn['lancamentos_do_mes']['Returns'][number]

export async function lancamentosDoMes(escopo: Escopo, competencia: DataLocal): Promise<LancamentoDoMes[]> {
  const { data, error } = await supabase.rpc('lancamentos_do_mes', { p_escopo: escopo, p_competencia: competencia })
  if (error) throw error
  return data ?? []
}

export type ParcelaDetalhe = {
  id: string
  numero: number
  valor: number
  competencia: DataLocal
  vencimento: DataLocal
  status: 'pendente' | 'pago' | 'cancelado'
  pago_em: DataLocal | null
  mes_fechado: boolean
}

export type DetalheLancamento = {
  id: string
  escopo: Escopo
  metodo: Metodo
  natureza: Natureza
  descricao: string
  valor_total: number
  data_compra: DataLocal
  parcelas_total: number
  cancelado_em: string | null
  recorrencia_id: string | null
  cartao_id: string | null
  cartao: string | null
  dia_fechamento: number | null
  dia_vencimento: number | null
  categoria_id: string
  categoria: string
  categoria_cor: string
  categoria_icone: string
  pago_por: string | null
  pago_por_nome: string | null
  mes_fechado: boolean
  parcelas: ParcelaDetalhe[]
}

export async function buscarDetalhe(lancamentoId: string): Promise<DetalheLancamento> {
  const { data, error } = await supabase.rpc('detalhe_lancamento', { p_lancamento_id: lancamentoId })
  if (error) throw error
  if (!data) throw new Error('Lançamento não encontrado.')
  return data as unknown as DetalheLancamento
}

export type EdicaoLancamento = {
  lancamentoId: string
  valorTotal: number
  categoriaId: string
  descricao: string
  dataCompra: DataLocal
  metodo: Metodo
  cartaoId: string | null
  natureza: Natureza
  /** id nulo = parcela nova. O que não vier e estiver pendente é removido. */
  parcelas: Array<{ id: string | null; numero: number; valorCentavos: number; competencia: DataLocal; vencimento: DataLocal }>
}

export async function editarLancamento(e: EdicaoLancamento): Promise<void> {
  const { error } = await supabase.rpc('editar_lancamento', {
    p_lancamento_id: e.lancamentoId,
    p_valor_total: e.valorTotal,
    p_categoria_id: e.categoriaId,
    p_descricao: e.descricao,
    p_data_compra: e.dataCompra,
    p_metodo: e.metodo,
    p_cartao_id: e.metodo === 'credito' ? e.cartaoId : null,
    p_natureza: e.natureza,
    p_parcelas: e.parcelas.map((p) => ({ id: p.id, numero: p.numero, valor: p.valorCentavos, competencia: p.competencia, vencimento: p.vencimento })),
  })
  if (error) throw error
}

/** Cancela as parcelas ainda abertas. Devolve os ids cancelados (para desfazer). */
export async function cancelarFuturas(lancamentoId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('cancelar_lancamento', { p_lancamento_id: lancamentoId })
  if (error) throw error
  return data ?? []
}

export async function reverterCancelamento(parcelaIds: string[]): Promise<void> {
  if (parcelaIds.length === 0) return
  const { error } = await supabase.rpc('reverter_cancelamento', { p_parcela_ids: parcelaIds })
  if (error) throw error
}

/** Apaga de vez. Devolve o retrato para restaurar com os mesmos ids. */
export async function excluirLancamento(lancamentoId: string): Promise<unknown> {
  const { data, error } = await supabase.rpc('excluir_lancamento', { p_lancamento_id: lancamentoId })
  if (error) throw error
  return data
}

export async function restaurarLancamento(snapshot: unknown): Promise<string> {
  const { data, error } = await supabase.rpc('restaurar_lancamento', { p_snapshot: snapshot as never })
  if (error) throw error
  return data
}

/** Desfaz um "marcar como pago" (o toque errado no check). */
export async function desmarcarParcelaPaga(parcelaId: string): Promise<void> {
  const { error } = await supabase.from('parcelas').update({ status: 'pendente', pago_em: null }).eq('id', parcelaId)
  if (error) throw error
}
