-- Testes de RLS e invariantes. Roda como superuser, alternando identidade.
\set ON_ERROR_STOP on
\set QUIET on

-- Dois usuários no auth
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'gabriel@ex.com'),
  ('22222222-2222-2222-2222-222222222222', 'heloisa@ex.com');
-- o trigger on_auth_user_created ja criou os profiles; aqui so completamos
update profiles set nome='Gabriel', salario_base=800000 where id='11111111-1111-1111-1111-111111111111';
update profiles set nome='Heloisa', salario_base=600000 where id='22222222-2222-2222-2222-222222222222';

create or replace function como(p uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p::text, false);
end $$;

\echo '=== T1: Gabriel cria household ==='
select como('11111111-1111-1111-1111-111111111111');
set role authenticated;
select criar_household('Casa GH') as household_id \gset
select gerar_codigo_convite(:'household_id') as codigo \gset
reset role;
\echo 'household criado, codigo gerado'

\echo '=== T2: Heloisa entra pelo codigo ==='
select como('22222222-2222-2222-2222-222222222222');
set role authenticated;
select entrar_household(:'codigo');
reset role;
select count(*) as membros from household_members;

\echo '=== T3: codigo eh de uso unico (deve FALHAR) ==='
select como('22222222-2222-2222-2222-222222222222');
set role authenticated;
\set ON_ERROR_STOP off
select entrar_household(:'codigo');
\set ON_ERROR_STOP on
reset role;

\echo '=== T4: Gabriel cadastra cartao (fecha 28, vence 05) ==='
select como('11111111-1111-1111-1111-111111111111');
set role authenticated;
insert into cartoes (owner_id, apelido, dia_fechamento, dia_vencimento, limite)
values ('11111111-1111-1111-1111-111111111111','Nubank',28,5,1500000);
reset role;
select id as cartao_id from cartoes limit 1 \gset

\echo '=== T5: Gabriel lanca PESSOAL (Heloisa nao pode ver) ==='
select como('11111111-1111-1111-1111-111111111111');
set role authenticated;
select criar_lancamento(
  'pessoal','a_vista',
  (select id from categorias where slug='beleza'),
  12000, date '2026-09-05', 1, 'Barbeiro',
  '[{"numero":1,"valor":12000,"competencia":"2026-09-01","vencimento":"2026-09-05"}]'::jsonb
) as lanc_pessoal \gset
reset role;

select como('22222222-2222-2222-2222-222222222222');
set role authenticated;
select count(*) as "heloisa_ve_pessoal_do_gabriel__esperado_0" from lancamentos;
reset role;

\echo '=== T6: Gabriel lanca COMPARTILHADO parcelado (Heloisa ve e edita) ==='
select como('11111111-1111-1111-1111-111111111111');
set role authenticated;
select criar_lancamento(
  'compartilhado','credito',
  (select id from categorias where slug='alimentacao'),
  119999, date '2026-09-26', 12, 'Freezer',
  '[{"numero":1,"valor":10000,"competencia":"2026-09-01","vencimento":"2026-10-05"},
    {"numero":2,"valor":10000,"competencia":"2026-10-01","vencimento":"2026-11-05"},
    {"numero":3,"valor":10000,"competencia":"2026-11-01","vencimento":"2026-12-05"},
    {"numero":4,"valor":10000,"competencia":"2026-12-01","vencimento":"2027-01-05"},
    {"numero":5,"valor":10000,"competencia":"2027-01-01","vencimento":"2027-02-05"},
    {"numero":6,"valor":10000,"competencia":"2027-02-01","vencimento":"2027-03-05"},
    {"numero":7,"valor":10000,"competencia":"2027-03-01","vencimento":"2027-04-05"},
    {"numero":8,"valor":10000,"competencia":"2027-04-01","vencimento":"2027-05-05"},
    {"numero":9,"valor":10000,"competencia":"2027-05-01","vencimento":"2027-06-05"},
    {"numero":10,"valor":10000,"competencia":"2027-06-01","vencimento":"2027-07-05"},
    {"numero":11,"valor":10000,"competencia":"2027-07-01","vencimento":"2027-08-05"},
    {"numero":12,"valor":9999,"competencia":"2027-08-01","vencimento":"2027-09-05"}]'::jsonb,
  :'cartao_id', '11111111-1111-1111-1111-111111111111', 'saida',
  (select household_id from profiles where id='11111111-1111-1111-1111-111111111111')
) as lanc_compart \gset
reset role;

select como('22222222-2222-2222-2222-222222222222');
set role authenticated;
select count(*) as "heloisa_ve_compartilhado__esperado_1" from lancamentos;
update lancamentos set descricao = 'Freezer da cozinha' where id = :'lanc_compart';
select descricao as "heloisa_editou" from lancamentos where id = :'lanc_compart';
reset role;

