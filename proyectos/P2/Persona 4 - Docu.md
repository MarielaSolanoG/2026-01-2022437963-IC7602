# Documentación — UI y REST API Node.js
## Proyecto 2 — IC7602 Redes
### Tecnológico de Costa Rica — Primer Semestre 2026

---

## Descripción de los módulos

Se implementaron dos módulos del sistema:

- **UI:** aplicación web en React + Vite + Tailwind CSS que permite a los administradores gestionar dominios, URLs, credenciales y configuraciones de caché. Desarrollada con ayuda de Claude (Anthropic) como herramienta de inteligencia artificial generativa.

- **REST API Node.js:** backend en Express que expone los endpoints requeridos por la UI y las cachés zonales para interactuar con Firebase Firestore. Implementa JWT + bcrypt como mecanismo de seguridad.

Ambos módulos se ejecutan en **Vercel** con deployments automáticos desde GitHub.

---


### Integración con Zonal Cache

Las cachés zonales interactúan con estos módulos de dos formas:

**1. Obtener configuración de dominio:**
```
GET /domains/:domain/config
Authorization: Bearer <token>
```
La Zonal Cache usa este endpoint para saber el tamaño de caché, TTL, política de reemplazo y tipo de autenticación configurados desde la UI.

**2. Autenticar usuarios:**
```
Zonal Cache redirige a:
https://ic7602-p2-ui.vercel.app/auth?domain=ejemplo.com&redirect=http://cache/callback

Usuario llena credenciales → UI llama a POST /auth/verify → devuelve JWT
```

---

## UI — React + Vite + Tailwind CSS

**URL de producción:** `https://ic7602-p2-ui.vercel.app`

**Repositorio:** rama `main`, carpeta `P2/ui/`

### Tecnologías

| Tecnología | Versión | Propósito |
|---|---|---|
| React | 19.x | Framework UI |
| Vite | 6.x | Bundler y servidor de desarrollo |
| Tailwind CSS | 4.x | Estilos utilitarios |
| React Router | 7.x | Navegación entre páginas |
| Axios | 1.x | Cliente HTTP |
| Zustand | 4.x | Estado global de sesión |

### Estructura de carpetas

```
ui/
├── src/
│   ├── api/
│   │   └── client.js           # Cliente HTTP centralizado
│   │                           # Soporta modo mock y modo real
│   ├── components/
│   │   └── ProtectedRoute.jsx  # Redirige a /login si no hay sesión
│   ├── mocks/
│   │   └── handlers.js         # Respuestas simuladas para desarrollo
│   ├── pages/
│   │   ├── LoginPage.jsx       # Inicio de sesión administrativo
│   │   ├── RegisterPage.jsx    # Registro de nueva cuenta
│   │   ├── DashboardPage.jsx   # Panel principal con navegación
│   │   ├── DomainsPage.jsx     # CRUD de dominios + verificación TXT
│   │   ├── UrlsPage.jsx        # CRUD de URLs con políticas de caché
│   │   ├── CredentialsPage.jsx # API Keys y usuarios por URL
│   │   └── AuthFormPage.jsx    # Formulario público para Zonal Cache
│   ├── store/
│   │   └── authStore.js        # Estado global: token, user, login, logout
│   ├── App.jsx                 # Definición de rutas
│   └── main.jsx                # Punto de entrada
├── .env.example
└── package.json
```

### Funcionalidades

#### Autenticación administrativa
- Registro con email y contraseña (mínimo 6 caracteres)
- Login con JWT — token guardado en localStorage
- Logout — limpia token del store y localStorage
- Rutas protegidas — `ProtectedRoute` redirige a `/login` si no hay sesión
- Sesión persistente — al recargar la página, se recupera el token de localStorage

#### Gestión de dominios
- Listar dominios con estado de verificación (verificado / pendiente)
- Agregar dominio — genera `txtRecord` único automáticamente
- Verificar dominio — hace DNS lookup para confirmar el registro TXT
- Eliminar dominio con confirmación

