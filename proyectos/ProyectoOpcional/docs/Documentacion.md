# Proyecto Opcional — IC7602 Redes (2026-01)

**Fecha de entrega:** 19 de marzo de 2026  
**Archivo:** `Documentacion.md`

**Integrantes:**
- Mariela Solano Gómez  
- Alejandra Delgado Pérez  
- Joshua Obando Castro  
- Roilin Navarro Vargas  

## Tabla de contenidos
1. [Introducción](#introducción)  
2. [Arquitectura requerida](#arquitectura-requerida)  
3. [Requisitos del entorno](#requisitos-del-entorno)  
4. [Estructura del repositorio](#estructura-del-repositorio)  
5. [Instalación y ejecución paso a paso](#instalación-y-ejecución-paso-a-paso)  
6. [Pruebas realizadas (reproducibles)](#pruebas-realizadas-reproducibles)  
7. [Problemas encontrados y solución](#problemas-encontrados-y-solución)   
8. [Recomendaciones ](#recomendaciones-mínimo-10)  
9. [Conclusiones ](#conclusiones-mínimo-10)  
 

## Introducción

Este proyecto implementa una arquitectura en **Kubernetes** con dos namespaces (`publico` y `privado`) para separar servicios internos y componentes de entrada y salida.

Componentes implementados:
- **Apache1 y Apache2** en `privado` (servicios web internos, Service `ClusterIP`).
- **Ingress Controller NGINX** en `publico` para enrutar por rutas HTTP (`/Apache1`, `/Apache2`).
- **Router (Ubuntu + iptables)** en `publico` para redirección por puertos:
  - `8080` → Apache1
  - `8081` → Apache2
  - `80` → Ingress Controller
  - `5601` TCP/UDP → Asterisk 

## Arquitectura requerida

### Namespaces
- `privado`: Apache1, Apache2 (y Asterisk/FreePBX cuando se implemente).
- `publico`: Ingress Controller + Router.

### Flujo esperado

**1) Acceso web centralizado (HTTP)**
- Cliente → **Router:80** → **Ingress Controller** → Apache1 o Apache2  
- Rutas:
  - `http://<entrada>/Apache1` → Apache1
  - `http://<entrada>/Apache2` → Apache2

**2) Acceso directo por puertos**
- Cliente → **Router:8080** → Apache1  
- Cliente → **Router:8081** → Apache2

**3) Telefonía**
- Cliente → **Router:5601 TCP UDP**

### Despliegue automatizado completo

```bash
helm install proyecto ./charts/proyecto-redes
```
Este comando realiza automáticamente:

- Creación de namespaces (`publico` y `privado`)
- Despliegue de servicios internos (Apache1, Apache2, Asterisk)
- Despliegue del router con reglas NAT
- Instalación del Ingress Controller (NGINX)
- Configuración del recurso Ingress
- Conectividad entre todos los componentes mediante DNS interno
---

## Requisitos del entorno

Enfocado en **Windows 10 u 11** con **Docker Desktop + WSL2**.

### Requisitos mínimos
- Windows 10/11 (64 bits)
- Virtualización habilitada (BIOS)
- 8 GB RAM mínimo (16 GB recomendado)
- Conexión a internet

### Herramientas
- Docker Desktop (con WSL2)
- Kubernetes habilitado en Docker Desktop
- kubectl
- helm
- git

### Verificación rápida (PowerShell)
```
kubectl config use-context docker-desktop
kubectl get nodes
helm version
docker version
git --version
```

## Estructura del repositorio

```text
proyectos/ProyectoOpcional/
├── k8s/
│   ├── namespaces.yaml
│   └── ingress.yaml
└── charts/
    ├── apache1/
    │   ├── app/ (Dockerfile + index.html)
    │   ├── templates/
    │   ├── Chart.yaml
    │   └── values.yaml
    ├── apache2/
    │   ├── app/ (Dockerfile + index.html)
    │   ├── templates/
    │   ├── Chart.yaml
    │   └── values.yaml
    └── router/
        ├── app/ (Dockerfile + router.sh)
        ├── templates/
        ├── Chart.yaml
        └── values.yaml


```
## Instalación y ejecución paso a paso

Ejecutar los comandos desde: `proyectos/ProyectoOpcional`

1) Confirmar que Kubernetes esté activo
```
kubectl config use-context docker-desktop
kubectl get nodes
Esperado: 1 nodo Ready.
```

2) Crear namespaces
```
cd proyectos/ProyectoOpcional
kubectl apply -f k8s/namespaces.yaml
kubectl get ns
Esperado: publico y privado.
```

3) Apache1 y Apache2 (namespace privado)

- 3.1 Construir imágenes Docker
```
cd charts/apache1/app
docker build -t apache1-custom:latest .

cd ../../apache2/app
docker build -t apache2-custom:latest .

docker images | findstr apache
```

- 3.2 Instalar con Helm
```
cd ../../..
helm upgrade --install apache1 charts/apache1 -n privado --create-namespace
helm upgrade --install apache2 charts/apache2 -n privado --create-namespace
```

- 3.3 Verificación
```
kubectl get deploy,svc,pods -n privado
Esperado: 2 deployments 1/1 y 2 services ClusterIP en puerto 80.
```

4) Ingress Controller (NGINX)

- 4.1 Instalar ingress-nginx (namespace publico)
```
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx -n publico --create-namespace
```

4.2 Verificación
```
kubectl get pods -n publico
kubectl get svc -n publico

Esperado: ingress-nginx-controller en Running.
```

4.3 Aplicar reglas Ingress (en privado)
```
kubectl apply -f k8s/ingress.yaml
kubectl get ingress -n privado

Esperado: apache-ingress creado.
```

5) Router NAT (iptables) 

- 5.1 Construir imagen del router
```
cd charts/router/app
docker build -t router-custom:latest .
docker images | findstr router
cd ../../..
```
- 5.2 Instalar router con Helm (namespace publico)
```
helm upgrade --install router charts/router -n publico --create namespace
```

- 5.3 Verificación
```
kubectl get pods -n publico -l app.kubernetes.io/name=router
kubectl describe svc -n publico router

Esperado: Service router tipo NodePort con 80, 8080, 8081, 5601 TCP/UDP.
```


---

## Pruebas realizadas 


> Nota importante (Windows + Docker Desktop + kind):  
> A veces los NodePorts no son accesibles desde Windows por temas de red o WSL o Docker.  
> Por eso, las pruebas más reproducibles son **dentro del cluster**

### Prueba 0 — Estado general
```
kubectl get pods -A
kubectl get svc -A
kubectl get ingress -A
```
Prueba 1 — Apache1 (port-forward)
```
kubectl port-forward -n privado svc/apache1 8080:80

Abrir: http://localhost:8080
Esperado: Hola Apache1
```

Prueba 2 — Apache2 (port-forward)
```
kubectl port-forward -n privado svc/apache2 8081:80

Abrir: http://localhost:8081
Esperado: Hola Apache2
```

Prueba 3 — Ingress por rutas (si el entorno lo permite)
```
Probar:

http://localhost/Apache1

http://localhost/Apache2

Esperado:

/Apache1 → Hola Apache1

/Apache2 → Hola Apache2
```

> Si no funciona directo por localhost, usar Prueba 4, la cual se hace dentro del cluster, que es la más confiable.

Prueba 4 — Router, se hace dentro del cluster. 
```
- 4.1 Crear un pod temporal con curl

kubectl run -it --rm test-curl --image=curlimages/curl -n publico -- sh

- 4.2 Probar redirecciones del router

- Router → Apache1

curl -v http://router.publico.svc.cluster.local:8080/

- Router → Apache2

curl -v http://router.publico.svc.cluster.local:8081/

- Router → Ingress → Apache1

curl -v http://router.publico.svc.cluster.local:80/Apache1

- Router → Ingress → Apache2

curl -v http://router.publico.svc.cluster.local:80/Apache2

Esperado: HTTP 200 + Hola Apache1/2

Y para salir: 

exit
```
Prueba 5 — Router: verificación técnica (iptables)
```
kubectl exec -it -n publico deployment/router -- bash

Dentro:

cat /proc/sys/net/ipv4/ip_forward

iptables -t nat -L PREROUTING -n -v
iptables -t nat -L OUTPUT -n -v
iptables -t nat -L POSTROUTING -n -v

exit

Esperado: reglas DNAT + MASQUERADE e ip_forward = 1.
```

---

## Problemas encontrados y solución

-  Problema 1:  Ingress en namespace incorrecto. 
    - Que pasaba: `services "apache1" not found`  
    - Causa: Ingress creado en `publico`, pero Apache está en `privado`  
    - Solución:** El Ingress debe estar en `privado`.

- Problema 2: “Not Found” al usar `/Apache1` o `/Apache2`
    - Causa: Apache recibe la ruta completa `/Apache1`, pero el sitio está en `/`  
    - Solución: usar rewrite con:
        - `nginx.ingress.kubernetes.io/use-regex`
        - `nginx.ingress.kubernetes.io/rewrite-target`

-  Problema 3: NodePort inaccesible desde Windows (Docker Desktop + kind)

    - Que pasaba: `curl http://127.0.0.1:<nodePort>` falla  
    - Causa: aislamiento de red Windows → WSL2 → Docker Desktop → red interna kind  
    - Solución: pruebas dentro del cluster (Prueba 4) y evidencias con `kubectl describe svc`.





## Recomendaciones 

1. Hacer un “Quickstart” corto y luego el detalle, para que el profe lo ejecute rápido.
2. Probar Apache (interno) antes de Ingress y Router, así se depura por capas.
3. Usar `helm upgrade --install` para reinstalar sin pelearse con “ya existe”.
4. No ejecutar `helm create` sobre charts ya modificados (puede sobreescribir y perder cambios).
5. Mantener `imagePullPolicy: IfNotPresent` cuando se usan imágenes locales.
6. Siempre validar con `kubectl get`, `kubectl describe` y `kubectl logs`.
7. Separar componentes en namespaces mejora orden y seguridad.
8. Documentar el “por qué” de decisiones (rewrite, pruebas dentro del cluster).
9. Para debug, usar `kubectl exec` + `iptables` + un pod temporal con `curl`.
10. Tener comandos de limpieza para reiniciar el ambiente si algo se rompe.
11. Usar pruebas reproducibles con “resultado esperado” claro.
12. Guardar evidencias (capturas/salidas) de las pruebas principales.
Conclusiones (mínimo 10)
## Conclusiones (mínimo 10)

1. Kubernetes permite separar componentes claramente usando namespaces.
2. `ClusterIP` es ideal para servicios internos (Apache en `privado`).
3. Ingress Controller resuelve enrutamiento HTTP por rutas (L7).
4. El rewrite es necesario cuando el backend no espera prefijos como `/Apache1`.
5. Un router con iptables permite redirecciones por puertos (L4) sin depender de HTTP.
6. iptables requiere permisos especiales (`NET_ADMIN`/`privileged`) dentro del contenedor.
7. Docker Desktop + kind en Windows puede limitar acceso a NodePort desde el host.
8. Probar desde dentro del cluster es una forma consistente y reproducible de validar redirecciones.
9. Helm ayuda a automatizar despliegues y reinstalaciones de manera ordenada.
10. La documentación y pruebas reproducibles son clave para la evaluación, no solo el código.
11. La arquitectura es ampliable: se pueden sumar más servicios sin rehacer todo.
12. Entender PREROUTING/OUTPUT/POSTROUTING facilita depurar problemas de NAT.
Estado de completitud
## Estado de completitud

