# L3 - Network Media Types

**Estudiante:** Mariela Solano Gómez  
**Carné:** 2022437963  

---

## Preguntas

### **¿En qué consiste la comunicación Wireless?**

La comunicación Wireless utiliza radiofrecuencias (RF) o ondas infrarrojas (IR) para transmitir datos entre dispositivos dentro de una LAN. En las redes LAN inalámbricas, un componente clave es el hub inalámbrico o punto de acceso, el cual se utiliza para la distribución de la señal.

Para recibir las señales provenientes del punto de acceso, una PC o laptop debe instalar una tarjeta adaptadora inalámbrica (wireless NIC). Las señales inalámbricas son ondas electromagnéticas que pueden viajar a través del vacío del espacio o por un medio como el aire. Debido a esto, no es necesario un medio físico, lo que convierte a la comunicación inalámbrica en una forma muy versátil de construir una red.

Las señales inalámbricas utilizan partes del espectro de radiofrecuencia (RF) para transmitir voz, video y datos. Las frecuencias inalámbricas van desde 3 kilohertz (kHz) hasta 300 gigahertz (GHz). Las velocidades de transmisión de datos pueden variar desde 9 kilobits por segundo (kbps) hasta 54 Mbps.

Algunas aplicaciones comunes de la comunicación inalámbrica de datos incluyen:

- Acceder a Internet utilizando un teléfono celular
- Establecer una conexión a Internet en el hogar o negocio mediante satélite
- Transmitir datos entre dos dispositivos portátiles
- Utilizar un teclado y un mouse inalámbricos para la computadora

### **¿Cuál es la diferencia entre los dos modos de fibra óptica? Puede consultar otros recursos en internet para complementar esta respuesta.**

- **Single-mode:**
El cable de fibra óptica single-mode permite que solo un modo o longitud de onda de luz se propague a través de la fibra. Es capaz de ofrecer mayor ancho de banda y mayores distancias que la fibra multimode, por lo que suele utilizarse en backbones de campus. Este tipo de fibra utiliza láseres como método de generación de luz. Además, el cable single-mode es más costoso que el multimode y su longitud máxima puede superar los 10 km.

- **Multimode:**
El cable de fibra óptica multimode permite que múltiples modos de luz se propaguen a través de la fibra. Se utiliza frecuentemente para aplicaciones de grupos de trabajo y dentro de edificios, como en risers. Este tipo de fibra utiliza diodos emisores de luz (LED) como fuente de luz y su longitud máxima de cable es de aproximadamente 2 km.

En la fibra multimodo, la luz puede viajar por varias trayectorias dentro del núcleo de la fibra. Parte de la luz viaja por el centro mientras otra parte rebota dentro del cable, recorriendo una distancia mayor y tardando más tiempo en llegar al receptor. Esto provoca que el pulso de luz se “estire” durante la transmisión, lo que puede generar errores si el enlace es demasiado largo [1].

### **¿Qué importancia tiene el par trenzado en la comunicación en una LAN desde el punto de vista electromagnético?**

El par trenzado es importante en la comunicación de una LAN porque ayuda a reducir las interferencias electromagnéticas y el ruido en la transmisión de datos. Cuando una corriente eléctrica circula por un cable, se genera un campo magnético alrededor del conductor. Si dos cables están cerca, los campos magnéticos que producen son opuestos, por lo que pueden cancelarse entre sí.

El diseño de cables trenzados mejora este efecto de cancelación, lo que permite disminuir la interferencia generada por otros cables cercanos y por fuentes externas. Gracias a este proceso de cancelación y al trenzado de los conductores, el cable puede proporcionar una protección, ayudando a mantener la calidad de la señal durante la transmisión de datos en la red.

### **¿Cuál es la importancia del “shield” en los medios de transmisión cableados?**

El shield es un escudo, una capa metálica que rodea los conductores del cable y tiene como función proteger la señal de interferencias externas.

Su importancia radica en que:

- Reduce el ruido electromagnético (EMI) proveniente de otros dispositivos eléctricos.
- Disminuye las interferencias de radiofrecuencia (RFI).
- Mejora la integridad de la señal transmitida.
- Evita interferencias entre cables cercanos.

## Referencias

[1] Cisco Learning Network (Autor corporativo), “Optical Fiber Explained and Demystified,” 2017. [Online]. Disponible en: https://learningnetwork.cisco.com/s/blogs/a0D3i000002SKR6EAO/optical-fiber-explained-and-demystified. [Fecha de acceso: 12-mar-2026].
