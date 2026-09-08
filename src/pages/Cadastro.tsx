import { useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { traduzErro } from '../lib/erros'
import { Campo } from '../components/Campo'
import { Botao } from '../components/Botao'
import { senhaValida } from '../lib/senha'

export function Cadastro() {
  const { cadastrar } = useAuth()
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [aguardandoEmail, setAguardandoEmail] = useState(false)

  async function enviar() {
    if (ocupado) return
    setErro(null)
    if (!nome.trim()) return setErro('Informe seu nome.')
    if (!email.trim()) return setErro('Informe seu email.')
    if (!senhaValida(senha)) return setErro('A senha precisa ter pelo menos 8 caracteres, com letras e números.')
    if (senha !== confirmacao) return setErro('As senhas não conferem.')

    setOcupado(true)
    try {
      const { precisaConfirmar } = await cadastrar(nome, email, senha)
      if (precisaConfirmar) setAguardandoEmail(true)
      else navigate('/', { replace: true })
    } catch (e) {
      setErro(traduzErro((e as Error).message))
    } finally {
      setOcupado(false)
    }
  }

  function aoTeclar(e: KeyboardEvent) {
    if (e.key === 'Enter') void enviar()
  }

  if (aguardandoEmail) {
    return (
      <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10 text-center">
        <h1 className="text-2xl font-bold">Confirme seu email</h1>
        <p className="mt-3 text-zinc-400">
          Enviamos um link para <span className="text-zinc-200">{email}</span>. Abra o link para ativar
          sua conta e depois volte para entrar.
        </p>
        <Link to="/entrar" className="mt-8">
          <Botao variante="secundario">Ir para o login</Botao>
        </Link>
      </main>
    )
  }

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">Criar conta</h1>
        <p className="mt-1 text-zinc-400">Leva menos de um minuto</p>
      </div>

      <div className="space-y-4" onKeyDown={aoTeclar}>
        <Campo
          id="nome"
          rotulo="Seu nome"
          autoComplete="given-name"
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Campo
          id="email"
          rotulo="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Campo
          id="senha"
          rotulo="Senha"
          type="password"
          autoComplete="new-password"
          placeholder="mínimo 8 caracteres, letras e números"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Campo
          id="confirmacao"
          rotulo="Confirme a senha"
          type="password"
          autoComplete="new-password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />

        {erro && (
          <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {erro}
          </p>
        )}

        <Botao onClick={enviar} ocupado={ocupado}>
          Criar conta
        </Botao>
      </div>

      <p className="mt-8 text-center text-sm text-zinc-400">
        Já tem conta?{' '}
        <Link to="/entrar" className="font-semibold text-emerald-400">
          Entrar
        </Link>
      </p>
    </main>
  )
}
