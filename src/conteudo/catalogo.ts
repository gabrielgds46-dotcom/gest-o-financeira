// =============================================================
// O que o casal pode escolher ao criar uma categoria.
//
// Ícone e cor não são campo livre de propósito: uma grade de ícones
// desenhados no mesmo traço fica legível; uma mistura de emoji e SVG
// aleatório, não. E cor escolhida a dedo costuma cair no cinza que
// some no fundo escuro — as daqui já foram medidas.
// =============================================================
import type { NomeIcone } from '../components/Icone'

export const ICONES_CATEGORIA: NomeIcone[] = [
  'casa', 'mercado', 'utensils', 'cafe', 'car', 'viagem',
  'saude', 'academia', 'pet', 'bebe', 'educacao', 'roupa',
  'celular', 'ferramenta', 'presente', 'musica', 'jogo', 'clapperboard',
  'palmtree', 'sparkles', 'receipt', 'piggy-bank',
]

/**
 * Medidas contra o cartão (#18181b): a pior fica em 5.94:1, bem acima do
 * 4.5:1 do AA. Importa porque o nome da categoria é escrito nessa mesma
 * cor na grade e nos painéis, não só o ícone.
 */
export const CORES_CATEGORIA = [
  '#F97316', '#FB923C', '#FBBF24', '#A3E635',
  '#4ADE80', '#22C55E', '#2DD4BF', '#22D3EE',
  '#38BDF8', '#60A5FA', '#818CF8', '#A78BFA',
  '#C084FC', '#E879F9', '#F472B6', '#FB7185',
  '#F87171', '#94A3B8',
] as const
