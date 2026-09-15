import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'fantasma'
  ocupado?: boolean
}

export function Botao({ variante = 'primario', ocupado, children, className = '', disabled, ...rest }: Props) {
  const base =
    'inline-flex h-12 w-full items-center justify-center rounded-xl px-4 text-base font-semibold ' +
    'transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 '
  const estilos = {
    primario: 'bg-acao text-bg hover:bg-acao',
    secundario: 'bg-s2 text-ink hover:bg-s3',
    fantasma: 'bg-transparent text-ink-2 hover:bg-s1',
  }[variante]
  return (
    <button type="button" className={base + estilos + ' ' + className} disabled={disabled || ocupado} {...rest}>
      {ocupado ? (
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  )
}
