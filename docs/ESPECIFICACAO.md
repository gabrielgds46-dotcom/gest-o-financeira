# PROMPT — App de Gestão Financeira do Casal (v2)

> Cole isso inteiro na primeira mensagem do Claude Code, dentro de uma pasta vazia.

---

## Contexto

Aplicativo web de gestão financeira para um casal (Heloisa e Gabriel).
Uso primário: **celular**. Instalável como PWA (ícone na home, tela cheia).
Dados persistidos na nuvem, sincronizando entre os dois aparelhos.

Cada pessoa tem uma visão **pessoal** (privada) e as duas compartilham uma visão
**compartilhada** (do casal).

Não construa tudo de uma vez. Siga as fases no fim deste documento e **pare ao fim de cada
fase** para eu validar.

---

## Stack obrigatória

- **Front:** Vite + React + TypeScript + Tailwind CSS
- **Backend/DB:** Supabase (Auth + Postgres + RLS + Realtime)
- **Gráficos:** Recharts
- **Datas:** date-fns + date-fns-tz, locale pt-BR
- **Testes:** Vitest
- **Deploy:** Vercel
- **PWA:** vite-plugin-pwa

Tudo em **pt-BR**: labels, erros, moeda (R$ 1.234,56), datas (dd/MM/yyyy).

---

## ⚠️ Regra transversal: fuso horário

**Leia isto antes de escrever qualquer código de data.**

O Supabase grava em UTC; o Brasil é UTC−3. Um lançamento feito às 22h do dia 30 vira dia 1º
do mês seguinte em UTC. Se o fechamento do cartão for dia 30, essa compra pula uma fatura
inteira e todos os indicadores derivados ficam errados.

Regras:

1. `data_compra`, `competencia` e `vencimento` são **`date`**, nunca `timestamptz`.
2. O front nunca usa `new Date()` cru para derivar "hoje". Existe um único helper
   `hojeLocal()` que resolve a data em `America/Sao_Paulo`.
3. Toda formatação e parse de data passa por `date-fns-tz` com timezone explícito.
4. `created_at` pode ser `timestamptz` — é auditoria, não entra em cálculo.
5. Teste obrigatório: lançamento às 23h00 do último dia do mês deve permanecer naquele mês.

---

## Modelo de dados

Gere migrations SQL versionadas. Use `@supabase/supabase-js` direto, sem ORM.

### `households`
`id uuid PK` · `nome text` · `codigo_convite text unique` · `codigo_expira_em timestamptz`

### `profiles`
| campo | tipo | obs |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| nome | text | |
| household_id | uuid FK nullable | nulo até entrar num household |
| salario_base | numeric | líquido mensal |
| dia_recebimento | int | |
| dia_vencimento_contas | int | |

**Não** há dados de cartão aqui — ver tabela `cartoes`.

### `household_members`
`household_id FK` · `user_id FK` · `percentual_rateio numeric default 50`

Constraint: a soma de `percentual_rateio` por household deve ser 100. Valide via trigger.

### `cartoes`
| campo | tipo | obs |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid FK | |
| apelido | text | "Nubank", "Itaú Gabriel" |
| dia_fechamento | int | |
| dia_vencimento | int | |
| limite | numeric nullable | |
| ativo | bool | default true |

Um casal tem vários cartões, cada um com datas próprias. O motor de competência depende
dessas duas datas — por isso elas vivem aqui, não no perfil.

### `categorias`
Seed fixo: `slug`, `nome`, `icone`, `cor`, `grupo`.

`alimentacao`, `transporte`, `custos_fixos`, `entretenimento`, `lazer`, `beleza` → grupo `despesa`
`investimento`, `poupanca` → grupo `reserva`

Reserva **não** é gasto: não entra no denominador de "% dos custos". Entra no indicador de
destinação de renda.

### `lancamentos`
| campo | tipo | obs |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid FK | quem registrou |
| household_id | uuid FK nullable | |
| escopo | enum | `pessoal` \| `compartilhado` |
| metodo | enum | `credito` \| `a_vista` |
| cartao_id | uuid FK nullable | **obrigatório** se `metodo = credito` |
| categoria_id | FK | |
| natureza | enum | `saida` \| `resgate` — default `saida` |
| descricao | text | observação livre |
| valor_total | bigint | **em centavos** |
| data_compra | date | |
| parcelas_total | int | default 1 |
| pago_por | uuid FK | relevante no escopo compartilhado |
| recorrencia_id | uuid FK nullable | preenchido se gerado automaticamente |
| cancelado_em | timestamptz nullable | soft delete |
| created_at | timestamptz | |