#### Gestión de URLs
- Listar URLs de un dominio
- Crear URL con:
  - Patrón con soporte de wildcards (ej: `/images/*`, `/api/v1/*`)
  - Tamaño máximo de caché en MB
  - Tipos de archivo con TTL en segundos y política de reemplazo (LRU, LFU, FIFO, MRU, Random)
  - Tipo de autenticación: ninguna, API Key o usuario/contraseña
- Editar y eliminar URLs

#### Gestión de credenciales
- **API Keys:** generar claves con formato `ak-xxxxxxxx`, eliminar claves
- **Usuarios:** crear con username y contraseña, editar, eliminar

#### Formulario para Zonal Cache
- Ruta pública `/auth` — no requiere login administrativo
- Lee parámetros de la URL: `?domain=` y `?redirect=`
- Valida credenciales contra `POST /auth/verify`
- Si hay `redirect`: redirige con token en la URL
- Si no hay `redirect`: muestra el token generado

### Sistema de mocks

Para desarrollo sin backend, la UI incluye un sistema de mocks en `src/mocks/handlers.js`. Se activa con `VITE_USE_MOCK=true` en el archivo `.env`.

Credenciales de prueba con mock:
```
Email:    test@test.com
Password: 123456
```

Cuando `VITE_USE_MOCK=false`, todas las llamadas van a la API real configurada en `VITE_API_URL`.

### Diagrama de navegación

```
/login ──────────────── /register
   │
   ▼ (sesión activa)
/dashboard
   │
   └── /dashboard/domains
           │
           ├── /dashboard/domains/:domainId/urls
           │           │
           │           └── /dashboard/domains/:domainId/urls/:urlId/credentials
           │
           └── (flujo verificación TXT)

/auth  ←── ruta pública, usada por Zonal Cache
```

---

## REST API Node.js

**URL de producción:** `https://2026-01-2022437963-ic-7602.vercel.app`

**Repositorio:** rama `main`, carpeta `P2/api/`

### Tecnologías

| Tecnología | Versión | Propósito |
|---|---|---|
| Node.js | 18.x | Runtime |
| Express | 4.x | Framework HTTP |
| Firebase Admin SDK | 12.x | Acceso a Firestore |
| jsonwebtoken | 9.x | Generación y verificación de tokens JWT |
| bcryptjs | 2.x | Hash seguro de contraseñas |
| dotenv | 16.x | Carga de variables de entorno |

### Estructura de carpetas

```
api/
├── routes/
│   └── auth.routes.js     # Endpoints de autenticación
├── middleware/
│   └── auth.js            # Middleware requireAuth (verifica JWT)
├── firebase.js            # Inicialización de Firebase Admin SDK
├── server.js              # Servidor Express y endpoints principales
├── vercel.json            # Configuración serverless para Vercel
├── .env.example           # Variables de entorno requeridas
└── package.json
```

### Mecanismo de seguridad — JWT + bcrypt

Se implementó autenticación y autorización mediante **JSON Web Tokens (JWT)** combinado con **bcrypt** para el almacenamiento seguro de contraseñas.

**¿Por qué JWT?**
JWT es un estándar abierto (RFC 7519) para transmitir información de forma segura entre partes como un objeto JSON firmado digitalmente. Es stateless — el servidor no necesita almacenar sesiones, lo que lo hace ideal para APIs desplegadas en entornos serverless como Vercel.

**Flujo completo:**

```
1. POST /auth/register o /auth/login
   │
   ├── Busca usuario en Firestore
   ├── bcrypt.compare(password, hash) — verifica contraseña
   ├── jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "24h" })
   └── Devuelve { token, user }

2. Requests a endpoints protegidos
   │
   ├── Cliente envía: Authorization: Bearer eyJ...
   ├── middleware requireAuth extrae el token
   ├── jwt.verify(token, JWT_SECRET) — verifica firma y expiración
   ├── Si válido: adjunta req.user y llama a next()
   └── Si inválido: devuelve 401
```

