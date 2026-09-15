-- =============================================================
-- 012_categorias.sql  ·  Categorias criadas pelo casal
--
-- Até aqui `categorias` era uma tabela global de 8 linhas fixas. Agora
-- ela guarda dois tipos de linha, separadas por household_id:
--
--   household_id null  -> embutida, igual para todo mundo, ninguém edita
--   household_id = X   -> criada pela casa X, só ela vê e só ela mexe
--
-- O slug deixa de ser único no mundo e passa a ser único POR CASA
-- (`nulls not distinct` mantém as embutidas competindo entre si, como
-- antes). Assim duas casas podem ter cada uma a sua "Pets".
--
-- Remover categoria é reversível, como todo o resto do app: se ninguém
-- usou, some do banco; se já tem lançamento, vira inativa (o histórico
-- nunca se perde). Em ambos os casos volta com o mesmo id.
-- =============================================================

-- -------------------------------------------------------------
-- Estrutura
-- -------------------------------------------------------------
alter table categorias
  add column if not exists household_id uuid references households(id) on delete cascade,
  add column if not exists ativo        boolean not null default true,
  add column if not exists criada_por   uuid references profiles(id) on delete set null,
  add column if not exists created_at   timestamptz not null default now();

alter table categorias drop constraint if exists categorias_slug_key;
create unique index if not exists uq_cat_slug on categorias (household_id, slug) nulls not distinct;
create index if not exists idx_cat_household on categorias (household_id) where household_id is not null;

-- Nome não pode ser vazio nem gigante: ele aparece num quadradinho de 72px.
alter table categorias drop constraint if exists ck_cat_nome;
alter table categorias add constraint ck_cat_nome
  check (length(btrim(nome)) between 1 and 24);

-- Cor tem de ser hex de 6 dígitos: a UI usa `cor || '26'` para o fundo.
alter table categorias drop constraint if exists ck_cat_cor;
alter table categorias add constraint ck_cat_cor check (cor ~ '^#[0-9A-Fa-f]{6}$');

-- -------------------------------------------------------------
-- RLS: embutida é de todos (só leitura); criada é da casa (leitura e escrita)
-- -------------------------------------------------------------
drop policy if exists cat_select on categorias;
create policy cat_select on categorias for select to authenticated
  using (household_id is null or fn_sou_membro(household_id));

drop policy if exists cat_insert on categorias;
create policy cat_insert on categorias for insert to authenticated
  with check (household_id is not null and fn_sou_membro(household_id));

drop policy if exists cat_update on categorias;
create policy cat_update on categorias for update to authenticated
  using      (household_id is not null and fn_sou_membro(household_id))
  with check (household_id is not null and fn_sou_membro(household_id));

drop policy if exists cat_delete on categorias;
create policy cat_delete on categorias for delete to authenticated
  using (household_id is not null and fn_sou_membro(household_id));

grant insert, update, delete on categorias to authenticated;

-- -------------------------------------------------------------
-- fn_slug: 'Pets & Cia' -> 'pets_cia'. Sem unaccent (a extensão não
-- está instalada), então os acentos caem no translate.
-- -------------------------------------------------------------
create or replace function fn_slug(p_texto text)
returns text language sql immutable set search_path = public as $$
  select coalesce(nullif(
    trim(both '_' from
      regexp_replace(
        lower(translate(p_texto,
          'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
          'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')),
        '[^a-z0-9]+', '_', 'g')),
    ''), 'categoria')
$$;

-- -------------------------------------------------------------
-- criar_categoria
--
-- SECURITY INVOKER: o RLS acima já garante que só dá para criar na
-- própria casa. A função existe para resolver slug e ordem em uma
-- transação só, não para furar permissão.
-- -------------------------------------------------------------
create or replace function criar_categoria(
  p_nome  text,
  p_icone text,
  p_cor   text,
  p_grupo grupo_categoria_t default 'despesa'
) returns uuid language plpgsql set search_path = public as $$
declare
  v_hh    uuid;
  v_base  text;
  v_slug  text;
  v_n     int := 1;
  v_ordem int;
  v_qtd   int;
  v_id    uuid;
