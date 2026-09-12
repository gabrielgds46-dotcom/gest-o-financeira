-- =============================================================
-- 011_edicao.sql  ·  Editar, cancelar e excluir lançamentos
--
-- Princípio: toda ação destrutiva é REVERSÍVEL por 5 segundos, porque
-- a UI troca o "tem certeza?" por um "desfazer". Então cada operação
-- devolve o que é preciso para voltar atrás:
--   cancelar  -> os ids das parcelas que ELA cancelou
--   excluir   -> um retrato completo do lançamento
--
-- O motor de competência continua no TypeScript. Aqui só se persiste.
-- =============================================================

-- -------------------------------------------------------------
-- detalhe_lancamento: o lançamento com as parcelas, para a folha.
-- Passa pelo RLS normalmente (SECURITY INVOKER).
-- -------------------------------------------------------------
create or replace function detalhe_lancamento(p_lancamento_id uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', l.id,
    'escopo', l.escopo,
    'metodo', l.metodo,
    'natureza', l.natureza,
    'descricao', l.descricao,
    'valor_total', l.valor_total,
    'data_compra', l.data_compra,
    'parcelas_total', l.parcelas_total,
    'cancelado_em', l.cancelado_em,
    'recorrencia_id', l.recorrencia_id,
    'cartao_id', l.cartao_id,
    'cartao', ct.apelido,
    'dia_fechamento', ct.dia_fechamento,
    'dia_vencimento', ct.dia_vencimento,
    'categoria_id', l.categoria_id,
    'categoria', c.nome,
    'categoria_cor', c.cor,
    'categoria_icone', c.icone,
    'pago_por', l.pago_por,
    'pago_por_nome', pr.nome,
    'mes_fechado', fn_mes_esta_fechado(l.escopo, l.owner_id, l.household_id, l.data_compra),
    'parcelas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', pc.id, 'numero', pc.numero, 'valor', pc.valor,
               'competencia', pc.competencia, 'vencimento', pc.vencimento,
               'status', pc.status, 'pago_em', pc.pago_em,
               'mes_fechado', fn_mes_esta_fechado(l.escopo, l.owner_id, l.household_id, pc.competencia))
               order by pc.numero)
        from parcelas pc where pc.lancamento_id = l.id), '[]'::jsonb)
  )
  from lancamentos l
  join categorias c on c.id = l.categoria_id
  left join v_cartoes_household ct on ct.id = l.cartao_id
  left join profiles pr on pr.id = l.pago_por
  where l.id = p_lancamento_id
$$;

-- -------------------------------------------------------------
-- editar_lancamento: campos do lançamento + novos valores das
-- parcelas ainda abertas, numa transação só.
--
-- p_parcelas: [{id, numero, valor, competencia, vencimento}]
--   · id nulo  -> parcela nova (só quando nada foi pago)
--   · o que não vier na lista e estiver PENDENTE é removido
--   · parcela PAGA ou CANCELADA nunca é tocada, venha ou não na lista
-- -------------------------------------------------------------
create or replace function editar_lancamento(
  p_lancamento_id uuid,
  p_valor_total   bigint,
  p_categoria_id  uuid,
  p_descricao     text,
  p_data_compra   date,
  p_metodo        metodo_t,
  p_cartao_id     uuid,
  p_natureza      natureza_t,
  p_parcelas      jsonb
) returns void language plpgsql set search_path = public as $$
declare
  l            lancamentos%rowtype;
  v_pagas      int;
  v_canceladas int;
  v_soma       bigint;
  v_total      int;