**¿Por qué bcrypt?**
bcrypt genera un hash con salt aleatorio para cada contraseña. Esto significa que dos usuarios con la misma contraseña tienen hashes diferentes, protegiendo contra ataques de diccionario y rainbow tables.

### Endpoints

#### Autenticación — sin protección JWT

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/auth/register` | `{ email, password }` | `{ token, user }` |
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` |
| POST | `/auth/logout` | — | `{ message }` |
| POST | `/auth/verify` | `{ username, password, domain }` | `{ token, username, domain }` |

#### Dominios — requieren JWT

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/domains` | Listar todos los dominios |
| POST | `/domains` | Crear dominio con txtRecord generado |
| GET | `/domains/:domain/config` | Configuración para Zonal Cache |
| DELETE | `/domains/:domain` | Eliminar dominio |
| POST | `/domains/:domain/verify` | Verificar registro TXT en DNS real |

#### URLs — requieren JWT

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/domains/:domain/urls` | Listar URLs del dominio |
| POST | `/domains/:domain/urls` | Crear URL |
| PUT | `/domains/:domain/urls/:urlId` | Actualizar URL |
| DELETE | `/domains/:domain/urls/:urlId` | Eliminar URL |

#### API Keys — requieren JWT

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/urls/:urlId/apikeys` | Listar API Keys |
| POST | `/urls/:urlId/apikeys` | Generar nueva API Key |
| DELETE | `/urls/:urlId/apikeys/:keyId` | Eliminar API Key |

#### Usuarios por URL — requieren JWT

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/urls/:urlId/users` | Listar usuarios |
| POST | `/urls/:urlId/users` | Crear usuario (contraseña hasheada con bcrypt) |
| PUT | `/urls/:urlId/users/:userId` | Actualizar usuario |
| DELETE | `/urls/:urlId/users/:userId` | Eliminar usuario |

### Configuración de Vercel

`vercel.json` adapta Express para ejecutarse como función serverless:

```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

El servidor detecta el entorno y solo llama a `app.listen` en desarrollo local:

```js
if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => console.log(`API http://localhost:${PORT}`));
}
module.exports = app;
```

---

## Firebase Firestore

### Estructura de colecciones

```
users/
└── {userId}
    ├── email: string
    ├── password: string        ← hash bcrypt
    ├── role: "admin"
    └── createdAt: string

domains/
└── {domain}                   ← ID es el nombre del dominio
    ├── domain: string
    ├── ttl: number             ← segundos
    ├── cache_size_mb: number
    ├── replacement_policy: string   ← LRU | LFU | FIFO | MRU | Random
    ├── auth_type: string            ← none | apikey | credentials
    ├── api_key: string
    ├── verified: boolean
    ├── txtRecord: string            ← generado al crear el dominio
    └── urls/
        └── {urlId}
            ├── pattern: string      ← soporta wildcards
            ├── cacheSize: number
            ├── fileTypes: array     ← [{ ext, ttl, policy }]
            ├── authType: string
            ├── createdAt: string
            ├── apikeys/
            │   └── {keyId}
            │       ├── key: string  ← formato ak-xxxxxxxx
            │       └── createdAt: string
            └── users/
                └── {userId}
                    ├── username: string
                    ├── password: string   ← hash bcrypt
                    └── createdAt: string
```

---

## Variables de entorno

### UI (`ui/.env`)

```bash
# URL base de la REST API Node.js
VITE_API_URL=https://2026-01-2022437963-ic-7602.vercel.app

# true = usa respuestas simuladas (desarrollo sin backend)
# false = usa la API real
VITE_USE_MOCK=false
```

### API (`api/.env`)

```bash
# Clave secreta para firmar tokens JWT
# Debe ser una cadena larga y aleatoria
JWT_SECRET=clave-secreta-muy-larga-y-random

