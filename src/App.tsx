import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PerfilProvider } from './contexts/PerfilContext'
import { VisaoProvider } from './contexts/VisaoContext'
import { RotaComCasa, RotaProtegida, RotaPublica } from './components/RotaProtegida'
import { Entrar } from './pages/Entrar'
import { Cadastro } from './pages/Cadastro'
import { Comecar } from './pages/Comecar'
import { Inicio } from './pages/Inicio'
import { Lancar } from './pages/Lancar'
import { Perfil } from './pages/Perfil'
import { Carregando } from './components/Carregando'
import { Avisos } from './components/Avisos'

// Recharts é pesado (~700 kB). Carregar a Análise sob demanda mantém o
// primeiro acesso leve no celular, que é o uso principal do app.
const Analise = lazy(() => import('./pages/Analise').then((m) => ({ default: m.Analise })))

export default function App() {
  return (
    <BrowserRouter>
      <Avisos />
      <AuthProvider>
        <PerfilProvider>
          <VisaoProvider>
          <Routes>
            <Route element={<RotaPublica />}>
              <Route path="/entrar" element={<Entrar />} />
              <Route path="/cadastro" element={<Cadastro />} />
            </Route>

            <Route element={<RotaProtegida />}>
              <Route path="/comecar" element={<Comecar />} />
              <Route element={<RotaComCasa />}>
                <Route path="/" element={<Inicio />} />
                <Route path="/lancar" element={<Lancar />} />
                <Route path="/analise" element={<Suspense fallback={<Carregando />}><Analise /></Suspense>} />
                <Route path="/perfil" element={<Perfil />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </VisaoProvider>
        </PerfilProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