\echo '=== T7: soma de parcelas errada deve ser REJEITADA ==='
select como('11111111-1111-1111-1111-111111111111');
set role authenticated;
\set ON_ERROR_STOP off
select criar_lancamento('pessoal','credito',
  (select id from categorias where slug='lazer'),
  30000, date '2026-09-10', 3, 'Erro proposital',
  '[{"numero":1,"valor":10000,"competencia":"2026-09-01","vencimento":"2026-10-05"},
    {"numero":2,"valor":10000,"competencia":"2026-10-01","vencimento":"2026-11-05"},
    {"numero":3,"valor":9999,"competencia":"2026-11-01","vencimento":"2026-12-05"}]'::jsonb,
  :'cartao_id');
\set ON_ERROR_STOP on
reset role;

\echo '=== T8: limite do cartao nao vaza para a parceira ==='
select como('22222222-2222-2222-2222-222222222222');
set role authenticated;
select count(*) as "heloisa_le_tabela_cartoes__esperado_0" from cartoes;
select apelido, dia_fechamento, dia_vencimento from v_cartoes_household;
reset role;

\echo '=== T9: mes fechado bloqueia escrita ==='
select como('11111111-1111-1111-1111-111111111111');
set role authenticated;
insert into meses_fechados (escopo, owner_id, competencia, fechado_por)
values ('pessoal','11111111-1111-1111-1111-111111111111', date '2026-09-01',
        '11111111-1111-1111-1111-111111111111');
\set ON_ERROR_STOP off
select criar_lancamento('pessoal','a_vista',
  (select id from categorias where slug='transporte'),
  5000, date '2026-09-15', 1, 'Uber atrasado',
  '[{"numero":1,"valor":5000,"competencia":"2026-09-01","vencimento":"2026-09-15"}]'::jsonb);
\set ON_ERROR_STOP on
delete from meses_fechados;
reset role;

\echo '=== T10: saldo do casal antes e depois do acerto ==='
select como('22222222-2222-2222-2222-222222222222');
set role authenticated;
select p.nome, s.pago, s.devido, s.saldo
  from saldo_casal((select household_id from profiles where id=auth.uid())) s
  join profiles p on p.id = s.user_id order by p.nome;

insert into acertos (household_id, de_user_id, para_user_id, valor, descricao)
values ((select household_id from profiles where id=auth.uid()),
        '22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111', 59999, 'Pix do freezer');

\echo '--- apos acerto de R$ 599,99 ---'
select p.nome, s.saldo
  from saldo_casal((select household_id from profiles where id=auth.uid())) s
  join profiles p on p.id = s.user_id order by p.nome;
reset role;

\echo '=== T11: idempotencia de recorrencia ==='
select como('11111111-1111-1111-1111-111111111111');
set role authenticated;
insert into recorrencias (owner_id, escopo, tipo, categoria_id, metodo, descricao, valor, dia_vencimento)
values ('11111111-1111-1111-1111-111111111111','pessoal','despesa',
        (select id from categorias where slug='custos_fixos'),'a_vista','Faculdade',89000,10)
returning id as rec_id \gset

insert into lancamentos (owner_id, escopo, metodo, categoria_id, descricao, valor_total,
                         data_compra, pago_por, recorrencia_id, competencia_rec)
values ('11111111-1111-1111-1111-111111111111','pessoal','a_vista',
        (select id from categorias where slug='custos_fixos'),'Faculdade',89000,
        date '2026-10-10','11111111-1111-1111-1111-111111111111', :'rec_id', date '2026-10-01');
insert into parcelas (lancamento_id, numero, valor, competencia, vencimento)
values ((select id from lancamentos where recorrencia_id=:'rec_id'),1,89000,'2026-10-01','2026-10-10');

select count(*) as "pendentes_outubro__esperado_0" from recorrencias_pendentes(date '2026-10-01');
select count(*) as "pendentes_novembro__esperado_1" from recorrencias_pendentes(date '2026-11-01');

\echo '--- segunda geracao do mesmo mes deve FALHAR (idempotencia) ---'
\set ON_ERROR_STOP off
insert into lancamentos (owner_id, escopo, metodo, categoria_id, descricao, valor_total,
                         data_compra, pago_por, recorrencia_id, competencia_rec)
values ('11111111-1111-1111-1111-111111111111','pessoal','a_vista',
        (select id from categorias where slug='custos_fixos'),'Faculdade DUPLICADA',89000,
        date '2026-10-10','11111111-1111-1111-1111-111111111111', :'rec_id', date '2026-10-01');
\set ON_ERROR_STOP on
reset role;

\echo '=== FIM ==='

\echo '=== T12: INVARIANTE — a soma dos saldos do casal tem de ser ZERO ==='
select como('11111111-1111-1111-1111-111111111111');
set role authenticated;
select sum(saldo) as "soma_saldos__esperado_0", sum(devido) as soma_devido,
       (select coalesce(sum(pc.valor),0) from parcelas pc join lancamentos l on l.id=pc.lancamento_id
         where l.escopo='compartilhado' and pc.status<>'cancelado') as gasto_total
  from saldo_casal((select household_id from profiles where id=auth.uid()));
reset role;
