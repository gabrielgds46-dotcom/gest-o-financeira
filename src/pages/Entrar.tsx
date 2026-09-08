import { useState, type KeyboardEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { traduzErro } from '../lib/erros'
import { Campo } from '../components/Campo'
import { Botao } from '../components/Botao'

export function Entrar() {
  const { entrar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const destino = (location.state as { de?: string } | null)?.de ?? '/'

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function enviar() {
    if (ocupado) return
    setErro(null)
    if (!email.trim() || !senha) {
      setErro('Preencha email e senha.')
      return
    }
    setOcupado(true)
    try {
      await entrar(email, senha)
      navigate(destino, { replace: true })
    } catch (e) {
      setErro(traduzErro((e as Error).message))
    } finally {
      setOcupado(false)
    }
  }

  // Sem <form> com submit nativo: Enter dispara o handler manualmente.
  function aoTeclar(e: KeyboardEvent) {
    if (e.key === 'Enter') void enviar()
  }

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-10 text-center">
        <img src="/favicon.svg" alt="" className="mx-auto mb-4 h-16 w-16" />
        <h1 className="text-2xl font-bold">Finanças do Casal</h1>
        <p className="mt-1 text-zinc-400">Entre para continuar</p>
      </div>

      <div className="space-y-4" onKeyDown={aoTeclar}>
        <Campo
          id="email"
          rotulo="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Campo
          id="senha"
          rotulo="Senha"
          type="password"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        {erro && (
          <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {erro}
          </p>
        )}

        <Botao onClick={enviar} ocupado={ocupado}>
          Entrar
        </Botao>
      </div>

      <p className="mt-8 text-center text-sm text-zinc-400">
        Ainda não tem conta?{' '}
        <Link to="/cadastro" className="font-semibold text-emerald-400">
          Criar conta
        </Link>
      </p>
    </main>
  )
}