begin
  select * into l from lancamentos where id = p_lancamento_id;
  if l.id is null then raise exception 'Lançamento não encontrado'; end if;

  select count(*) filter (where status = 'pago'),
         count(*) filter (where status = 'cancelado')
    into v_pagas, v_canceladas
    from parcelas where lancamento_id = l.id;

  -- Com parcela paga ou cancelada, data e cartão ficam travados: mexer neles
  -- moveria a competência de algo que já saiu do caixa ou que já foi baixado.
  if (v_pagas > 0 or v_canceladas > 0)
     and (p_data_compra <> l.data_compra
          or p_cartao_id is distinct from l.cartao_id
          or p_metodo <> l.metodo) then
    raise exception 'Com parcela paga ou cancelada não dá para mudar data, método ou cartão. Cancele as futuras e lance de novo.';
  end if;

  -- Parcela cancelada continua contando para o trigger fn_valida_soma_parcelas,
  -- que compara valor_total com a soma de TODAS as parcelas. Redistribuir o
  -- valor deixaria a cancelada sobrando, então o total fica congelado.
  if v_canceladas > 0 and p_valor_total <> l.valor_total then
    raise exception 'Este lançamento tem parcela cancelada: o valor total não muda mais. Exclua e lance de novo.';
  end if;

  -- A soma (intocáveis + as que vieram) tem de bater com o novo total.
  select coalesce(sum(valor), 0) into v_soma from parcelas
   where lancamento_id = l.id and status in ('pago', 'cancelado');
  v_soma := v_soma + coalesce((select sum((e->>'valor')::bigint)
                                 from jsonb_array_elements(p_parcelas) e), 0);
  if v_soma <> p_valor_total then
    raise exception 'Soma das parcelas (%) difere do valor total (%)', v_soma, p_valor_total;
  end if;

  set constraints all deferred;

  -- Remove as pendentes que sumiram da lista (redução de parcelas).
  delete from parcelas pc
   where pc.lancamento_id = l.id
     and pc.status = 'pendente'
     and not exists (
       select 1 from jsonb_array_elements(p_parcelas) e
        where (e->>'id') is not null and (e->>'id')::uuid = pc.id);

  -- Atualiza as existentes e insere as novas.
  update parcelas pc set
      valor       = (e->>'valor')::bigint,
      numero      = (e->>'numero')::int,
      competencia = (e->>'competencia')::date,
      vencimento  = (e->>'vencimento')::date
    from jsonb_array_elements(p_parcelas) e
   where (e->>'id') is not null and pc.id = (e->>'id')::uuid
     and pc.lancamento_id = l.id and pc.status = 'pendente';

  insert into parcelas (lancamento_id, numero, valor, competencia, vencimento)
  select l.id, (e->>'numero')::int, (e->>'valor')::bigint,
         (e->>'competencia')::date, (e->>'vencimento')::date
    from jsonb_array_elements(p_parcelas) e
   where (e->>'id') is null;

  select count(*) into v_total from parcelas where lancamento_id = l.id;

  update lancamentos set
      valor_total    = p_valor_total,
      categoria_id   = p_categoria_id,
      descricao      = coalesce(p_descricao, ''),
      data_compra    = p_data_compra,
      metodo         = p_metodo,
      cartao_id      = case when p_metodo = 'credito' then p_cartao_id else null end,
      natureza       = p_natureza,
      parcelas_total = v_total
   where id = l.id;
end $$;

-- -------------------------------------------------------------
-- cancelar_lancamento: agora devolve os IDs que cancelou, para o
-- desfazer saber exatamente o que reverter (e não ressuscitar uma
-- parcela que já estava cancelada antes).
-- -------------------------------------------------------------
drop function if exists cancelar_lancamento(uuid);
create or replace function cancelar_lancamento(p_lancamento_id uuid)
returns uuid[] language plpgsql set search_path = public as $$
declare v_ids uuid[];
begin
  with alvo as (
    update parcelas set status = 'cancelado'
     where lancamento_id = p_lancamento_id and status = 'pendente'
     returning id
  ) select coalesce(array_agg(id), '{}') into v_ids from alvo;

  update lancamentos set cancelado_em = now() where id = p_lancamento_id;
  return v_ids;
end $$;

create or replace function reverter_cancelamento(p_parcela_ids uuid[])
returns void language plpgsql set search_path = public as $$
begin
  update parcelas set status = 'pendente', pago_em = null
   where id = any(p_parcela_ids) and status = 'cancelado';

  -- Se voltou a existir parcela pendente, o lançamento não está mais cancelado.
  update lancamentos l set cancelado_em = null
   where l.id in (select lancamento_id from parcelas where id = any(p_parcela_ids))
     and exists (select 1 from parcelas p where p.lancamento_id = l.id and p.status = 'pendente');
