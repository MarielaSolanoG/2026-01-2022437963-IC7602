import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import useAuthStore from '../store/authStore'

function DomainsPage() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  // Lista de dominios cargados desde la API
  const [domains, setDomains] = useState([])

  // Estado de carga inicial
  const [loading, setLoading] = useState(true)

  // Error general de la página
  const [error, setError] = useState(null)

  // Controla si el formulario de agregar está visible
  const [showForm, setShowForm] = useState(false)

  // Valores del formulario de nuevo dominio
  const [newDomain, setNewDomain] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState(null)

  // Estado para el flujo de verificación TXT
  // Cuando agregas un dominio, el backend devuelve un txtRecord que debes publicar
  const [pendingVerification, setPendingVerification] = useState(null)

  // useEffect: se ejecuta una sola vez cuando el componente carga
  // El array vacío [] al final significa "solo ejecutar al montar"
  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      setLoading(true)
      const data = await api.get('/domains')
      setDomains(data)
    } catch (err) {
      setError('Error al cargar los dominios')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDomain = async (e) => {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)

    try {
      const data = await api.post('/domains', { name: newDomain })

      // El backend devuelve el dominio creado con un txtRecord para verificar
      // Guardamos ese estado para mostrarle al usuario qué debe hacer
      setPendingVerification(data)
      setNewDomain('')
      setShowForm(false)

      // Refrescamos la lista para incluir el nuevo dominio
      fetchDomains()
    } catch (err) {
      setFormError(err.message || 'Error al agregar el dominio')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteDomain = async (id) => {
    // Confirmación antes de eliminar — buena práctica para acciones destructivas
    if (!confirm('¿Estás seguro de que querés eliminar este dominio?')) return

    try {
      await api.delete(`/domains/${id}`)
      // Actualiza la lista localmente sin volver a llamar a la API
      setDomains((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      alert('Error al eliminar el dominio')
    }
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      console.error(err)
    } finally {
      logout()
      navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Dashboard
          </Link>
          <h1 className="text-lg font-bold text-gray-800">Mis Dominios</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
        >
          Cerrar sesión
        </button>
      </nav>

      <main className="max-w-4xl mx-auto p-8">

        {/* Aviso de verificación TXT pendiente */}
        {pendingVerification && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2">
              Verificá tu dominio: {pendingVerification.name}
            </h3>
            <p className="text-yellow-700 text-sm mb-2">
              Agregá este registro TXT en tu proveedor de DNS:
            </p>
            <code className="block bg-yellow-100 px-3 py-2 rounded text-sm text-yellow-900 font-mono">
              {pendingVerification.txtRecord}
            </code>
            <button
              onClick={() => setPendingVerification(null)}
              className="mt-3 text-sm text-yellow-700 hover:underline"
            >
              Entendido, cerrar aviso
            </button>
          </div>
        )}

        {/* Header con botón agregar */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Dominios registrados</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            {showForm ? 'Cancelar' : '+ Agregar dominio'}
          </button>
        </div>

        {/* Formulario para agregar dominio */}
        {showForm && (
          <form onSubmit={handleAddDomain} className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-4">Nuevo dominio</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="ejemplo.com"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                disabled={formLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {formLoading ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
            {formError && (
              <p className="text-red-500 text-sm mt-2">{formError}</p>
            )}
          </form>
        )}

        {/* Estados de carga y error */}
        {loading && (
          <p className="text-gray-500 text-center py-8">Cargando dominios...</p>
        )}

        {error && (
          <p className="text-red-500 text-center py-8">{error}</p>
        )}

        {/* Lista de dominios */}
        {!loading && !error && (
          <div className="space-y-3">
            {domains.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                No tenés dominios registrados todavía.
              </div>
            ) : (
              domains.map((domain) => (
                <div
                  key={domain.id}
                  className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-gray-800">{domain.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      domain.verified
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {domain.verified ? 'Verificado' : 'Pendiente verificación'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/dashboard/domains/${domain.id}/urls`}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Ver URLs
                    </Link>
                    <button
                      onClick={() => handleDeleteDomain(domain.id)}
                      className="text-sm bg-red-100 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>
    </div>
  )
}

export default DomainsPage