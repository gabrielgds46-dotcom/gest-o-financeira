-- =============================================================
-- 015_semana.sql  ·  Resumo da semana e inscrições de push
--
-- O resumo responde quatro perguntas, nessa ordem: quanto saiu na
-- semana, se foi mais ou menos que na anterior, em quê, e o que vem
-- pela frente. Nada de "você gastou R$ 2.180" solto — número sem
-- comparação não diz se foi bom ou ruim.
--
-- A janela é de 7 dias corridos terminando em p_ate (inclusive), e a
-- comparação são os 7 dias anteriores a essa janela. Usa a data do
-- VENCIMENTO, não a competência: a pergunta é sobre a semana que passou,
-- não sobre a fatura.
-- =============================================================

-- O corpo recebe o usuário explicitamente porque a Edge Function roda como
-- service_role, onde auth.uid() é nulo. A função pública é uma casca que
-- injeta auth.uid() — assim a consulta existe uma vez só.
create or replace function fn_resumo_semanal(p_user uuid, p_visao text, p_ate date)
returns table (
  ate            date,
  gasto          bigint,
  gasto_anterior bigint,
  variacao       numeric,
  top_nome       text,
  top_valor      bigint,
  top_cor        text,
  top_icone      text,
  maior_nome     text,
  maior_valor    bigint,
  vence_valor    bigint,
  vence_qtd      int
)
language sql stable security definer set search_path = public as $$
  with j as (
    select coalesce(p_ate, fn_hoje_local()) as ate
  ),
  hh as (select household_id as h from profiles where id = p_user),
  base as (
    select pc.valor, pc.vencimento, l.descricao, c.nome as cat, c.cor, c.icone
      from parcelas pc
      join lancamentos l on l.id = pc.lancamento_id
      join categorias  c on c.id = l.categoria_id
     where pc.status <> 'cancelado' and l.natureza = 'saida' and c.grupo = 'despesa'
       and ((p_visao in ('pessoal','consolidado')       and l.escopo = 'pessoal'       and l.owner_id = p_user)
         or (p_visao in ('compartilhado','consolidado') and l.escopo = 'compartilhado' and l.household_id = (select h from hh)))
  ),
  semana as (
    select * from base, j where vencimento between j.ate - 6 and j.ate
  ),
  anterior as (
    select * from base, j where vencimento between j.ate - 13 and j.ate - 7
  ),
  topo as (
    select cat, cor, icone, sum(valor)::bigint as v
      from semana group by cat, cor, icone order by v desc limit 1
  ),
  maior as (
    select coalesce(nullif(descricao, ''), cat) as nome, valor
      from semana order by valor desc limit 1
  ),
  futuro as (
    select coalesce(sum(pc.valor), 0)::bigint as v, count(*)::int as n
      from parcelas pc
      join lancamentos l on l.id = pc.lancamento_id, j
     where pc.status = 'pendente'
       and pc.vencimento between j.ate + 1 and j.ate + 7
       and ((p_visao in ('pessoal','consolidado')       and l.escopo = 'pessoal'       and l.owner_id = p_user)
         or (p_visao in ('compartilhado','consolidado') and l.escopo = 'compartilhado' and l.household_id = (select h from hh)))
  )
  select
    (select ate from j),
    coalesce((select sum(valor) from semana), 0)::bigint,
    coalesce((select sum(valor) from anterior), 0)::bigint,
    case when coalesce((select sum(valor) from anterior), 0) > 0
         then round((coalesce((select sum(valor) from semana), 0)
                   - (select sum(valor) from anterior))::numeric
                   / (select sum(valor) from anterior), 4)
         else null end,
    (select cat from topo), (select v from topo), (select cor from topo), (select icone from topo),
    (select nome from maior), (select valor from maior),
    (select v from futuro), (select n from futuro)
  where fn_valida_visao(p_visao) is not null
$$;

revoke execute on function fn_resumo_semanal(uuid, text, date) from public, anon, authenticated;
grant execute on function fn_resumo_semanal(uuid, text, date) to service_role;

create or replace function resumo_semanal(p_visao text, p_ate date default null)
returns table (
  ate date, gasto bigint, gasto_anterior bigint, variacao numeric,
  top_nome text, top_valor bigint, top_cor text, top_icone text,
  maior_nome text, maior_valor bigint, vence_valor bigint, vence_qtd int
)
language sql stable set search_path = public as $$
  select * from fn_resumo_semanal(auth.uid(), p_visao, p_ate)
$$;

-- -------------------------------------------------------------
-- Inscrições de push (Web Push).
--
-- Uma linha por APARELHO, não por pessoa: o mesmo casal usa celular e
-- computador, e cada navegador gera o seu endpoint. O endpoint é a
-- chave natural — reinstalar o app gera outro e o antigo morre.
--
-- A chave privada VAPID nunca encosta aqui: ela vive nos secrets da
-- Edge Function. Aqui só ficam os dados públicos do navegador.
-- -------------------------------------------------------------
create table if not exists push_inscricoes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  aparelho   text,
  criada_em  timestamptz not null default now(),
  falhas     int not null default 0
);

create index if not exists idx_push_user on push_inscricoes(user_id);

alter table push_inscricoes enable row level security;

drop policy if exists push_minhas on push_inscricoes;
create policy push_minhas on push_inscricoes for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on push_inscricoes to authenticated;

-- -------------------------------------------------------------
-- A Edge Function roda como service_role e precisa varrer todo mundo.
-- Vem daqui e não de um select solto para o filtro de quem quer receber
-- ficar em um lugar só.
-- -------------------------------------------------------------
drop function if exists push_destinatarios();
create or replace function push_destinatarios()
returns table (user_id uuid, nome text, endpoint text, p256dh text, auth text)
language sql stable security definer set search_path = public as $$
  select i.user_id, p.nome, i.endpoint, i.p256dh, i.auth
    from push_inscricoes i
    join profiles p on p.id = i.user_id
   where i.falhas < 3
$$;

revoke execute on function push_destinatarios() from public, anon, authenticated;
grant execute on function push_destinatarios() to service_role;

create or replace function push_marcar_falha(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  update push_inscricoes set falhas = falhas + 1 where endpoint = p_endpoint;
  delete from push_inscricoes where endpoint = p_endpoint and falhas >= 3;
$$;

revoke execute on function push_marcar_falha(text) from public, anon, authenticated;
grant execute on function push_marcar_falha(text) to service_role;

revoke execute on all functions in schema public from public, anon;
grant execute on function resumo_semanal(text, date) to authenticated, service_role;

-- -------------------------------------------------------------
-- Cron de segunda, 8h em São Paulo (11:00 UTC).
--
-- Nasce DESLIGADO de propósito: sem as chaves VAPID nos secrets a função
-- devolve 500, e um cron que falha toda semana vira ruído que ninguém
-- mais lê. Ligue depois de configurar (ver README):
--   select cron.alter_job((select jobid from cron.job where jobname = 'resumo-semanal'), active := true);
-- -------------------------------------------------------------
