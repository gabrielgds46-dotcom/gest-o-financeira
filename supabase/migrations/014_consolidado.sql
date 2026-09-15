-- =============================================================
-- 014_consolidado.sql  ·  A visão "Tudo"
--
-- Até aqui o Início só sabia olhar um escopo de cada vez: ou o pessoal,
-- ou o do casal. Faltava a pergunta que um app de casal existe para
-- responder — "como estamos, no total?".
--
-- As funções passam a receber p_visao text ('pessoal' | 'compartilhado'
-- | 'consolidado'), como as de Análise já faziam desde 009.
--
-- -------------------------------------------------------------
-- A DEFINIÇÃO DE RENDA, que é onde isso pode dar errado
-- -------------------------------------------------------------
-- No modo Casal a renda soma OS DOIS salários, porque é o bolo inteiro
-- que paga as contas da casa. Só que o gasto pessoal que o app consegue
-- mostrar é só o de quem está olhando — o RLS não deixa ver o pessoal do
-- par, e isso é proposital.
--
-- Então, no consolidado, somar os dois salários contra apenas os seus
-- gastos daria um número inflado e otimista. Seria o mesmo erro que
-- 013_hero.sql acabou de corrigir no topo da tela.
--
-- Por isso o consolidado é simétrico:
--
--   renda = suas receitas pessoais + as receitas compartilhadas da casa
--   gasto = seus gastos pessoais   + os gastos compartilhados da casa
--
-- Consequência a saber: o pedaço compartilhado da renda no consolidado
-- NÃO é igual ao do modo Casal (lá entram os dois salários, aqui não).
-- São perguntas diferentes: "de onde sai o dinheiro das contas da casa"
-- e "como está o meu mês por inteiro".
-- =============================================================

create or replace function fn_valida_visao(p_visao text) returns text
language sql immutable set search_path = public as $$
  select case when p_visao in ('pessoal', 'compartilhado', 'consolidado') then p_visao
              else null end
$$;

-- -------------------------------------------------------------
-- resumo_mes
-- -------------------------------------------------------------
drop function if exists resumo_mes(escopo_t, date);
create or replace function resumo_mes(p_visao text, p_competencia date)
returns table (
  renda bigint, gasto bigint, reserva bigint, resgate bigint, credito bigint,
  sobra bigint, taxa_poupanca numeric, comprometimento numeric,
  a_vencer_mes bigint
)
language sql stable set search_path = public as $$
  with comp as (select date_trunc('month', p_competencia)::date as c),
  hh as (select household_id as h from profiles where id = auth.uid()),
  -- Receitas visíveis nesta visão.
  rec as (
    select coalesce(sum(r.valor), 0)::bigint as v
      from receitas r, comp
     where r.competencia = comp.c
       and ((p_visao in ('pessoal','consolidado')       and r.escopo = 'pessoal'       and r.owner_id = auth.uid())
         or (p_visao in ('compartilhado','consolidado') and r.escopo = 'compartilhado' and r.household_id = (select h from hh)))
  ),
  -- Só o modo Casal soma os salários dos dois: ali a pergunta é de onde
  -- sai o dinheiro das contas da casa.
  rec_casa as (
    select coalesce(sum(v.renda_total), 0)::bigint as v
      from v_renda_household v, comp
     where v.competencia = comp.c and p_visao = 'compartilhado'
  ),
  p as (
    select l.natureza, l.metodo, c.grupo, pc.valor, pc.status
      from parcelas pc
      join lancamentos l on l.id = pc.lancamento_id
      join categorias  c on c.id = l.categoria_id, comp
     where pc.competencia = comp.c and pc.status <> 'cancelado'
       and ((p_visao in ('pessoal','consolidado')       and l.escopo = 'pessoal'       and l.owner_id = auth.uid())
         or (p_visao in ('compartilhado','consolidado') and l.escopo = 'compartilhado' and l.household_id = (select h from hh)))
  ),
  x as (
    select
      (select v from rec) + coalesce((select v from rec_casa), 0) as renda,
      coalesce((select sum(valor) from p where natureza = 'saida'   and grupo = 'despesa'), 0)::bigint as gasto,
      coalesce((select sum(valor) from p where natureza = 'saida'   and grupo = 'reserva'), 0)::bigint as reserva,
      coalesce((select sum(valor) from p where natureza = 'resgate'), 0)::bigint                        as resgate,
      coalesce((select sum(valor) from p where natureza = 'saida'   and metodo = 'credito'), 0)::bigint as credito,
      coalesce((select sum(valor) from p where natureza = 'saida'   and grupo = 'despesa'
                                          and status = 'pendente'), 0)::bigint                          as a_vencer_mes
  )
  select renda, gasto, reserva, resgate, credito,
         (renda + resgate - gasto - reserva)::bigint as sobra,
         case when renda > 0 then round((reserva - resgate)::numeric / renda, 4) else 0 end as taxa_poupanca,
         case when renda > 0 then round(credito::numeric / renda, 4) else 0 end            as comprometimento,
         a_vencer_mes
    from x
   where fn_valida_visao(p_visao) is not null
$$;

