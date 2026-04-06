# L4 - Address Resolution Protocol

**Estudiante:** Mariela Solano Gómez  
**Carné:** 2022437963  

---

## Preguntas

### ¿En qué consiste ARP?

ARP es un protocolo dentro del conjunto TCP/IP cuyo objetivo es asociar una dirección lógica IPv4 (32 bits) con una dirección física MAC (48 bits). Su función principal es permitir que, dentro de una red local (LAN), un dispositivo pueda encontrar la dirección MAC correspondiente a una dirección IP con la que desea comunicarse.

---

### ¿Cómo funciona ARP?

El funcionamiento de ARP sigue una secuencia de pasos:

1. El emisor conoce la dirección IP del destino.
2. El protocolo IP solicita a ARP crear un mensaje de solicitud (ARP request), incluyendo la dirección física e IP del emisor y la IP del destino; la dirección física del destino se coloca en ceros.
3. Este mensaje se encapsula en una trama con dirección de destino de broadcast.
4. Todos los dispositivos de la red reciben el mensaje, pero solo el que reconoce la IP destino lo procesa.
5. El dispositivo destino responde con un mensaje ARP reply que incluye su dirección física.
6. El emisor recibe la respuesta y obtiene la dirección MAC del destino.
7. Finalmente, los datos se envían encapsulados en una trama dirigida directamente (unicast) al destino.

---

### ¿Cuáles considera son las ventajas y desventajas de Static y Dynamic Mapping?

#### Static Mapping

**Ventajas:**

- Permite que una máquina consulte directamente en una tabla la relación entre dirección IP y dirección física.

**Desventajas:**

- La dirección física puede cambiar si se modifica la tarjeta de red.
- En algunas redes, la dirección física cambia cada vez que el dispositivo se enciende.
- Un dispositivo móvil puede cambiar de red y, por lo tanto, de dirección física.
- Requiere actualizar la tabla periódicamente, lo que genera sobrecarga en la red.

#### Dynamic Mapping

**Ventajas:**

- Permite obtener la dirección física automáticamente usando un protocolo cuando se conoce la dirección lógica.

**Desventajas:**

- Depende del uso de protocolos adicionales para resolver las direcciones.

---

### ¿Cuáles son las aplicaciones de un Proxy ARP?

Proxy ARP es una técnica en la que un router actúa en nombre de otros hosts. Cuando recibe una solicitud ARP buscando la dirección IP de uno de estos hosts, responde con su propia dirección física. Luego, al recibir el paquete IP, lo reenvía al host correspondiente. Esto permite que el router represente a varios dispositivos dentro de la red.

Aplicaciones:

- Crear efecto de subnetting

- Permitir que un router actúe en nombre de varios hosts

- Facilitar la comunicación sin cambiar la configuración de toda la red
  
---

### ¿Cómo funciona el ARP spoofing?

El ARP spoofing, también conocido como envenenamiento de tablas ARP, consiste en la manipulación de las tablas ARP mediante el envío de paquetes falsificados. En este ataque, un atacante envía mensajes ARP falsos dentro de una red local con el objetivo de asociar su dirección MAC con la dirección IP de otro dispositivo [1].

De esta manera, el atacante logra posicionarse entre dos sistemas que están comunicándose, permitiéndole interceptar, espiar o incluso modificar el tráfico de datos sin que los dispositivos lo detecten. Este tipo de ataque se clasifica como un ataque "man in the middle", ya que el atacante se infiltra en la comunicación entre dos equipos.

**Referencia:**

[1] IONOS Digital Guide, «ARP spoofing: cuando el peligro acecha en la red local», 2022. [Online]. Disponible en: [IONOS Digital Guide](https://www.ionos.mx/digitalguide/servidores/seguridad/arp-spoofing-ataques-desde-la-red-interna/). [Acceso: 18-marzo-2026].