begin
  select household_id into v_hh from profiles where id = auth.uid();
  if v_hh is null then
    raise exception 'Crie ou entre numa casa antes de criar categorias.';
  end if;

  select count(*) into v_qtd from categorias where household_id = v_hh and ativo;
  if v_qtd >= 20 then
    raise exception 'Limite de 20 categorias por casa. Remova alguma antes de criar outra.';
  end if;

  -- Nome repetido confunde na grade: duas "Pets" ficam iguais na tela.
  if exists (select 1 from categorias
              where lower(btrim(nome)) = lower(btrim(p_nome))
                and (household_id = v_hh or household_id is null)) then
    raise exception 'Já existe uma categoria chamada "%".', btrim(p_nome);
  end if;

  v_base := fn_slug(p_nome);
  v_slug := v_base;
  while exists (select 1 from categorias where household_id = v_hh and slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '_' || v_n;
  end loop;

  -- As criadas entram depois das embutidas (que vão de 1 a 8).
  select coalesce(max(ordem), 99) + 1 into v_ordem
    from categorias where household_id = v_hh;

  insert into categorias (slug, nome, icone, cor, grupo, ordem, household_id, criada_por)
  values (v_slug, btrim(p_nome), p_icone, upper(p_cor), p_grupo, v_ordem, v_hh, auth.uid())
  returning id into v_id;

  return v_id;
end $$;

-- -------------------------------------------------------------
-- editar_categoria: nome, ícone e cor. Grupo NÃO muda depois de criada
-- — virar 'reserva' tiraria retroativamente todo o histórico da conta
-- de gastos, e o mês passado mudaria sozinho.
-- -------------------------------------------------------------
create or replace function editar_categoria(
  p_id uuid, p_nome text, p_icone text, p_cor text
) returns void language plpgsql set search_path = public as $$
declare v_hh uuid;
begin
  select household_id into v_hh from categorias where id = p_id;
  if v_hh is null then
    raise exception 'Categorias embutidas não podem ser editadas.';
  end if;

  if exists (select 1 from categorias
              where id <> p_id
                and lower(btrim(nome)) = lower(btrim(p_nome))
                and (household_id = v_hh or household_id is null)) then
    raise exception 'Já existe uma categoria chamada "%".', btrim(p_nome);
  end if;

  update categorias
     set nome = btrim(p_nome), icone = p_icone, cor = upper(p_cor)
   where id = p_id;   -- o RLS recusa se não for da casa
end $$;

-- -------------------------------------------------------------
-- remover_categoria: some se ninguém usou, arquiva se já tem história.
-- Devolve o retrato para o desfazer.
-- -------------------------------------------------------------
create or replace function remover_categoria(p_id uuid)
returns jsonb language plpgsql set search_path = public as $$
declare
  c      categorias%rowtype;
  v_uso  int;
begin
  select * into c from categorias where id = p_id;
  if c.id is null then raise exception 'Categoria não encontrada.'; end if;
  if c.household_id is null then
    raise exception 'Categorias embutidas não podem ser removidas.';
  end if;

  select (select count(*) from lancamentos  where categoria_id = p_id)
       + (select count(*) from orcamentos   where categoria_id = p_id)
       + (select count(*) from recorrencias where categoria_id = p_id)
    into v_uso;

  if v_uso = 0 then
    delete from categorias where id = p_id;
    return jsonb_build_object('acao', 'excluida', 'categoria', to_jsonb(c));
  end if;

  update categorias set ativo = false where id = p_id;
  return jsonb_build_object('acao', 'arquivada', 'categoria', to_jsonb(c), 'usos', v_uso);
end $$;

create or replace function restaurar_categoria(p_snapshot jsonb)
returns uuid language plpgsql set search_path = public as $$
declare v_id uuid;
begin
  if p_snapshot->>'acao' = 'excluida' then
    insert into categorias
    select * from jsonb_populate_record(null::categorias, p_snapshot->'categoria')
    returning id into v_id;
  else
    v_id := (p_snapshot->'categoria'->>'id')::uuid;
    update categorias set ativo = true where id = v_id;
  end if;
  return v_id;
end $$;

-- -------------------------------------------------------------
-- As telas que listam categorias precisam esconder as arquivadas — mas
-- só quando não há nada nelas neste mês. Categoria arquivada com gasto
-- em setembro tem de continuar aparecendo no setembro.
-- -------------------------------------------------------------
create or replace function gasto_por_categoria(p_escopo escopo_t, p_competencia date)
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
   where c.ativo or coalesce(g.v, 0) > 0 or o.valor_mensal is not null
   order by c.ordem
$$;

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
   where c.ativo or coalesce(g.v, 0) > 0
   order by c.ordem
$$;

-- -------------------------------------------------------------
-- Grants
-- -------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function
  fn_slug(text),
  criar_categoria(text, text, text, grupo_categoria_t),
  editar_categoria(uuid, text, text, text),
  remover_categoria(uuid),
  restaurar_categoria(jsonb),
  gasto_por_categoria(escopo_t, date),
  analise_categorias(text, date)
to authenticated, service_role;
