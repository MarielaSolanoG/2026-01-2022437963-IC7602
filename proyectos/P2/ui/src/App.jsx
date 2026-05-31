import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import DomainsPage from './pages/DomainsPage'
import UrlsPage from './pages/UrlsPage'
import CredentialsPage from './pages/CredentialsPage'
import ProtectedRoute from './components/ProtectedRoute'
import AuthFormPage from './pages/AuthFormPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/domains"
          element={
            <ProtectedRoute>
              <DomainsPage />
            </ProtectedRoute>
          }
        />
         <Route
          path="/dashboard/domains/:domainId/urls"
          element={
            <ProtectedRoute>
              <UrlsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/domains/:domainId/urls/:urlId/credentials"
          element={
            <ProtectedRoute>
              <CredentialsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/auth" element={<AuthFormPage />} />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App