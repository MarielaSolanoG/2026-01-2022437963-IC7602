import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

// Este componente envuelve cualquier página que requiera autenticación
// Si no hay sesión activa, redirige al login automáticamente
function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Si hay sesión, muestra la página normalmente
  return children
}

export default ProtectedRoute