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
  lib/senha.ts           # política de senha espelhada do Supabase
  lib/datas.ts           # DataLocal ('yyyy-MM-dd'), hojeLocal(), aritmética sem Date, formatação pt-BR
  lib/moeda.ts           # centavos <-> 'R$ 1.234,56'
  dominio/calendario.ts  # aritmética de datas, ZERO dependências (copiada para a Edge Function)
  dominio/parcelas.ts    # calcularParcelas(): motor de competência do cartão (função pura)
  dominio/recorrencias.ts # planejarRecorrencia(): o que uma recorrência gera no mês
  dominio/previa.ts      # texto "12x de R$ 99,99 — de out/2026 a set/2027"
  tipos/supabase.ts      # tipos gerados do banco (regenerar após cada migration)
  dados/                 # acesso ao Supabase: perfil/casa/membros, cartões, lançamentos/KPIs
  contexts/AuthContext   # sessão, entrar, cadastrar, sair
  contexts/PerfilContext # profile, household, membros, parceiro, recarregar()
  contexts/VisaoContext  # mês (competência) e escopo selecionados, compartilhados entre abas
  components/            # Campo, CampoMoeda, CampoDia, Alternador, Folha, BarraAbas,
                         # FormCartao, ListaCartoes, Icone, Tela, RotaProtegida/RotaComCasa/RotaPublica
  pages/                 # Entrar, Cadastro, Comecar (onboarding), Inicio, Lancar, Perfil, EmBreve (Análise)
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
    005_hardening.sql # correções pós-revisão: search_path, grants, políticas, índices
    006_rateio.sql   # RPC definir_rateio (soma 100 numa única transação)
    007_kpis.sql     # resumo_mes, gasto_por_categoria, a_vencer, garantir_salario, fn_hoje_local
    008_recorrencias.sql # gerar_recorrencia (idempotente), gerar_salarios
  functions/
    gerar-recorrencias/  # Edge Function (Deno) do cron mensal
  tests/
    01_rls_test.sql  # testes de RLS e invariantes (roda via psql como superuser)
```

## Fases

- [x] Fase 1 — Setup Vite/React/TS/Tailwind/PWA, `.env.example`, login por email/senha
- [x] Fase 2 — Migrations SQL + RLS + triggers + seed, aplicadas e revisadas no projeto (005_hardening)
- [x] Fase 3 — `calcularParcelas()` + helpers de timezone, 38 testes Vitest (passam em qualquer TZ)
- [x] Fase 4 — Onboarding (criar casa / entrar por código), dados pessoais, cartões, convite, rateio, Perfil, barra de abas
- [x] Fase 5 — Início (KPIs, a vencer, orçamento, saldo do casal, fechar mês) e Lançar (prévia de parcelas, sugestão de categoria, renda extra, repetir último)
- [x] Fase 6 — Recorrências, orçamentos e Edge Function mensal com idempotência
- [ ] Fase 7 — Análise, KPIs, CSV
- [ ] Fase 8 — Realtime, refino mobile, deploy

## Convenções

- Dinheiro é `bigint` em **centavos**. Nunca float ou numeric fracionário.
- Datas de negócio são `date` puro, nunca `timestamptz`. No front circulam como
  string `'yyyy-MM-dd'` (`DataLocal`); a conversão de instante para data acontece só
  em `paraDataLocal()` / `hojeLocal()`, com fuso `America/Sao_Paulo` explícito.
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

## Geração mensal (recorrências e salário)

A regra de competência vive só no TypeScript (`planejarRecorrencia` -> `calcularParcelas`).
O SQL apenas persiste, e o índice único `(recorrencia_id, competencia)` garante que a
mesma recorrência nunca gera duas vezes no mesmo mês. Existem dois gatilhos, e rodar
os dois é seguro:

1. **Edge Function `gerar-recorrencias`** (cron da virada do mês).
2. **Fallback no app**, no primeiro acesso a um mês (`gerarPendentes`).

Para os módulos do domínio não divergirem entre app e função, eles são copiados para
`supabase/functions/gerar-recorrencias/dominio/` e um teste (`sincronia.test.ts`)
falha se as cópias saírem de sincronia. Depois de alterar qualquer um deles:

```bash
cp src/dominio/{calendario,parcelas,recorrencias}.ts supabase/functions/gerar-recorrencias/dominio/
sed -i "s#from './calendario'#from './calendario.ts'#" supabase/functions/gerar-recorrencias/dominio/*.ts
sed -i "s#from './parcelas'#from './parcelas.ts'#" supabase/functions/gerar-recorrencias/dominio/recorrencias.ts
```

### Agendando o cron

No painel do Supabase, em **Integrations > Cron**, crie um job que chame a Edge
Function `gerar-recorrencias`. Sugestão: `0 6 1 * *` (dia 1 de cada mês, 03h de
Brasília). O painel cuida da autenticação, então a chave secreta não precisa ser
copiada para lugar nenhum. Para reprocessar um mês específico, envie no corpo
`{"competencia":"2026-10-01"}`.

## Decisões registradas no linter do Supabase

O linter de segurança ainda aponta dois itens que são **intencionais**:

- `v_cartoes_household` e `v_renda_household` como SECURITY DEFINER: é o que
  esconde o limite do cartão e o detalhe da renda do parceiro. RLS filtra linha,
  não coluna, então a exposição parcial precisa ser uma view do dono.
- RPCs SECURITY DEFINER executáveis por `authenticated` (`criar_household`,
  `entrar_household`, `gerar_codigo_convite`, `fn_sou_membro`, `fn_meu_household`):
  todas dependem de `auth.uid()` e existem justamente para o fluxo de onboarding
  e para evitar recursão de RLS. `anon` não executa nenhuma função.

## Rodando os testes

```bash
psql "$DATABASE_URL" -f supabase/tests/01_rls_test.sql
```
