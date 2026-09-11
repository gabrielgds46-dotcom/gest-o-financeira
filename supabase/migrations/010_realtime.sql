-- =============================================================
-- 010_realtime.sql  ·  Sincronia entre os dois aparelhos
--
-- O Realtime do Supabase respeita RLS: cada aparelho só recebe evento
-- de linha que ele já poderia ler. Por isso só as tabelas do fluxo
-- compartilhado entram na publicação — nada de dado pessoal do parceiro
-- vaza por aqui.
--
-- REPLICA IDENTITY FULL é necessário para que o payload de UPDATE e
-- DELETE traga as colunas usadas nas políticas (escopo, owner_id,
-- household_id). Sem isso o filtro do RLS no Realtime não consegue
-- decidir e o evento simplesmente não chega.
-- =============================================================

alter table lancamentos    replica identity full;
alter table parcelas       replica identity full;
alter table receitas       replica identity full;
alter table acertos        replica identity full;
alter table orcamentos     replica identity full;
alter table recorrencias   replica identity full;
alter table meses_fechados replica identity full;

do $$
declare t text;
begin
  foreach t in array array['lancamentos','parcelas','receitas','acertos',
                           'orcamentos','recorrencias','meses_fechados']
  loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
