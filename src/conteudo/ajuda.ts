// =============================================================
// O conteúdo da Ajuda.
//
// Regra: só entra aqui o que o app REALMENTE faz hoje. Ajuda que
// descreve um botão inexistente é pior que ajuda nenhuma — a pessoa
// procura, não acha, e passa a desconfiar do resto do texto.
//
// `*trecho*` vira negrito (ver FolhaAjuda). O `{par}` é trocado pelo
// primeiro nome do par, ou por "seu par" quando ainda não há ninguém.
// =============================================================
import type { NomeIcone } from '../components/Icone'

export type SecaoAjuda = {
  id: string
  titulo: string
  icone: NomeIcone
  cor: string
  /** Para a busca pegar sinônimos que não estão no texto. */
  termos: string[]
  passos: string[]
}

export const SECOES_AJUDA: SecaoAjuda[] = [
  {
    id: 'lancar',
    titulo: 'Lançar um gasto',
    icone: 'mais',
    cor: '#2FD399',
    termos: ['gasto', 'compra', 'despesa', 'valor', 'parcela', 'parcelamento', 'pix', 'débito'],
    passos: [
      'Toque no *+* verde no Início, ou na aba *Lançar*.',
      'Digite o *valor*. O teclado começa pelos centavos: 1 2 3 4 vira R$ 12,34.',
      'Escolha *Pessoal* ou *Compartilhado*. O compartilhado entra no rateio de vocês.',
      'Toque na *categoria*. Se você escrever "iFood" na descrição, o app já sugere Alimentação sozinho.',
      'No crédito, escolha o *cartão* e o número de parcelas. Aparece a prévia: "12x de R$ 99,99 — de out/2026 a set/2027".',
      '*Repetir último* no canto de cima copia o lançamento anterior inteiro, para o que você lança todo dia.',
    ],
  },
  {
    id: 'corrigir',
    titulo: 'Corrigir ou apagar',
    icone: 'editar',
    cor: '#F0A83C',
    termos: ['editar', 'excluir', 'apagar', 'errei', 'erro', 'cancelar', 'desfazer'],
    passos: [
      'Toque no lançamento em qualquer lista para abrir o detalhe.',
      '*Editar* muda valor, categoria, data e descrição. Mudar o valor recalcula as parcelas que ainda não venceram.',
      'Se alguma parcela já foi paga, só o valor muda — data, método e cartão ficam travados. Parcela paga é histórico e não se mexe.',
      '*Cancelar o que falta* serve para compra devolvida ou quitada: zera o que resta e preserva o que já foi pago.',
      '*Excluir* some com tudo, e só aparece enquanto nenhuma parcela foi paga e o mês está aberto.',
      'Errou? Toda ação mostra *Desfazer* por alguns segundos. O app não pergunta "tem certeza" em lugar nenhum.',
    ],
  },
  {
    id: 'casal',
    titulo: 'Dividir com {par}',
    icone: 'casal',
    cor: '#5B9CF5',
    termos: ['rateio', 'dividir', 'acerto', 'deve', 'saldo', 'compartilhado', 'convite'],
    passos: [
      'Um gasto *Compartilhado* é dividido pelo rateio de vocês, que fica no Perfil.',
      'Quem pagou não importa na hora: o app acumula e mostra "{par} deve R$ X a você".',
      'Quando um pagar o outro, toque em *Registrar acerto* para zerar a conta.',
      'Seus gastos *Pessoais* continuam invisíveis para {par}, e os de {par} para você. Isso vale no banco, não só na tela.',
    ],
  },
  {
    id: 'visoes',
    titulo: 'As três visões',
    icone: 'analise',
    cor: '#A78BFA',
    termos: ['meu', 'casal', 'tudo', 'consolidado', 'visão', 'filtro'],
    passos: [
      '*Meu* mostra só o que é seu: sua renda pessoal e seus gastos pessoais.',
      '*Casal* mostra as contas da casa. Aqui a renda soma os salários de vocês dois, porque é o bolo inteiro que paga essas contas.',
      '*Tudo* junta os dois: sua renda pessoal mais a da casa, contra seus gastos pessoais mais os da casa.',
      'No *Tudo* a renda não inclui o salário de {par}. O app só enxerga o gasto pessoal de quem está olhando — somar os dois salários contra um gasto só deixaria o número otimista.',
    ],
  },
  {
    id: 'cartao',
    titulo: 'Cartão e faturas',
    icone: 'cartao',
    cor: '#4F92EF',
    termos: ['cartão', 'fatura', 'fechamento', 'vencimento', 'limite', 'crédito'],
    passos: [
      'Cadastre o cartão no Perfil com o *dia que fecha* e o *dia que vence*. É isso que decide em qual fatura a compra cai.',
      'Comprou até o dia do fechamento, entra na fatura deste mês. Comprou depois, vai para a próxima.',
      'Quando o vencimento é antes do fechamento, a fatura vence no mês seguinte. O app já faz essa conta.',
      'Em *Análise* você vê quanto do limite já está comprometido pelas parcelas que ainda vão vencer.',
    ],
  },
  {
    id: 'categorias',
    titulo: 'Criar categorias',
    icone: 'presente',
    cor: '#E879F9',
    termos: ['categoria', 'criar', 'ícone', 'cor', 'arquivar'],
    passos: [
      'As oito de fábrica não dão conta? Em *Perfil > Categorias*, crie as suas.',
      'Dá para criar na hora do lançamento também: o último quadrado da grade é *Nova*.',
      'Escolha o *tipo* com cuidado: *Gasto* conta no orçamento; *Reserva* é dinheiro guardado e entra na taxa de poupança. O tipo não muda depois de criada.',
      'Remover uma categoria sem uso apaga de vez. Com lançamentos, ela vira *arquivada*: some da grade mas o histórico fica inteiro.',
    ],
  },
  {
    id: 'recorrencias',
    titulo: 'Contas que se repetem',
    icone: 'repetir',
    cor: '#23B79B',
    termos: ['recorrência', 'aluguel', 'luz', 'assinatura', 'mensal', 'salário'],
    passos: [
      'Em *Perfil > Recorrências*, cadastre aluguel, luz, academia com o valor esperado e o dia.',
      'Na virada do mês elas entram sozinhas na lista, sem você fazer nada.',
      'Quando a conta real chegar diferente, abra e *corrija o valor*. Só aquele mês muda.',
      'Seu salário também entra sozinho todo mês, pelo valor que está no Perfil.',
    ],
  },
  {
    id: 'fechar',
    titulo: 'Fechar o mês',
    icone: 'cadeado',
    cor: '#98A2B3',
    termos: ['fechar', 'reabrir', 'trancar', 'mês fechado'],
    passos: [
      'A partir do dia 1 do mês seguinte aparece *Fechar mês* no Início.',
      'Mês fechado vira só leitura: ninguém altera o passado sem querer, nem você nem {par}.',
      'Esqueceu um gasto? *Reabrir* está sempre disponível. Nada é apagado.',
    ],
  },
  {
    id: 'aparelhos',
    titulo: 'Nos dois celulares',
    icone: 'compartilhar',
    cor: '#F97316',
    termos: ['sincronizar', 'celular', 'instalar', 'pwa', 'offline', 'atalho'],
    passos: [
      'O que {par} lançar aparece no seu celular sozinho, sem precisar recarregar.',
      'Dá para *instalar na tela de início*: no iPhone, Compartilhar > Adicionar à Tela de Início; no Android, o menu do navegador oferece.',
      'Instalado, o app ganha um atalho que abre direto na tela de lançar.',
      'Sem internet ele ainda abre e mostra o que já tinha carregado, mas lançar precisa de conexão.',
    ],
  },
]

/** Troca {par} pelo primeiro nome de quem divide a casa. */
export function comNomeDoPar(texto: string, nomeDoPar: string | null): string {
  return texto.replaceAll('{par}', nomeDoPar?.split(' ')[0] ?? 'seu par')
}

/** Busca simples: casa no título, nos passos e nos termos extras. */
export function buscarSecoes(secoes: SecaoAjuda[], termo: string): SecaoAjuda[] {
  const t = termo.trim().toLowerCase()
  if (t.length < 2) return secoes
  const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const alvo = semAcento(t)
  return secoes.filter((s) =>
    semAcento(s.titulo).includes(alvo) ||
    s.termos.some((x) => semAcento(x).includes(alvo)) ||
    s.passos.some((p) => semAcento(p).includes(alvo)),
  )
}
