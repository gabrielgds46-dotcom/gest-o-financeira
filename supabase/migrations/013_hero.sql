-- =============================================================
-- 013_hero.sql  ·  O número do topo do Início
--
-- A auditoria pegou um problema de leitura, não de conta: "Livre para
-- gastar" era renda - gasto - reserva, e a aritmética estava certa, mas
-- no dia 11 ela já descontava contas que ainda nem saíram da conta
-- corrente. Quem lia o número achava que aquilo estava no banco.
--
-- A correção é mostrar a decomposição em vez de um número solto, e para
-- isso falta um dado: quanto do gasto do mês ainda não foi pago.
--
--   pago      = gasto - a_vencer_mes   (já saiu da conta)
--   guardado  = reserva
--   a vencer  = a_vencer_mes           (vai sair ainda este mês)
--   livre     = sobra
--
-- Os quatro somam renda + resgate, que é a barra inteira. Sem isso a
-- barra não fecha em 100% e vira decoração.
--
-- Reserva pendente entra em "guardado", não em "a vencer": o casal trata
-- o que vai para investimento como já comprometido.
-- =============================================================
create or replace function resumo_mes(p_escopo escopo_t, p_competencia date)
returns table (
  renda bigint, gasto bigint, reserva bigint, resgate bigint, credito bigint,
  sobra bigint, taxa_poupanca numeric, comprometimento numeric,
  a_vencer_mes bigint
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
    select l.natureza, l.metodo, c.grupo, pc.valor, pc.status
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
$$;

-- -------------------------------------------------------------
-- a_vencer ganha o resto do mês além dos 7 dias: a seção "Ainda vence
-- este mês" precisa do mês inteiro, não de uma janela fixa.
-- p_dias null = até o último dia da competência corrente.
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
     and pc.vencimento <= case
           when p_dias is null
             then (date_trunc('month', fn_hoje_local()) + interval '1 month - 1 day')::date
           else fn_hoje_local() + p_dias
         end
   order by pc.vencimento, pc.valor desc
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function resumo_mes(escopo_t, date), a_vencer(escopo_t, int)
to authenticated, service_role;
