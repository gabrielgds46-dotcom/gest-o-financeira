# Gestão Financeira do Casal

Backend (Supabase / PostgreSQL) do app de gestão financeira compartilhada.

## Estrutura

```
docs/
  ESPECIFICACAO.md   # especificação completa do app (v2): stack, modelo, regras, telas, KPIs, fases
supabase/
  migrations/
    001_schema.sql   # enums, tabelas, constraints, índices, triggers
    002_rls.sql      # Row Level Security, views de exposição controlada, grants
    003_seed.sql     # categorias fixas
    004_rpc.sql      # funções chamadas pelo front via supabase.rpc()
  tests/
    01_rls_test.sql  # testes de RLS e invariantes (roda via psql como superuser)
```

## Convenções

- Dinheiro é `bigint` em **centavos**. Nunca float ou numeric fracionário.
- Datas de negócio são `date` puro, nunca `timestamptz`.
- `competencia` é sempre o dia 1 do mês de referência.
- Toda autorização vive no RLS. O front nunca depende de filtro manual para segurança.
- A regra de competência do cartão (fechamento, vencimento, parcelas) vive só no front, em `calcularParcelas()`. O SQL apenas persiste as parcelas já calculadas.

## Aplicando as migrations

Com o Supabase CLI:

```bash
supabase db push
```

Ou direto no banco, na ordem numérica:

```bash
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

## Rodando os testes

```bash
psql "$DATABASE_URL" -f supabase/tests/01_rls_test.sql
```
