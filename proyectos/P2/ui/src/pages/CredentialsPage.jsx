import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom'
import api from '../api/client'
import useAuthStore from '../store/authStore'


function CredentialsPage() {
  const { domainId, urlId } = useParams()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  // Tipo de autenticación viene desde la URL anterior
  // Lee el authType que pasó UrlsPage
  const location = useLocation()
  const [authType, setAuthType] = useState(location.state?.authType || null)

  // Estado para API Keys
  const [apiKeys, setApiKeys] = useState([])

  // Estado para usuarios
  const [users, setUsers] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Formulario de nuevo usuario
  const [showUserForm, setShowUserForm] = useState(false)
  const [userForm, setUserForm] = useState({ username: '', password: '' })
  const [editingUserId, setEditingUserId] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    fetchCredentials()
  }, [urlId])

  const fetchCredentials = async () => {
  setLoading(true)
  try {
    const type = location.state?.authType

    if (type === 'apikey') {
      const keys = await api.get(`/urls/${urlId}/apikeys`)
      setApiKeys(keys || [])
      setAuthType('apikey')
    } else if (type === 'credentials') {
      const usrs = await api.get(`/urls/${urlId}/users`)
      setUsers(usrs || [])
      setAuthType('credentials')
    }
  } catch (err) {
    setError('Error al cargar credenciales')
  } finally {
    setLoading(false)
  }
}

  // --- API Keys ---
  const handleGenerateKey = async () => {
    try {
      const data = await api.post(`/urls/${urlId}/apikeys`)
      setApiKeys((prev) => [...prev, data])
    } catch (err) {
      alert('Error al generar API Key')
    }
  }

  const handleDeleteKey = async (keyId) => {
    if (!confirm('¿Eliminar esta API Key?')) return
    try {
      await api.delete(`/urls/${urlId}/apikeys/${keyId}`)
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId))
    } catch (err) {
      alert('Error al eliminar API Key')
    }
  }

  // --- Usuarios ---
  const handleUserSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)

    try {
      if (editingUserId) {
        const data = await api.put(`/urls/${urlId}/users/${editingUserId}`, userForm)
        setUsers((prev) => prev.map((u) => (u.id === editingUserId ? data : u)))
      } else {
        const data = await api.post(`/urls/${urlId}/users`, userForm)
        setUsers((prev) => [...prev, data])
      }
      setShowUserForm(false)
      setUserForm({ username: '', password: '' })
      setEditingUserId(null)
    } catch (err) {
      setFormError(err.message || 'Error al guardar usuario')
    } finally {
      setFormLoading(false)
    }
  }

  const handleEditUser = (user) => {
    setUserForm({ username: user.username, password: '' })
    setEditingUserId(user.id)
    setShowUserForm(true)
    setFormError(null)
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Eliminar este usuario?')) return
    try {
      await api.delete(`/urls/${urlId}/users/${userId}`)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err) {
      alert('Error al eliminar usuario')
    }
  }

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch (err) { console.error(err) }
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            to={`/dashboard/domains/${domainId}/urls`}
            className="text-blue-600 hover:underline text-sm"
          >
            ← URLs
          </Link>
          <h1 className="text-lg font-bold text-gray-800">Credenciales</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
        >
          Cerrar sesión
        </button>
      </nav>

      <main className="max-w-4xl mx-auto p-8">

        {loading && <p className="text-gray-500 text-center py-8">Cargando...</p>}
        {error && <p className="text-red-500 text-center py-8">{error}</p>}

        {!loading && !error && (
          <>
            {/* Sección API Keys */}
            {authType === 'apikey' && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">API Keys</h2>
                  <button
                    onClick={handleGenerateKey}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                  >
                    + Generar Key
                  </button>
                </div>

                {apiKeys.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
                    No hay API Keys generadas todavía.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {apiKeys.map((k) => (
                      <div
                        key={k.id}
                        className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center"
                      >
                        <code className="font-mono text-sm text-gray-700">{k.key}</code>
                        <button
                          onClick={() => handleDeleteKey(k.id)}
                          className="text-sm bg-red-100 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-200 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sección Usuarios */}
            {authType === 'credentials' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Usuarios</h2>
                  {!showUserForm && (
                    <button
                      onClick={() => {
                        setShowUserForm(true)
                        setEditingUserId(null)
                        setUserForm({ username: '', password: '' })
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                    >
                      + Agregar usuario
                    </button>
                  )}
                </div>

                {/* Formulario usuario */}
                {showUserForm && (
                  <form onSubmit={handleUserSubmit} className="bg-white rounded-lg shadow-sm p-6 mb-4 space-y-4">
                    <h3 className="font-semibold text-gray-800">
                      {editingUserId ? 'Editar usuario' : 'Nuevo usuario'}
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre de usuario
                      </label>
                      <input
                        type="text"
                        value={userForm.username}
                        onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {editingUserId ? 'Nueva contraseña (dejá vacío para no cambiar)' : 'Contraseña'}
                      </label>
                      <input
                        type="password"
                        value={userForm.password}
                        onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required={!editingUserId}
                      />
                    </div>
                    {formError && <p className="text-red-500 text-sm">{formError}</p>}
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {formLoading ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserForm(false)
                          setEditingUserId(null)
                          setFormError(null)
                        }}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}

                {/* Lista usuarios */}
                {users.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
                    No hay usuarios creados todavía.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center"
                      >
                        <span className="font-medium text-gray-800">{u.username}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditUser(u)}
                            className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-sm bg-red-100 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-200 transition-colors"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default CredentialsPage