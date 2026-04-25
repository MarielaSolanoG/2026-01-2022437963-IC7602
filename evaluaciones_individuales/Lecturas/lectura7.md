# L7 – Common Security Protocols for Wireless Networks

**Estudiante:** Mariela Solano Gómez  
**Carné:** 2022437963  

---

# Preguntas

---

## 1. Comente de acuerdo a la lectura las principales características de WEP, WAP y WAP2

### WEP (Wired Equivalent Privacy)

Desarrollado por Ron Rivest en 1987 e implementado por el IEEE en 1997, WEP fue el primer protocolo de seguridad inalámbrica ampliamente adoptado. Su propósito central era cifrar los datos transmitidos por los dispositivos de red.

Cifrado y autenticación: Utiliza el algoritmo RC4 (Rivest Cipher 4) como motor de cifrado por flujo, complementado con CRC-32 para verificar la integridad de los paquetes. En cuanto a la autenticación, define dos modalidades: Open System (sin restricciones de acceso) y Shared Key (basada en una clave preconfigurada compartida entre todos los dispositivos de la red, denominada Root Key).

Fortalezas y debilidades: Aunque impone una barrera mínima frente a intrusos, sus debilidades son críticas: la clave compartida puede decodificarse fácilmente capturando tráfico, el vector de inicialización se reutiliza (permitiendo descifrar sin conocer la clave), y el tamaño de clave de 40 bits resulta insuficiente ante ataques de fuerza bruta. En 2005, el FBI demostró públicamente que podía romper su cifrado en menos de 3 minutos, lo que llevó al IEEE a declararlo obsoleto.

### WAP (Wi-Fi Protected Access)

Introducido en 2003 por la Wi-Fi Alliance como respuesta directa a las fallas de WEP, WPA no es un protocolo completamente nuevo, sino una mejora estructural sobre su predecesor, diseñado para ser compatible con hardware existente.

Cifrado y autenticación: Emplea el protocolo TKIP (Temporal Key Integrity Protocol), que funciona como una capa de protección sobre WEP sin alterar su núcleo. TKIP genera claves dinámicas: por cada 10,000 paquetes de datos, las claves temporales se renuevan, lo que dificulta considerablemente el descifrado. Adicionalmente, permite hasta 280 billones de claves posibles por paquete. En cuanto a la autenticación, usa PSK (Pre-shared Key) para redes domésticas o pequeñas oficinas (SOHO), y EAP (Extensible Authentication Protocol) junto con servidores RADIUS para entornos corporativos.

Fortalezas y debilidades: Introduce el Message Integrity Code (MIC) para detectar alteraciones en los paquetes y prevenir ataques de man-in-the-middle. Sin embargo, su implementación de la clave maestra PMK presenta vulnerabilidades ante ataques de diccionario y fuerza bruta. Ataques como el de Beck-Tews y el Ohigashi-Morii expusieron debilidades del TKIP, este último capaz de inyectar paquetes falsos en tan solo un minuto.

### WAP2 (Wi-Fi Protected Access 2)

Publicado en junio de 2004 bajo el estándar IEEE 802.11i, WPA2 representa la solución definitiva y más robusta para la seguridad inalámbrica, superando las limitaciones temporales de WPA.

Cifrado y autenticación: Su cambio más significativo es la adopción del algoritmo AES (Advanced Encryption Standard) con claves de 128 a 256 bits, combinado con el protocolo CCMP (Counter Mode/CBC-MAC Protocol), que protege tanto los datos como los encabezados de los paquetes. Mantiene los dos esquemas de autenticación de WPA: PSK para entornos pequeños y servidores de autenticación 802.1X/EAP para organizaciones grandes.

Fortalezas y debilidades: WPA2 amplía el vector de inicialización a 48 bits (frente a los 24 bits de protocolos anteriores), lo que elimina prácticamente la reutilización de IVs. Además, el soporte de PMK caching y pre-autenticación reduce el tiempo de reconexión al itinerar entre puntos de acceso de 1 segundo a apenas 1/10 de segundo, beneficiando aplicaciones como VoIP y video en streaming. Entre sus debilidades, la fortaleza de su cifrado depende directamente de la calidad de la PSK elegida, y el protocolo de cuatro vías del handshake puede exponerse a ataques de diccionario. Ataques de tipo DoS tampoco pueden ser prevenidos por ningún protocolo Wi-Fi actual.
