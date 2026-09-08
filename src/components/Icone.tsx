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
