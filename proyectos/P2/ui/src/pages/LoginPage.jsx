import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import api from '../api/client'

function LoginPage() {
  // Valores del formulario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Estado de la petición
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Para redirigir después del login
  const navigate = useNavigate()

  // Acción del store para guardar la sesión
  const login = useAuthStore((state) => state.login)

  const handleSubmit = async (e) => {
    // Evita que el formulario recargue la página
    e.preventDefault()

    // Limpia error anterior y activa loading
    setError(null)
    setLoading(true)

    try {
      // Llama a la API (mock por ahora)
      const data = await api.post('/auth/login', { email, password })

      // Guarda la sesión en el store y localStorage
      login(data.user, data.token)

      // Redirige al dashboard
      navigate('/dashboard')
    } catch (err) {
      // Muestra el error al usuario
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      // Siempre desactiva el loading, haya error o no
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Iniciar sesión
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Campo email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"
              required
            />
          </div>

          {/* Campo password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Mensaje de error */}
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {/* Botón submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Iniciando sesión...' : 'Entrar'}
          </button>

        </form>

        {/* Link a registro */}
        <p className="mt-4 text-center text-sm text-gray-600">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">
            Registrarse
          </Link>
        </p>

      </div>
    </div>
  )
}

export default LoginPage