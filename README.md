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
  dominio/csv.ts         # CSV pt-BR (separador ;, BOM, vírgula decimal)
  dominio/exportacao.ts  # linhas do banco -> CSV de lançamentos
  lib/viz.ts             # paleta dos gráficos, validada para daltonismo
  lib/tempoReal.ts       # useTempoReal(): sincronia entre os dois aparelhos
  lib/baixar.ts          # entrega de arquivo (folha nativa no celular, download no desktop)
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
    009_analise.sql  # analise_categorias, analise_metodo, evolucao_mensal,
                     # comprometimento_futuro, limite_por_cartao, exportar_lancamentos
    010_realtime.sql # publicação Realtime das tabelas do fluxo compartilhado
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
- [x] Fase 7 — Análise (comprometimento futuro, por categoria, método, evolução, limite por cartão) e exportação CSV
- [x] Fase 8 — Realtime entre os aparelhos, refino mobile (aviso de nova versão, offline, toque) e deploy

### Melhorias

- [x] Etapa 1 — Lista do mês, folha de detalhe, edição, cancelamento, exclusão e faixa de desfazer
- [x] Etapa 2 — Categorias criadas por vocês
- [x] Etapa 3 — Layout novo e correções da auditoria de UX
- [x] Etapa 4 — Ajuda, tour e telas vazias
- [x] Etapa 5 — Lançar por frase e resumo de segunda

## Convenções

- Dinheiro é `bigint` em **centavos**. Nunca float ou numeric fracionário.
- Datas de negócio são `date` puro, nunca `timestamptz`. No front circulam como
  string `'yyyy-MM-dd'` (`DataLocal`); a conversão de instante para data acontece só
  em `paraDataLocal()` / `hojeLocal()`, com fuso `America/Sao_Paulo` explícito.
- `competencia` é sempre o dia 1 do mês de referência.
- Toda autorização vive no RLS. O front nunca depende de filtro manual para segurança.
- A regra de competência do cartão (fechamento, vencimento, parcelas) vive só no front, em `calcularParcelas()`. O SQL apenas persiste as parcelas já calculadas.
- **Parcela paga é histórico e nunca muda.** Editar um lançamento com parcela paga
  redistribui a diferença só entre as pendentes; data, método e cartão ficam travados.
  Ver `src/dominio/edicao.ts` e `011_edicao.sql` — a mesma regra nos dois lados.
- **Parcela cancelada congela o valor total.** O trigger `fn_valida_soma_parcelas`
  compara `valor_total` com a soma de *todas* as parcelas, canceladas inclusive;
  redistribuir deixaria a cancelada sobrando. Descrição e categoria seguem livres.
- **Três níveis de tinta, e só três** (`ink`, `ink-2`, `ink-3` em `index.css`).
  Medidos contra o cartão `s1`: 16,18:1 / 9,21:1 / 5,74:1. O `ink-3` substituiu
  um cinza que ficava em 3,67:1 e reprovava no AA.
- **Verde é ação e dinheiro positivo, e nada mais.** As duas pessoas da casa são
  azul (`p1`) e âmbar (`p2`), que sobrevivem a daltonismo — verde/vermelho não.
- **Três visões, não duas** (`VisaoContext`): Meu, Casal e Tudo. `Tudo` não é um
  escopo de lançamento — quem escreve (Lançar, recorrências, orçamentos) continua
  com dois valores. No Casal a renda soma os dois salários, porque a pergunta é de
  onde sai o dinheiro das contas da casa. No Tudo, **não**: o app só consegue ver o
  gasto pessoal de quem está olhando, então somar os dois salários contra um gasto
  só daria um número otimista. Ver o cabeçalho de `014_consolidado.sql`.
- **O número do topo mostra a decomposição, não um número solto.** Os quatro
  pedaços (pago, guardado, a vencer, livre) somam a renda do mês; se não
  somassem, a barra seria enfeite. Ver `components/Hero.tsx`.
