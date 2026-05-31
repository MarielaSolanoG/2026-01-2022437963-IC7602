// Respuestas simuladas para cada endpoint de la API
// Cuando la API real esté lista, esto se desactiva con VITE_USE_MOCK=false

export const mockHandlers = {
  // Auth
  'POST /auth/login': (body) => {
    if (body.email === 'test@test.com' && body.password === '123456') {
      return { token: 'fake-token-123', user: { id: '1', email: body.email } }
    }
    throw { status: 401, message: 'Credenciales inválidas' }
  },

  'POST /auth/register': (body) => {
    return { token: 'fake-token-123', user: { id: '2', email: body.email } }
  },

  'POST /auth/logout': () => {
    return { message: 'Sesión cerrada' }
  },

  // Dominios
  'GET /domains': () => {
    return [
      { id: '1', name: 'ejemplo.com', verified: true },
      { id: '2', name: 'otrodominio.com', verified: false },
    ]
  },

  'POST /domains': (body) => {
    return {
      id: '3',
      name: body.name,
      verified: false,
      txtRecord: `proyecto2-verify=${Math.random().toString(36).slice(2)}`
    }
  },

  'DELETE /domains/:id': () => {
    return { message: 'Dominio eliminado' }
  },

  // URLs
  'GET /domains/:id/urls': () => {
    return [
      {
        id: '1',
        pattern: '/images/*',
        cacheSize: 100,
        fileTypes: [{ ext: 'png', ttl: 3600, policy: 'LRU' }],
        authType: 'apikey',
      }
    ]
  },

  'POST /domains/:id/urls': (body) => {
    return { id: '4', ...body }
  },

  'PUT /domains/:id/urls/:id': (body) => {
    return { id: '1', ...body }
  },

  'DELETE /domains/:id/urls/:id': () => {
    return { message: 'URL eliminada' }
  },

  // Credenciales - API Keys
    'GET /urls/:id/apikeys': () => {
    return [
        { id: '1', key: 'ak-abc123def456' },
        { id: '2', key: 'ak-xyz789ghi012' },
    ]
    },

    'POST /urls/:id/apikeys': () => {
    return { id: '3', key: `ak-${Math.random().toString(36).slice(2)}` }
    },

    'DELETE /urls/:id/apikeys/:id': () => {
    return { message: 'API Key eliminada' }
    },

    // Credenciales - Usuarios
    'GET /urls/:id/users': () => {
    return [
        { id: '1', username: 'usuario1' },
        { id: '2', username: 'usuario2' },
    ]
    },

    'POST /urls/:id/users': (body) => {
    return { id: '3', username: body.username }
    },

    'PUT /urls/:id/users/:id': (body) => {
    return { id: '1', username: body.username }
    },

    'DELETE /urls/:id/users/:id': () => {
    return { message: 'Usuario eliminado' }
    },

    // Auth para Zonal Cache
    'POST /auth/verify': (body) => {
    if (body.username === 'usuario1' && body.password === '123456') {
        return { 
        token: `session-${Math.random().toString(36).slice(2)}`,
        username: body.username 
        }
    }
    throw { status: 401, message: 'Credenciales inválidas' }
    },
}