import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Auth = {
  user: User | null
  session: Session | null
  carregando: boolean
  entrar: (email: string, senha: string) => Promise<void>
  cadastrar: (nome: string, email: string, senha: string) => Promise<{ precisaConfirmar: boolean }>
  sair: () => Promise<void>
}

const AuthContext = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function entrar(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    if (error) throw error
  }

  async function cadastrar(nome: string, email: string, senha: string) {
    // `nome` vai em raw_user_meta_data; o trigger on_auth_user_created
    // (001_schema.sql) usa esse campo para criar a linha em profiles.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: { nome: nome.trim() } },
    })
    if (error) throw error
    // Com confirmação de email ligada no Supabase, session vem nula.
    return { precisaConfirmar: !data.session }
  }

  async function sair() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, session, carregando, entrar, cadastrar, sair }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
