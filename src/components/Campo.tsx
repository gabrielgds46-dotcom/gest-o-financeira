import type { InputHTMLAttributes } from 'react'

type Props = InputHTMLAttributes<HTMLInputElement> & { rotulo: string; erro?: string }

// Input padrão do app: alvo de toque ≥ 44px, sem zoom no iOS (font ≥ 16px).
export function Campo({ rotulo, erro, id, className = '', ...rest }: Props) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-300">{rotulo}</span>
      <input
        id={id}
        className={
          'h-12 w-full rounded-xl border bg-zinc-900 px-4 text-base text-zinc-100 outline-none ' +
          'placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 ' +
          (erro ? 'border-red-500' : 'border-zinc-800') +
          ' ' +
          className
        }
        {...rest}
      />
      {erro && <span className="mt-1 block text-sm text-red-400">{erro}</span>}
    </label>
  )
}
