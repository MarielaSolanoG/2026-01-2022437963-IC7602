import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import api from '../api/client'

function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      console.error('Error al cerrar sesión en servidor:', err)
    } finally {
      logout()
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-bold text-blue-600">Proxy Cache Manager</h1>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-gray-600">{user.email}</span>
          )}
          <button
            onClick={handleLogout}
            className="text-sm bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="max-w-4xl mx-auto p-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          ¿Qué querés administrar?
        </h2>

        {/* Tarjeta de dominios */}
        <Link
          to="/dashboard/domains"
          className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            Dominios
          </h3>
          <p className="text-gray-500 text-sm">
            Administrá tus dominios registrados y sus configuraciones de caché.
          </p>
        </Link>
      </main>

    </div>
  )
}

export default DashboardPage