**Sobre os dois macros:** o pedido original era "cartão" e "pix ou débito". Os nomes no banco
são `credito` e `a_vista` porque o que separa os dois grupos não é a maquininha — é *quando o
dinheiro sai*. Crédito posterga e parcela; Pix, débito, dinheiro, boleto e débito automático
saem na hora. Boleto da faculdade e conta de luz caem em `a_vista`. Na UI, exiba os rótulos
como **"Cartão de crédito"** e **"Pix / Débito"**.

`natureza = resgate` cobre saque da poupança e resgate de investimento: entra como entrada de
caixa e reduz o saldo acumulado da reserva.

### `parcelas`
Geradas no insert do lançamento — uma linha por parcela, mesmo com N=1.

`id` · `lancamento_id FK` · `numero int` · `valor bigint` (centavos) ·
`competencia date` (1º dia do mês da fatura) · `vencimento date` ·
`status enum (pendente | pago | cancelado)` · `pago_em date nullable`

### `receitas`
`id` · `owner_id FK` · `escopo enum` · `tipo enum (salario | extra)` · `valor bigint` ·
`competencia date` · `descricao text` · `recorrencia_id FK nullable`

O salário do perfil gera automaticamente a receita `salario` de cada mês, **editável** naquele
mês (comissão, hora extra, mês de férias). Editar um mês não altera o `salario_base`.

### `recorrencias`
| campo | tipo | obs |
|---|---|---|
| id | uuid PK | |
| owner_id / household_id / escopo | | |
| tipo | enum | `despesa` \| `receita` |
| categoria_id | FK nullable | |
| metodo / cartao_id | | |
| descricao | text | |
| valor | bigint | valor esperado |
| dia_vencimento | int | |
| ativo | bool | |
| inicio / fim | date nullable | |

Aluguel, faculdade, luz, streaming, academia. Geradas automaticamente na virada do mês, com
status `pendente` e valor esperado — editável quando a conta real chega.

**Idempotência:** unique em `(recorrencia_id, competencia)`. A geração roda via Edge Function
agendada **e** também no primeiro acesso do mês (fallback, caso o cron falhe), e nunca pode
duplicar.

### `orcamentos`
`id` · `owner_id / household_id` · `escopo` · `categoria_id FK` · `valor_mensal bigint` ·
`vigente_desde date`

Teto mensal por categoria. Sem isso o app é relatório; com isso é ferramenta.

### `acertos`
`id` · `household_id` · `de_user_id` · `para_user_id` · `valor bigint` · `data date` ·
`descricao`

Quitação do saldo entre o casal. Sem esta tabela o saldo acumula para sempre e o número perde
o sentido depois do segundo mês.

### `meses_fechados`
`id` · `escopo` · `owner_id / household_id` · `competencia date` · `fechado_em timestamptz`

Fechamento é **manual e reversível**, não automático. Ver seção "Fechamento mensal".

---

## Regra de negócio crítica: motor de competência

**É o coração do app. Função pura, isolada, sem dependência de banco nem de relógio, coberta
por testes antes de qualquer UI.**

```ts
calcularParcelas({
  dataCompra: Date,      // date-only, timezone local
  valorTotalCentavos: number,
  parcelasTotal: number,
  metodo: 'credito' | 'a_vista',
  diaFechamento?: number,
  diaVencimento?: number,
}): Array<{ numero, valorCentavos, competencia, vencimento }>
```

**1. Se `metodo = a_vista`:** competência = 1º dia do mês de `dataCompra`;
vencimento = `dataCompra`; sempre 1 parcela.

**2. Se `metodo = credito`:**
- Fechamento do mês da compra = `diaFechamento` daquele mês.
- `dataCompra <= fechamento` → fatura do **mês corrente**.
- `dataCompra > fechamento` → fatura do **mês seguinte**.
- Parcela `k` (1..N): competência = mês-base + (k−1) meses.
- Vencimento = `diaVencimento` aplicado à competência. **Se `diaVencimento < diaFechamento`,
  o vencimento cai no mês seguinte ao da competência** (fecha 28, vence 5 → fatura de
  setembro vence em 05/10).

