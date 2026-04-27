# DNS UI

Interfaz web del sistema DNS Management. Permite al administrador gestionar registros DNS, health checks y la base de datos IP to Country sin acceder directamente a Supabase.

## Tecnologías

- React 18 + Vite
- JavaScript (ES6+)
- CSS puro
- nginx (para producción en Docker)

## Arquitectura

```
dns-ui (React)
    │
    │  HTTP REST (fetch)
    ▼
dns-api (Go - puerto 8080)
    │
    │  HTTP REST (Supabase client)
    ▼
Supabase (PostgreSQL)
```

La UI no se conecta directamente a Supabase — todas las operaciones pasan por el `dns-api`.

## Requisitos

- Node.js v18 o superior
- dns-api corriendo en `http://localhost:8080`

## Instalación y ejecución local

```bash
# 1. Entrar a la carpeta
cd dns-ui

# 2. Instalar dependencias
npm install

# 3. Crear el archivo de variables de entorno
echo "VITE_API_URL=http://localhost:8080" > .env

# 4. Correr en modo desarrollo
npm run dev
```

La UI queda disponible en `http://localhost:5173`.

## Ejecución con Docker

```bash
# Construir la imagen
docker build -t dns-ui .

# Correr el contenedor
docker run -p 80:80 dns-ui
```

La UI queda disponible en `http://localhost:80`.

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base del dns-api | `http://localhost:8080` |

## Funcionalidades

### DNS Records

Permite gestionar los registros DNS almacenados en Supabase.

**Tipos de registro soportados:**

| Tipo | Descripción |
|---|---|
| `single` | Una sola IP fija |
| `multi` | Varias IPs en round-robin |
| `weight` | Varias IPs con peso — la de mayor peso atiende más tráfico |
| `round-trip` | Devuelve la IP con menor latencia según ubicación del usuario |
| `geo` | Devuelve una IP según el país de origen del usuario |

**Operaciones:**
- Crear registro con su health check
- Editar registro existente
- Eliminar registro
- Ver estado (Healthy / Unhealthy) en tiempo real

### Health Checks

Muestra el estado de salud de cada registro DNS. Los health checks son ejecutados por el componente `health-checker` de forma periódica. La UI solo los visualiza.

**Tipos de health check:**
- `TCP` — verifica que se pueda abrir una conexión al servidor
- `HTTP` — verifica que el servidor responda con el código HTTP esperado

**Parámetros configurables:**

| Parámetro | Descripción |
|---|---|
| `timeout` | Tiempo máximo de espera en segundos |
| `retries` | Número de intentos antes de marcar como unhealthy |
| `interval` | Cada cuántos segundos se repite la prueba |
| `path` | Path HTTP a verificar (solo tipo HTTP) |
| `expected_codes` | Códigos HTTP esperados, ej: 200, 201 (solo tipo HTTP) |

### IP to Country

Permite gestionar la base de datos que mapea rangos de IPs a países. Es usada por el DNS Interceptor para determinar el país de origen de una consulta y aplicar la lógica del tipo de registro `geo`.

**Operaciones:**
- Agregar rango CIDR con su país
- Editar registro existente
- Eliminar registro

**Formato del campo CIDR:** `x.x.x.x/n` — por ejemplo `200.200.0.0/16` representa todas las IPs entre `200.200.0.0` y `200.200.255.255`.

