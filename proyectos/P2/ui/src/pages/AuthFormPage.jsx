import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/client'

function AuthFormPage() {
  // Lee parámetros de la URL: /auth?domain=ejemplo.com&redirect=http://...
  const [searchParams] = useSearchParams()
  const domain = searchParams.get('domain')
  const redirectUrl = searchParams.get('redirect')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const data = await api.post('/auth/verify', { username, password, domain })

      // Si hay una URL de redirección, redirige con el token
      if (redirectUrl) {
        window.location.href = `${redirectUrl}?token=${data.token}`
        return
      }

      // Si no hay redirect, muestra el token para que la Zonal Cache lo use
      setSuccess(data.token)
    } catch (err) {
      setError(err.message || 'Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Iniciar sesión
        </h1>
        {domain && (
          <p className="text-sm text-gray-500 mb-6">
            Accediendo a: <span className="font-medium text-gray-700">{domain}</span>
          </p>
        )}

        {/* Formulario */}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="nombre de usuario"
                required
              />
            </div>

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

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        )}

        {/* Token generado — cuando no hay redirect */}
        {success && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm font-medium mb-2">
                Sesión iniciada correctamente
              </p>
              <p className="text-xs text-green-700 mb-1">Token de sesión:</p>
              <code className="block bg-green-100 px-3 py-2 rounded text-xs font-mono text-green-900 break-all">
                {success}
              </code>
            </div>
            <button
              onClick={() => {
                setSuccess(null)
                setUsername('')
                setPassword('')
              }}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-md text-sm hover:bg-gray-200 transition-colors"
            >
              Volver al formulario
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default AuthFormPage