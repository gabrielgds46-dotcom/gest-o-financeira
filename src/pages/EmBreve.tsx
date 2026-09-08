import { Link } from 'react-router-dom'

// Destino do shortcut do PWA (/lancar) até a tela real existir na Fase 5.
export function EmBreve({ titulo }: { titulo: string }) {
  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <p className="mt-2 text-zinc-400">Esta tela chega em uma fase seguinte.</p>
      <Link to="/" className="mt-6 font-semibold text-emerald-400">
        Voltar ao início
      </Link>
    </main>
  )
}