# Puerto del servidor (solo en desarrollo local)
PORT=3000

# Credenciales de Firebase como JSON en una sola línea
# Obtener con: node -e "console.log(JSON.stringify(require('./firebase-key.json')))"
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Entorno de ejecución
NODE_ENV=production
```

---

## Instrucciones de ejecución

### Requisitos previos

- Node.js 18 o superior
- npm 9 o superior
- Proyecto en Firebase con Firestore habilitado
- Archivo `firebase-key.json` con las credenciales de servicio

### Ejecutar la UI localmente

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd P2/ui

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores correctos

# 4. Iniciar servidor de desarrollo
npm run dev
```

Abrir `http://localhost:5173` en el navegador.

### Ejecutar la API localmente

```bash
# 1. Ir a la carpeta de la API
cd P2/api

# 2. Instalar dependencias
npm install

# 3. Agregar credenciales de Firebase
# Copiar firebase-key.json en la raíz de P2/api/

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env con JWT_SECRET y PORT

# 5. Iniciar el servidor
node server.js
```

La API estará disponible en `http://localhost:3000`.

### Verificar que la API funciona

```bash
# Endpoint público de verificación
curl http://localhost:3000/
# Respuesta esperada: { "message": "API running" }

# Registrar usuario
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@test.com", "password": "123456" }'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "admin@test.com", "password": "123456" }'

# Usar el token del login para acceder a endpoints protegidos
curl http://localhost:3000/domains \
  -H "Authorization: Bearer <token>"
```

---

## Pruebas realizadas

### Prueba 1 — Registro de usuario

**Objetivo:** Verificar que un usuario puede crear una cuenta nueva.

**Pasos:**
1. Ir a `https://ic7602-p2-ui.vercel.app/register`
2. Ingresar email: `nuevo@test.com`, contraseña: `123456`
3. Repetir la contraseña
4. Click en "Registrarse"

**Resultado esperado:** Redirección al dashboard, usuario creado en Firestore con contraseña hasheada.

**Resultado obtenido:** ✅ Correcto

---

### Prueba 2 — Login y logout

**Objetivo:** Verificar el ciclo completo de sesión.

**Pasos:**
1. Ir a `/login`, ingresar credenciales correctas → debe entrar al dashboard
2. Recargar la página → sesión debe persistir
3. Click en "Cerrar sesión" → debe redirigir a `/login`
4. Intentar ir a `/dashboard` → debe redirigir a `/login`

**Resultado obtenido:** ✅ Correcto

---

### Prueba 3 — Protección de rutas en la UI

**Objetivo:** Verificar que las rutas requieren autenticación.

**Pasos:**
1. Sin login, ir a `http://localhost:5173/dashboard`

**Resultado esperado:** Redirección automática a `/login`.

**Resultado obtenido:** ✅ Correcto

---

### Prueba 4 — Protección de endpoints en la API

**Objetivo:** Verificar que el middleware JWT funciona.

**Pasos en Postman:**
```
GET https://2026-01-2022437963-ic-7602.vercel.app/domains
Sin header Authorization
```
**Resultado esperado:** `401 { "message": "Token requerido" }`

```
GET https://2026-01-2022437963-ic-7602.vercel.app/domains
Authorization: Bearer <token-válido>
```
**Resultado esperado:** Lista de dominios de Firestore.

**Resultado obtenido:** ✅ Correcto en ambos casos

---

### Prueba 5 — Crear dominio con verificación TXT

**Objetivo:** Verificar el flujo completo de registro de dominio.

**Pasos:**
1. Ir a Dominios → click en "+ Agregar dominio"
2. Ingresar `prueba-verificacion.com`
3. Click en "Agregar"
4. Verificar que aparece el aviso amarillo con el `txtRecord`
5. Click en "Verificar ahora"