- **Categoria com `household_id` null é embutida** (do seed, igual para todo mundo,
  ninguém edita); com valor, é da casa. O slug é único POR CASA, não no mundo.
  Remover é reversível: some se ninguém usou, arquiva se já tem lançamento.
- **A Ajuda só descreve o que o app faz hoje** (`conteudo/ajuda.ts`). Ajuda que
  cita um botão inexistente é pior que ajuda nenhuma: a pessoa procura, não acha,
  e passa a desconfiar do resto. Por isso o lançamento por frase não está lá — é
  da Etapa 5.
- **Passo de tour sem alvo é pulado, não mostrado vazio** (`Tour.tsx`). A tela
  muda conforme o mês, a visão e o que já foi lançado.
- **Vazio não é erro.** Cada tela vazia diz o que falta, por que está vazia, e
  oferece a ação que resolve — nunca "nenhum registro encontrado".
- **A barra de frase preenche, nunca salva** (`dominio/frase.ts`). O parser é
  deliberadamente burro: o que não reconhece vira descrição, e o que reconhece
  aparece em fichas que a pessoa confere. Errar para "não entendi" é barato;
  errar para "achei que era 3x" custa um lançamento errado que ninguém percebe.
- **O texto da notificação é domínio, não detalhe da Edge Function**
  (`dominio/mensagem.ts`). A única forma de julgar uma notificação é ler as
  várias que ela pode virar, lado a lado, num teste.
- **Nada de "tem certeza?".** Ação destrutiva acontece na hora e fica reversível por
  alguns segundos (`components/Desfazer.tsx`). Por isso `cancelar_lancamento` devolve
  os ids que ela cancelou e `excluir_lancamento` devolve um retrato completo.

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

### Sincronia entre os aparelhos

As tabelas do fluxo compartilhado publicam no Realtime (`010_realtime.sql`), e o
Realtime do Supabase respeita RLS: cada aparelho só recebe evento de linha que já
poderia ler, então nada de pessoal do parceiro trafega. `REPLICA IDENTITY FULL` é
necessário para que o payload de UPDATE e DELETE traga as colunas usadas nas
políticas; sem isso o filtro não decide e o evento não chega.

O `useTempoReal` não aplica o payload: ele só dispara a recarga das RPCs. Assim a
tela nunca diverge do banco. Eventos vêm em rajada (um lançamento de 12x gera 13
linhas), então há um agrupamento de 350ms. Voltar do segundo plano e reconectar
também recarregam, porque a aba dormindo perde eventos.

### Agendando o cron

Já está agendado: job `gerar-recorrencias`, `0 6 1 * *` (dia 1 de cada mês, 03h de
Brasília), chamando a Edge Function via `net.http_post`. Requisitos no banco:
`pg_cron` e `pg_net` instaladas (`pg_net` no schema `extensions`).

A chamada leva a chave **anon** no `Authorization`, não a secreta. A anon já é
pública (vai no bundle do app) e a Edge Function exige apenas um JWT válido; como
a geração é idempotente e não destrutiva, disparar fora de hora não causa dano, e
nenhum segredo passa a morar no banco. Para reprocessar um mês, envie no corpo
`{"competencia":"2026-10-01"}`.

## Ligando o resumo de segunda (push)

O resumo funciona dentro do app desde já — o botão "Resumo da semana" no
Início, e a folha que a notificação abre. O **push** precisa de um par de
chaves VAPID, que identifica o servidor para o serviço de notificação do
navegador. Gere o seu:

```bash
npx web-push generate-vapid-keys
```

Depois, três lugares:

1. **Vercel** (e `.env` local): `VITE_VAPID_PUBLICA=<a pública>`
2. **Supabase > Edge Functions > Secrets**: `VAPID_PUBLICA`, `VAPID_PRIVADA` e
   `VAPID_CONTATO`. A privada só vive aqui — nunca no front, nunca no banco.
   O contato tem de ser um `mailto:` de verdade e é obrigatório: é por ele que
   o serviço de push avisa se algo estiver errado do lado deles, e alguns
   recusam a entrega sem um endereço válido. A função devolve 500 com o motivo
   se faltar qualquer um dos três.
