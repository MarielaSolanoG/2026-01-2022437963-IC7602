# L8 - RFC 792 - Internet Control Message Protocol

**Estudiante:** Mariela Solano Gómez  
**Carné:** 2022437963  

---

# Preguntas

---

## 1. Explique el funcionamiento de ICMP.

ICMP (Internet Control Message Protocol) es un protocolo auxiliar al Protocolo de Internet (IP) cuya función principal es proporcionar retroalimentación sobre problemas ocurridos en el entorno de comunicación. Aunque ICMP utiliza el soporte básico de IP como si fuera un protocolo de nivel superior, en realidad constituye una parte integral de IP y debe ser implementado por cada módulo IP.

Los mensajes ICMP se generan en situaciones específicas: cuando un datagrama no puede alcanzar su destino, cuando un gateway carece de capacidad de buffer para reenviar un datagrama, o cuando un gateway puede indicarle al host que existe una ruta más corta hacia el destino.

Es importante destacar que ICMP no tiene como objetivo hacer a IP confiable. Su propósito es únicamente reportar errores, ya que no existe garantía de que un datagrama sea entregado ni de que un mensaje de control sea retornado.

Para evitar una regresión infinita de mensajes sobre mensajes, no se envían mensajes ICMP en respuesta a otros mensajes ICMP. Adicionalmente, los mensajes ICMP solo se generan para errores relacionados con el fragmento cero de los datagramas fragmentados.

**Formato de los mensajes:**

Los mensajes ICMP se envían utilizando el encabezado IP básico. El primer octeto de la porción de datos del datagrama corresponde al campo de tipo ICMP, cuyo valor determina el formato del resto del mensaje. Los campos etiquetados como unused están reservados para extensiones futuras, deben enviarse con valor cero y los receptores no deben utilizarlos, salvo para incluirlos en el cálculo del checksum.

## 2. Comente las aplicaciones de este protocolo en las comunicaciones.

El RFC 792 define un conjunto de mensajes ICMP que permiten gestionar distintas situaciones en la red. Cada uno representa una aplicación concreta del protocolo:

- **Control de errores de entrega**: El mensaje *Destination Unreachable* (Tipo 3) notifica al host origen cuando un datagrama no puede ser entregado, ya sea porque la red o el host destino son inalcanzables, porque el protocolo o puerto indicado no está activo, o porque el datagrama requería fragmentación pero tenía activa la bandera *Don't Fragment*.

- **Control de congestión**: El mensaje *Source Quench* (Tipo 4) permite que un gateway o host destino solicite al emisor que reduzca la tasa de envío de tráfico cuando no cuenta con suficiente espacio de buffer. El host origen debe reducir gradualmente su tasa de envío hasta que deje de recibir estos mensajes, y puede incrementarla de nuevo de forma progresiva.

- **Optimización de rutas**: El mensaje *Redirect* (Tipo 5) es enviado por un gateway para informar al host que existe una ruta más corta hacia el destino, indicándole la dirección del gateway más adecuado al que debe enviar el tráfico.

- **Control del tiempo de vida**: El mensaje *Time Exceeded* (Tipo 11) se utiliza cuando el campo TTL (*Time to Live*) de un datagrama llega a cero durante su tránsito, o cuando un host no puede completar el reensamblado de un datagrama fragmentado dentro del tiempo límite.

- **Diagnóstico de conectividad**: Los mensajes *Echo* y *Echo Reply* (Tipos 8 y 0) permiten verificar si un host es alcanzable. El host receptor debe devolver los mismos datos recibidos, lo que posibilita comprobar la comunicación de extremo a extremo.

- **Sincronización temporal**: Los mensajes *Timestamp* y *Timestamp Reply* (Tipos 13 y 14) permiten intercambiar marcas de tiempo en milisegundos desde la medianoche UTC, lo que facilita la estimación de retardos en la red.

- **Descubrimiento de red**: Los mensajes *Information Request* e *Information Reply* (Tipos 15 y 16) permiten a un host determinar el número de red al que pertenece, enviando una solicitud con la dirección de red en cero y recibiendo una respuesta con la dirección completamente especificada.

- **Reporte de problemas en parámetros**: El mensaje *Parameter Problem* (Tipo 12) notifica al host origen cuando se detecta un error en el encabezado de un datagrama que impide su procesamiento, indicando mediante un puntero el octeto exacto donde se encontró el problema.