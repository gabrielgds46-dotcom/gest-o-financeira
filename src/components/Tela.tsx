import type { ReactNode } from 'react'

/** Container padrão de uma aba: cabeçalho + conteúdo com espaço para a barra inferior. */
export function Tela({ titulo, subtitulo, acao, children }: { titulo: string; subtitulo?: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <main className="safe-top mx-auto min-h-dvh max-w-md px-5 pb-24 pt-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-[-0.02em]">{titulo}</h1>
          {subtitulo && <p className="text-xs font-medium text-ink-3">{subtitulo}</p>}
        </div>
        {acao}
      </header>
      {children}
    </main>
  )
}

export function Cartao({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={'rounded-2xl border border-s2 bg-s1 p-4 ' + className}>{children}</section>
}

export function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'info' | 'ok'; children: ReactNode }) {
  const cor = { erro: 'bg-perigo/10 text-perigo', info: 'bg-s2 text-ink-2', ok: 'bg-acao/10 text-acao' }[tipo]
  return <p role={tipo === 'erro' ? 'alert' : undefined} className={'rounded-xl px-4 py-3 text-sm ' + cor}>{children}</p>
}
