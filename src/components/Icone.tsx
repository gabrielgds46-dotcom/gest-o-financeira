// Ícones inline (Lucide, MIT) para não carregar uma biblioteca inteira.
const CAMINHOS: Record<string, string> = {
  inicio: 'M3 10.5 12 3l9 7.5V21H3z M9 21v-6h6v6',
  lancar: 'M12 5v14 M5 12h14',
  analise: 'M3 3v18h18 M7 14l4-4 4 4 5-6',
  perfil: 'M20 21a8 8 0 0 0-16 0 M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  cartao: 'M3 6h18v12H3z M3 10h18',
  compartilhar: 'M4 12v8h16v-8 M12 3v13 M8 7l4-4 4 4',
  copiar: 'M9 9h11v11H9z M5 15H4V4h11v1',
  check: 'M5 13l4 4L19 7',
  seta: 'M9 6l6 6-6 6',
  voltar: 'M15 6l-6 6 6 6',
  fechar: 'M6 6l12 12 M18 6L6 18',
  casal: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M22 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8',
  chave: 'M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8-7.8 5.5 5.5 0 0 1 7.8 7.8zm0 0L15 9m0 0 3 3 3-3-3-3',
  sair: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  editar: 'M12 20h9 M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z',
  alerta: 'M12 9v4 M12 17h.01 M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  calendario: 'M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4',
  esquerda: 'M15 18l-6-6 6-6',
  direita: 'M9 18l6-6-6-6',
  cadeado: 'M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4',
  repetir: 'M17 2l4 4-4 4 M3 11V8a2 2 0 0 1 2-2h16 M7 22l-4-4 4-4 M21 13v3a2 2 0 0 1-2 2H3',
  mais: 'M12 5v14 M5 12h14',
  lixeira: 'M4 7h16 M10 11v6 M14 11v6 M5 7l1 13h12l1-13 M9 7V4h6v3',
  desfazer: 'M3 7v6h6 M3 13a9 9 0 1 0 3-7.7L3 8',
  bloqueado: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M5 5l14 14',
  // categorias (slug -> ícone do seed)
  utensils: 'M3 2v7a3 3 0 0 0 6 0V2 M6 2v20 M18 2c-2 2-3 5-3 8v2h3v10',
  car: 'M5 17h14 M3 12l2-5h14l2 5v5H3z M7 17v2 M17 17v2 M7 13h.01 M17 13h.01',
  receipt: 'M4 2h16v20l-3-2-3 2-2-2-2 2-3-2-3 2z M8 8h8 M8 12h8 M8 16h5',
  clapperboard: 'M3 9h18v12H3z M3 9l2-5h14l2 5 M8 4l2 5 M13 4l2 5',
  palmtree: 'M12 22V9 M12 9c-3-4-7-4-9-1 4-1 7 1 9 1 M12 9c3-4 7-4 9-1-4-1-7 1-9 1 M12 9c-1-4 1-7 4-7-2 2-3 5-4 7 M12 9c1-4-1-7-4-7 2 2 3 5 4 7',
  sparkles: 'M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z M19 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1z M5 15l1 2 2 1-2 1-1 2-1-2-2-1 2-1z',
  'trending-up': 'M3 17l6-6 4 4 8-8 M15 7h6v6',
  // disponíveis para as categorias criadas pelo casal (ver conteudo/catalogo.ts)
  casa: 'M3 10.5 12 3l9 7.5V21H3z',
  pet: 'M5 14c-1.5 0-2.5-1.3-2.5-2.8S3.5 8.5 5 8.5 7.5 9.7 7.5 11.2 6.5 14 5 14z M19 14c-1.5 0-2.5-1.3-2.5-2.8s1-2.7 2.5-2.7 2.5 1.2 2.5 2.7S20.5 14 19 14z M9 8.5C7.9 8.5 7 7.3 7 5.8S7.9 3 9 3s2 1.3 2 2.8S10.1 8.5 9 8.5z M15 8.5c-1.1 0-2-1.2-2-2.7S13.9 3 15 3s2 1.3 2 2.8-.9 2.7-2 2.7z M12 12c3 0 5 2.5 5 5a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4c0-2.5 2-5 5-5z',
  saude: 'M12 21s-8-4.9-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 3.5C20 16.1 12 21 12 21z',
  presente: 'M3 11h18v10H3z M3 7h18v4H3z M12 7v14 M12 7C10 7 7.5 6.5 7.5 4.8 7.5 3.8 8.3 3 9.3 3 11 3 12 5.5 12 7z M12 7c2 0 4.5-.5 4.5-2.2 0-1-.8-1.8-1.8-1.8C13 3 12 5.5 12 7z',
  educacao: 'M12 3 1 9l11 6 9-4.9V17 M5 12.5V18c0 1.7 3.1 3 7 3s7-1.3 7-3v-5.5',
  academia: 'M4 9v6 M7 6v12 M17 6v12 M20 9v6 M7 12h10',
  mercado: 'M3 4h2l2.5 11h10L20 7H6 M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z M17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  cafe: 'M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z M17 9h2a2.5 2.5 0 0 1 0 5h-2 M7 2v3 M11 2v3',
  roupa: 'M9 3 4 6l2 4 2-1v12h8V9l2 1 2-4-5-3a3 3 0 0 1-6 0z',
  celular: 'M7 2h10v20H7z M10 18h4',
  ferramenta: 'M14.7 6.3a4 4 0 0 0 5.3 5.3L21 10l-7 7-7 7-3-3 7-7 7-7z M14.7 6.3 12 3.6l2-2 3.6 1.4z',
  viagem: 'M10.2 2.4a1.8 1.8 0 0 1 3.6 0V9l8 4.6v2.4l-8-2.2v4.3l2.5 1.9v1.5L12 20.9l-4.3.6v-1.5l2.5-1.9v-4.3L2 16v-2.4L10.2 9z',
  bebe: 'M9 2h6 M10 2v3L8 7.5V20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7.5L14 5V2 M8 12h8',
  musica: 'M9 18V5l12-2v13 M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  jogo: 'M6 12h4 M8 10v4 M15 11h.01 M18 13h.01 M7 7h10a5 5 0 0 1 0 10H7A5 5 0 0 1 7 7z',
  'piggy-bank': 'M5 11a6 6 0 0 1 6-5h4a5 5 0 0 1 5 5v1l2 1v3l-2 1v1h-3l-1 2h-2l-1-2H9l-1 2H6l-1-3a6 6 0 0 1 0-6z M15 11h.01 M2 10v3',
}

export type NomeIcone = keyof typeof CAMINHOS

export function Icone({ nome, tamanho = 22, className = '' }: { nome: NomeIcone; tamanho?: number; className?: string }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={CAMINHOS[nome]} />
    </svg>
  )
}