**3. Casos de borda com teste obrigatório:**
- Dia inexistente no mês: fechamento 31 em fevereiro → último dia do mês.
- Divisão de centavos: total 119.999 centavos em 12x → 11 de 10.000 e a última de 9.999.
  **A soma das parcelas é sempre exatamente igual ao total.**
- Compra exatamente no dia do fechamento → fatura corrente.
- Compra às 23h do último dia do mês → permanece no mês (teste de timezone).
- Vencimento dia 31 num mês de 30 dias.
- Parcelamento que cruza o ano (nov/2026 em 6x → abr/2027).

---

## Row Level Security

Políticas no Postgres. Nenhuma query do front pode depender de filtro manual para segurança.

- **Escopo `pessoal`** (`lancamentos`, `receitas`, `orcamentos`): apenas `owner_id = auth.uid()`.
- **Escopo `compartilhado`**: qualquer membro do mesmo `household_id` pode ler **e editar**.
  Se a Heloisa lançar o mercado errado, o Gabriel corrige — sem pedir licença.
- **`cartoes`**: dono edita; o parceiro **lê** apelido e datas (necessário para ver a fatura
  compartilhada). Limite só o dono vê.
- **`parcelas`**: herda a permissão do lançamento pai.
- **`profiles`**: cada um edita o próprio.

### Visibilidade de renda — decisão explícita

O parceiro **vê o valor total da renda** do outro, mas **não vê os lançamentos pessoais** dele.

Isso não é detalhe de privacidade, é dependência funcional: o rateio proporcional e o KPI
consolidado do casal são impossíveis de calcular sem as duas rendas. A linha fica entre
*quanto entra* (compartilhado) e *no que cada um gasta o próprio dinheiro* (privado).

Implemente via view `v_renda_household` que expõe só o agregado por pessoa, sem detalhe de
lançamento.

---

## Onboarding e convite

Sem isso, a Heloisa cria a conta e cai num household vazio — duas ilhas de dados, zero visão
compartilhada.

1. Primeiro usuário: cadastro → cria household → define nome, salário, cartões.
2. Gera **código de convite de 6 caracteres**, válido por 7 dias, exibido com botão de
   compartilhar.
3. Segundo usuário: cadastro → tela "Tenho um convite" → digita o código → entra no mesmo
   household.
4. Definem juntos o `percentual_rateio` (default 50/50; opção de proporcional à renda, que o
   app calcula e sugere).
5. Só depois disso o escopo Compartilhado fica ativo.

---

## Telas

Bottom tab bar fixa, 4 abas. Alvos de toque ≥ 44px. `env(safe-area-inset-bottom)` respeitado
(notch do iPhone). Modo escuro por padrão.

### 1. Início
- Seletor de mês (← → com o mês em destaque).
- Alternador **Pessoal / Compartilhado** no topo, refletindo em toda a tela.
- Cards: **Renda**, **Gasto**, **Sobra**, **Taxa de poupança**.
- **A vencer** — parcelas e contas dos próximos 7 dias, ordenadas por data, badge de dias
  restantes, cor de alerta com ≤ 2 dias, botão "pago" na própria linha.
- **Orçamento do mês** — barras por categoria com consumo vs teto.
- No escopo compartilhado: linha de **saldo entre o casal** com botão "registrar acerto".

### 2. Lançar
Formulário curto, otimizado pro polegar:
- Valor primeiro, teclado numérico (`inputmode="decimal"`), máscara de moeda, foco automático.
- Escopo: Pessoal / Compartilhado (toggle).
- Método: Cartão de crédito / Pix-Débito (toggle grande).
- Se crédito: seletor de cartão (pula se só houver um ativo).
- Categoria: **grid de ícones**, nunca dropdown.
- Descrição livre, com **sugestão de categoria** baseada em lookup no histórico de descrições
  (digitou "iFood" → sugere alimentação). Lookup simples, sem IA.
- Data (default: hoje, via `hojeLocal()`).
- Parcelas (só se crédito). Prévia em tempo real, obrigatória:
  *"12x de R$ 99,99 — de out/2026 a set/2027"*.