**Resultado esperado:**
- Dominio creado con `txtRecord` único guardado en Firestore
- DNS lookup retorna `verified: false` con mensaje explicativo

**Resultado obtenido:** ✅ Correcto

---

### Prueba 6 — CRUD de URLs con políticas de caché

**Objetivo:** Verificar configuración completa de una URL.

**Pasos:**
1. Ir a URLs de un dominio → click en "+ Agregar URL"
2. Configurar patrón: `/api/*`, caché: `50` MB, auth: `API Key`
3. Agregar tipo de archivo: `.json`, TTL: `3600`, política: `LRU`
4. Click en "Guardar" → URL aparece en la lista
5. Click en "Editar" → cambiar política a `LFU` → Guardar
6. Click en "Eliminar" → URL desaparece

**Resultado obtenido:** ✅ Correcto

---

### Prueba 7 — Gestión de API Keys

**Objetivo:** Verificar generación y eliminación de API Keys.

**Pasos:**
1. Ir a Credenciales de una URL con `authType: apikey`
2. Click en "+ Generar Key" → aparece key con formato `ak-xxxxxxxx`
3. Click en "Eliminar" → key desaparece

**Resultado obtenido:** ✅ Correcto

---

### Prueba 8 — Gestión de usuarios por URL

**Objetivo:** Verificar CRUD de usuarios para autenticación por contraseña.

**Pasos:**
1. Crear URL con `authType: credentials`
2. Ir a Credenciales → click en "+ Agregar usuario"
3. Ingresar `usuario1` / `password123` → aparece en la lista
4. Click en "Editar" → cambiar username → Guardar
5. Click en "Eliminar" → usuario desaparece

**Resultado obtenido:** ✅ Correcto

---

### Prueba 9 — Formulario de autenticación para Zonal Cache

**Objetivo:** Verificar el formulario público de login.

**Pasos:**
1. Sin login administrativo, ir a:
   `https://ic7602-p2-ui.vercel.app/auth?domain=ejemplo.com`
2. Verificar que muestra "Accediendo a: ejemplo.com"
3. Ingresar credenciales de un usuario creado en la prueba anterior
4. Verificar que devuelve un token JWT

**Resultado obtenido:** ✅ Correcto

---

### Prueba 10 — Deploy automático

**Objetivo:** Verificar CI/CD con Vercel y GitHub.

**Pasos:**
1. Hacer un cambio en el código
2. `git add . && git commit -m "test: verify auto deploy" && git push`
3. Verificar en el dashboard de Vercel que se inicia un nuevo deploy
4. Verificar que el cambio está disponible en la URL de producción

**Resultado obtenido:** ✅ Correcto — deploy completado en menos de 2 minutos

---

## Recomendaciones

1. **Nunca hardcodear credenciales en el código** — usar variables de entorno para todas las configuraciones sensibles como JWT_SECRET, URLs de API y credenciales de Firebase. Esto permite cambiar valores sin tocar el código.

2. **Implementar un sistema de mock para el frontend** — permite desarrollar la UI sin depender del backend. Acelera el desarrollo paralelo y facilita las pruebas de componentes de forma aislada.

3. **Definir el contrato de API antes de implementar** — acordar nombres de campos, tipos y estructuras de respuesta entre frontend y backend antes de escribir código evita desajustes como el de `name` vs `domain` que ocurrió durante el desarrollo.

4. **Normalizar el formato de datos en el cliente HTTP** — centralizar la conversión de snake_case a camelCase en el interceptor de Axios evita tener que manejar ambos formatos en cada componente.

5. **Usar JWT con expiración corta en producción** — tokens de 24 horas son razonables para uso administrativo. Para la Zonal Cache se usó 1 hora por ser sesiones de usuario final.

