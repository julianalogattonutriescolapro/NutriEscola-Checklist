import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import IndicadorConexao from './components/IndicadorConexao'
import { iniciarSincronizacaoAutomatica } from './lib/offlineQueue'

import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Perfil from './pages/Perfil'
import Dashboard from './pages/Dashboard'
import Receitas from './pages/Receitas'
import Despesas from './pages/Despesas'
import ReservaFinanceira from './pages/ReservaFinanceira'
import Calendario from './pages/Calendario'
import Alertas from './pages/Alertas'
import Relatorios from './pages/Relatorios'
import Categorias from './pages/Categorias'
import Pesquisa from './pages/Pesquisa'
import Aprovacoes from './pages/Aprovacoes'

function Protegida({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  useEffect(() => {
    iniciarSincronizacaoAutomatica()
  }, [])

  return (
    <AuthProvider>
      <BrowserRouter>
        <IndicadorConexao />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Signup />} />
          <Route path="/esqueci-senha" element={<ForgotPassword />} />
          <Route path="/redefinir-senha" element={<ResetPassword />} />

          <Route path="/" element={<Protegida><Calendario /></Protegida>} />
          <Route path="/painel" element={<Protegida><Dashboard /></Protegida>} />
          <Route path="/receitas" element={<Protegida><Receitas /></Protegida>} />
          <Route path="/despesas" element={<Protegida><Despesas /></Protegida>} />
          <Route path="/reserva" element={<Protegida><ReservaFinanceira /></Protegida>} />
          <Route path="/alertas" element={<Protegida><Alertas /></Protegida>} />
          <Route path="/relatorios" element={<Protegida><Relatorios /></Protegida>} />
          <Route path="/categorias" element={<Protegida><Categorias /></Protegida>} />
          <Route path="/pesquisa" element={<Protegida><Pesquisa /></Protegida>} />
          <Route path="/aprovacoes" element={<Protegida><Aprovacoes /></Protegida>} />
          <Route path="/perfil" element={<Protegida><Perfil /></Protegida>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
