# Sprint 3 -- Implementación del Ingress Controller

## 1. Objetivo

El objetivo de este sprint fue implementar un **Ingress Controller**
para permitir el acceso a los servidores web Apache utilizando rutas
HTTP desde el navegador.

Antes de este sprint, los servicios **Apache1** y **Apache2** solo
podían ser accedidos desde dentro del cluster o mediante
`port-forward`.\
Con el uso de Ingress se logra exponer múltiples servicios web
utilizando una única dirección.

Las rutas configuradas fueron:

-   http://localhost/Apache1
-   http://localhost/Apache2

Cada ruta redirige al servidor Apache correspondiente.

------------------------------------------------------------------------

# 2. Arquitectura antes del Sprint 3

Después del Sprint 2, la arquitectura del sistema era la siguiente:

    privado
     ├── Apache1 (ClusterIP)
     └── Apache2 (ClusterIP)

Los servicios eran accesibles únicamente desde el cluster de Kubernetes.

------------------------------------------------------------------------

# 3. Arquitectura después del Sprint 3

Después de implementar el Ingress Controller, la arquitectura quedó de
la siguiente forma:

    Cliente
       │
    Ingress Controller (NGINX)
       │
     ┌───────┴───────┐
    Apache1        Apache2
    (namespace privado)

El Ingress Controller recibe las solicitudes HTTP y decide a qué
servicio enviarlas según la ruta solicitada.

------------------------------------------------------------------------

# 4. Instalación del Ingress Controller

Para implementar el Ingress Controller se utilizó **NGINX**, instalado
mediante **Helm**.

## Agregar repositorio de Helm

    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx

Actualizar repositorios:

    helm repo update

------------------------------------------------------------------------

## Instalar el Ingress Controller

El controlador se instaló en el namespace `publico`.

    helm install ingress-nginx ingress-nginx/ingress-nginx -n publico --create-namespace

------------------------------------------------------------------------

## Verificar instalación

Se verificó que el controlador estuviera ejecutándose:

    kubectl get pods -n publico

Debe aparecer un pod similar a:

    ingress-nginx-controller

------------------------------------------------------------------------

# 5. Creación del recurso Ingress

Se creó un archivo llamado:

    k8s/ingress.yaml

con la configuración de las rutas.

    apiVersion: networking.k8s.io/v1
    kind: Ingress
    metadata:
      name: apache-ingress
      namespace: privado
      annotations:
        nginx.ingress.kubernetes.io/use-regex: "true"
        nginx.ingress.kubernetes.io/rewrite-target: /$2
    spec:
      ingressClassName: nginx
      rules:
      - http:
          paths:
          - path: /Apache1(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: apache1
                port:
                  number: 80
          - path: /Apache2(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: apache2
                port:
                  number: 80

Este recurso define las reglas que determinan cómo redirigir las
solicitudes HTTP.

------------------------------------------------------------------------

# 6. Aplicar la configuración

Se aplicó el recurso Ingress con el siguiente comando:

    kubectl apply -f k8s/ingress.yaml

Luego se verificó su creación:

    kubectl get ingress -n privado

------------------------------------------------------------------------

# 7. Problemas encontrados y solución

Durante la implementación se presentaron dos problemas principales.

## Problema 1 -- Namespace incorrecto

Inicialmente el recurso Ingress se creó en el namespace `publico`,
mientras que los servicios Apache se encuentran en `privado`.

Kubernetes no permite que un Ingress apunte a servicios que se
encuentren en otro namespace.

Esto provocó el siguiente error:

    services "apache1" not found
    services "apache2" not found

### Solución

Se eliminó el Ingress incorrecto:

    kubectl delete ingress apache-ingress -n publico

Luego se creó nuevamente en el namespace correcto (`privado`).

------------------------------------------------------------------------

## Problema 2 -- Error "Not Found" en Apache

Después de corregir el namespace, al acceder a:

    http://localhost/Apache1

Apache respondía con:

    Not Found

Esto ocurrió porque el servidor Apache recibía la ruta `/Apache1`, pero
el contenido del sitio web se encuentra en `/`.

### Solución

Se utilizó la funcionalidad de **rewrite del Ingress Controller**, que
transforma la ruta antes de enviarla al servicio.

Ejemplo:

    /Apache1 → /
    /Apache2 → /

Esto se logró mediante las anotaciones:

    nginx.ingress.kubernetes.io/use-regex
    nginx.ingress.kubernetes.io/rewrite-target

------------------------------------------------------------------------

# 8. Verificación del funcionamiento

Una vez aplicada la configuración, se probaron las rutas desde el
navegador.

    http://localhost/Apache1

Resultado esperado:

    Hola Apache1

    http://localhost/Apache2

Resultado esperado:

    Hola Apache2

Ambos servicios respondieron correctamente.

------------------------------------------------------------------------

# 9. Resultado del Sprint

Al finalizar este sprint se logró:

-   Instalar el **Ingress Controller basado en NGINX**
-   Configurar reglas de redirección HTTP
-   Conectar las rutas con los servicios Apache
-   Resolver problemas de namespace y rutas
-   Verificar el acceso desde el navegador

Con esto se completó la capa de **enrutamiento HTTP del sistema**.

------------------------------------------------------------------------

# 10. Próximos pasos

El siguiente componente a implementar es el **Router**, el cual se
ubicará en el namespace `publico`.

Este router redirigirá el tráfico hacia:

    80   → Ingress Controller
    8080 → Apache1
    8081 → Apache2
    5601 → Asterisk

El router se implementará utilizando **iptables dentro de un contenedor
Ubuntu**.
