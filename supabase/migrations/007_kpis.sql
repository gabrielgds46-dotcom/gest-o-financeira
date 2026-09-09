-- =============================================================
-- 007_kpis.sql  ·  KPIs e consultas da tela Início / Lançar
-- Todas SECURITY INVOKER: o RLS continua valendo dentro delas.
-- "Hoje" no banco segue a mesma regra do front: America/Sao_Paulo.
-- =============================================================

create or replace function fn_hoje_local() returns date
language sql stable set search_path = public as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

-- -------------------------------------------------------------
-- garantir_salario: fallback da receita de salário do mês.
-- O salário do perfil vira uma receita `salario` (única por mês, editável).
-- Chamada no primeiro acesso ao mês; a Edge Function (Fase 6) faz o mesmo.
-- -------------------------------------------------------------
create or replace function garantir_salario(p_competencia date) returns void
language plpgsql set search_path = public as $$
declare
  v_sal  bigint;
  v_comp date := date_trunc('month', p_competencia)::date;
begin
  select salario_base into v_sal from profiles where id = auth.uid();
  if coalesce(v_sal, 0) <= 0 then return; end if;
  if fn_mes_esta_fechado('pessoal', auth.uid(), null, v_comp) then return; end if;

  insert into receitas (owner_id, escopo, tipo, valor, competencia, descricao)
  values (auth.uid(), 'pessoal', 'salario', v_sal, v_comp, 'Salário')
  on conflict (owner_id, competencia) where tipo = 'salario' do nothing;
end $$;

-- -------------------------------------------------------------
-- resumo_mes: Renda, Gasto, Reserva, Resgate, Sobra, Taxa de poupança,
-- Comprometimento (crédito ÷ renda). Reserva NÃO é gasto.
-- Compartilhado: renda = renda pessoal dos dois (view) + receitas compartilhadas.
-- -------------------------------------------------------------
create or replace function resumo_mes(p_escopo escopo_t, p_competencia date)
returns table (
  renda bigint, gasto bigint, reserva bigint, resgate bigint, credito bigint,
  sobra bigint, taxa_poupanca numeric, comprometimento numeric
)
language sql stable set search_path = public as $$
  with comp as (select date_trunc('month', p_competencia)::date as c),
  hh as (select household_id as h from profiles where id = auth.uid()),
  rec as (
    select coalesce(sum(r.valor), 0)::bigint as v
      from receitas r, comp
     where r.competencia = comp.c
       and ((p_escopo = 'pessoal'       and r.escopo = 'pessoal'       and r.owner_id = auth.uid())
         or (p_escopo = 'compartilhado' and r.escopo = 'compartilhado' and r.household_id = (select h from hh)))
  ),
  rec_casa as (
    select coalesce(sum(v.renda_total), 0)::bigint as v
      from v_renda_household v, comp
     where v.competencia = comp.c
  ),
  p as (
    select l.natureza, l.metodo, c.grupo, pc.valor
      from parcelas pc
      join lancamentos l on l.id = pc.lancamento_id
      join categorias  c on c.id = l.categoria_id, comp
     where pc.competencia = comp.c and pc.status <> 'cancelado'
       and ((p_escopo = 'pessoal'       and l.escopo = 'pessoal'       and l.owner_id = auth.uid())
         or (p_escopo = 'compartilhado' and l.escopo = 'compartilhado' and l.household_id = (select h from hh)))
  ),
  x as (
    select
      case when p_escopo = 'pessoal' then (select v from rec) else (select v from rec) + (select v from rec_casa) end as renda,
      coalesce((select sum(valor) from p where natureza = 'saida'   and grupo = 'despesa'), 0)::bigint as gasto,
      coalesce((select sum(valor) from p where natureza = 'saida'   and grupo = 'reserva'), 0)::bigint as reserva,
      coalesce((select sum(valor) from p where natureza = 'resgate'), 0)::bigint                        as resgate,
      coalesce((select sum(valor) from p where natureza = 'saida'   and metodo = 'credito'), 0)::bigint as credito
  )
  select renda, gasto, reserva, resgate, credito,
         (renda + resgate - gasto - reserva)::bigint as sobra,
         case when renda > 0 then round((reserva - resgate)::numeric / renda, 4) else 0 end as taxa_poupanca,
         case when renda > 0 then round(credito::numeric / renda, 4) else 0 end            as comprometimento
    from x
