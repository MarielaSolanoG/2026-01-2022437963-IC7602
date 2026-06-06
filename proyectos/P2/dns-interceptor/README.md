# DNS Interceptor

DNS Interceptor es un servidor DNS ligero escrito en Rust que intercepta consultas DNS UDP y responde dinámicamente con una dirección IP de caché regional basada en la ubicación geográfica del cliente.

El sistema utiliza una función RPC en Supabase para determinar el país de origen de la IP cliente y seleccionar automáticamente la caché zonal más apropiada.

Su objetivo es dirigir tráfico DNS hacia infraestructuras regionales de forma transparente para optimizar latencia, distribución geográfica y consumo de recursos.

---

# Características

* Escucha consultas DNS vía UDP.
* Parseo manual de paquetes DNS.
* Extracción de dominios desde consultas DNS estándar.
* Geolocalización de clientes mediante Supabase RPC.
* Selección automática de caché regional.
* Construcción manual de respuestas DNS tipo A.
* Procesamiento concurrente mediante hilos (`thread::spawn`).
* TTL configurable por registro.
* Configuración mediante variables de entorno.
* Sin dependencias de resolvers DNS externos.

---

# Arquitectura

```text
                   +-------------------+
                   |    Cliente DNS    |
                   +---------+---------+
                             |
                             v
                    Consulta DNS UDP
                             |
                             v
                   +-------------------+
                   |  DNS Interceptor  |
                   +---------+---------+
                             |
                             v
                  Obtiene IP del cliente
                             |
                             v
                   +-------------------+
                   |   Supabase RPC    |
                   |   buscar_pais()   |
                   +---------+---------+
                             |
                             v
                      Código de país
                             |
                             v
                 Selección de caché zonal
                             |
          +------------------+------------------+
          |                  |                  |
          v                  v                  v
     LATAM Cache       USA Cache       EUROPE Cache
          |                  |                  |
          +------------------+------------------+
                             |
                             v
                   Respuesta DNS tipo A
```

---

# Flujo de resolución

## 1. Recepción de consulta DNS

El interceptor escucha consultas DNS UDP en el puerto configurado.

```rust
UdpSocket::bind("0.0.0.0:53")
```

Cada consulta es procesada en un hilo independiente.

---

## 2. Parseo del paquete DNS

Se valida el encabezado DNS y se extraen:

* Transaction ID
* QR Flag
* Opcode

Únicamente se procesan consultas DNS estándar:

```text
QR = 0
Opcode = 0
```

---

## 3. Extracción del dominio

Se reconstruye el dominio solicitado a partir del campo QNAME.

Ejemplo:

```text
03www07example03com00
```

↓

```text
www.example.com
```

Actualmente el dominio se utiliza para fines de logging y trazabilidad.

---

## 4. Geolocalización del cliente

El interceptor obtiene la IP de origen del cliente DNS.

Ejemplo:

```rust
let client_ip = src.ip().to_string();
```

Posteriormente ejecuta una función RPC en Supabase:

```http
POST /rest/v1/rpc/buscar_pais
```

Payload:

```json
{
  "client_ip": "181.193.10.50"
}
```

Respuesta esperada:

```json
[
  {
    "country_code": "CR"
  }
]
```

---

## 5. Selección de caché regional

Según el país detectado se selecciona una IP de caché regional.

### LATAM

Países:

```text
CR
NI
PA
GT
HN
```

Variable utilizada:

```bash
ZONAL_CACHE_LATAM_IP
```

---

### Norteamérica

Países:

```text
US
CA
MX
```

Variable utilizada:

```bash
ZONAL_CACHE_USA_IP
```

---

### Europa y otras regiones

Variable utilizada:

```bash
ZONAL_CACHE_EUROPE_IP
```

---

## 6. Construcción de respuesta DNS

Una vez seleccionada la IP regional, el interceptor genera manualmente una respuesta DNS tipo A.

Ejemplo:

```text
www.example.com -> 10.10.1.10
```

La respuesta incluye:

* Transaction ID original.
* Pregunta DNS original.
* Registro tipo A.
* TTL configurable.
* Compresión DNS para el nombre consultado.

---

## 7. Envío de respuesta

La respuesta DNS generada es enviada directamente al cliente mediante UDP.

```rust
socket.send_to(&dns_response, src)?;
```

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

## query_handler.rs

Contiene la lógica principal del interceptor.

Responsabilidades:

* Validar consultas DNS.
* Extraer dominios.
* Obtener IP de origen.
* Consultar país del cliente.
* Seleccionar caché regional.
* Construir respuestas DNS.
* Enviar respuestas UDP.

---

## geo_locator.rs

Cliente encargado de consultar Supabase para determinar la ubicación geográfica del cliente.

### RPC soportada

```http
POST /rest/v1/rpc/buscar_pais
```

Payload:

```json
{
  "client_ip": "181.193.10.50"
}
```

Respuesta:

```json
[
  {
    "country_code": "CR"
  }
]
```

También implementa la lógica de asignación:

```text
País → Caché regional
```

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

Reconstruye el dominio consultado desde el campo QNAME.

---

## dns_response.rs

Genera respuestas DNS tipo A.

### build_a_record_response()

Construye una respuesta DNS válida utilizando:

* Transaction ID original.
* Pregunta DNS original.
* Registro A.
* TTL configurable.

Actualmente utiliza compresión DNS:

```text
C0 0C
```

para referenciar el nombre consultado en la sección de respuesta.

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

## SUPABASE_URL

URL base de Supabase.

Ejemplo:

```bash
export SUPABASE_URL=https://mi-proyecto.supabase.co
```

---

## SUPABASE_KEY

API Key utilizada para ejecutar la función RPC.

Ejemplo:

```bash
export SUPABASE_KEY=xxxxxxxxxxxxxxxx
```

---

## ZONAL_CACHE_LATAM_IP

IP de la caché regional para Latinoamérica.

Ejemplo:

```bash
export ZONAL_CACHE_LATAM_IP=10.10.1.10
```

---

## ZONAL_CACHE_USA_IP

IP de la caché regional para Norteamérica.

Ejemplo:

```bash
export ZONAL_CACHE_USA_IP=10.20.1.10
```

---

## ZONAL_CACHE_EUROPE_IP

IP de la caché regional para Europa y otras regiones.

Ejemplo:

```bash
export ZONAL_CACHE_EUROPE_IP=10.30.1.10
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
Geolocalización del cliente
  ↓
Selección de caché regional
  ↓
Respuesta DNS tipo A
```

Resultado:

```text
app.miempresa.com -> 10.10.1.10
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
* No soporta balanceo entre múltiples IPs regionales.
* Actualmente todas las respuestas corresponden a una caché regional determinada por la ubicación del cliente.

---

# Casos de uso

* CDN privada.
* Cachés regionales.
* Distribución geográfica de contenido.
* Optimización de latencia.
* Edge DNS.
* Infraestructura multi-región.
* Streaming de contenido.
* Plataformas SaaS distribuidas globalmente.
* Service delivery por proximidad geográfica.

---

# Dependencias

| Crate      | Uso                             |
| ---------- | ------------------------------- |
| serde      | Serialización y deserialización |
| serde_json | Manejo de JSON                  |
| reqwest    | Cliente HTTP para Supabase      |