-- -------------------------------------------------------------
-- gasto_por_categoria
-- -------------------------------------------------------------
drop function if exists gasto_por_categoria(escopo_t, date);
create or replace function gasto_por_categoria(p_visao text, p_competencia date)
returns table (categoria_id uuid, slug text, nome text, icone text, cor text,
               grupo grupo_categoria_t, ordem int, valor bigint, teto bigint)
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
  ),
  o as (
    select o.categoria_id, sum(o.valor_mensal)::bigint as valor_mensal
      from (
        select distinct on (o.categoria_id, o.escopo) o.categoria_id, o.escopo, o.valor_mensal
          from orcamentos o, comp
         where o.vigente_desde <= comp.c
           and ((p_visao in ('pessoal','consolidado')       and o.escopo = 'pessoal'       and o.owner_id = auth.uid())
             or (p_visao in ('compartilhado','consolidado') and o.escopo = 'compartilhado' and o.household_id = (select h from hh)))
         order by o.categoria_id, o.escopo, o.vigente_desde desc
      ) o
     group by o.categoria_id
  )
  select c.id, c.slug, c.nome, c.icone, c.cor, c.grupo, c.ordem,
         coalesce(g.v, 0)::bigint, o.valor_mensal
    from categorias c
    left join g on g.categoria_id = c.id
    left join o on o.categoria_id = c.id
   where fn_valida_visao(p_visao) is not null
     and (c.ativo or coalesce(g.v, 0) > 0 or o.valor_mensal is not null)
   order by c.ordem
$$;

-- -------------------------------------------------------------
-- a_vencer
-- -------------------------------------------------------------
drop function if exists a_vencer(escopo_t, int);
create or replace function a_vencer(p_visao text, p_dias int default 7)
returns table (
  parcela_id uuid, lancamento_id uuid, descricao text,
  categoria_slug text, categoria_nome text, categoria_cor text, categoria_icone text,
  metodo metodo_t, cartao_apelido text, numero int, parcelas_total int,
  valor bigint, vencimento date, competencia date, dias_restantes int, pago_por uuid,
  escopo escopo_t
)
language sql stable set search_path = public as $$
  with hh as (select household_id as h from profiles where id = auth.uid())
  select pc.id, l.id, l.descricao,
         c.slug, c.nome, c.cor, c.icone,
         l.metodo, ct.apelido, pc.numero, l.parcelas_total,
         pc.valor, pc.vencimento, pc.competencia,
         (pc.vencimento - fn_hoje_local())::int, l.pago_por, l.escopo
    from parcelas pc
    join lancamentos l on l.id = pc.lancamento_id
    join categorias  c on c.id = l.categoria_id
    left join v_cartoes_household ct on ct.id = l.cartao_id
   where pc.status = 'pendente'
     and fn_valida_visao(p_visao) is not null
     and ((p_visao in ('pessoal','consolidado')       and l.escopo = 'pessoal'       and l.owner_id = auth.uid())
       or (p_visao in ('compartilhado','consolidado') and l.escopo = 'compartilhado' and l.household_id = (select h from hh)))
     and pc.vencimento <= case
           when p_dias is null
             then (date_trunc('month', fn_hoje_local()) + interval '1 month - 1 day')::date
           else fn_hoje_local() + p_dias
         end
   order by pc.vencimento, pc.valor desc
$$;

-- -------------------------------------------------------------
-- lancamentos_do_mes
-- -------------------------------------------------------------
drop function if exists lancamentos_do_mes(escopo_t, date);
create or replace function lancamentos_do_mes(p_visao text, p_competencia date)
returns table (
  parcela_id uuid, lancamento_id uuid, descricao text,
  categoria_nome text, categoria_cor text, categoria_icone text,
  metodo metodo_t, natureza natureza_t, cartao_apelido text,
  numero int, parcelas_total int, valor bigint,
  vencimento date, status status_parcela_t, pago_em date,
  pago_por uuid, recorrencia_id uuid, escopo escopo_t
)
language sql stable set search_path = public as $$
  with hh as (select household_id as h from profiles where id = auth.uid())
  select pc.id, l.id, l.descricao,
         c.nome, c.cor, c.icone,
         l.metodo, l.natureza, ct.apelido,
         pc.numero, l.parcelas_total, pc.valor,
         pc.vencimento, pc.status, pc.pago_em, l.pago_por, l.recorrencia_id, l.escopo
    from parcelas pc
    join lancamentos l on l.id = pc.lancamento_id
    join categorias  c on c.id = l.categoria_id
    left join v_cartoes_household ct on ct.id = l.cartao_id
   where pc.competencia = date_trunc('month', p_competencia)::date
     and pc.status <> 'cancelado'
     and fn_valida_visao(p_visao) is not null
     and ((p_visao in ('pessoal','consolidado')       and l.escopo = 'pessoal'       and l.owner_id = auth.uid())
       or (p_visao in ('compartilhado','consolidado') and l.escopo = 'compartilhado' and l.household_id = (select h from hh)))
   order by pc.vencimento, pc.valor desc
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function
  fn_valida_visao(text),
  resumo_mes(text, date),
  gasto_por_categoria(text, date),
  a_vencer(text, int),
  lancamentos_do_mes(text, date)
to authenticated, service_role;
