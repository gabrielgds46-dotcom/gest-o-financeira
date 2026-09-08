-- =============================================================
-- 001_schema.sql  ·  App de Gestão Financeira do Casal
-- Estrutura base: enums, tabelas, constraints, índices, triggers.
-- Convenções:
--   · dinheiro  = bigint em CENTAVOS (nunca float, nunca numeric fracionário)
--   · datas de negócio = date puro (nunca timestamptz) — ver seção de fuso
--   · competencia = sempre o dia 1 do mês de referência
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- ENUMS
-- -------------------------------------------------------------
do $$ begin
  create type escopo_t as enum ('pessoal', 'compartilhado');
exception when duplicate_object then null; end $$;
do $$ begin
  create type metodo_t as enum ('credito', 'a_vista');
exception when duplicate_object then null; end $$;
do $$ begin
  create type natureza_t as enum ('saida', 'resgate');
exception when duplicate_object then null; end $$;
do $$ begin
  create type status_parcela_t as enum ('pendente', 'pago', 'cancelado');
exception when duplicate_object then null; end $$;
do $$ begin
  create type grupo_categoria_t as enum ('despesa', 'reserva');
exception when duplicate_object then null; end $$;
do $$ begin
  create type tipo_receita_t as enum ('salario', 'extra');
exception when duplicate_object then null; end $$;
do $$ begin
  create type tipo_recorrencia_t as enum ('despesa', 'receita');
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------
-- HOUSEHOLDS
-- -------------------------------------------------------------
create table if not exists households (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  codigo_convite    text unique,
  codigo_expira_em  timestamptz,
  created_at        timestamptz not null default now()
);

-- -------------------------------------------------------------
-- PROFILES  (1:1 com auth.users)
-- -------------------------------------------------------------
create table if not exists profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  nome                   text not null default '',
  household_id           uuid references households(id) on delete set null,
  salario_base           bigint not null default 0 check (salario_base >= 0),
  dia_recebimento        int    not null default 5  check (dia_recebimento between 1 and 31),
  dia_vencimento_contas  int    not null default 10 check (dia_vencimento_contas between 1 and 31),
  created_at             timestamptz not null default now()
);

