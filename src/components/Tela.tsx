import type { ReactNode } from 'react'

/** Container padrão de uma aba: cabeçalho + conteúdo com espaço para a barra inferior. */
export function Tela({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <main className="safe-top mx-auto min-h-dvh max-w-md px-5 pb-24 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{titulo}</h1>
        {acao}
      </header>
      {children}
    </main>
  )
}

export function Cartao({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={'rounded-2xl border border-zinc-800 bg-zinc-900 p-4 ' + className}>{children}</section>
}

export function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'info' | 'ok'; children: ReactNode }) {
  const cor = { erro: 'bg-red-500/10 text-red-300', info: 'bg-zinc-800 text-zinc-300', ok: 'bg-emerald-500/10 text-emerald-300' }[tipo]
  return <p role={tipo === 'erro' ? 'alert' : undefined} className={'rounded-xl px-4 py-3 text-sm ' + cor}>{children}</p>
}
