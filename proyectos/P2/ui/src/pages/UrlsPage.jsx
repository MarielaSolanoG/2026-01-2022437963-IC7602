import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import useAuthStore from '../store/authStore'

// Opciones fijas para los selectores del formulario
const REPLACEMENT_POLICIES = ['LRU', 'LFU', 'FIFO', 'MRU', 'Random']
const FILE_TYPES = ['html', 'css', 'js', 'png', 'jpg', 'gif', 'svg', 'json', 'pdf']
const AUTH_TYPES = [
  { value: 'none', label: 'Sin autenticación' },
  { value: 'apikey', label: 'API Key' },
  { value: 'credentials', label: 'Usuario y contraseña' },
]

// Formulario vacío — lo usamos para crear y para resetear
const emptyForm = {
  pattern: '',
  cacheSize: '',
  authType: 'none',
  fileTypes: [{ ext: 'html', ttl: 3600, policy: 'LRU' }],
}

function UrlsPage() {
  // Lee el id del dominio desde la URL: /dashboard/domains/123/urls
  const { domainId } = useParams()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  const [urls, setUrls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // null = formulario cerrado, 'new' = creando, string = editando (id de la url)
  const [formMode, setFormMode] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState(null)

  useEffect(() => {
    fetchUrls()
  }, [domainId])

  const fetchUrls = async () => {
    try {
      setLoading(true)
      const data = await api.get(`/domains/${domainId}/urls`)
      setUrls(data)
    } catch (err) {
      setError('Error al cargar las URLs')
    } finally {
      setLoading(false)
    }
  }

  // Abre el formulario en modo edición con los datos de una URL existente
  const handleEdit = (url) => {
    setForm({
      pattern: url.pattern,
      cacheSize: url.cacheSize,
      authType: url.authType,
      fileTypes: url.fileTypes,
    })
    setFormMode(url.id)
    setFormError(null)
  }

  // Abre el formulario en modo creación
  const handleNew = () => {
    setForm(emptyForm)
    setFormMode('new')
    setFormError(null)
  }

  const handleCancel = () => {
    setFormMode(null)
    setForm(emptyForm)
    setFormError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    setFormLoading(true)

    try {
      if (formMode === 'new') {
        // Crear nueva URL
        const data = await api.post(`/domains/${domainId}/urls`, form)
        setUrls((prev) => [...prev, data])
      } else {
        // Editar URL existente
        const data = await api.put(`/domains/${domainId}/urls/${formMode}`, form)
        setUrls((prev) => prev.map((u) => (u.id === formMode ? data : u)))
      }
      handleCancel()
    } catch (err) {
      setFormError(err.message || 'Error al guardar la URL')
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (urlId) => {
    if (!confirm('¿Eliminar esta URL?')) return
    try {
      await api.delete(`/domains/${domainId}/urls/${urlId}`)
      setUrls((prev) => prev.filter((u) => u.id !== urlId))
    } catch (err) {
      alert('Error al eliminar la URL')
    }
  }

  // Agrega un tipo de archivo al formulario
  const handleAddFileType = () => {
    setForm((prev) => ({
      ...prev,
      fileTypes: [...prev.fileTypes, { ext: 'html', ttl: 3600, policy: 'LRU' }],
    }))
  }

  // Elimina un tipo de archivo del formulario por índice
  const handleRemoveFileType = (index) => {
    setForm((prev) => ({
      ...prev,
      fileTypes: prev.fileTypes.filter((_, i) => i !== index),
    }))
  }

  // Actualiza un campo específico de un tipo de archivo
  const handleFileTypeChange = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      fileTypes: prev.fileTypes.map((ft, i) =>
        i === index ? { ...ft, [field]: value } : ft
      ),
    }))
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
          <Link to="/dashboard/domains" className="text-blue-600 hover:underline text-sm">
            ← Dominios
          </Link>
          <h1 className="text-lg font-bold text-gray-800">
            URLs del dominio
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
        >
          Cerrar sesión
        </button>
      </nav>

      <main className="max-w-4xl mx-auto p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">URLs configuradas</h2>
          {formMode === null && (
            <button
              onClick={handleNew}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              + Agregar URL
            </button>
          )}
        </div>

        {/* Formulario crear/editar */}
        {formMode !== null && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 mb-6 space-y-4">
            <h3 className="font-semibold text-gray-800">
              {formMode === 'new' ? 'Nueva URL' : 'Editar URL'}
            </h3>

            {/* Patrón de URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Patrón de URL (soporta wildcards)
              </label>
              <input
                type="text"
                value={form.pattern}
                onChange={(e) => setForm((prev) => ({ ...prev, pattern: e.target.value }))}
                placeholder="/images/* o /api/v1/users"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Tamaño de caché */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tamaño máximo de caché (MB)
              </label>
              <input
                type="number"
                value={form.cacheSize}
                onChange={(e) => setForm((prev) => ({ ...prev, cacheSize: Number(e.target.value) }))}
                placeholder="100"
                min="1"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Tipo de autenticación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Autenticación
              </label>
              <select
                value={form.authType}
                onChange={(e) => setForm((prev) => ({ ...prev, authType: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {AUTH_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            {/* Tipos de archivo */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tipos de archivo
                </label>
                <button
                  type="button"
                  onClick={handleAddFileType}
                  className="text-xs text-blue-600 hover:underline"
                >
                  + Agregar tipo
                </button>
              </div>

              <div className="space-y-2">
                {form.fileTypes.map((ft, index) => (
                  <div key={index} className="flex gap-2 items-center">

                    {/* Extensión */}
                    <select
                      value={ft.ext}
                      onChange={(e) => handleFileTypeChange(index, 'ext', e.target.value)}
                      className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {FILE_TYPES.map((ext) => (
                        <option key={ext} value={ext}>.{ext}</option>
                      ))}
                    </select>

                    {/* TTL */}
                    <input
                      type="number"
                      value={ft.ttl}
                      onChange={(e) => handleFileTypeChange(index, 'ttl', Number(e.target.value))}
                      placeholder="TTL (seg)"
                      min="1"
                      className="w-28 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* Política de reemplazo */}
                    <select
                      value={ft.policy}
                      onChange={(e) => handleFileTypeChange(index, 'policy', e.target.value)}
                      className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {REPLACEMENT_POLICIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>

                    {/* Botón eliminar tipo */}
                    {form.fileTypes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFileType(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {formError && (
              <p className="text-red-500 text-sm">{formError}</p>
            )}

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
                onClick={handleCancel}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Estados */}
        {loading && <p className="text-gray-500 text-center py-8">Cargando URLs...</p>}
        {error && <p className="text-red-500 text-center py-8">{error}</p>}

        {/* Lista de URLs */}
        {!loading && !error && (
          <div className="space-y-3">
            {urls.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
                No hay URLs configuradas para este dominio.
              </div>
            ) : (
              urls.map((url) => (
                <div key={url.id} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-medium text-gray-800">{url.pattern}</p>
                      <div className="flex gap-3 mt-1 text-sm text-gray-500">
                        <span>Caché: {url.cacheSize} MB</span>
                        <span>Auth: {AUTH_TYPES.find(a => a.value === url.authType)?.label}</span>
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {url.fileTypes.map((ft, i) => (
                          <span
                            key={i}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                          >
                            .{ft.ext} · {ft.ttl}s · {ft.policy}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                        {url.authType !== 'none' && (
                            <Link
                                to={`/dashboard/domains/${domainId}/urls/${url.id}/credentials`}
                                state={{ authType: url.authType }}
                                className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md hover:bg-blue-200 transition-colors"
                            >
                            Credenciales
                            </Link>
                        )}
                        <button
                            onClick={() => handleEdit(url)}
                            className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors"
                        >
                            Editar
                        </button>
                        <button
                            onClick={() => handleDelete(url.id)}
                            className="text-sm bg-red-100 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-200 transition-colors"
                        >
                            Eliminar
                        </button>
                    </div>
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

export default UrlsPage