3. **Ligue o cron**, que nasce desligado justamente porque sem as chaves a
   função devolve 500 toda segunda:

```sql
select cron.alter_job((select jobid from cron.job where jobname = 'resumo-semanal'), active := true);
```

> Já está ligado neste projeto. Os passos acima valem para quem for montar
> outro do zero.

Para ver o texto que sairia, sem mandar nada a ninguém:

```bash
curl -X POST "$URL/functions/v1/resumo-semanal" \
  -H "Authorization: Bearer $ANON" -H 'Content-Type: application/json' \
  -d '{"seco": true, "ate": "2026-09-14"}'
```

No iPhone a notificação só funciona com o app **adicionado à Tela de
Início** — é limitação do Safari, e o painel em Perfil > Resumo de segunda
diz isso em vez de falhar calado.

## Decisões de visualização

O guia de dataviz foi aplicado na tela Análise, e duas escolhas merecem registro:

- **Barras horizontais no lugar do donut.** A especificação pedia um donut de %
  por categoria com uma lista ao lado. O validador de paleta reprovou qualquer
  arranjo de seis fatias: o pior par fica com ΔE 1,6 para deuteranopia, ou seja,
  indistinguível. Como as fatias de um donut são ordenadas por valor, a
  vizinhança muda todo mês e não há ordem que resolva. A forma recomendada para
  partes de um todo com nomes longos é a barra horizontal, então cada categoria
  virou uma linha com ícone, nome, valor, percentual e barra na cor dela. A
  identidade nunca depende só da cor, e no celular lê melhor.
- **Cores dos gráficos separadas das cores das categorias.** As categorias
  seguem a cor da entidade, vinda do banco. As séries dos gráficos (renda vs
  gasto, crédito vs à vista) usam `lib/viz.ts`, validado para daltonismo na
  superfície escura em todos os pares.

## Decisões registradas no linter do Supabase

O linter aponta três itens. Os dois primeiros são **intencionais**, e cada um foi
verificado no banco em vez de aceito de palavra.

**`v_cartoes_household` e `v_renda_household` como SECURITY DEFINER** (nível ERROR).
Elas burlam o RLS de propósito: `cartoes` só deixa cada um ver o próprio
(`owner_id = auth.uid()`), mas o escopo compartilhado precisa mostrar o cartão do
par — e `v_renda_household` precisa somar o salário dos dois. RLS filtra linha, não
coluna, então a exposição parcial tem de ser uma view do dono. O que segura o
isolamento é o `where ... = fn_meu_household()` de cada view. Medido:

| | vê pela view | vê na tabela |
|---|---|---|
| Gabriel (dono) | 1 cartão | 1 |
| Heloisa (mesma casa) | 1 cartão — é o ponto | **0** |
| Estranho, sem casa | **0** | 0 |

**RPCs SECURITY DEFINER executáveis por `authenticated`** (nível WARN).
`criar_household`, `entrar_household` e `gerar_codigo_convite` existem para o
onboarding e precisam escrever linhas que o chamador ainda não enxerga.
`gerar_recorrencia` é o fallback do app no primeiro acesso do mês.
`fn_sou_membro` e `fn_meu_household` são chamadas de dentro das políticas de RLS,
e o `EXECUTE` delas é **estrutural**: revogar de `authenticated` derruba o RLS
inteiro com `permission denied for function fn_sou_membro` — testado e revertido.
`anon` não executa nenhuma função.

**Proteção contra senha vazada** (nível WARN): só existe do plano Pro para cima.
Fica aberto até a conta mudar de plano.

## Rodando os testes

```bash
psql "$DATABASE_URL" -f supabase/tests/01_rls_test.sql
```