## Endpoints del dns-api que usa la UI

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/records` | Lista todos los registros DNS |
| POST | `/api/records` | Crea un registro DNS |
| PUT | `/api/records/:id` | Actualiza un registro DNS |
| DELETE | `/api/records/:id` | Elimina un registro DNS |
| GET | `/api/ip-country` | Lista registros IP to Country |
| POST | `/api/ip-country` | Crea un registro IP to Country |
| PUT | `/api/ip-country/:id` | Actualiza un registro IP to Country |
| DELETE | `/api/ip-country/:id` | Elimina un registro IP to Country |

## Pruebas realizadas

### Prueba 1 — Crear registro Single
```
Domain:     single-test.com
Type:       single
IP:         10.0.0.1
Check Type: TCP | Timeout: 3s | Retries: 2 | Intervalo: 10s
Resultado:    registro aparece en tabla con estado Healthy
```

### Prueba 2 — Crear registro Multi
```
Domain:     multi-test.com
Type:       multi
IPs:        10.0.0.1, 10.0.0.2, 10.0.0.3
Check Type: TCP | Timeout: 3s | Retries: 2 | Intervalo: 10s
Resultado:    registro aparece con 3 IPs en Supabase
```

### Prueba 3 — Crear registro Weight
```
Domain:     weight-test.com
Type:       weight
IPs:        10.0.0.1 (peso 3), 10.0.0.2 (peso 1)
Check Type: TCP | Timeout: 5s | Retries: 3 | Intervalo: 30s
Resultado:    pesos guardados correctamente en Supabase
```

### Prueba 4 — Crear registro Round-trip
```
Domain:     roundtrip-test.com
Type:       round-trip
IPs:        10.0.0.1, 10.0.0.2
Check Type: TCP | Timeout: 3s | Retries: 2 | Intervalo: 10s
Resultado:    registro creado correctamente
```

### Prueba 5 — Crear registro Geo
```
Domain:     geo-test.com
Type:       geo
IPs:        10.0.0.1 (CR), 10.0.0.2 (US), 10.0.0.3 (MX)
Check Type: HTTP | Path: /health | Códigos: 200
Resultado:    países guardados por IP en Supabase
```

### Prueba 6 — Editar registro
```
Registro:   single-test.com
Cambio:     IP de 10.0.0.1 a 192.168.1.50
Resultado:    tabla actualizada inmediatamente
```

### Prueba 7 — Eliminar registro
```
Acción:     eliminar multi-test.com
Resultado:    registro desaparece de la tabla
```

### Prueba 8 — Verificar en Postman
```
GET http://localhost:8080/api/records
Resultado:    JSON con todos los registros y sus IPs
```

### Prueba 9 — Verificar existencia via API
```
GET http://localhost:8080/api/exists?domain=geo-test.com
Resultado:  {"exists": true, "record": {...}}
```

### Prueba 10 — IP to Country
```
CIDR:    200.200.0.0/16
Código:  CR
Nombre:  Costa Rica
Resultado: aparece bandera 🇨🇷
```

## Estructura de archivos

```
dns-ui/
├── src/
│   ├── App.jsx        # Componente principal con todas las vistas
│   ├── App.css        # Estilos globales
│   └── api.js         # Funciones de comunicación con el dns-api
├── public/
├── Dockerfile         # Imagen Docker para producción
├── nginx.conf         # Configuración de nginx
├── .env               # Variables de entorno (no se sube al repo)
├── .gitignore
├── index.html
├── package.json
└── vite.config.js
```

## Recomendaciones

1. Siempre tener el `dns-api` corriendo antes de abrir la UI, de lo contrario la tabla aparecerá vacía.
2. Verificar que el archivo `.env` existe con `VITE_API_URL` correcto antes de correr `npm run dev`.
3. Para producción usar Docker — el comando `npm run dev` es solo para desarrollo.
4. Si se agregan nuevos campos al struct `DnsRecord` en Go, actualizar también el `api.js` de la UI.
5. El campo `healthy` lo actualiza el `health-checker` automáticamente — no modificarlo manualmente desde la UI.
6. Para depurar errores de red abrir F12 → Network en el navegador y verificar qué responde el API.
7. Si la tabla aparece vacía verificar CORS en el `dns-api` — debe tener el header `Access-Control-Allow-Origin: *`.
8. Los registros tipo `geo` requieren que existan entradas en `ip_to_country` para funcionar correctamente.
9. Usar Postman para probar los endpoints del `dns-api` de forma independiente antes de probar desde la UI.
10. No subir el archivo `.env` al repositorio — contiene credenciales.

## Conclusiones

1. React con Vite permite un desarrollo rápido con recarga en caliente, ideal para iterar sobre la interfaz.
2. Separar la UI del API permite que ambos componentes se desarrollen y prueben de forma independiente.
3. El uso de `fetch` nativo de JavaScript es suficiente para consumir APIs REST simples sin necesidad de librerías externas.
4. La arquitectura de microservicios facilita que cada integrante trabaje en su componente sin bloquear a los demás.
5. El tipo de registro `geo` es el más complejo porque depende de tres componentes: la UI, el API y la tabla `ip_to_country`.
6. Docker con nginx es la forma estándar de servir aplicaciones React en producción.
7. Las variables de entorno con el prefijo `VITE_` permiten configurar la URL del API sin hardcodear valores en el código.
8. El campo `omitempty` en Go es crítico para no interferir con los campos autogenerados por Supabase como el `id`.
9. CORS debe estar habilitado en el API para que el navegador permita las peticiones desde un origen diferente.
10. Probar cada tipo de registro por separado facilita identificar errores específicos en la lógica del sistema.