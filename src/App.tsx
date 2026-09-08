import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { RotaProtegida, RotaPublica } from './components/RotaProtegida'
import { Entrar } from './pages/Entrar'
import { Cadastro } from './pages/Cadastro'
import { Inicio } from './pages/Inicio'
import { EmBreve } from './pages/EmBreve'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RotaPublica />}>
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/cadastro" element={<Cadastro />} />
          </Route>

          <Route element={<RotaProtegida />}>
            <Route path="/" element={<Inicio />} />
            <Route path="/lancar" element={<EmBreve titulo="Lançar" />} />
            <Route path="/analise" element={<EmBreve titulo="Análise" />} />
            <Route path="/perfil" element={<EmBreve titulo="Perfil" />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
