-- =============================================================
-- 008_recorrencias.sql  ·  Geração idempotente de recorrências
--
-- Quem decide a competência é o TypeScript (planejarRecorrencia ->
-- calcularParcelas), tanto no app (fallback do 1º acesso) quanto na
-- Edge Function (cron). Aqui o banco só persiste, atomicamente, e
-- garante que a mesma recorrência nunca gera duas vezes no mesmo mês.
-- =============================================================

-- Idempotência também para receitas recorrentes (lançamentos já têm
-- uq_lanc_recorrencia).
create unique index if not exists uq_rcta_recorrencia
  on receitas(recorrencia_id, competencia) where recorrencia_id is not null;

-- -------------------------------------------------------------
-- gerar_recorrencia: grava o lançamento+parcela (despesa) ou a receita
-- de UMA recorrência numa competência. Retorna o id criado, ou NULL se
-- já existia (idempotente, seguro para cron + fallback concorrentes).
--
-- SECURITY DEFINER porque o parceiro pode disparar a geração de uma
-- recorrência compartilhada criada pelo outro (owner_id diferente do
-- auth.uid()), e o RLS de INSERT exige owner_id = auth.uid(). A
-- autorização é feita explicitamente abaixo. service_role (cron) passa
-- com auth.uid() nulo.
-- -------------------------------------------------------------
create or replace function gerar_recorrencia(
  p_recorrencia_id uuid,
  p_competencia    date,
  p_data           date,     -- data de compra (despesa) ou de referência (receita)
  p_parcela        jsonb     -- {valor, competencia, vencimento} · ignorado em receita
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r     recorrencias%rowtype;
  v_uid uuid := auth.uid();
  v_comp date := date_trunc('month', p_competencia)::date;
  v_id  uuid;
begin
  select * into r from recorrencias where id = p_recorrencia_id;
  if r.id is null then raise exception 'Recorrência não encontrada'; end if;
  if not r.ativo then return null; end if;

  -- Autorização: cron (sem uid), dono, ou membro do household no compartilhado.
  if v_uid is not null and v_uid <> r.owner_id
     and not (r.escopo = 'compartilhado' and fn_sou_membro(r.household_id)) then
    raise exception 'Sem permissão nesta recorrência';
  end if;

  -- Vigência
  if date_trunc('month', r.inicio)::date > v_comp then return null; end if;
  if r.fim is not null and date_trunc('month', r.fim)::date < v_comp then return null; end if;

  if r.tipo = 'receita' then
    insert into receitas (owner_id, household_id, escopo, tipo, valor, competencia, descricao, recorrencia_id)
    values (r.owner_id, r.household_id, r.escopo, 'extra', r.valor, v_comp, r.descricao, r.id)
    on conflict (recorrencia_id, competencia) where recorrencia_id is not null do nothing
    returning id into v_id;
    return v_id;
  end if;

  -- Despesa: lançamento + 1 parcela na mesma transação.
  insert into lancamentos (owner_id, household_id, escopo, metodo, cartao_id, categoria_id,
                           natureza, descricao, valor_total, data_compra, parcelas_total,
                           pago_por, recorrencia_id, competencia_rec)
  values (r.owner_id, r.household_id, r.escopo, r.metodo, r.cartao_id, r.categoria_id,
          'saida', r.descricao, r.valor, p_data, 1,
          r.owner_id, r.id, v_comp)
  on conflict (recorrencia_id, competencia_rec) where recorrencia_id is not null do nothing
  returning id into v_id;

  if v_id is null then return null; end if;   -- já gerado antes

  if (p_parcela->>'valor')::bigint <> r.valor then
    raise exception 'Parcela (%) difere do valor da recorrência (%)', p_parcela->>'valor', r.valor;
  end if;

  insert into parcelas (lancamento_id, numero, valor, competencia, vencimento)
  values (v_id, 1, r.valor, (p_parcela->>'competencia')::date, (p_parcela->>'vencimento')::date);

  return v_id;
end $$;

revoke execute on function gerar_recorrencia(uuid, date, date, jsonb) from public, anon;
grant execute on function gerar_recorrencia(uuid, date, date, jsonb) to authenticated, service_role;

-- Salário de todos os perfis para a competência (uso do cron, service_role).
create or replace function gerar_salarios(p_competencia date) returns int
language plpgsql security definer set search_path = public as $$
declare v_comp date := date_trunc('month', p_competencia)::date; v_qtd int;
begin
  if auth.uid() is not null then raise exception 'Somente o serviço de geração pode chamar'; end if;
  insert into receitas (owner_id, escopo, tipo, valor, competencia, descricao)
  select p.id, 'pessoal', 'salario', p.salario_base, v_comp, 'Salário'
    from profiles p
   where p.salario_base > 0
     and not fn_mes_esta_fechado('pessoal', p.id, null, v_comp)
  on conflict (owner_id, competencia) where tipo = 'salario' do nothing;
  get diagnostics v_qtd = row_count;
  return v_qtd;
end $$;

revoke execute on function gerar_salarios(date) from public, anon, authenticated;
grant execute on function gerar_salarios(date) to service_role;
