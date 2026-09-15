import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { rotulo: string; erro?: string }

// Input padrão do app: alvo de toque ≥ 44px, sem zoom no iOS (font ≥ 16px).
export function Campo({ rotulo, erro, id, className = '', ...rest }: Props) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-2">{rotulo}</span>
      <input
        id={id}
        className={
          'h-12 w-full rounded-xl border bg-s1 px-4 text-base text-ink outline-none ' +
          'placeholder:text-ink-3 focus:border-acao focus:ring-2 focus:ring-acao/30 ' +
          (erro ? 'border-perigo' : 'border-s2') +
          ' ' +
          className
        }
        {...rest}
      />
      {erro && <span className="mt-1 block text-sm text-perigo">{erro}</span>}
    </label>
  )
}