$$;

-- -------------------------------------------------------------
-- gasto_por_categoria: realizado no mês por categoria + teto vigente
-- do orçamento (o mais recente com vigente_desde <= competência).
-- -------------------------------------------------------------
create or replace function gasto_por_categoria(p_escopo escopo_t, p_competencia date)
returns table (
  categoria_id uuid, slug text, nome text, icone text, cor text,
  grupo grupo_categoria_t, ordem int, valor bigint, teto bigint
)
language sql stable set search_path = public as $$
  with comp as (select date_trunc('month', p_competencia)::date as c),
  hh as (select household_id as h from profiles where id = auth.uid()),
  g as (
    select l.categoria_id, sum(pc.valor)::bigint as v
      from parcelas pc
      join lancamentos l on l.id = pc.lancamento_id, comp
     where pc.competencia = comp.c and pc.status <> 'cancelado' and l.natureza = 'saida'
       and ((p_escopo = 'pessoal'       and l.escopo = 'pessoal'       and l.owner_id = auth.uid())
         or (p_escopo = 'compartilhado' and l.escopo = 'compartilhado' and l.household_id = (select h from hh)))
     group by l.categoria_id
  ),
  o as (
    select distinct on (o.categoria_id) o.categoria_id, o.valor_mensal
      from orcamentos o, comp
     where o.vigente_desde <= comp.c
       and ((p_escopo = 'pessoal'       and o.escopo = 'pessoal'       and o.owner_id = auth.uid())
         or (p_escopo = 'compartilhado' and o.escopo = 'compartilhado' and o.household_id = (select h from hh)))
     order by o.categoria_id, o.vigente_desde desc
  )
  select c.id, c.slug, c.nome, c.icone, c.cor, c.grupo, c.ordem,
         coalesce(g.v, 0)::bigint, o.valor_mensal
    from categorias c
    left join g on g.categoria_id = c.id
    left join o on o.categoria_id = c.id
   order by c.ordem
$$;

-- -------------------------------------------------------------
-- a_vencer: parcelas pendentes até N dias à frente (inclui atrasadas).
-- -------------------------------------------------------------
create or replace function a_vencer(p_escopo escopo_t, p_dias int default 7)
returns table (
  parcela_id uuid, lancamento_id uuid, descricao text,
  categoria_slug text, categoria_nome text, categoria_cor text, categoria_icone text,
  metodo metodo_t, cartao_apelido text, numero int, parcelas_total int,
  valor bigint, vencimento date, competencia date, dias_restantes int, pago_por uuid
)
language sql stable set search_path = public as $$
  select pc.id, l.id, l.descricao,
         c.slug, c.nome, c.cor, c.icone,
         l.metodo, ct.apelido, pc.numero, l.parcelas_total,
         pc.valor, pc.vencimento, pc.competencia,
         (pc.vencimento - fn_hoje_local())::int, l.pago_por
    from parcelas pc
    join lancamentos l on l.id = pc.lancamento_id
    join categorias  c on c.id = l.categoria_id
    left join v_cartoes_household ct on ct.id = l.cartao_id
   where pc.status = 'pendente'
     and l.escopo = p_escopo
     and (p_escopo = 'compartilhado' or l.owner_id = auth.uid())
     and pc.vencimento <= fn_hoje_local() + p_dias
   order by pc.vencimento, pc.valor desc
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function fn_hoje_local(), garantir_salario(date),
  resumo_mes(escopo_t, date), gasto_por_categoria(escopo_t, date), a_vencer(escopo_t, int)
to authenticated, service_role;
