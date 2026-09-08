import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Carregando } from './Carregando'

export function RotaProtegida() {
  const { user, carregando } = useAuth()
  const location = useLocation()
  if (carregando) return <Carregando />
  if (!user) return <Navigate to="/entrar" replace state={{ de: location.pathname }} />
  return <Outlet />
}

// Inverso: quem já está logado não vê login/cadastro.
export function RotaPublica() {
  const { user, carregando } = useAuth()
  if (carregando) return <Carregando />
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}
