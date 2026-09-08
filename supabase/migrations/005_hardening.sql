-- =============================================================
-- 005_hardening.sql  ·  Correções após revisão do projeto no Supabase
-- Origem: linter de segurança/desempenho do Supabase + teste real.
-- Idempotente: pode rodar mais de uma vez.
-- =============================================================

-- -------------------------------------------------------------
-- 1. BUG: gerar_codigo_convite quebrava em produção.
-- No Supabase o pgcrypto fica no schema `extensions`, e a função fixava
-- search_path = public, então gen_random_bytes() não era encontrado
-- ("function gen_random_bytes(integer) does not exist").
-- -------------------------------------------------------------
alter function gerar_codigo_convite(uuid) set search_path = public, extensions;

-- -------------------------------------------------------------
-- 2. search_path fixo nas funções que não tinham (linter 0011).
-- Sem isso, um schema malicioso no search_path do chamador poderia
-- sombrear tabelas/funções que a função usa.
-- -------------------------------------------------------------
alter function fn_mes_esta_fechado(escopo_t, uuid, uuid, date) set search_path = public;
alter function fn_valida_rateio()          set search_path = public;
alter function fn_valida_soma_parcelas()   set search_path = public;
alter function fn_bloqueia_mes_fechado()   set search_path = public;
alter function cancelar_lancamento(uuid)   set search_path = public;
alter function saldo_casal(uuid)           set search_path = public;
alter function recorrencias_pendentes(date) set search_path = public;
alter function criar_lancamento(escopo_t, metodo_t, uuid, bigint, date, int, text, jsonb, uuid, uuid, natureza_t, uuid)
  set search_path = public;

-- -------------------------------------------------------------
-- 3. EXECUTE em funções: Postgres dá EXECUTE a PUBLIC por padrão, o que
-- expunha todas as funções (inclusive as de trigger e as SECURITY DEFINER)
-- via /rest/v1/rpc para o papel anon (linter 0028/0029).
-- Regra: anon não executa nada; authenticated só o que o front chama
-- e os helpers usados dentro das políticas RLS.
-- -------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;

-- RPCs chamadas pelo front (supabase.rpc) e helpers de policy/trigger.
grant execute on function
  criar_household(text),
  entrar_household(text),
  gerar_codigo_convite(uuid),
  criar_lancamento(escopo_t, metodo_t, uuid, bigint, date, int, text, jsonb, uuid, uuid, natureza_t, uuid),
  cancelar_lancamento(uuid),
  saldo_casal(uuid),
  recorrencias_pendentes(date),
  fn_sou_membro(uuid),
  fn_meu_household(),
  fn_mes_esta_fechado(escopo_t, uuid, uuid, date)
to authenticated;

-- Trigger em auth.users é disparado pelo serviço de Auth.
grant execute on function fn_handle_new_user() to supabase_auth_admin;

-- -------------------------------------------------------------
-- 4. Views são somente leitura. O GRANT genérico de 002 também deu
-- INSERT/UPDATE/DELETE nelas.
-- -------------------------------------------------------------
revoke insert, update, delete on v_cartoes_household, v_renda_household from authenticated;

-- -------------------------------------------------------------
-- 5. service_role sem nenhum grant nas tabelas. É o papel da Edge
-- Function de recorrências (Fase 6) e de scripts administrativos.
-- Ele já ignora RLS por atributo do papel; só faltavam os privilégios.
-- -------------------------------------------------------------
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- -------------------------------------------------------------
-- 6. Políticas RLS: auth.uid() reavaliado linha a linha (linter 0003).
-- Envolver em (select auth.uid()) faz o planner calcular uma vez por
-- query. Mesma semântica, custo bem menor em tabelas grandes.
-- Também remove rc_select em receitas, redundante com rc_write (ALL).
-- -------------------------------------------------------------
drop policy if exists pr_select on profiles;
create policy pr_select on profiles for select to authenticated
  using (id = (select auth.uid()) or fn_sou_membro(household_id));