-- -------------------------------------------------------------
-- HOUSEHOLD_MEMBERS
-- -------------------------------------------------------------
create table if not exists household_members (
  household_id       uuid not null references households(id) on delete cascade,
  user_id            uuid not null references profiles(id)   on delete cascade,
  percentual_rateio  numeric(5,2) not null default 50
                     check (percentual_rateio >= 0 and percentual_rateio <= 100),
  created_at         timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Regra: a soma do rateio deve ser 100 — mas só é exigível quando o household
-- já tem 2+ membros. Durante o onboarding do primeiro usuário a soma é 50 e
-- isso é legítimo. Validar sempre travaria o cadastro inicial.
create or replace function fn_valida_rateio() returns trigger
language plpgsql as $$
declare
  v_household uuid := coalesce(new.household_id, old.household_id);
  v_qtd int;
  v_soma numeric;
begin
  select count(*), coalesce(sum(percentual_rateio), 0)
    into v_qtd, v_soma
    from household_members where household_id = v_household;

  if v_qtd >= 2 and v_soma <> 100 then
    raise exception 'A soma do percentual de rateio do household deve ser 100 (atual: %)', v_soma;
  end if;
  return null;
end $$;

drop trigger if exists trg_valida_rateio on household_members;
create constraint trigger trg_valida_rateio
  after insert or update or delete on household_members
  deferrable initially deferred
  for each row execute function fn_valida_rateio();

-- -------------------------------------------------------------
-- CARTOES
-- -------------------------------------------------------------
create table if not exists cartoes (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  apelido         text not null,
  dia_fechamento  int  not null check (dia_fechamento between 1 and 31),
  dia_vencimento  int  not null check (dia_vencimento between 1 and 31),
  limite          bigint check (limite is null or limite >= 0),
  ativo           boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_cartoes_owner on cartoes(owner_id) where ativo;

-- -------------------------------------------------------------
-- CATEGORIAS  (seed fixo em 003)
-- -------------------------------------------------------------
create table if not exists categorias (
  id     uuid primary key default gen_random_uuid(),
  slug   text unique not null,
  nome   text not null,
  icone  text not null,
  cor    text not null,
  grupo  grupo_categoria_t not null,
  ordem  int not null default 0
);

-- -------------------------------------------------------------
-- RECORRENCIAS  (aluguel, faculdade, luz, streaming…)
-- -------------------------------------------------------------
create table if not exists recorrencias (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references profiles(id) on delete cascade,
  household_id   uuid references households(id) on delete cascade,
  escopo         escopo_t not null,
  tipo           tipo_recorrencia_t not null,
  categoria_id   uuid references categorias(id),
  metodo         metodo_t,
  cartao_id      uuid references cartoes(id) on delete set null,
  descricao      text not null,
  valor          bigint not null check (valor > 0),
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  ativo          boolean not null default true,
  inicio         date not null default current_date,
  fim            date,
  created_at     timestamptz not null default now(),

  constraint ck_rec_compartilhado check (escopo = 'pessoal' or household_id is not null),
  constraint ck_rec_despesa       check (tipo = 'receita' or (categoria_id is not null and metodo is not null)),
  constraint ck_rec_credito       check (metodo is distinct from 'credito' or cartao_id is not null),
  constraint ck_rec_periodo       check (fim is null or fim >= inicio)
);

-- -------------------------------------------------------------
-- ORCAMENTOS  (teto mensal por categoria)
-- -------------------------------------------------------------
create table if not exists orcamentos (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null references profiles(id) on delete cascade,
  household_id   uuid references households(id) on delete cascade,
  escopo         escopo_t not null,
  categoria_id   uuid not null references categorias(id),
  valor_mensal   bigint not null check (valor_mensal >= 0),
  vigente_desde  date not null default date_trunc('month', current_date)::date,
  created_at     timestamptz not null default now(),

  constraint ck_orc_compartilhado check (escopo = 'pessoal' or household_id is not null),
  constraint ck_orc_dia1 check (vigente_desde = date_trunc('month', vigente_desde)::date)
);
-- Um teto por categoria/escopo/mês. No pessoal a chave é o dono; no
-- compartilhado é o household (senão cada um criaria o seu e o casal teria dois).
create unique index if not exists uq_orc_pessoal on orcamentos(owner_id, categoria_id, vigente_desde)
  where escopo = 'pessoal';
create unique index if not exists uq_orc_compart on orcamentos(household_id, categoria_id, vigente_desde)
  where escopo = 'compartilhado';

-- -------------------------------------------------------------
-- MESES_FECHADOS  (fechamento manual e reversível)
-- -------------------------------------------------------------
create table if not exists meses_fechados (
  id           uuid primary key default gen_random_uuid(),
  escopo       escopo_t not null,
  owner_id     uuid references profiles(id) on delete cascade,
  household_id uuid references households(id) on delete cascade,
  competencia  date not null,
  fechado_em   timestamptz not null default now(),
  fechado_por  uuid not null references profiles(id),

  constraint ck_mf_dia1 check (competencia = date_trunc('month', competencia)::date),
  constraint ck_mf_escopo check (
    (escopo = 'pessoal'       and owner_id is not null and household_id is null) or
    (escopo = 'compartilhado' and household_id is not null)
  )
);
create unique index if not exists uq_mf_pessoal on meses_fechados(owner_id, competencia)
  where escopo = 'pessoal';
create unique index if not exists uq_mf_compart on meses_fechados(household_id, competencia)
  where escopo = 'compartilhado';

-- -------------------------------------------------------------
-- LANCAMENTOS
-- -------------------------------------------------------------
create table if not exists lancamentos (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  household_id    uuid references households(id) on delete cascade,
  escopo          escopo_t not null,
  metodo          metodo_t not null,
  cartao_id       uuid references cartoes(id) on delete restrict,
  categoria_id    uuid not null references categorias(id),
  natureza        natureza_t not null default 'saida',
  descricao       text not null default '',
  valor_total     bigint not null check (valor_total > 0),   -- CENTAVOS
  data_compra     date not null,
  parcelas_total  int not null default 1 check (parcelas_total between 1 and 60),
  pago_por        uuid not null references profiles(id),
  recorrencia_id  uuid references recorrencias(id) on delete set null,
  competencia_rec date,                                       -- só p/ idempotência
  cancelado_em    timestamptz,
  created_at      timestamptz not null default now(),

  constraint ck_lanc_compartilhado check (escopo = 'pessoal' or household_id is not null),
  constraint ck_lanc_credito       check (metodo <> 'credito' or cartao_id is not null),
  constraint ck_lanc_avista        check (metodo <> 'a_vista' or parcelas_total = 1),
  constraint ck_lanc_rec           check ((recorrencia_id is null) = (competencia_rec is null))
);

-- Idempotência: uma recorrência só pode gerar UM lançamento por competência.
-- Sem isso, cron + fallback no primeiro acesso do mês duplicam o aluguel.
create unique index if not exists uq_lanc_recorrencia on lancamentos(recorrencia_id, competencia_rec)
  where recorrencia_id is not null;

create index if not exists idx_lanc_owner  on lancamentos(owner_id, data_compra desc);
create index if not exists idx_lanc_house  on lancamentos(household_id, data_compra desc)
  where escopo = 'compartilhado';
create index if not exists idx_lanc_desc   on lancamentos(owner_id, lower(descricao));

-- -------------------------------------------------------------
-- PARCELAS
-- -------------------------------------------------------------
create table if not exists parcelas (
  id             uuid primary key default gen_random_uuid(),
  lancamento_id  uuid not null references lancamentos(id) on delete cascade,
  numero         int not null check (numero >= 1),
  valor          bigint not null check (valor > 0),   -- CENTAVOS
  competencia    date not null,
  vencimento     date not null,
  status         status_parcela_t not null default 'pendente',
  pago_em        date,
  created_at     timestamptz not null default now(),

  unique (lancamento_id, numero),
  constraint ck_parc_dia1 check (competencia = date_trunc('month', competencia)::date),
  constraint ck_parc_pago check ((status = 'pago') = (pago_em is not null))
);
create index if not exists idx_parc_comp on parcelas(competencia, status);
create index if not exists idx_parc_venc on parcelas(vencimento) where status = 'pendente';

-- Garantia dura: a soma das parcelas tem de bater com o valor do lançamento.
-- É a invariante que impede erro de arredondamento de virar dívida fantasma.
create or replace function fn_valida_soma_parcelas() returns trigger
language plpgsql as $$
declare
  v_lanc uuid := coalesce(new.lancamento_id, old.lancamento_id);
  v_total bigint;
  v_soma  bigint;
  v_qtd   int;
  v_esperado int;
begin
  select valor_total, parcelas_total into v_total, v_esperado
    from lancamentos where id = v_lanc;
  if v_total is null then return null; end if;   -- lançamento já removido

  select coalesce(sum(valor), 0), count(*) into v_soma, v_qtd
    from parcelas where lancamento_id = v_lanc;

  if v_qtd <> v_esperado then
    raise exception 'Lançamento % declara % parcelas mas tem %', v_lanc, v_esperado, v_qtd;
  end if;
  if v_soma <> v_total then
    raise exception 'Soma das parcelas (%) difere do valor total (%) no lançamento %',
      v_soma, v_total, v_lanc;
  end if;
  return null;
end $$;

drop trigger if exists trg_valida_soma_parcelas on parcelas;
create constraint trigger trg_valida_soma_parcelas
  after insert or update or delete on parcelas
  deferrable initially deferred
  for each row execute function fn_valida_soma_parcelas();

-- -------------------------------------------------------------
-- RECEITAS
-- -------------------------------------------------------------
create table if not exists receitas (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references profiles(id) on delete cascade,
  household_id    uuid references households(id) on delete cascade,
  escopo          escopo_t not null,
  tipo            tipo_receita_t not null,
  valor           bigint not null check (valor > 0),   -- CENTAVOS
  competencia     date not null,
  descricao       text not null default '',
  recorrencia_id  uuid references recorrencias(id) on delete set null,
  created_at      timestamptz not null default now(),

  constraint ck_rcta_dia1 check (competencia = date_trunc('month', competencia)::date),
  constraint ck_rcta_compartilhado check (escopo = 'pessoal' or household_id is not null)
);
-- O salário de cada pessoa é único por mês (editável, nunca duplicado).
create unique index if not exists uq_rcta_salario on receitas(owner_id, competencia)
  where tipo = 'salario';
create index if not exists idx_rcta_owner on receitas(owner_id, competencia);

-- -------------------------------------------------------------
-- ACERTOS  (quitação do saldo entre o casal)
-- -------------------------------------------------------------
create table if not exists acertos (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  de_user_id    uuid not null references profiles(id),
  para_user_id  uuid not null references profiles(id),
  valor         bigint not null check (valor > 0),
  data          date not null default current_date,
  descricao     text not null default '',
  created_at    timestamptz not null default now(),

  constraint ck_acerto_pessoas check (de_user_id <> para_user_id)
);
create index if not exists idx_acertos_house on acertos(household_id, data desc);

-- -------------------------------------------------------------
-- TRAVA DE MÊS FECHADO
-- Mês fechado é somente leitura. Bloqueia na escrita, não na UI —
-- a UI erra, o banco não.
-- -------------------------------------------------------------
create or replace function fn_mes_esta_fechado(p_escopo escopo_t, p_owner uuid,
                                               p_household uuid, p_comp date)
returns boolean language sql stable as $$
  select exists (
    select 1 from meses_fechados m
     where m.competencia = date_trunc('month', p_comp)::date
       and ((p_escopo = 'pessoal'       and m.escopo = 'pessoal'       and m.owner_id = p_owner)
         or (p_escopo = 'compartilhado' and m.escopo = 'compartilhado' and m.household_id = p_household))
  )
$$;

create or replace function fn_bloqueia_mes_fechado() returns trigger
language plpgsql as $$
declare
  l lancamentos%rowtype;
  v_comp date;
begin
  if TG_TABLE_NAME = 'parcelas' then
    select * into l from lancamentos
      where id = coalesce(new.lancamento_id, old.lancamento_id);
    if l.id is null then return coalesce(new, old); end if;
    v_comp := coalesce(new.competencia, old.competencia);
    if fn_mes_esta_fechado(l.escopo, l.owner_id, l.household_id, v_comp) then
      raise exception 'Mês % está fechado. Reabra o mês antes de alterar.',
        to_char(v_comp, 'MM/YYYY');
    end if;
  else -- receitas
    v_comp := coalesce(new.competencia, old.competencia);
    if fn_mes_esta_fechado(coalesce(new.escopo, old.escopo),
                           coalesce(new.owner_id, old.owner_id),
                           coalesce(new.household_id, old.household_id), v_comp) then
      raise exception 'Mês % está fechado. Reabra o mês antes de alterar.',
        to_char(v_comp, 'MM/YYYY');
    end if;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_bloqueia_parcelas on parcelas;
create trigger trg_bloqueia_parcelas
  before insert or update or delete on parcelas
  for each row execute function fn_bloqueia_mes_fechado();

drop trigger if exists trg_bloqueia_receitas on receitas;
create trigger trg_bloqueia_receitas
  before insert or update or delete on receitas
  for each row execute function fn_bloqueia_mes_fechado();

-- -------------------------------------------------------------
-- Criação automática do profile quando o usuário se cadastra
-- -------------------------------------------------------------
create or replace function fn_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

-- Cria o profile automaticamente quando alguém se cadastra.
-- Sem este trigger, o usuário faz login mas não tem linha em profiles,
-- e o app quebra logo na primeira tela.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function fn_handle_new_user();
