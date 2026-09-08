# Gestão Financeira do Casal

App web (PWA, mobile-first) de gestão financeira pessoal e compartilhada para um casal.

**Stack:** Vite + React + TypeScript + Tailwind CSS · Supabase (Auth + Postgres + RLS) ·
Recharts · date-fns/date-fns-tz · Vitest · vite-plugin-pwa · Vercel.

## Rodando localmente

1. Crie um projeto em https://supabase.com e, em **Authentication > Providers > Email**,
   deixe o provedor de email ativo. Para testar sem caixa de entrada, desligue
   *Confirm email* nessa mesma tela.
2. Rode as migrations (seção abaixo).
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` (Dashboard > Project Settings > API).
4. Instale e suba:

```bash
npm install
npm run dev
```

Outros comandos: `npm run build` (produção + service worker), `npm run preview`,
`npm test` (Vitest), `npm run typecheck`.

## Deploy na Vercel

Importe o repositório na Vercel, framework **Vite**, e cadastre as duas variáveis
`VITE_SUPABASE_*` em *Environment Variables*. O `vercel.json` já reescreve todas as
rotas para `index.html` (SPA). No Supabase, adicione a URL da Vercel em
**Authentication > URL Configuration > Site URL / Redirect URLs**.

## Estrutura

```
src/
  main.tsx               # bootstrap + registro do service worker
  App.tsx                # rotas (públicas: /entrar, /cadastro · protegidas: /, /lancar, /analise, /perfil)
  index.css              # Tailwind v4, modo escuro padrão, safe-area
  lib/supabase.ts        # cliente único do Supabase (só via variáveis de ambiente)
  lib/erros.ts           # tradução de erros do Auth para pt-BR
  contexts/AuthContext   # sessão, entrar, cadastrar, sair
  components/            # Campo, Botao, Carregando, RotaProtegida/RotaPublica
  pages/                 # Entrar, Cadastro, Inicio (placeholder), EmBreve
public/                  # ícones do PWA
vite.config.ts           # React, Tailwind, PWA (manifest com shortcut para /lancar)
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

## Fases

- [x] Fase 1 — Setup Vite/React/TS/Tailwind/PWA, `.env.example`, login por email/senha
- [x] Fase 2 — Migrations SQL + RLS + triggers + seed (entregues para revisão)
- [ ] Fase 3 — `calcularParcelas()` + helpers de timezone com testes
- [ ] Fase 4 — Onboarding + convite + cartões
- [ ] Fase 5 — Telas Lançar e Início
- [ ] Fase 6 — Recorrências, orçamentos, Edge Function mensal
- [ ] Fase 7 — Análise, KPIs, CSV
- [ ] Fase 8 — Realtime, refino mobile, deploy

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
