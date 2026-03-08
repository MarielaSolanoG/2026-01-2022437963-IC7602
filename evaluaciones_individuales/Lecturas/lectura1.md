# L1 – Brief History of the Internet (1997)

**Estudiante:** Mariela Solano Gómez  
**Carné:** 2022437963  

---

# Preguntas

---

## 1. Explique cómo se originó el Internet

El Internet se originó a partir de investigaciones académicas y militares realizadas en la década de 1960, impulsadas principalmente por la necesidad de compartir información y recursos computacionales de manera eficiente.  

Uno de los primeros antecedentes fue el concepto de “Galactic Network”, propuesto en 1962 por J. C. R. Licklider, quien imaginó una red global de computadoras interconectadas que permitiera a las personas acceder rápidamente a datos y programas desde cualquier lugar. Esta idea fue promovida dentro de la agencia DARPA, donde Licklider trabajó y convenció a otros investigadores de su importancia.

Un avance clave fue el desarrollo de la conmutación de paquetes, propuesta por Leonard Kleinrock, quien demostró teóricamente que transmitir información en paquetes era más eficiente que usar circuitos dedicados.  

En 1965 se realizó la primera conexión entre computadoras distantes, lo que evidenció que los sistemas telefónicos tradicionales no eran adecuados y confirmó la necesidad de redes basadas en paquetes.

Estos avances llevaron a la creación de ARPANET, cuyo diseño se presentó en 1967 y cuya implementación comenzó en 1969 con la conexión de cuatro universidades. A partir de ARPANET se desarrollaron protocolos de comunicación que permitieron el crecimiento de la red y la creación de aplicaciones como el correo electrónico.

Con el tiempo, ARPANET evolucionó hacia el Internet actual gracias al concepto de arquitectura abierta, que permitió interconectar múltiples redes independientes. Este enfoque culminó en el desarrollo del protocolo TCP/IP, que sentó las bases técnicas del Internet moderno y posibilitó su expansión global.

---

## 2. De acuerdo con la lectura, ¿Qué es circuit switching y packet switching?

### Circuit Switching

- Método tradicional utilizado por la red telefónica.
- Se establece un circuito dedicado extremo a extremo.
- La comunicación es continua y síncrona.
- Si el circuito falla, la comunicación se interrumpe.
- Los bits viajan por una ruta fija previamente establecida.

---

### Packet Switching

- La información se divide en paquetes independientes.
- Cada paquete puede tomar rutas distintas.
- No requiere un circuito dedicado.
- Es más eficiente en el uso del ancho de banda.
- Kleinrock demostró que era más eficiente que el circuit switching.
- El Internet moderno funciona bajo este modelo.

---

## 3. ¿Qué tanto impacto causó las “Four ground rules” en el Desarrollo de las comunicaciones actuales? Base su respuesta en su conocimiento actual de cómo funcionan las redes, comunicaciones y el Internet.

Las cuatro reglas establecían que:

- Cada red podía funcionar por sí sola.
- La comunicación sería “best effort”.
- Se usarían dispositivos intermedios (routers o gateways).
- No existiría un control central del Internet.

### Impacto en las comunicaciones actuales

**1. Internet no depende de una sola autoridad**  
Internet está formado por muchas redes conectadas entre sí, no pertenece a una sola empresa o país.

**2. Se pueden conectar redes diferentes**  
Universidades, empresas y hogares pueden conectarse aunque sus redes internas sean distintas.

**3. Mayor resistencia a fallos**  
Si una ruta falla, los paquetes pueden enviarse por otro camino.

**4. Uso de routers para interconectar redes**  
Los routers deciden por dónde enviar la información, permitiendo que millones de dispositivos se comuniquen.

---

## 4. Explique el rol de la documentación en las redes.

La documentación ha sido fundamental en el desarrollo del Internet.  

En 1969 se creó la serie RFC (Request for Comments), documentos donde los investigadores compartían ideas, propuestas y soluciones sobre el funcionamiento de la red.

Estos documentos permitieron:

- Colaboración entre investigadores en distintos lugares.
- Definir claramente reglas y protocolos.
- Mejorar continuamente las propuestas.
- Establecer estándares formales.

Gracias a la documentación, el Internet pudo crecer de manera organizada y abierta. Actualmente, los RFC siguen siendo los documentos oficiales donde se definen muchos de los estándares que permiten el funcionamiento global del Internet.

---

## 5.  En la lectura se mencionan múltiples dispositivos de red, así como protocolos, por ejemplo satélites, ethernet y routers (pero no se limita solo a estos), extraiga todos estos nombres de dispositivos y mediante alguna herramienta de Inteligencia artificial generativa (que se debe especificar), proporcione una definición de cada dispositivos en el ámbito de redes además pregunte ¿A que capa del modelo de referencia OSI pertenece el dispositivo o protocolo?

**Herramienta utilizada:** ChatGPT (modelo GPT-5) como herramienta de IA generativa para definir y clasificar cada elemento según el modelo OSI.

---

### 1. ARPANET
- Red pionera basada en packet switching.
- Tipo: Red de área amplia experimental.
- Capa OSI: No aplica directamente (infraestructura completa).

### 2. IMP (Interface Message Processor)
- Primeros switches de paquetes de ARPANET.
- Función: Encaminamiento de paquetes.
- Capa OSI: Capa 3 (Red).

### 3. Router
- Dispositivo que reenvía paquetes entre redes.
- Función: Enrutamiento basado en direcciones IP.
- Capa OSI: Capa 3 (Red).

### 4. Gateway
- Dispositivo que conecta redes diferentes.
- Función: Traducción y reenvío.
- Capa OSI: Puede operar en Capa 3 o superior.

### 5. TCP (Transmission Control Protocol)
- Protocolo orientado a conexión.
- Función: Control de flujo y confiabilidad.
- Capa OSI: Capa 4 (Transporte).

### 6. IP (Internet Protocol)
- Protocolo de direccionamiento y envío de paquetes.
- Función: Entrega de datagramas.
- Capa OSI: Capa 3 (Red).

### 7. UDP (User Datagram Protocol)
- Protocolo no orientado a conexión.
- Función: Envío rápido sin garantía.
- Capa OSI: Capa 4 (Transporte).

### 8. Ethernet
- Tecnología de red local (LAN).
- Función: Comunicación en red local.
- Capa OSI: Capas 1 (Física) y 2 (Enlace de datos).

### 9. DNS (Domain Name System)
- Sistema de resolución de nombres.
- Función: Traduce nombres a direcciones IP.
- Capa OSI: Capa 7 (Aplicación).

### 10. NCP (Network Control Protocol)
- Protocolo inicial de ARPANET.
- Función: Comunicación host-to-host.
- Capa OSI: Similar a Capa 4 (Transporte).

### 11. SNMP (Simple Network Management Protocol)
- Protocolo de administración de red.
- Función: Gestión remota de dispositivos.
- Capa OSI: Capa 7 (Aplicación).

### 12. FTP (File Transfer Protocol)
- Protocolo de transferencia de archivos.
- Función: Envío de archivos.
- Capa OSI: Capa 7 (Aplicación).

### 13. Telnet
- Protocolo de acceso remoto.
- Función: Conexión remota.
- Capa OSI: Capa 7 (Aplicación).

### 14. LAN (Local Area Network)
- Red local.
- Capa OSI: Infraestructura física y de enlace (Capas 1 y 2).

### 15. Satélites (Packet Satellite Networks)
- Red basada en enlaces satelitales.
- Capa OSI: Capa 1 (Medio físico).