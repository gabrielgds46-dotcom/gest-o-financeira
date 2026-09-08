-- =============================================================
-- 004_rpc.sql  ·  Funções chamadas pelo front (supabase.rpc)
--
-- NOTA DE ARQUITETURA — leia antes de mexer:
-- A regra de competência do cartão (fechamento/vencimento/parcelas)
-- vive em UM lugar só: a função TypeScript calcularParcelas(),
-- coberta por testes. Ela NÃO é reimplementada em PL/pgSQL.
-- Duplicar essa regra em duas linguagens é garantir que as duas
-- divirjam em algum mês e ninguém descubra por seis faturas.
-- O SQL apenas PERSISTE as parcelas já calculadas, de forma atômica.
-- =============================================================

-- -------------------------------------------------------------
-- criar_lancamento: grava lançamento + parcelas numa transação só.
-- Sem isso, uma falha no meio deixa lançamento órfão sem parcela —
-- ele some dos relatórios mas continua no banco.
-- SECURITY INVOKER (padrão) para que o RLS continue valendo.
-- -------------------------------------------------------------
create or replace function criar_lancamento(
  p_escopo         escopo_t,
  p_metodo         metodo_t,
  p_categoria_id   uuid,
  p_valor_total    bigint,
  p_data_compra    date,
  p_parcelas_total int,
  p_descricao      text,
  p_parcelas       jsonb,          -- [{numero, valor, competencia, vencimento}]
  p_cartao_id      uuid default null,
  p_pago_por       uuid default null,
  p_natureza       natureza_t default 'saida',
  p_household_id   uuid default null
) returns uuid
language plpgsql as $$
declare
  v_id uuid;
  v_soma bigint;
begin
  -- Validação de coerência antes de tocar no banco.
  select coalesce(sum((e->>'valor')::bigint), 0) into v_soma
    from jsonb_array_elements(p_parcelas) e;

  if v_soma <> p_valor_total then
    raise exception 'Soma das parcelas (%) difere do valor total (%)', v_soma, p_valor_total;
  end if;
  if jsonb_array_length(p_parcelas) <> p_parcelas_total then
    raise exception 'Foram enviadas % parcelas para um lançamento de %',
      jsonb_array_length(p_parcelas), p_parcelas_total;
  end if;

  insert into lancamentos (owner_id, household_id, escopo, metodo, cartao_id,
                           categoria_id, natureza, descricao, valor_total,
                           data_compra, parcelas_total, pago_por)
  values (auth.uid(), p_household_id, p_escopo, p_metodo, p_cartao_id,
          p_categoria_id, p_natureza, coalesce(p_descricao, ''), p_valor_total,
          p_data_compra, p_parcelas_total, coalesce(p_pago_por, auth.uid()))
  returning id into v_id;

  insert into parcelas (lancamento_id, numero, valor, competencia, vencimento)
  select v_id,
         (e->>'numero')::int,
         (e->>'valor')::bigint,
         (e->>'competencia')::date,
         (e->>'vencimento')::date
    from jsonb_array_elements(p_parcelas) e;

  return v_id;
end $$;

-- -------------------------------------------------------------
-- cancelar_lancamento: cancela as parcelas FUTURAS/pendentes.
-- Nunca deleta. Mês fechado nunca muda retroativamente — é o que
-- mantém o histórico auditável.
-- -------------------------------------------------------------
create or replace function cancelar_lancamento(p_lancamento_id uuid)
returns int language plpgsql as $$
declare v_qtd int;
begin
  update parcelas set status = 'cancelado'
   where lancamento_id = p_lancamento_id
     and status = 'pendente';
  get diagnostics v_qtd = row_count;

  update lancamentos set cancelado_em = now() where id = p_lancamento_id;
  return v_qtd;
end $$;

