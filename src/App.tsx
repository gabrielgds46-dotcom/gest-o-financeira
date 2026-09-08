import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { PerfilProvider } from './contexts/PerfilContext'
import { RotaComCasa, RotaProtegida, RotaPublica } from './components/RotaProtegida'
import { Entrar } from './pages/Entrar'
import { Cadastro } from './pages/Cadastro'
import { Comecar } from './pages/Comecar'
import { Inicio } from './pages/Inicio'
import { Perfil } from './pages/Perfil'
import { EmBreve } from './pages/EmBreve'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PerfilProvider>
          <Routes>
            <Route element={<RotaPublica />}>
              <Route path="/entrar" element={<Entrar />} />
              <Route path="/cadastro" element={<Cadastro />} />
            </Route>

            <Route element={<RotaProtegida />}>
              <Route path="/comecar" element={<Comecar />} />
              <Route element={<RotaComCasa />}>
                <Route path="/" element={<Inicio />} />
                <Route path="/lancar" element={<EmBreve titulo="Lançar" />} />
                <Route path="/analise" element={<EmBreve titulo="Análise" />} />
                <Route path="/perfil" element={<Perfil />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PerfilProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