drop policy if exists pr_insert on profiles;
create policy pr_insert on profiles for insert to authenticated
  with check (id = (select auth.uid()));
drop policy if exists pr_update on profiles;
create policy pr_update on profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists hm_select on household_members;
create policy hm_select on household_members for select to authenticated
  using (fn_sou_membro(household_id) or user_id = (select auth.uid()));
drop policy if exists hm_insert on household_members;
create policy hm_insert on household_members for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists hm_delete on household_members;
create policy hm_delete on household_members for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists ct_all on cartoes;
create policy ct_all on cartoes for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists lc_select on lancamentos;
create policy lc_select on lancamentos for select to authenticated
  using ((escopo = 'pessoal' and owner_id = (select auth.uid()))
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));
drop policy if exists lc_insert on lancamentos;
create policy lc_insert on lancamentos for insert to authenticated
  with check (owner_id = (select auth.uid())
    and (escopo = 'pessoal' or fn_sou_membro(household_id)));
drop policy if exists lc_update on lancamentos;
create policy lc_update on lancamentos for update to authenticated
  using ((escopo = 'pessoal' and owner_id = (select auth.uid()))
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)))
  with check ((escopo = 'pessoal' and owner_id = (select auth.uid()))
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));
drop policy if exists lc_delete on lancamentos;
create policy lc_delete on lancamentos for delete to authenticated
  using ((escopo = 'pessoal' and owner_id = (select auth.uid()))
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));

drop policy if exists rc_select on receitas;
drop policy if exists rc_write on receitas;
create policy rc_all on receitas for all to authenticated
  using ((escopo = 'pessoal' and owner_id = (select auth.uid()))
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)))
  with check ((escopo = 'pessoal' and owner_id = (select auth.uid()))
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));

drop policy if exists or_all on orcamentos;
create policy or_all on orcamentos for all to authenticated
  using ((escopo = 'pessoal' and owner_id = (select auth.uid()))
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)))
  with check ((escopo = 'pessoal' and owner_id = (select auth.uid()))
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));

drop policy if exists rec_all on recorrencias;
create policy rec_all on recorrencias for all to authenticated
  using ((escopo = 'pessoal' and owner_id = (select auth.uid()))
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)))
  with check ((escopo = 'pessoal' and owner_id = (select auth.uid()))
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));

drop policy if exists mf_all on meses_fechados;
create policy mf_all on meses_fechados for all to authenticated
  using ((escopo = 'pessoal' and owner_id = (select auth.uid()))
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)))
  with check ((escopo = 'pessoal' and owner_id = (select auth.uid()))
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));

-- -------------------------------------------------------------
-- 7. Índices nas chaves estrangeiras sem cobertura (linter 0001).
-- Importam nos JOINs dos KPIs e nos ON DELETE CASCADE/RESTRICT.
-- -------------------------------------------------------------
create index if not exists idx_profiles_household   on profiles(household_id);
create index if not exists idx_hm_user              on household_members(user_id);
create index if not exists idx_lanc_cartao          on lancamentos(cartao_id);
create index if not exists idx_lanc_categoria       on lancamentos(categoria_id);
create index if not exists idx_lanc_pago_por        on lancamentos(pago_por);
create index if not exists idx_rec_owner            on recorrencias(owner_id);
create index if not exists idx_rec_household        on recorrencias(household_id);
create index if not exists idx_rec_categoria        on recorrencias(categoria_id);
create index if not exists idx_rec_cartao           on recorrencias(cartao_id);
create index if not exists idx_rcta_household       on receitas(household_id);
create index if not exists idx_rcta_recorrencia     on receitas(recorrencia_id);
create index if not exists idx_orc_categoria        on orcamentos(categoria_id);
create index if not exists idx_acertos_de           on acertos(de_user_id);
create index if not exists idx_acertos_para         on acertos(para_user_id);
create index if not exists idx_mf_fechado_por       on meses_fechados(fechado_por);
