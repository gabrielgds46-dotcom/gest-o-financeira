import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { buscarCasa, buscarMembros, buscarPerfil, type Casa, type Membro, type Perfil } from '../dados/perfil'

type Estado = {
  perfil: Perfil | null
  casa: Casa | null
  membros: Membro[]
  /** O parceiro (undefined enquanto o casal não está completo). */
  parceiro: Membro | undefined
  carregando: boolean
  erro: string | null
  recarregar: () => Promise<void>
}

const PerfilContext = createContext<Estado | null>(null)

export function PerfilProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [casa, setCasa] = useState<Casa | null>(null)
  const [membros, setMembros] = useState<Membro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    if (!user) {
      setPerfil(null); setCasa(null); setMembros([]); setCarregando(false)
      return
    }
    setErro(null)
    try {
      const p = await buscarPerfil(user.id)
      setPerfil(p)
      if (p?.household_id) {
        const [c, m] = await Promise.all([buscarCasa(p.household_id), buscarMembros(p.household_id)])
        setCasa(c); setMembros(m)
      } else {
        setCasa(null); setMembros([])
      }
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setCarregando(false)
    }
  }, [user])

  useEffect(() => { setCarregando(true); void recarregar() }, [recarregar])

  const parceiro = membros.find((m) => m.user_id !== user?.id)

  return (
    <PerfilContext.Provider value={{ perfil, casa, membros, parceiro, carregando, erro, recarregar }}>
      {children}
    </PerfilContext.Provider>
  )
}

export function usePerfil(): Estado {
  const ctx = useContext(PerfilContext)
  if (!ctx) throw new Error('usePerfil precisa estar dentro de <PerfilProvider>')
  return ctx
}
