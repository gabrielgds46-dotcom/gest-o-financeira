-- =============================================================
-- 003_seed.sql  ·  Categorias fixas
-- Investimento e poupança são grupo 'reserva': NÃO entram no
-- denominador de "% dos custos". Se entrarem, o casal vê
-- "35% em investimento" e acha que está gastando demais, quando
-- na verdade está guardando.
-- =============================================================

insert into categorias (slug, nome, icone, cor, grupo, ordem) values
  ('alimentacao',    'Alimentação',   'utensils',    '#F97316', 'despesa', 1),
  ('transporte',     'Transporte',    'car',         '#3B82F6', 'despesa', 2),
  ('custos_fixos',   'Custos fixos',  'receipt',     '#64748B', 'despesa', 3),
  ('entretenimento', 'Entretenimento','clapperboard','#A855F7', 'despesa', 4),
  ('lazer',          'Lazer',         'palmtree',    '#14B8A6', 'despesa', 5),
  ('beleza',         'Beleza',        'sparkles',    '#EC4899', 'despesa', 6),
  ('investimento',   'Investimento',  'trending-up', '#22C55E', 'reserva', 7),
  ('poupanca',       'Poupança',      'piggy-bank',  '#16A34A', 'reserva', 8)
on conflict (slug) do nothing;
