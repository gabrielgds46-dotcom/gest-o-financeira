// =============================================================
// Os passos do tour, por tela.
//
// Cada passo aponta para um data-tour="..." no JSX. Passo cujo alvo não
// existe na tela é pulado sozinho (ver Tour.tsx): a tela muda conforme o
// mês, a visão e o que já foi lançado, e um tour que acende um retângulo
// vazio ensina a desconfiar do app.
// =============================================================
import type { PassoTour } from '../components/Tour'

export const PASSOS_POR_TELA: Record<string, PassoTour[]> = {
  '/': [
    {
      alvo: '[data-tour="visao"]',
      titulo: 'De quem são estes números',
      texto: 'Meu é só seu. Casal são as contas da casa. Tudo junta os dois. Tudo o que você vê abaixo muda com esta escolha.',
    },
    {
      alvo: '[data-tour="mes"]',
      titulo: 'O mês que você está olhando',
      texto: 'As setas andam no tempo. O app guarda meses futuros também, porque parcela de cartão já nasce com data marcada.',
    },
    {
      alvo: '[data-tour="hero"]',
      titulo: 'O número que importa',
      texto: 'É o que sobra depois de pagar tudo o que ainda vence neste mês. A barra mostra a renda inteira dividida: o que já saiu, o que está guardado, o que ainda vai sair e o que sobrou.',
    },
    {
      alvo: '[data-tour="lista"]',
      titulo: 'Suas contas do mês',
      texto: 'Toque no círculo para marcar como pago — e, se errar, aparece Desfazer. Toque na linha para abrir, editar ou excluir.',
    },
    {
      alvo: '[data-tour="orcamento"]',
      titulo: 'Quanto já foi de cada coisa',
      texto: 'A barra fica vermelha quando passa do teto. Os tetos ficam em Perfil, Orçamentos — e são opcionais.',
    },
    {
      alvo: '[data-tour="lancar"]',
      titulo: 'Lançar leva dez segundos',
      texto: 'Este é o botão que você mais vai usar. Valor, categoria, pronto.',
    },
  ],
  '/lancar': [
    { alvo: '[data-tour="frase"]', titulo: 'Escreva a frase inteira', texto: 'O jeito mais rápido: "mercado 187,50 no débito". O app mostra em fichas o que entendeu e preenche o formulário. Ele nunca salva sozinho — você confere antes.' },
    { alvo: '[data-tour="valor"]', titulo: 'Comece pelo valor', texto: 'O teclado começa pelos centavos: digite 1 2 3 4 e vira R$ 12,34. Sem vírgula, sem ponto.' },
    { alvo: '[data-tour="categoria"]', titulo: 'Categoria em um toque', texto: 'Grade, nunca lista suspensa. Se você escrever "iFood" na descrição, o app já sugere Alimentação. O último quadrado cria uma categoria nova.' },
    { alvo: '[data-tour="previa"]', titulo: 'A prévia antes de salvar', texto: 'No crédito o app mostra em que faturas a compra vai cair, contando o fechamento do cartão. Confira aqui antes de lançar.' },
  ],
  '/perfil': [
    { alvo: '[data-tour="cartoes"]', titulo: 'Cartões', texto: 'O dia que fecha e o dia que vence são o que decide em qual fatura cada compra cai. Sem isso, o parcelamento erra o mês.' },
    { alvo: '[data-tour="config"]', titulo: 'Recorrências, orçamentos e categorias', texto: 'Aluguel e luz entram sozinhos todo mês. Tetos avisam antes de estourar. E as categorias são suas para criar.' },
  ],
}
