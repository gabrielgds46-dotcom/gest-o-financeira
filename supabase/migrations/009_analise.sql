-- =============================================================
-- 009_analise.sql  ·  Consultas da tela Análise
--
-- Visão (p_visao text), diferente do escopo do banco:
--   'pessoal'       -> meus lançamentos pessoais
--   'compartilhado' -> lançamentos da casa
--   'consolidado'   -> meus pessoais + os da casa
--
-- Em 'compartilhado' e 'consolidado' a RENDA é a da casa inteira
-- (as duas rendas pessoais via v_renda_household + receitas
-- compartilhadas), porque o KPI do casal precisa das duas.
-- Os gastos pessoais do parceiro seguem invisíveis (RLS), então a UI
-- avisa que o consolidado não os inclui.
--
-- Todas SECURITY INVOKER: o RLS continua valendo dentro delas.
-- =============================================================

-- -------------------------------------------------------------
-- analise_categorias: % por categoria no mês (grupo despesa e reserva
-- separados pelo campo `grupo`; o front usa só despesa no denominador).
-- -------------------------------------------------------------
create or replace function analise_categorias(p_visao text, p_competencia date)
returns table (categoria_id uuid, slug text, nome text, icone text, cor text,
               grupo grupo_categoria_t, ordem int, valor bigint)
language sql stable set search_path = public as $$
  with comp as (select date_trunc('month', p_competencia)::date as c),
  hh as (select household_id as h from profiles where id = auth.uid()),
  g as (
    select l.categoria_id, sum(pc.valor)::bigint as v
      from parcelas pc
      join lancamentos l on l.id = pc.lancamento_id, comp
     where pc.competencia = comp.c and pc.status <> 'cancelado' and l.natureza = 'saida'
       and ((p_visao in ('pessoal','consolidado')       and l.escopo = 'pessoal'       and l.owner_id = auth.uid())
         or (p_visao in ('compartilhado','consolidado') and l.escopo = 'compartilhado' and l.household_id = (select h from hh)))
     group by l.categoria_id
  )
  select c.id, c.slug, c.nome, c.icone, c.cor, c.grupo, c.ordem, coalesce(g.v, 0)::bigint
    from categorias c left join g on g.categoria_id = c.id
   order by c.ordem
$$;

-- -------------------------------------------------------------
-- analise_metodo: crédito vs à vista no mês (só saídas de despesa).
-- -------------------------------------------------------------
create or replace function analise_metodo(p_visao text, p_competencia date)
returns table (credito bigint, a_vista bigint)
language sql stable set search_path = public as $$
  with comp as (select date_trunc('month', p_competencia)::date as c),
  hh as (select household_id as h from profiles where id = auth.uid()),
  p as (
    select l.metodo, pc.valor
      from parcelas pc
      join lancamentos l on l.id = pc.lancamento_id, comp
     where pc.competencia = comp.c and pc.status <> 'cancelado' and l.natureza = 'saida'
       and ((p_visao in ('pessoal','consolidado')       and l.escopo = 'pessoal'       and l.owner_id = auth.uid())
         or (p_visao in ('compartilhado','consolidado') and l.escopo = 'compartilhado' and l.household_id = (select h from hh)))
  )
  select coalesce(sum(valor) filter (where metodo = 'credito'), 0)::bigint,
         coalesce(sum(valor) filter (where metodo = 'a_vista'), 0)::bigint
    from p
$$;

-- -------------------------------------------------------------
-- evolucao_mensal: renda vs gasto nos últimos N meses (inclui o mês
-- de referência). generate_series garante mês sem movimento no gráfico.
-- -------------------------------------------------------------
create or replace function evolucao_mensal(p_visao text, p_competencia date, p_meses int default 6)
returns table (competencia date, renda bigint, gasto bigint)
language sql stable set search_path = public as $$
  with base as (select date_trunc('month', p_competencia)::date as fim),
  hh as (select household_id as h from profiles where id = auth.uid()),
  meses as (
    select (fim - (interval '1 month' * gs))::date as c
      from base, generate_series(0, greatest(p_meses, 1) - 1) gs
  ),
  rec as (
    select r.competencia as c, sum(r.valor)::bigint as v
      from receitas r
     where ((p_visao = 'pessoal' and r.escopo = 'pessoal' and r.owner_id = auth.uid())
         or (p_visao in ('compartilhado','consolidado') and r.escopo = 'compartilhado' and r.household_id = (select h from hh)))
     group by r.competencia
  ),
  rec_casa as (
    select v.competencia as c, sum(v.renda_total)::bigint as v
      from v_renda_household v
     where p_visao in ('compartilhado','consolidado')
     group by v.competencia
  ),
  gas as (
    select pc.competencia as c, sum(pc.valor)::bigint as v
      from parcelas pc
      join lancamentos l on l.id = pc.lancamento_id
      join categorias  ct on ct.id = l.categoria_id
     where pc.status <> 'cancelado' and l.natureza = 'saida' and ct.grupo = 'despesa'
       and ((p_visao in ('pessoal','consolidado')       and l.escopo = 'pessoal'       and l.owner_id = auth.uid())
         or (p_visao in ('compartilhado','consolidado') and l.escopo = 'compartilhado' and l.household_id = (select h from hh)))
     group by pc.competencia
  )
  select m.c,
         (coalesce(rec.v, 0) + coalesce(rec_casa.v, 0))::bigint,
         coalesce(gas.v, 0)::bigint
    from meses m
    left join rec      on rec.c = m.c
    left join rec_casa on rec_casa.c = m.c
    left join gas      on gas.c = m.c
   order by m.c
