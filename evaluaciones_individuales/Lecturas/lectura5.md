# L5 - 802.1x

**Estudiante:** Mariela Solano Gómez  
**Carné:** 2022437963  

---

## Preguntas

### ¿Cómo funciona el Port-Based Authentication?

El Port-Based Authentication es un mecanismo que controla el acceso a la red mediante la verificación previa de la identidad de un dispositivo antes de permitir su conexión. Este proceso se desarrolla de manera secuencial e involucra tres componentes principales: el supplicant (cliente), el authenticator (dispositivo de control) y el authentication server (servidor de autenticación).

En primer lugar, el proceso inicia cuando un cliente o supplicant se conecta a un puerto de red con la intención de obtener acceso. En este punto, el puerto se mantiene bloqueado para el tráfico normal, permitiendo únicamente el intercambio de mensajes relacionados con la autenticación.

Seguidamente, el authenticator, que actúa como una puerta de seguridad entre el supplicant y la red protegida, envía un mensaje solicitando la identidad del cliente mediante un EAP Request. Como respuesta, el supplicant envía sus credenciales a través de un EAP Response, contenido en un EAP frame que, a su vez, se encuentra encapsulado dentro de un EAPOL frame.

Posteriormente, el authenticator no realiza ninguna validación directa de las credenciales, sino que funciona como intermediario. Este recibe la información encapsulada en EAPOL, extrae los datos correspondientes al EAP-Method y los reenvía al authentication server mediante el protocolo RADIUS, también encapsulados adecuadamente.

Una vez que el authentication server recibe la información, procede a procesarla. Durante esta fase, se lleva a cabo un intercambio de mensajes EAP entre el supplicant y el servidor, siguiendo el método de autenticación definido (EAP-Method), hasta que se logra verificar la identidad del cliente.

Como resultado de este proceso, el servidor envía una respuesta al authenticator. Si la autenticación es exitosa (EAP Success), el puerto se habilita y el cliente obtiene acceso a la red. En caso contrario (EAP Failure), el acceso es denegado o limitado, pudiendo redirigirse a una red de invitados.

Finalmente, el authenticator es el encargado de aplicar la decisión de acceso. Dependiendo del resultado, puede permitir el acceso completo a la red, asignar al cliente a una VLAN específica o restringir su conectividad. En situaciones donde el cliente no responde, el sistema realiza varios intentos de autenticación; si no se obtiene respuesta, el puerto puede ser bloqueado o configurado para ofrecer acceso limitado.

---

### Defina los componentes principales de 802-1x.

El estándar 802.1X para autenticación basada en puertos se compone de tres elementos fundamentales que interactúan para controlar el acceso a la red: el supplicant, el authenticator y el authentication server.

En primer lugar, el supplicant es el dispositivo cliente que solicita acceso a la red. Este puede ser una computadora, un teléfono IP u otro equipo de red, cuya identidad aún no ha sido verificada. Por esta razón, el supplicant debe proporcionar credenciales válidas mediante un método de autenticación (EAP-Method) para poder acceder a los recursos protegidos.

En segundo lugar, el authenticator es un dispositivo de red de capa 2, como un switch Ethernet o un punto de acceso inalámbrico. Su función principal es actuar como una puerta de control entre el supplicant y la red protegida. Inicialmente, mantiene el puerto cerrado y solo permite el tráfico de autenticación. Además, funciona como intermediario, retransmitiendo la información entre el supplicant y el authentication server, sin realizar la validación de credenciales.

Finalmente, el authentication server es el componente encargado de verificar las credenciales del supplicant. Generalmente, este servidor utiliza el protocolo RADIUS y contiene una base de datos con la información de autenticación. A partir del intercambio de mensajes EAP, el servidor determina si el supplicant está autorizado o no para acceder a la red, enviando el resultado al authenticator.

En conjunto, estos tres componentes permiten implementar un sistema de autenticación robusto, donde el supplicant solicita acceso, el authenticator controla la conexión y el authentication server valida la identidad del usuario o dispositivo.

---

### ¿Por qué considera que este tipo de autenticación es relevante?

Es un mecanismo que permite bloquear el acceso desde el punto de conexión, es decir, desde el puerto físico o la asociación inalámbrica, lo que impide que un atacante obtenga acceso simplemente conectándose a la red. Sin este tipo de control, cualquier persona podría conectarse a un puerto Ethernet o a una red inalámbrica y comenzar a explorar vulnerabilidades

Además, este mecanismo reduce significativamente los riesgos de seguridad, ya que dificulta ataques como el escaneo de puertos, el acceso a interfaces administrativas de dispositivos o la interceptación de información sensible. La lectura menciona que un atacante con acceso a la red puede explotar múltiples debilidades, por lo que impedir ese acceso inicial es clave para la protección del sistema.

Por otro lado, también tiene otros beneficios como la asignación de permisos según el usuario, el seguimiento de la ubicación de los dispositivos en la red y la integración con sistemas de facturación o control de acceso a servicios.

Es importante resaltar que este tipo de autenticación no soluciona todos los problemas de seguridad, pero su implementación contribuye significativamente a fortalecer la protección de la red cuando se combina con otras medidas como el cifrado, la detección de intrusos y el control de accesos.

---