end $$;

-- -------------------------------------------------------------
-- excluir_lancamento: apaga de vez, e só quando nada saiu do caixa.
-- Devolve um retrato completo para o desfazer recriar igual,
-- com os MESMOS ids.
-- -------------------------------------------------------------
create or replace function excluir_lancamento(p_lancamento_id uuid)
returns jsonb language plpgsql set search_path = public as $$
declare
  l    lancamentos%rowtype;
  snap jsonb;
begin
  select * into l from lancamentos where id = p_lancamento_id;
  if l.id is null then raise exception 'Lançamento não encontrado'; end if;

  if exists (select 1 from parcelas where lancamento_id = l.id and status = 'pago') then
    raise exception 'Este lançamento tem parcela paga. Cancele as futuras em vez de excluir.';
  end if;
  if fn_mes_esta_fechado(l.escopo, l.owner_id, l.household_id, l.data_compra) then
    raise exception 'O mês está fechado. Reabra antes de excluir.';
  end if;
  if l.recorrencia_id is not null then
    raise exception 'Este lançamento veio de uma recorrência. Desative a recorrência ou cancele as parcelas.';
  end if;

  snap := jsonb_build_object(
    'lancamento', to_jsonb(l),
    'parcelas', coalesce((select jsonb_agg(to_jsonb(pc) order by pc.numero)
                            from parcelas pc where pc.lancamento_id = l.id), '[]'::jsonb));

  delete from parcelas where lancamento_id = l.id;
  delete from lancamentos where id = l.id;
  return snap;
end $$;

create or replace function restaurar_lancamento(p_snapshot jsonb)
returns uuid language plpgsql set search_path = public as $$
declare v_id uuid;
begin
  set constraints all deferred;

  insert into lancamentos
  select * from jsonb_populate_record(null::lancamentos, p_snapshot->'lancamento')
  returning id into v_id;

  insert into parcelas
  select * from jsonb_populate_recordset(null::parcelas, p_snapshot->'parcelas');

  return v_id;
end $$;

-- -------------------------------------------------------------
-- lancamentos_do_mes: a lista navegável do mês. Sem ela não há
-- como achar o lançamento errado para corrigir — só o "a vencer"
-- dos próximos 7 dias ficava visível.
-- Cancelado some da lista; pago fica, porque é o histórico.
-- -------------------------------------------------------------
create or replace function lancamentos_do_mes(p_escopo escopo_t, p_competencia date)
returns table (
  parcela_id uuid, lancamento_id uuid, descricao text,
  categoria_nome text, categoria_cor text, categoria_icone text,
  metodo metodo_t, natureza natureza_t, cartao_apelido text,
  numero int, parcelas_total int, valor bigint,
  vencimento date, status status_parcela_t, pago_em date,
  pago_por uuid, recorrencia_id uuid
)
language sql stable set search_path = public as $$
  select pc.id, l.id, l.descricao,
         c.nome, c.cor, c.icone,
         l.metodo, l.natureza, ct.apelido,
         pc.numero, l.parcelas_total, pc.valor,
         pc.vencimento, pc.status, pc.pago_em, l.pago_por, l.recorrencia_id
    from parcelas pc
    join lancamentos l on l.id = pc.lancamento_id
    join categorias  c on c.id = l.categoria_id
    left join v_cartoes_household ct on ct.id = l.cartao_id
   where pc.competencia = date_trunc('month', p_competencia)::date
     and pc.status <> 'cancelado'
     and l.escopo = p_escopo
     and (p_escopo = 'compartilhado' or l.owner_id = auth.uid())
   order by pc.vencimento, pc.valor desc
$$;

-- -------------------------------------------------------------
-- Grants
-- -------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function
  detalhe_lancamento(uuid),
  lancamentos_do_mes(escopo_t, date),
  editar_lancamento(uuid, bigint, uuid, text, date, metodo_t, uuid, natureza_t, jsonb),
  cancelar_lancamento(uuid),
  reverter_cancelamento(uuid[]),
  excluir_lancamento(uuid),
  restaurar_lancamento(jsonb)
to authenticated, service_role;
