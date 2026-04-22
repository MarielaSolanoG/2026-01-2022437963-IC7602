# DNS API

Componente del proyecto P1 — Bases de Datos II (IC 4302).  
Implementa una API REST en Go que actúa como intermediario entre el DNS Interceptor y el servidor DNS público.

---

## Requisitos

- [Go 1.26+](https://go.dev/dl/)
- [Docker](https://www.docker.com/products/docker-desktop/)
- [Postman](https://www.postman.com/downloads/) (para pruebas manuales)
- Acceso al proyecto en Supabase (credenciales proporcionadas por el equipo)

---

## Configuración

Creá un archivo `.env` en la raíz del proyecto con estas variables:

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co/rest/v1/
SUPABASE_KEY=tu-anon-key
DNS_REMOTE_SERVER=8.8.8.8
```

> El archivo `.env` nunca se sube al repositorio ni se incluye en la imagen Docker.

---

## Estructura del proyecto

```
dns-api/
├── main.go                        # Punto de entrada, define los endpoints
├── supabase/
│   ├── client.go                  # Consultas a Supabase
│   └── client_test.go             # Tests del cliente Supabase
├── dns/
│   ├── udp_client.go              # Cliente UDP para reenviar paquetes DNS
│   └── udp_client_test.go         # Tests del cliente UDP
├── Dockerfile
├── docker-compose.yml
└── .env                           # No incluido en el repositorio
```

---

## Cómo ejecutar

### Con Go directamente

```bash
go mod download
go run main.go
```

### Con Docker Compose (recomendado)

```bash
docker compose up
```

El servidor queda disponible en `http://localhost:8080`.

---

## Endpoints

### `GET /api/exists?domain=<dominio>`

Verifica si un dominio existe en la base de datos de Supabase.

**Ejemplo de request:**
```
GET http://localhost:8080/api/exists?domain=test.com
```

**Respuesta cuando existe:**
```json
{
  "exists": true,
  "record": {
    "id": 1,
    "domain": "test.com",
    "type": "single",
    "ips": ["192.168.1.1"],
    "healthy": true
  }
}
```

**Respuesta cuando no existe:**
```json
{
  "exists": false,
  "record": null
}
```

---

### `POST /api/dns_resolver`

Recibe un paquete DNS codificado en BASE64, lo reenvía por UDP al servidor DNS remoto y devuelve la respuesta en BASE64.

**Body:**
```json
{
  "data": "<paquete DNS en BASE64>"
}
```

**Respuesta:**
```json
{
  "data": "<respuesta DNS en BASE64>"
}
```

**Cómo generar un paquete DNS de prueba:**
```bash
pip install dnspython
python -c "import dns.message, base64; q = dns.message.make_query('google.com', 'A'); print(base64.b64encode(q.to_wire()).decode())"
```

**Cómo decodificar la respuesta:**
```bash
python -c "import dns.message, base64; r = dns.message.from_wire(base64.b64decode('<BASE64 aqui>')); print(r)"
```

---

## Estructura de la tabla en Supabase

La tabla `dns_records` debe existir en el proyecto Supabase con estas columnas:

| Columna   | Tipo    |
|-----------|---------|
| `id`      | int (PK)|
| `domain`  | text    |
| `type`    | text    |
| `ips`     | jsonb   |
| `healthy` | bool    |

Los valores posibles para `type` son: `single`, `multi`, `weight`, `round-trip`, `geo`.

---

## Pruebas unitarias

```bash
go test ./...
```

Cubre los paquetes `supabase` y `dns`. La ausencia de tests implica nota 0 según el enunciado del proyecto.
