-- =============================================================
-- 002_rls.sql  ·  Row Level Security
-- Toda a autorização vive aqui. O front NUNCA deve depender de
-- filtro manual para segurança — se a query esquecer o WHERE,
-- o banco continua negando.
-- =============================================================

-- -------------------------------------------------------------
-- HELPERS
-- SECURITY DEFINER é obrigatório: sem isso, uma política que
-- consulta a própria tabela protegida entra em recursão infinita
-- (erro 42P17). Este é o erro nº 1 de quem escreve RLS no Supabase.
-- -------------------------------------------------------------
create or replace function fn_meu_household() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from profiles where id = auth.uid()
$$;

create or replace function fn_sou_membro(p_household uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_household is not null and p_household = (
    select household_id from profiles where id = auth.uid()
  )
$$;

-- -------------------------------------------------------------
alter table households        enable row level security;
alter table profiles          enable row level security;
alter table household_members enable row level security;
alter table cartoes           enable row level security;
alter table categorias        enable row level security;
alter table recorrencias      enable row level security;
alter table orcamentos        enable row level security;
alter table meses_fechados    enable row level security;
alter table lancamentos       enable row level security;
alter table parcelas          enable row level security;
alter table receitas          enable row level security;
alter table acertos           enable row level security;

-- -------------------------------------------------------------
-- HOUSEHOLDS
-- -------------------------------------------------------------
drop policy if exists hh_select on households;
create policy hh_select on households for select to authenticated
  using (fn_sou_membro(id));
drop policy if exists hh_insert on households;
create policy hh_insert on households for insert to authenticated
  with check (true);                       -- qualquer um cria o seu
drop policy if exists hh_update on households;
create policy hh_update on households for update to authenticated
  using (fn_sou_membro(id)) with check (fn_sou_membro(id));

-- -------------------------------------------------------------
-- PROFILES
-- DECISÃO EXPLÍCITA: o parceiro lê a linha inteira do outro, o que
-- inclui salario_base. Isso é dependência funcional, não descuido —
-- o rateio proporcional e o KPI consolidado do casal são impossíveis
-- sem as duas rendas. A privacidade fica no nível do LANÇAMENTO
-- (o que cada um gasta do próprio dinheiro), não da renda.
--
-- Se vocês decidirem por sigilo total de renda: troque o OR abaixo por
--   using (id = auth.uid())
-- e aceite perder o rateio proporcional e o consolidado.
-- -------------------------------------------------------------
drop policy if exists pr_select on profiles;
create policy pr_select on profiles for select to authenticated
  using (id = auth.uid() or fn_sou_membro(household_id));
drop policy if exists pr_insert on profiles;
create policy pr_insert on profiles for insert to authenticated
  with check (id = auth.uid());
drop policy if exists pr_update on profiles;
create policy pr_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- -------------------------------------------------------------
-- HOUSEHOLD_MEMBERS
-- -------------------------------------------------------------
drop policy if exists hm_select on household_members;
create policy hm_select on household_members for select to authenticated
  using (fn_sou_membro(household_id) or user_id = auth.uid());
drop policy if exists hm_insert on household_members;
create policy hm_insert on household_members for insert to authenticated
  with check (user_id = auth.uid());       -- entra por conta própria, via código
drop policy if exists hm_update on household_members;
create policy hm_update on household_members for update to authenticated
  using (fn_sou_membro(household_id)) with check (fn_sou_membro(household_id));
drop policy if exists hm_delete on household_members;
create policy hm_delete on household_members for delete to authenticated
  using (user_id = auth.uid());

-- -------------------------------------------------------------
-- CARTOES
-- O dono manda na linha. O parceiro NÃO lê a tabela base — lê a view
-- v_cartoes_household, que omite o limite. RLS filtra linha, não
-- coluna; por isso a exposição parcial precisa ser uma view.
-- -------------------------------------------------------------
drop policy if exists ct_all on cartoes;
create policy ct_all on cartoes for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- -------------------------------------------------------------
-- CATEGORIAS  (leitura pública, escrita só por migration)
-- -------------------------------------------------------------
drop policy if exists cat_select on categorias;
create policy cat_select on categorias for select to authenticated using (true);

-- -------------------------------------------------------------
-- Política padrão de escopo, aplicada a lancamentos / receitas /
-- orcamentos / recorrencias: pessoal é do dono; compartilhado é dos
-- dois, com direito de EDIÇÃO mútua (se um lança errado, o outro
-- corrige sem pedir licença).
-- -------------------------------------------------------------
drop policy if exists lc_select on lancamentos;
create policy lc_select on lancamentos for select to authenticated
  using ((escopo = 'pessoal' and owner_id = auth.uid())
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));
drop policy if exists lc_insert on lancamentos;
create policy lc_insert on lancamentos for insert to authenticated
  with check (owner_id = auth.uid()
    and (escopo = 'pessoal' or fn_sou_membro(household_id)));
