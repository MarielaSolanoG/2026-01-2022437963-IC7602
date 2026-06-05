# DNS Interceptor

DNS Interceptor es un servidor DNS ligero escrito en Rust que intercepta consultas DNS UDP, consulta una API externa para determinar si un dominio debe resolverse localmente y, en caso contrario, actúa como proxy hacia un resolvedor DNS remoto.

El objetivo principal es permitir una resolución DNS inteligente basada en lógica externa (geolocalización, balanceo de carga, health checks, etc.) sin modificar los clientes DNS.

---

## Características

* Escucha consultas DNS vía UDP.
* Parseo manual de paquetes DNS.
* Extracción de dominios desde consultas DNS estándar.
* Resolución local mediante API HTTP.
* Construcción manual de respuestas DNS tipo A.
* Fallback automático hacia un resolvedor DNS remoto.
* Procesamiento concurrente mediante hilos (`thread::spawn`).
* TTL configurable por registro.
* Configuración mediante variables de entorno.

---

## Arquitectura

```text
Cliente DNS
     |
     v
+----------------+
| DNS Interceptor|
+----------------+
     |
     | /api/exists
     v
+----------------+
| DNS API        |
+----------------+
     |
     | Existe + Healthy
     |
     +------> Construye respuesta DNS local
     |
     | No existe / Error
     v
/api/dns_resolver
     |
     v
Resolvedor DNS externo
```

---

## Flujo de resolución

### 1. Recepción de consulta DNS

El interceptor escucha consultas DNS UDP en el puerto configurado.

```rust
UdpSocket::bind("0.0.0.0:53")
```

---

### 2. Parseo del paquete

Se valida el encabezado DNS y se extraen:

* Transaction ID
* QR Flag
* Opcode
* Dominio consultado

Ejemplo:

```text
www.example.com
```

---

### 3. Consulta a la DNS API

El interceptor realiza una petición HTTP:

```http
GET /api/exists?domain=www.example.com&client_ip=1.2.3.4
```

Respuesta esperada:

```json
{
  "exists": true,
  "healthy": true,
  "type": "A",
  "ip": "10.0.0.15",
  "ttl": 300
}
```

---

### 4. Resolución local

Si el registro:

* Existe
* Está healthy
* Tiene IP válida

entonces se construye una respuesta DNS tipo A directamente.

Ejemplo:

```text
www.example.com -> 10.0.0.15
```

---

### 5. Fallback

Si:

* No existe el registro
* Está unhealthy
* Ocurre un error
* El paquete DNS no es una consulta estándar

entonces se utiliza:

```http
POST /api/dns_resolver
```

enviando el paquete DNS original codificado en Base64.

La API devuelve la respuesta DNS completa, la cual es reenviada al cliente sin modificaciones.

---

# Estructura del proyecto

```text
src/
├── main.rs
├── dns_parser.rs
├── dns_response.rs
├── geo_locator.rs
└── query_handler.rs
```

---

## main.rs

Punto de entrada de la aplicación.

Responsabilidades:

* Abrir socket UDP.
* Escuchar consultas DNS.
* Crear un hilo por solicitud.
* Delegar el procesamiento al Query Handler.

---

## dns_parser.rs

Implementa el parseo básico de paquetes DNS.

### DNSHeader

```rust
pub struct DNSHeader {
    pub id: u16,
    pub qr: u8,
    pub opcode: u8,
}
```

### parse_header()

Extrae:

* Transaction ID
* QR Flag
* Opcode

### extract_domain()

Reconstruye el dominio consultado a partir del campo QNAME.

Ejemplo:

```text
03www07example03com00
```

↓

```text
www.example.com
```

---

## dns_response.rs

Genera respuestas DNS tipo A.

### build_a_record_response()

Construye una respuesta DNS válida utilizando:

* Transaction ID original
* Flags estándar DNS
* Pregunta original
* Registro A
* TTL configurable

Ejemplo:

```text
www.example.com -> 192.168.1.100
```

---

## geo_locator.rs

Cliente HTTP para la DNS API.

### Endpoints soportados

#### Verificación de registros

```http
GET /api/exists
```

Parámetros:

| Parámetro | Descripción        |
| --------- | ------------------ |
| domain    | Dominio consultado |
| client_ip | IP del cliente     |

---

#### Resolución DNS remota

```http
POST /api/dns_resolver
```

Payload:

```json
{
  "data": "<dns_packet_base64>"
}
```

Respuesta:

```json
{
  "data": "<dns_response_base64>"
}
```

---

## query_handler.rs

Contiene la lógica principal del interceptor.

Responsabilidades:

* Validar consultas DNS.
* Extraer dominio.
* Consultar la API.
* Construir respuestas locales.
* Aplicar fallback cuando sea necesario.
* Enviar respuestas UDP al cliente.

---

# Variables de entorno

## DNS_PORT

Puerto UDP donde escuchará el interceptor.

Valor por defecto:

```bash
53
```

Ejemplo:

```bash
export DNS_PORT=5353
```

---

## DNS_API_URL

URL base de la DNS API.

Valor por defecto:

```bash
http://localhost:8080
```

Ejemplo:

```bash
export DNS_API_URL=http://dns-api:8080
```

---

# Compilación

```bash
cargo build --release
```

---

# Ejecución

```bash
cargo run --release
```

o

```bash
./target/release/dns-interceptor
```

---

# Ejemplo de uso

Configurar un cliente DNS apuntando al servidor:

```text
192.168.1.10
```

Consulta:

```bash
dig app.miempresa.com @192.168.1.10
```

Flujo:

```text
dig
  ↓
DNS Interceptor
  ↓
/api/exists
  ↓
Registro encontrado
  ↓
Respuesta DNS local
```

o

```text
dig
  ↓
DNS Interceptor
  ↓
/api/exists
  ↓
No encontrado
  ↓
/api/dns_resolver
  ↓
Resolvedor externo
```

---

# Limitaciones actuales

* Soporta únicamente respuestas tipo A (IPv4).
* No genera respuestas AAAA (IPv6).
* No soporta QNAME comprimido en consultas.
* No implementa caché DNS local.
* No soporta TCP DNS.
* No soporta DNSSEC.
* No soporta múltiples registros en una misma respuesta.

---

# Casos de uso

* DNS geográfico.
* Balanceo de tráfico por región.
* Failover automático basado en health checks.
* Edge DNS personalizado.
* DNS interno corporativo.
* Service discovery.
* Resolución híbrida entre registros privados y DNS público.

---

# Dependencias

| Crate      | Uso                             |
| ---------- | ------------------------------- |
| serde      | Serialización y deserialización |
| serde_json | Manejo de JSON                  |
| reqwest    | Cliente HTTP                    |
| base64     | Codificación de paquetes DNS    |