$$;

-- -------------------------------------------------------------
-- comprometimento_futuro: soma das parcelas PENDENTES por mês, N meses
-- à frente. É o indicador mais importante: mostra quanto do salário
-- futuro já foi vendido.
-- -------------------------------------------------------------
create or replace function comprometimento_futuro(p_visao text, p_competencia date, p_meses int default 12)
returns table (competencia date, valor bigint, credito bigint)
language sql stable set search_path = public as $$
  with base as (select date_trunc('month', p_competencia)::date as ini),
  hh as (select household_id as h from profiles where id = auth.uid()),
  meses as (
    select (ini + (interval '1 month' * gs))::date as c
      from base, generate_series(0, greatest(p_meses, 1) - 1) gs
  ),
  p as (
    select pc.competencia as c, pc.valor, l.metodo
      from parcelas pc
      join lancamentos l on l.id = pc.lancamento_id
     where pc.status = 'pendente' and l.natureza = 'saida'
       and ((p_visao in ('pessoal','consolidado')       and l.escopo = 'pessoal'       and l.owner_id = auth.uid())
         or (p_visao in ('compartilhado','consolidado') and l.escopo = 'compartilhado' and l.household_id = (select h from hh)))
  )
  select m.c,
         coalesce((select sum(valor) from p where p.c = m.c), 0)::bigint,
         coalesce((select sum(valor) from p where p.c = m.c and p.metodo = 'credito'), 0)::bigint
    from meses m
   order by m.c
$$;

-- -------------------------------------------------------------
-- limite_por_cartao: parcelas pendentes (todas, deste mês em diante)
-- sobre o limite. Só os MEUS cartões: o limite é privado, e a tabela
-- base já é restrita ao dono pelo RLS.
-- -------------------------------------------------------------
create or replace function limite_por_cartao(p_competencia date)
returns table (cartao_id uuid, apelido text, limite bigint, comprometido bigint)
language sql stable set search_path = public as $$
  with comp as (select date_trunc('month', p_competencia)::date as c)
  select c.id, c.apelido, c.limite,
         coalesce((select sum(pc.valor)
                     from parcelas pc
                     join lancamentos l on l.id = pc.lancamento_id, comp
                    where l.cartao_id = c.id and pc.status = 'pendente'
                      and pc.competencia >= comp.c), 0)::bigint
    from cartoes c
   where c.ativo
   order by c.apelido
$$;

-- -------------------------------------------------------------
-- exportar_lancamentos: linhas detalhadas para o CSV. O front monta o
-- arquivo; aqui só se garante o mesmo filtro de visão das outras telas.
-- -------------------------------------------------------------
create or replace function exportar_lancamentos(p_visao text, p_de date, p_ate date)
returns table (
  competencia date, vencimento date, data_compra date, descricao text,
  categoria text, grupo grupo_categoria_t, escopo escopo_t, metodo metodo_t,
  natureza natureza_t, cartao text, parcela text, valor bigint,
  status status_parcela_t, pago_em date, pago_por text
)
language sql stable set search_path = public as $$
  with hh as (select household_id as h from profiles where id = auth.uid())
  select pc.competencia, pc.vencimento, l.data_compra, l.descricao,
         c.nome, c.grupo, l.escopo, l.metodo, l.natureza,
         ct.apelido,
         case when l.parcelas_total > 1 then pc.numero || '/' || l.parcelas_total else '' end,
         pc.valor, pc.status, pc.pago_em, pr.nome
    from parcelas pc
    join lancamentos l on l.id = pc.lancamento_id
    join categorias  c on c.id = l.categoria_id
    left join v_cartoes_household ct on ct.id = l.cartao_id
    left join profiles pr on pr.id = l.pago_por
   where pc.competencia >= date_trunc('month', p_de)::date
     and pc.competencia <= date_trunc('month', p_ate)::date
     and ((p_visao in ('pessoal','consolidado')       and l.escopo = 'pessoal'       and l.owner_id = auth.uid())
       or (p_visao in ('compartilhado','consolidado') and l.escopo = 'compartilhado' and l.household_id = (select h from hh)))
   order by pc.competencia, pc.vencimento, l.descricao
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  analise_categorias(text, date), analise_metodo(text, date),
  evolucao_mensal(text, date, int), comprometimento_futuro(text, date, int),
  limite_por_cartao(date), exportar_lancamentos(text, date, date)
to authenticated, service_role;