drop policy if exists lc_update on lancamentos;
create policy lc_update on lancamentos for update to authenticated
  using ((escopo = 'pessoal' and owner_id = auth.uid())
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)))
  with check ((escopo = 'pessoal' and owner_id = auth.uid())
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));
drop policy if exists lc_delete on lancamentos;
create policy lc_delete on lancamentos for delete to authenticated
  using ((escopo = 'pessoal' and owner_id = auth.uid())
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));

-- PARCELAS: herda a permissão do lançamento pai. O EXISTS abaixo já
-- passa pelo RLS de lancamentos, então a herança é automática.
drop policy if exists pc_all on parcelas;
create policy pc_all on parcelas for all to authenticated
  using (exists (select 1 from lancamentos l where l.id = parcelas.lancamento_id))
  with check (exists (select 1 from lancamentos l where l.id = parcelas.lancamento_id));

drop policy if exists rc_select on receitas;
create policy rc_select on receitas for select to authenticated
  using ((escopo = 'pessoal' and owner_id = auth.uid())
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));
drop policy if exists rc_write on receitas;
create policy rc_write on receitas for all to authenticated
  using ((escopo = 'pessoal' and owner_id = auth.uid())
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)))
  with check ((escopo = 'pessoal' and owner_id = auth.uid())
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));

drop policy if exists or_all on orcamentos;
create policy or_all on orcamentos for all to authenticated
  using ((escopo = 'pessoal' and owner_id = auth.uid())
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)))
  with check ((escopo = 'pessoal' and owner_id = auth.uid())
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));

drop policy if exists rec_all on recorrencias;
create policy rec_all on recorrencias for all to authenticated
  using ((escopo = 'pessoal' and owner_id = auth.uid())
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)))
  with check ((escopo = 'pessoal' and owner_id = auth.uid())
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));

drop policy if exists mf_all on meses_fechados;
create policy mf_all on meses_fechados for all to authenticated
  using ((escopo = 'pessoal' and owner_id = auth.uid())
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)))
  with check ((escopo = 'pessoal' and owner_id = auth.uid())
      or (escopo = 'compartilhado' and fn_sou_membro(household_id)));

drop policy if exists ac_all on acertos;
create policy ac_all on acertos for all to authenticated
  using (fn_sou_membro(household_id)) with check (fn_sou_membro(household_id));

-- -------------------------------------------------------------
-- VIEWS DE EXPOSIÇÃO CONTROLADA
-- security_invoker = off (padrão): a view roda com os privilégios do
-- dono, então o filtro por household precisa estar explícito dentro
-- dela. É esse filtro que substitui o RLS aqui.
-- -------------------------------------------------------------

-- Cartões visíveis ao casal: apelido e datas sim, LIMITE não.
drop view if exists v_cartoes_household cascade;
create view v_cartoes_household as
  select c.id, c.owner_id, c.apelido, c.dia_fechamento, c.dia_vencimento, c.ativo
    from cartoes c
    join profiles p on p.id = c.owner_id
   where p.household_id is not null
     and p.household_id = fn_meu_household();

-- Renda agregada por pessoa: o valor total, sem detalhe de lançamento.
-- É o mínimo necessário para rateio proporcional e KPI consolidado.
drop view if exists v_renda_household cascade;
create view v_renda_household as
  select r.owner_id, r.competencia, sum(r.valor)::bigint as renda_total
    from receitas r
    join profiles p on p.id = r.owner_id
   where r.escopo = 'pessoal'
     and p.household_id is not null
     and p.household_id = fn_meu_household()
   group by r.owner_id, r.competencia;

-- -------------------------------------------------------------
-- GRANTS
-- -------------------------------------------------------------
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on categorias, v_cartoes_household, v_renda_household to authenticated;
grant usage on schema public to authenticated;
revoke insert, update, delete on categorias from authenticated;