- Se compartilhado: quem pagou.
- Alerta inline se o lançamento estourar o orçamento da categoria.
- Botões visíveis: **"+ Renda extra"** e **"Repetir último"**.

### 3. Análise
Com alternador Pessoal / Compartilhado / Consolidado:
- Donut de **% por categoria** + lista com valor e percentual.
- Barra empilhada **Crédito vs À vista**.
- **Evolução 6 meses** (renda vs gasto).
- **Comprometimento futuro** — barras dos próximos 12 meses com a soma das parcelas
  pendentes. É o indicador mais importante do app: mostra quanto do salário futuro já foi
  vendido.
- **Limite comprometido por cartão** (parcelas futuras ÷ limite).
- Botão **Exportar CSV** (mês ou ano).

### 4. Perfil
Salário, dia de recebimento, vencimento das contas fixas · gestão de **cartões** ·
**orçamentos** por categoria · **recorrências** · percentual de rateio · código de convite ·
exportar dados · sair.

---

## KPIs

Calcule em views ou RPC no Postgres, não no front.

1. `% por categoria` = gasto da categoria ÷ gasto total do mês (grupo `despesa` apenas).
2. `Taxa de poupança` = (investimento + poupança − resgates) ÷ renda total.
3. `Sobra` = renda − despesas − reservas.
4. `Comprometimento futuro` = parcelas pendentes por mês, 12 meses à frente.
5. `Comprometimento do mês` = parcelas do mês ÷ renda do mês. Alerta acima de 30%.
6. `Aderência ao orçamento` = realizado ÷ teto, por categoria.
7. `Saldo entre o casal` = (pago por cada um no compartilhado) − (devido pelo rateio) −
   (acertos já registrados). Exibir em uma linha: *"Gabriel deve R$ 240,00 à Heloisa"*.

---

## Fechamento mensal

Fechamento é **manual e reversível** — não automático por "todas as parcelas pagas". Se uma
conta atrasa, o mês não pode ficar refém.

- Botão "fechar mês" na tela Início, habilitado a partir do dia 1º do mês seguinte.
- Mês fechado fica somente leitura, com selo visual, navegável no histórico.
- Botão "reabrir" sempre disponível (lançamento esquecido acontece).
- **Nada é apagado, nunca.**

## Cancelamento e estorno

Compra cancelada, devolução ou quitação antecipada: as parcelas futuras viram
`status = cancelado`; as já pagas permanecem intactas.

**Nunca delete parcela de mês fechado** — isso alteraria o histórico retroativamente e
destruiria a rastreabilidade. Marca-se, não se apaga. Delete físico só é permitido em
lançamento do mês corrente, ainda não pago e ainda não fechado.

---

## Fases de execução

**Pare ao fim de cada fase e me mostre o resultado.**

- **Fase 1** — Setup: Vite + React + TS + Tailwind + PWA rodando. Projeto Supabase,
  `.env.example`. Login por email/senha funcionando.
- **Fase 2** — Migrations SQL completas + RLS + triggers + seed de categorias.
  **Me entregue o SQL para eu revisar antes de rodar.**
- **Fase 3** — `calcularParcelas()` + helpers de timezone, com todos os testes Vitest
  passando, incluindo os casos de borda. **Ainda sem UI.**
- **Fase 4** — Onboarding + convite + cadastro de cartões. Dois usuários no mesmo household.
- **Fase 5** — Tela Lançar + Início, gravando e lendo do Supabase.
- **Fase 6** — Recorrências, orçamentos e a Edge Function de geração mensal (com teste de
  idempotência).
- **Fase 7** — Tela Análise, KPIs, exportação CSV.
- **Fase 8** — Realtime, refino mobile, shortcut do PWA, deploy na Vercel.

---

## Restrições

- Valores monetários: `bigint` em **centavos** no banco e inteiros no JS. **Nunca float.**
  Formatação só na borda da UI.
- Datas: seguir a seção de fuso horário à risca.
- Nada de `<form>` com submit nativo — use handlers de evento.
- Nenhuma chave do Supabase hardcoded; só variável de ambiente.
- Todo texto de UI em pt-BR.
- Shortcut no manifest do PWA: segurar o ícone abre direto em "Lançar".
- **Fora de escopo nesta versão:** anexo de foto de comprovante, integração bancária/Open
  Finance, multi-moeda, metas de longo prazo. Não implemente.
