-- =============================================================
-- 006_rateio.sql  ·  Ajuste do percentual de rateio do casal
--
-- O trigger trg_valida_rateio exige que a soma seja 100 assim que o
-- household tem 2 membros. Pelo client, dois UPDATEs separados seriam
-- duas transações, e a primeira já falharia (ex.: 60 + 50 = 110).
-- Esta RPC grava os dois lados num único statement.
-- =============================================================
create or replace function definir_rateio(p_meu_percentual numeric)
returns void language plpgsql set search_path = public as $$
declare
  v_household uuid;
  v_qtd int;
begin
  if p_meu_percentual is null or p_meu_percentual < 0 or p_meu_percentual > 100 then
    raise exception 'Percentual deve estar entre 0 e 100';
  end if;

  select household_id into v_household from profiles where id = auth.uid();
  if v_household is null then
    raise exception 'Você ainda não pertence a um household';
  end if;

  select count(*) into v_qtd from household_members where household_id = v_household;
  if v_qtd <> 2 then
    raise exception 'O rateio só pode ser definido quando o casal está completo';
  end if;

  update household_members
     set percentual_rateio = case when user_id = auth.uid()
                                  then round(p_meu_percentual, 2)
                                  else round(100 - p_meu_percentual, 2) end
   where household_id = v_household;
end $$;

revoke execute on function definir_rateio(numeric) from public, anon;
grant execute on function definir_rateio(numeric) to authenticated, service_role;
