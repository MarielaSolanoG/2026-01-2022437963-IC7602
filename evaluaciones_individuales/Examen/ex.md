**Estudiante: Mariela Solano Gómez**

**Carné: 2022437963**

**Curso: Redes**

**Examen Final**

**Pregunta # 1**

**¿Por qué TCP/IP tradicional presentaría problemas en este escenario? (10 pts.)**

El protocolo TCP es orientado a conexión mediante un proceso llamado "Three-Way Handshake". Esto significa que, antes de que se pueda transmitir cualquier dato, se debe obtener y confirmar una conexión fiable (Kaushika-Msft, 2026).

Para establecer una conexión sigue estos pasos:

- SYN: El cliente envía un paquete con la bandera SYN (connection request) junto con su número de secuencia inicial.

- SYN-ACK: El servidor responde con su propio SYN más un ACK de confirmación.

- ACK: El cliente confirma con un ACK final. La conexión queda establecida.

El problema que se presentaría en Marte es que un mensaje en el mejor de los casos tarda 4 minutos en llegar, y en el peor de los casos tarda 20 minutos. En el mejor de los casos establecer la conexión inicial tardaría 12 minutos, y en el peor de los casos tardaría 60 minutos, y si por alguna razón hay una interrupción en la conectividad y el emisor no recibe respuesta al enviar su paquete SYN, se retransmitirá este paquete automáticamente varias veces esperando un acuse de recibo, haciendo que la transmisión de datos sea extremadamente ineficiente.

**¿Qué modificaciones o protocolos alternativos propondría? (10 pts.)**

**UDP**

Propondría el uso del protocolo UDP, ya que es un protocolo sin conexión basado en mensajes, más sencillo, sin confirmaciones y sin reordenamiento de paquetes. UDP no requiere handshakes iniciales, lo que elimina el retraso para establecer una conexión. La responsabilidad de los reintentos y la integridad de los datos se traslada a la capa de aplicación.

Las desventajas de usar este protocolo incluyen:

- Poca fiabilidad ya que cuando se envía un mensaje, no se puede saber si llegará a su destino; podría perderse en el camino. No existe el concepto de acuse de recibo, retransmisión ni tiempo de espera.

- Si se envían dos mensajes al mismo destinatario, no se puede predecir el orden en que llegarán.

- Los paquetes se envían individualmente y se garantiza que llegarán completos. Los paquetes tienen límites definidos y no se pueden dividir ni fusionar en flujos de datos.

(Terms, 2019)

**SCTP**

También podría usarse Stream Control Transmission Protocol (SCTP) es un protocolo orientado a las conexiones, similar a TCP, pero proporciona la transferencia de datos orientada a mensajes, similar a UDP. Una ventaja que tendría implementar este protocolo es que proporciona cierto grado de tolerancia a errores utilizando la característica de varios inicios. Se considera que un sistema principal tiene varios inicios cuando tiene conectada más de una interfaz de red, en la misma red o en redes diferentes (AIX, s. f.). Esto significa que se puede dividir el tráfico de una sola conexión entre múltiples enlaces físicos simultáneamente, para maximizar la utilización de los enlaces entre la Tierra y las diversas colonias.

**¿Cómo manejaría retransmisiones y confirmaciones de recepción? (5 pts.)**

Si se usa el protocolo TCP ya se analizó en las respuestas anteriores que los métodos tradicionales de parada y espera de recepción de mensajes son ineficientes. Es por eso por lo que conviene usar mecanismos de canalización avanzada y retransmisión local, como los siguientes:

**Selective Repeat**

Solo se descarta la trama dañada, mientras que las tramas correctas se almacenan en un buffer de la capa de enlace. El emisor retransmite únicamente las tramas con error, normalmente apoyándose en NACKs o ACKs individuales.

**NACKs**

El receptor envía un mensaje para indicar que una trama fue recibida con errores, solicitando su retransmisión. Esto permite que el emisor reaccione antes de que expire su propio timeout.

**Ventana Deslizante**

Este mecanismo permite enviar varios paquetes sin esperar confirmación inmediata de cada uno, mejorando la eficiencia.

- El emisor tiene una "ventana" de paquetes que puede enviar.

- A medida que el receptor confirma (ACKs), la ventana se mueve (desliza) y permite enviar más datos.

- Permite un flujo continuo de datos y confirmaciones en ambos sentidos, aprovechando mejor el canal.

(Solano, 2026)

**¿Qué tipo de enrutamiento utilizaría en un entorno interplanetario? (5 pts.)**

Utilizaría el tipo de enrutamiento con el modelo de Almacenamiento y Reenvío (Store-and-Forward) que se basa en almacenar y reenviar. De hecho, hay un tipo de enrutamiento llamado Delay/Disruption Tolerant Networking (DTN) con este enfoque que lo que hace es que a diferencia de las redes terrestres, DTN no requiere un enlace activo de extremo a extremo, cada nodo de la red puede almacenar los datos hasta que el siguiente nodo esté disponible. Este método está diseñado específicamente para superar los desafíos de la latencia extrema y las interrupciones frecuentes en las comunicaciones espaciales, asegurando la entrega de datos de forma estandarizada y confiable (NASA, 2026).

