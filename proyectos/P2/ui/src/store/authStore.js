import { create } from 'zustand'

// Estado global de autenticación
// Cualquier componente puede leer o modificar esto
const useAuthStore = create((set) => ({
  // Estado inicial
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),

  // Acción: guardar sesión después de login exitoso
  login: (user, token) => {
    localStorage.setItem('token', token)
    set({ user, token, isAuthenticated: true })
  },

  // Acción: limpiar sesión al hacer logout
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, isAuthenticated: false })
  },
}))

export default useAuthStore