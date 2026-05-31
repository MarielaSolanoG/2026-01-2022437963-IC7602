import axios from 'axios'
import { mockHandlers } from '../mocks/handlers'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// --- Cliente real (axios) ---
const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

httpClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || 'Error inesperado'
    return Promise.reject({ status: error.response?.status, message })
  }
)

// --- Cliente mock ---
// Palabras reservadas que no son IDs
const RESERVED_WORDS = ['domains', 'urls', 'users', 'apikeys', 'auth', 'login', 'logout', 'register', 'verify']

// Convierte /domains/123/urls/456 → /domains/:id/urls/:id
const normalize = (p) =>
  p.replace(/\/[^/]+/g, (segment) => {
    const value = segment.slice(1)
    const isId = /^[a-zA-Z0-9_-]+$/.test(value) && !RESERVED_WORDS.includes(value)
    return isId ? '/:id' : segment
  })

const mockClient = async (method, path, body = {}) => {
  const key = `${method.toUpperCase()} ${normalize(path)}`
  const handler = mockHandlers[key]

  if (!handler) {
    console.warn(`[Mock] No handler found for: ${key}`)
    return Promise.reject({ status: 404, message: `Mock no encontrado: ${key}` })
  }

  // Simula latencia de red
  await new Promise((r) => setTimeout(r, 300))

  try {
    return handler(body)
  } catch (err) {
    return Promise.reject(err)
  }
}

// --- API pública ---
const api = {
  get: (path) =>
    USE_MOCK ? mockClient('GET', path) : httpClient.get(path),

  post: (path, body) =>
    USE_MOCK ? mockClient('POST', path, body) : httpClient.post(path, body),

  put: (path, body) =>
    USE_MOCK ? mockClient('PUT', path, body) : httpClient.put(path, body),

  delete: (path) =>
    USE_MOCK ? mockClient('DELETE', path) : httpClient.delete(path),
}

export default api