-- -------------------------------------------------------------
-- Convite: criação e entrada no household
-- -------------------------------------------------------------
create or replace function gerar_codigo_convite(p_household_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_codigo text;
begin
  if not fn_sou_membro(p_household_id) then
    raise exception 'Sem permissão neste household';
  end if;

  -- 6 caracteres, sem 0/O/1/I para não gerar confusão ao ditar por voz.
  v_codigo := upper(translate(
    substr(encode(gen_random_bytes(8), 'base64'), 1, 6),
    '01OIl+/', 'ABCDEFG'));

  update households
     set codigo_convite = v_codigo,
         codigo_expira_em = now() + interval '7 days'
   where id = p_household_id;

  return v_codigo;
end $$;

create or replace function entrar_household(p_codigo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_household uuid;
  v_qtd int;
begin
  select id into v_household from households
   where codigo_convite = upper(trim(p_codigo))
     and codigo_expira_em > now();

  if v_household is null then
    raise exception 'Código inválido ou expirado';
  end if;

  select count(*) into v_qtd from household_members where household_id = v_household;
  if v_qtd >= 2 then
    raise exception 'Este household já tem dois membros';
  end if;

  update profiles set household_id = v_household where id = auth.uid();

  set constraints all deferred;
  insert into household_members (household_id, user_id, percentual_rateio)
  values (v_household, auth.uid(), 50)
  on conflict do nothing;
  update household_members set percentual_rateio = 50 where household_id = v_household;

  -- Queima o código: convite é de uso único.
  update households set codigo_convite = null, codigo_expira_em = null
   where id = v_household;

  return v_household;
end $$;

-- -------------------------------------------------------------
-- saldo_casal: quem deve quanto a quem, já líquido dos acertos.
-- Sem descontar acertos, o número cresce para sempre e vira inútil.
-- -------------------------------------------------------------
create or replace function saldo_casal(p_household_id uuid)
returns table (user_id uuid, pago bigint, devido bigint, saldo bigint)
language sql stable as $$
  with total as (
    select coalesce(sum(pc.valor), 0)::bigint as gasto
      from parcelas pc
      join lancamentos l on l.id = pc.lancamento_id
     where l.escopo = 'compartilhado'
       and l.household_id = p_household_id
       and pc.status <> 'cancelado'
  ),
  base as (
    select m.user_id, m.percentual_rateio,
           row_number() over (order by m.user_id) as rn,
           count(*)     over ()                   as n
      from household_members m
     where m.household_id = p_household_id
  ),
  bruto as (
    select b.user_id, b.rn, b.n, t.gasto,
           round(t.gasto * b.percentual_rateio / 100.0)::bigint as devido_bruto
      from base b cross join total t
  ),
  -- Ajuste de centavo: R$ 1.199,99 em 50/50 dá 599,995 para cada; arredondando,
  -- os dois devem 600,00 e a soma estoura o gasto em 1 centavo. O resultado é um
  -- saldo residual que NENHUM acerto zera. Por isso o último membro (ordem
  -- determinística por user_id) absorve a diferença: sum(devido) = gasto, sempre.
  devidos as (
    select user_id,
           case when rn < n then devido_bruto
                else gasto - coalesce(
                       sum(devido_bruto) over (order by rn
                         rows between unbounded preceding and 1 preceding), 0)
           end as devido
      from bruto
  ),
  pago_por_pessoa as (
    select l.pago_por as uid, coalesce(sum(pc.valor), 0)::bigint as pago
      from parcelas pc
      join lancamentos l on l.id = pc.lancamento_id
     where l.escopo = 'compartilhado'
       and l.household_id = p_household_id
       and pc.status <> 'cancelado'
     group by l.pago_por
  ),
  liquido_acertos as (
    select m.user_id as uid,
      coalesce((select sum(a.valor) from acertos a
                 where a.household_id = p_household_id and a.de_user_id = m.user_id), 0)::bigint
      - coalesce((select sum(a.valor) from acertos a
                 where a.household_id = p_household_id and a.para_user_id = m.user_id), 0)::bigint
        as ajuste
      from household_members m where m.household_id = p_household_id
  )
  select d.user_id,
         coalesce(p.pago, 0)::bigint as pago,
         d.devido,
         (coalesce(p.pago, 0) + coalesce(la.ajuste, 0) - d.devido)::bigint as saldo
    from devidos d
    left join pago_por_pessoa p  on p.uid  = d.user_id
    left join liquido_acertos la on la.uid = d.user_id;
$$;

-- -------------------------------------------------------------
-- recorrencias_pendentes: o que ainda não foi gerado nesta competência.
-- Consumida pela Edge Function, que aplica calcularParcelas() e chama
-- criar_lancamento(). O índice único uq_lanc_recorrencia garante a
-- idempotência mesmo se o cron rodar duas vezes.
-- -------------------------------------------------------------
create or replace function recorrencias_pendentes(p_competencia date)
returns setof recorrencias language sql stable as $$
  select r.* from recorrencias r
   where r.ativo
     and r.inicio <= (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date
     and (r.fim is null or r.fim >= date_trunc('month', p_competencia)::date)
     and not exists (
       select 1 from lancamentos l
        where l.recorrencia_id = r.id
          and l.competencia_rec = date_trunc('month', p_competencia)::date)
     and not exists (
       select 1 from receitas rc
        where rc.recorrencia_id = r.id
          and rc.competencia = date_trunc('month', p_competencia)::date);
$$;

grant execute on all functions in schema public to authenticated;

-- -------------------------------------------------------------
-- criar_household: onboarding do primeiro usuário.
-- Precisa ser SECURITY DEFINER por um motivo sutil: no Postgres,
-- INSERT ... RETURNING exige política de SELECT, e quem acabou de
-- criar o household ainda não é membro dele — logo não passaria no
-- próprio SELECT. Fazer isso pelo client resultaria em erro 42501
-- num fluxo perfeitamente legítimo.
-- -------------------------------------------------------------
create or replace function criar_household(p_nome text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if (select household_id from profiles where id = auth.uid()) is not null then
    raise exception 'Este usuário já pertence a um household';
  end if;

  insert into households (nome) values (coalesce(nullif(trim(p_nome), ''), 'Nossa casa'))
    returning id into v_id;

  update profiles set household_id = v_id where id = auth.uid();

  insert into household_members (household_id, user_id, percentual_rateio)
  values (v_id, auth.uid(), 50);

  return v_id;
end $$;

grant execute on function criar_household(text) to authenticated;
