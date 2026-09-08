import { useAuth } from '../contexts/AuthContext'
import { Botao } from '../components/Botao'

// Placeholder da Fase 1: confirma que o login funciona e que a sessão persiste.
// A tela real (seletor de mês, cards, a vencer, orçamento) chega na Fase 5.
export function Inicio() {
  const { user, sair } = useAuth()
  const nome = (user?.user_metadata?.nome as string | undefined) || user?.email

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <header className="mb-8">
        <p className="text-sm text-zinc-400">Olá,</p>
        <h1 className="text-2xl font-bold">{nome}</h1>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="font-semibold">Fase 1 concluída</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Login, sessão persistente e PWA estão funcionando. As próximas fases trazem o motor de
          parcelas, onboarding do casal e as telas de lançamento e análise.
        </p>
      </section>

      <div className="mt-auto pt-10">
        <Botao variante="secundario" onClick={() => void sair()}>
          Sair
        </Botao>
      </div>
    </main>
  )
}