Implementar este tipo de enrutamiento en un entorno interplanetario como el de la pregunta permite mantener la comunicación aun cuando existan interrupciones.

**¿Cómo diseñaría el sistema DNS o equivalente? (10 pts.)**

Utilizaría un diseño DNS Privado, donde cada colonia tenga sus propias Hosted Zones (base de datos DNS que contiene los registros de un dominio) privadas para que los recursos internos se resuelvan localmente rápidamente (Delgado, 2026). Esto garantiza que, aunque se pierda la conexión con la Tierra por una tormenta solar, las operaciones dentro de Marte sigan funcionando sin interrupciones.

Los registros se organizarían jerárquicamente (por ejemplo, *.marte.sol*) y se mantendrían en cachés DNS para minimizar repetición de consultas interplanetarias. Para controlar la latencia utilizaría Cachés Zonales: un DNS Interceptor para interceptar la petición del usuario. Si el nombre pertenece a Marte, lo resuelve de inmediato y si es una dirección terrestre, la petición se maneja de forma asíncrona mediante Store and Forward.

**¿Qué capas físicas utilizaría tanto en Marte como entre Marte y la Tierra? (5 pts.)**

Para la conectividad interna en Marte, se utilizaría una combinación de medios guiados y no guiados (Wireless). Para las ciudades utilizaría fibra óptica monomodo debido a su altísima velocidad, inmunidad a interferencias electromagnéticas y capacidad para cubrir largas distancias. Para las estaciones científicas utilizaría cable de par trenzado (Cat6 o superior) para conexiones locales mediante conectores RJ-45, mientras que la comunicación con vehículos autónomos y rovers en la superficie se realizaría a través de medios no guiados como Wi-fi y redes móviles de alta capacidad como 5G para áreas de exploración (Solano, 2026).

Para la comunicación interplanetaria entre Marte y la Tierra, se emplearían sistemas de relevo por láser, que convierten señales eléctricas en pulsos de luz para transmitir datos a gran velocidad a través del vacío, junto con enlaces de microondas de alta frecuencia (SHF/EHF) gestionados por satélites en órbita marciana (Delgado, 2026).

**¿Qué mecanismos implementaría para tolerancia a fallos y pérdida temporal de conectividad? (5 pts.)**

Se ha mencionado anteriormente en las respuestas diversos mecanismos para tolerancia a fallos y pérdida temporal de conectividad, específicamente se implementaría:

Multiplexación por almacenamiento, donde los nodos de red utilizan buffers para retener datagramas hasta que todos los fragmentos lleguen y el enlace hacia el siguiente salto esté disponible. Complementaría esto con el protocolo SCTP, el cual permite la multiplexión inversa para distribuir el tráfico entre múltiples enlaces físicos simultáneamente y el multi-homing para realizar un failover automático si un canal falla por interferencia. Asimismo, utilizaría mecanismos de ARQ (Automatic Repeat Request) con Repetición Selectiva, permitiendo que el receptor identifique tramas dañadas mediante el CRC y solicite, a través de NACKs, únicamente los paquetes específicos que fallaron para no desperdiciar ancho de banda en retransmisiones innecesarias.

Ante la pérdida temporal de conectividad, establecería Zonal Caches que actúen como proxies locales, interceptando peticiones y sirviendo recursos desde el disco para asegurar la autonomía de las colonias sin depender del enlace externo.

(Solano, 2026).


**Pregunta # 2**

**Pregunta # 3**

**Pregunta # 4**

**Referencias**

*AIX*. (s. f.). <https://www.ibm.com/docs/es/aix/7.2.0?topic=protocol-stream-control-transmission>

Delgado Pérez, A. (2026, 17 de marzo). *Apuntes – Clase de Redes "Deterioro de la Transmision (Transmission Impairments)"* [Apuntes de clase]. Curso IC 7602 – Redes.

Delgado Pérez, A. (2026,  29 de mayo). *Apuntes – Clase de Redes "Capa de Aplicación – DNS, VPC, Route 53 y Resolución de Nombres"* [Apuntes de clase]. Curso IC 7602 – Redes.

Kaushika-Msft. (2026). *Solución de problemas de conectividad tcp/IP - Windows Client*. Microsoft Learn. <https://learn.microsoft.com/es-es/troubleshoot/windows-client/networking/tcp-ip-connectivity-issues-troubleshooting>

Kaushika-Msft. (2026). *The three-way handshake via TCP/IP - Windows Server*. Microsoft Learn. <https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/three-way-handshake-via-tcpip>

NASA. (2026, 6 febrero). *Delay/Disruption tolerant networking - NASA*. <https://www.nasa.gov/communicating-with-missions/delay-disruption-tolerant-networking/>

Solano Gómez, M. (2026, 10 de marzo). *Apuntes – Clase de Redes "Introducción a Redes"* [Apuntes de clase]. Curso IC 7602 – Redes.

Solano Gómez, M. (2026, 10 de abril). *Apuntes – Clase de Redes "capa de enlace de datos"* [Apuntes de clase]. Curso IC 7602 – Redes.

Terms, I. (2019). *UDP*. <https://community.cisco.com/t5/networking-knowledge-base/udp/ta-p/3114870>
