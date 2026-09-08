import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePerfil } from '../contexts/PerfilContext'
import { Carregando } from './Carregando'
import { BarraAbas } from './BarraAbas'

/** Exige login. */
export function RotaProtegida() {
  const { user, carregando } = useAuth()
  const location = useLocation()
  if (carregando) return <Carregando />
  if (!user) return <Navigate to="/entrar" replace state={{ de: location.pathname }} />
  return <Outlet />
}

/** Exige login E household. Sem household, vai para o onboarding. Renderiza a barra de abas. */
export function RotaComCasa() {
  const { perfil, carregando, erro } = usePerfil()
  if (carregando) return <Carregando />
  if (erro) return <p role="alert" className="p-6 text-red-300">Erro ao carregar seu perfil: {erro}</p>
  if (!perfil?.household_id) return <Navigate to="/comecar" replace />
  return (
    <>
      <Outlet />
      <BarraAbas />
    </>
  )
}

/** Inverso: quem já está logado não vê login/cadastro. */
export function RotaPublica() {
  const { user, carregando } = useAuth()
  if (carregando) return <Carregando />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}