6. **Hashear contraseñas con bcrypt antes de guardar** — nunca almacenar contraseñas en texto plano. bcrypt con salt rounds de 10 ofrece buen balance entre seguridad y rendimiento en Node.js.

7. **Separar responsabilidades entre UI y API** — la UI no debe acceder directamente a Firebase. Toda la lógica de negocio debe estar en la API, lo que facilita el mantenimiento y permite cambiar la base de datos sin tocar el frontend.

8. **Documentar los endpoints con ejemplos de request y response** — facilita la integración entre componentes desarrollados por diferentes personas del equipo.

9. **Hacer commits frecuentes y descriptivos** — usar Conventional Commits (`feat:`, `fix:`, `docs:`) facilita entender el historial de cambios y localizar cuándo se introdujo un bug.

10. **Probar en producción después de cada deploy** — Vercel puede tener comportamientos diferentes al entorno local, especialmente con variables de entorno y rutas serverless.

11. **Manejar errores de red en el frontend** — mostrar mensajes claros al usuario cuando falla una llamada a la API es mejor que dejar la pantalla en blanco o en estado de carga infinita.

12. **Usar `Promise.allSettled` en lugar de `Promise.all`** cuando se hacen múltiples llamadas independientes — evita que un error en una llamada cancele todas las demás.

---

## Conclusiones

1. **React + Vite es una combinación eficiente para desarrollo moderno** — el hot reload instantáneo y el build optimizado mejoran significativamente la experiencia de desarrollo comparado con herramientas anteriores como Create React App.

2. **Tailwind CSS v4 simplifica la configuración** — la eliminación del archivo `tailwind.config.js` y el uso de `@import "tailwindcss"` reduce el setup inicial y el riesgo de errores de configuración.

3. **Zustand es una alternativa más simple que Redux** para proyectos de tamaño mediano — su API minimalista reduce el boilerplate y facilita la comprensión del flujo de datos.

4. **JWT es la solución correcta para APIs stateless en entornos serverless** — al no requerir almacenamiento de sesiones en el servidor, funciona perfectamente en el modelo de funciones serverless de Vercel donde no hay estado persistente entre invocaciones.

5. **bcrypt es esencial para seguridad de contraseñas** — el salt aleatorio garantiza que hashes iguales no impliquen contraseñas iguales, protegiendo a los usuarios incluso si la base de datos es comprometida.

6. **Firebase Firestore se adapta bien a estructuras jerárquicas** — el modelo de subcolecciones permite representar naturalmente la jerarquía dominios → URLs → credenciales sin necesidad de joins complejos.

7. **Vercel simplifica el deploy de APIs Node.js** — la adaptación de Express a funciones serverless con `vercel.json` es mínima y el deploy automático desde GitHub elimina pasos manuales propensos a errores.

8. **Los desajustes de nomenclatura entre frontend y backend son una fuente común de bugs** — el desajuste entre `name` (UI) y `domain` (API) causó varios errores que pudieron evitarse con un contrato de API definido desde el inicio.

9. **El sistema de mocks acelera el desarrollo y facilita las pruebas** — poder simular la API completa desde el frontend permitió avanzar en la UI sin bloqueos y probar todos los flujos de forma controlada.

10. **La verificación TXT es un mecanismo estándar de la industria** — su implementación con el módulo nativo `dns.promises` de Node.js demuestra que muchas funcionalidades complejas no requieren librerías externas.

11. **La integración entre componentes requiere coordinación temprana** — los puntos de integración entre la UI, la API y la Zonal Cache deben definirse antes de implementar, no después. Los parámetros del formulario de autenticación (`?domain=`, `?redirect=`) debieron acordarse con el equipo desde el inicio.

12. **Desarrollar con IA generativa acelera la implementación pero requiere comprensión profunda** — el uso de Claude como herramienta de desarrollo fue efectivo, pero es fundamental entender cada decisión de arquitectura y cada línea de código para poder mantener y defender el proyecto.
