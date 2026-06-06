# L10 - Server Load Balancing

**Estudiante:** Mariela Solano Gómez  
**Carné:** 2022437963  

---

# Preguntas

---

## 1. ¿Qué métricas de rendimiento son importantes en los Load Balancers?

Según la lectura, existen tres métricas principales que se deben monitorear en un dispositivo de balanceo de carga. La primera es las conexiones por segundo, que mide cuántas conexiones nuevas puede aceptar el dispositivo en un segundo. Esta es considerada la más crítica porque abrir y cerrar conexiones HTTP consume muchos recursos del sistema, y generalmente es lo primero en alcanzar un límite de rendimiento. La segunda métrica es las conexiones concurrentes totales, que indica cuántas sesiones TCP abiertas puede manejar el dispositivo al mismo tiempo, algo limitado principalmente por la memoria disponible. La tercera es el throughput (caudal de datos), que mide la velocidad a la que el dispositivo puede mover tráfico a través de su infraestructura, expresado en bits por segundo.

Lo interesante es que la importancia relativa de cada métrica cambia según el tipo de tráfico del sitio. Por ejemplo, para sitios con mucho tráfico HTTP, lo más crítico son las conexiones por segundo; para sitios con FTP o streaming, lo más importante es el throughput; y para tiendas en línea (web stores), lo que más importa es sostener muchas conexiones simultáneas. Esto significa que no existe una única métrica universal: hay que observar las tres en conjunto y entender el contexto del tráfico para interpretar correctamente el estado del sistema.

## 2. Fuera del aprovisionamiento de hardware, ¿qué otras aplicaciones puede tener esta información?

Otras aplicaciones incluyen la planificación de capacidad y crecimiento del sitio: si un administrador sabe que actualmente maneja 50 Mbps pero anticipa crecer, puede usar estas métricas para decidir cuándo y cómo escalar antes de que el sistema llegue a "the wall" (el punto de colapso de rendimiento). Monitorear estas métricas continuamente permite detectar con anticipación cuándo el sistema está acercándose a sus límites, evitando interrupciones del servicio.

Otro uso importante es la optimización de funcionalidades activas en el balanceador. La lectura explica que activar características avanzadas como el análisis de URLs o la persistencia por cookies puede reducir a la mitad el throughput disponible. Con datos de observabilidad, un equipo puede tomar decisiones informadas sobre qué funciones habilitar según el tráfico real, en lugar de hacerlo a ciegas. Además, para sitios de comercio electrónico en particular, monitorear las conexiones sostenidas y la redundancia stateful no es solo una decisión técnica, sino también una decisión de negocio, ya que una falla mal manejada puede significar pérdida directa de ventas y clientes.