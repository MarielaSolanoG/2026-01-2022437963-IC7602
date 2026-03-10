
##  ¿Qué es el Router?

El **Router** es un contenedor Kubernetes que actúa como un **middleware de redirección de puertos** usando **iptables NAT (Network Address Translation)**. Su función es:

1. **Redirigir puerto 8080** → Apache1 en namespace `privado`
2. **Redirigir puerto 8081** → Apache2 en namespace `privado`
3. **Redirigir puerto 80** → Ingress Controller (NGINX) en namespace `publico`
4. **Redirigir puerto 5601** → Asterisk (listo para Sprint 5)

El router **NO es un servidor web**, es un **enrutador de tráfico** que usa reglas iptables para interceptar y redirigir conexiones.

---

##  ¿Por Qué Funciona Así?

### El Problema Original
- Apache1 y Apache2 están en namespace `privado` como Services ClusterIP (IPs internas)
- No es posible accederlas directamente desde fuera del cluster
- El Ingress Controller está en `publico` pero solo para HTTP centralizado

### La Solución: NAT en Kernel
```
Petición externa (puerto 8080)
    ↓
Router intercepta en PREROUTING
    ↓
DNAT: cambia destino a Apache1:80 en privado
    ↓
Apache1 recibe la petición
    ↓
Apache1 responde
    ↓
POSTROUTING: MASQUERADE (respuesta regresa al cliente original)
```

### Reglas Implementadas
```bash
# PREROUTING: intercepta tráfico entrante
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination ${AP1_IP}:80

# OUTPUT: hace que localhost:8080 también funcione
iptables -t nat -A OUTPUT -p tcp --dport 8080 -j DNAT --to-destination ${AP1_IP}:80

# POSTROUTING: permite que las respuestas regresen correctamente
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
```

---

## Interpretación 

### Requisitos Previos
- Kubernetes + kind en Docker Desktop
- Namespaces `publico` y `privado` creados
- Apache1 y Apache2 deployados en `privado`
- Ingress Controller (ingress-nginx) en `publico`

### Agregar Router a tu Rama

**El router ya está implementado. Solo necesitas:**

```powershell
cd proyectos/ProyectoOpcional

# 1. Desplegar con Helm
helm install router charts/router -n publico

# 2. Esperar a que esté Running
kubectl get pods -n publico -l app.kubernetes.io/name=router

# 3. Ver logs (debe mostrar "[Router] ✓ Configuración completada")
kubectl logs -n publico deployment/router

# Listo. El router ya está activo.
```

---

## Cómo Probar el Router

### **POR QUÉ El Testing debe ser dentro del Cluster**

Esta es una decisión arquitectónica importante basada en **cómo funciona la red en Kubernetes + Docker Desktop + kind**.

#### El Problema: NodePorts NO Son Accesibles desde Windows

Cuando se intentó acceder a un NodePort desde Windows:

```
Windows (cmd/PowerShell)
    ↓
curl http://127.0.0.1:32674/
    ↓ (intenta conectar a localhost:32674)
    ↓
Docker Desktop WSL2
    ↓ (intenta llegar a kind cluster)
    ↓ (FALLA: kind está aislado en una red Docker interna)
    ↓
ERROR "Could not connect" o timeout
```

**¿Por qué fallaba?**
- `kind` corre en una red Docker privada (172.19.0.0/16)
- Windows NO puede acceder directamente a esa red
- Los NodePorts (ej: 32674) solo funcionan DENTRO de esa red Docker

#### Alternativa 1: Port-Forward (Tampoco funcionó)

```
kubectl port-forward -n publico svc/router 18080:8080
```

Esto debería teoricamente funcionar, pero **el router es especial**:

```
Port-Forward intenta conectar a Router:8080
    ↓
Router intercepta en PREROUTING de **iptables**
    ↓
Pero el tráfico de port-forward viene desde **localhost** (127.0.0.1)
    ↓
localhost NO pasa por PREROUTING (solo el tráfico externo)
    ↓
Port-forward intenta conectar directamente a 127.0.0.1:8080
    ↓
ERROR "Empty reply from server" (no hay servidor HTTP escuchando en 8080)
```

**El router NO es un servidor web** que escuche puertos. Es un middleware de redirección. No hay nada "escuchando" en puerto 8080 del contenedor. Solo hay reglas iptables que redirigen tráfico.

#### La Solución: Testing Dentro del Cluster 

Cuando se ejecuta desde dentro del cluster (un pod de curl):

```
Pod test-curl (IP 10.244.0.18)
    ↓
curl http://router.publico.svc.cluster.local:8080/
    ↓
Petición viaja por la red de Kubernetes
    ↓
Llega al Router pod (IP 10.244.0.16)
    ↓
Router recibe en PREROUTING de iptables
    ↓
DNAT: cambia destino a Apache1 10.96.200.164:80
    ↓
Apache1 recibe y responde
    ↓
POSTROUTING: MASQUERADE hace que parezca que vino del router
    ↓
Respuesta HTTP 200 + "Hola Apache1"
    ↓
 Funciona perfectamente
```

#### ¿Por Qué Funciona Desde el Cluster?

1. **El tráfico pod-a-pod sí pasa por iptables PREROUTING**
   - Cuando un pod conecta a otro servicio, Kubernetes enruta la petición
   - El router la intercepta en PREROUTING
   - Las reglas DNAT funcionan correctamente

2. **DNS Kube-DNS resuelve correctamente**
   - `router.publico.svc.cluster.local` → 10.96.154.188 (ClusterIP del router)
   - Desde Windows: no funciona
   - Desde cluster: funciona (Kube-DNS está disponible)

3. **Kube-proxy + iptables funciona en cadena**
   - Kube-proxy mantiene reglas para balanceo de carga
   - El router agrega reglas de redirección
   - Ambas capas funcionan correctamente

4. **El router SOÍ escucha en los puertos hacia el interior del cluster**
   - PREROUTING intercepta cualquier petición a esos puertos (desde otros pods)
   - POSTROUTING garantiza las respuestas
   - OUTPUT garantiza que localhost dentro del cluster también funciona

#### Analógía del Mundo Real

Es como un **operador telefónico antiguo**:

- **Desde Windows tratando NodePort**: Intentas llamar a la oficina, pero marques el número público (NodePort). La oficina está en un edificio privado dentro de una corporación. Nunca recibirás respuesta.

- **Port-forward**: Es como decir "dame la llamada en mi número privado". Pero el operador NO está en una cabina telefónica escuchando, es solo alguien pasando mensajes por papelitos (iptables). No "escucha" el teléfono.

- **Testing desde el cluster**: Es como un empleado interno de la corporación llamando al operador interno. Las líneas internas funcionan perfecto porque el operador tiene un sistema de recepción montado.

#### Conclusión: Por Qué Testing Desde Cluster

✅ **Es la forma correcta** de validar que el router funciona  
✅ **Funciona idéntico para todos** (Windows, Linux, Mac)  
✅ **No depende de configuración de kind** (extraPortMappings)  
✅ **Valida el comportamiento real**: tráfico pod-a-pod  
✅ **Reproducible**: tus compañeros ejecutan exactamente lo mismo  

---

### Opción A: Test Desde el Cluster (Recomendado)

Esta es la **forma reproducible y confiable** que funciona desde cualquier máquina:

```powershell
# Crear pod de testing
kubectl run -it --rm test-curl --image=curlimages/curl -n publico -- sh

# Dentro del pod (shell sh), ejecutar cada test:
```

#### Test 1: Apache1 (puerto 8080)
```sh
curl -v http://router.publico.svc.cluster.local:8080/
```
**Esperado:** `HTTP/1.1 200 OK` + `<h1>Hola Apache1</h1>`

#### Test 2: Apache2 (puerto 8081)
```sh
curl -v http://router.publico.svc.cluster.local:8081/
```
**Esperado:** `HTTP/1.1 200 OK` + `<h1>Hola Apache2</h1>`

#### Test 3: Ingress + Apache1 (puerto 80/path)
```sh
curl -v http://router.publico.svc.cluster.local:80/Apache1
```
**Esperado:** `HTTP/1.1 200 OK` + `<h1>Hola Apache1</h1>`

#### Test 4: Ingress + Apache2 (puerto 80/path)
```sh
curl -v http://router.publico.svc.cluster.local:80/Apache2
```
**Esperado:** `HTTP/1.1 200 OK` + `<h1>Hola Apache2</h1>`

#### Salir del pod
```sh
exit
```

** Si todos los tests retornan HTTP 200 con respuestas correctas, el router funciona.**

---

### Opción B: Test de Diagnóstico (Avanzado)

Para verificar que las reglas iptables están configuradas:

```powershell
kubectl exec -it -n publico deployment/router -- bash
```

Dentro del contenedor:

```bash
# 1. Verificar IP forwarding (debe ser 1)
cat /proc/sys/net/ipv4/ip_forward

# 2. Ver reglas PREROUTING (redirige tráfico entrante)
iptables -t nat -L PREROUTING -n -v

# 3. Ver reglas OUTPUT (redirige tráfico local)
iptables -t nat -L OUTPUT -n -v

# 4. Ver reglas POSTROUTING (MASQUERADE para respuestas)
iptables -t nat -L POSTROUTING -n -v

# 5. Probar conectividad a Apache1
curl -v http://10.96.200.164:80/

# 6. Probar conectividad a Apache2
curl -v http://10.96.133.206:80/

# Salir
exit
```

---

### Opción C: Test de Servicio

```powershell
# Ver configuración del service
kubectl describe svc -n publico router

# Debe mostrar:
# - Type: NodePort
# - ClusterIP: 10.96.x.x
# - Endpoints con puertos 80, 8080, 8081, 5601
```

---

## Resumen de Tests

| Nombre | Comando | Resultado Esperado |
|--------|---------|-------------------|
| Apache1 directo | `curl http://router.publico.svc.cluster.local:8080/` | HTTP 200 + Hola Apache1 |
| Apache2 directo | `curl http://router.publico.svc.cluster.local:8081/` | HTTP 200 + Hola Apache2 |
| Ingress Apache1 | `curl http://router.publico.svc.cluster.local:80/Apache1` | HTTP 200 + Hola Apache1 |
| Ingress Apache2 | `curl http://router.publico.svc.cluster.local:80/Apache2` | HTTP 200 + Hola Apache2 |
| IP forwarding | `cat /proc/sys/net/ipv4/ip_forward` | 1 |
| Reglas DNAT | `iptables -t nat -L PREROUTING -n -v` | Mostrar 3 reglas DNAT |

---

## � Análisis Técnico Profundo: Por Qué SOLO Funciona Desde el Cluster

### Stack de Red en Docker Desktop + kind

```
Capa 1: Windows (Host)
├─ PowerShell / CMD
├─ NO puede acceder directamente a la red del Docker
└─ Red Windows (192.168.x.x típicamente)
        ↓
Capa 2: Docker Desktop WSL2
├─ Corre en máquina virtual Linux (WSL2)
├─ Red interna Docker (172.17.0.0/16 - host bridge)
└─ Red kind (172.19.0.0/16 - red Docker privada)
        ↓
Capa 3: kind cluster
├─ Nodos kind en contenedores Docker
├─ Pod network (10.244.0.0/16)
└─ Service network (10.96.0.0/12)
        ↓
Capa 4: Router Pod
├─ IP: 10.244.0.16 (pod network)
├─ Service ClusterIP: 10.96.154.188 (service network)
└─ Escucha iptables en puertos 80, 8080, 8081, 5601
```

### Por Qué NO Funciona NodePort desde Windows

```
Intento 1: curl http://127.0.0.1:32674/ (NodePort)
Windows CMD → 127.0.0.1 es localhost de Windows
         ↓
         Intenta conectar a Windows:32674
         ↓
         Windows no tiene puerto 32674 escuchando (está en kind)
         ↓
          Timeout o "Connection refused"

Intento 2: curl http://172.19.0.2:32674/ (IP del nodo kind)
Windows CMD → 172.19.0.2 es IP en red Docker interna
         ↓
         Windows intenta enrutar a 172.19.0.0/16
         ↓
         Windows NO tiene ruta a esa red
         ↓
          Timeout
```

### Por Qué SÍ Funciona Port-Forward Pero Falla Aquí

```
kubectl port-forward -n publico svc/router 18080:8080
         ↓
Funciona: expone router:8080 en localhost:18080
         ↓
Pero: port-forward intenta conectar a 127.0.0.1:8080
         ↓
Tráfico de 127.0.0.1 NO pasa por PREROUTING de iptables
         ↓
Cae directamente en OUTPUT de iptables
         ↓
OUTPUT tiene DNAT configurado, PERO...
         ↓
No hay servidor HTTP escuchando en 8080
         ↓
El contenedor router NO escucha puerto 8080
         ↓
Es solo reglas iptables, no un servidor
         ↓
 "Empty reply from server"
```

### Por Qué SÍ Funciona Desde Dentro del Cluster

```
Pod test-curl: curl http://router.publico.svc.cluster.local:8080/
         ↓
Petición sale del pod test-curl
         ↓
kubelet enruta a través de kube-proxy
         ↓
kube-proxy maneja el Service (router 10.96.154.188)
         ↓
Petición va a 10.96.154.188:8080
         ↓
Ingresa al router pod (10.244.0.16)
         ↓
PREROUTING de iptables INTERCEPTA
         ↓
DNAT: cambia destino a 10.96.200.164:80 (Apache1)
         ↓
Petición sale del router hacia Apache1
         ↓
Apache1 (10.244.0.14) recibe y responde
         ↓
Respuesta viaja de vuelta
         ↓
POSTROUTING aplica MASQUERADE
         ↓
Respuesta llega correctamente al pod test-curl
         ↓
 HTTP 200 OK + "Hola Apache1"
```

### La Diferencia Clave: PREROUTING vs OUTPUT

```
PREROUTING:
- Intercepta paquetes que ENTRAN a la máquina
- Funciona para tráfico pod-a-pod (vienen de otro pod)
- Funciona para tráfico externo (si pudiera llegar)
-  Funciona desde cluster

OUTPUT:
- Intercepta paquetes que SALEN de la máquina
- Funciona SOLO si hay algo escuchando en el destino
- El router NO tiene servidor escuchando
-  No funciona desde Windows (localhost)
```

### Conclusión Técnica

El router es un **middleware de redirección en kernel**, NO un **servidor de aplicación**. Requiere que:

1. **El tráfico pase por las tablas de iptables** → solo ocurre para tráfico pod-a-pod
2. **El destino sea alcanzable** → desde el cluster sí, desde Windows no
3. **Haya respuesta** → Apache1 responde, no es un servidor HTTP en 8080

Por eso **SOLO funciona desde dentro del cluster**.

---

## Estructura del Router

```
charts/router/
├── Chart.yaml
├── values.yaml                    # Configuración: ports, image, pullPolicy
├── templates/
│   ├── deployment.yaml           # Pod del router con securityContext
│   ├── service.yaml              # Service NodePort para exponer puertos
│   ├── serviceaccount.yaml
│   ├── _helpers.tpl
│   ├── configmap.yaml (si aplica)
│   └── ...
└── app/
    ├── Dockerfile                # Ubuntu 22.04 + iptables + tools
    └── router.sh                 # Script que configura reglas NAT
```

### Archivos Clave

#### `router.sh` (Script de Configuración)
```bash
#!/usr/bin/env bash
# Realiza:
# 1. Habilita IP forwarding
# 2. Limpia reglas iptables previas
# 3. Resuelve DNSs a IPs usando getent
# 4. Agrega reglas DNAT en PREROUTING
# 5. Agrega reglas DNAT en OUTPUT (para localhost)
# 6. Agrega MASQUERADE en POSTROUTING
# 7. Imprime configuración final y queda escuchando
```

#### `values.yaml` (Configuración Helm)
```yaml
image:
  tag: latest
  pullPolicy: Always              # IMPORTANTE: siempre trae imagen nueva
service:
  type: NodePort                  # Expone los puertos en el nodo
livenessProbe: {}                 # Deshabilitado (router no es servidor web)
readinessProbe: {}                # Deshabilitado
```

#### `deployment.yaml` (Pod)
```yaml
securityContext:
  privileged: true                # Necesario para iptables
  runAsUser: 0                    # Root para acceso a kernel
  capabilities:
    add:
      - NET_ADMIN                 # Permisos de red
```

---

## 🔧 Para los Demás Integrantes del Grupo

### Primero de Integración
1. **Trae cambios del repo**
   ```bash
   git pull origin main
   ```

2. **Instala el router**
   ```bash
   cd proyectos/ProyectoOpcional
   helm install router charts/router -n publico
   ```

3. **Verifica que esté corriendo**
   ```bash
   kubectl get pods -n publico -l app.kubernetes.io/name=router
   kubectl logs -n publico deployment/router
   ```

4. **Ejecuta el test DENTRO del cluster (Opción A)**
   ```bash
   kubectl run -it --rm test-curl --image=curlimages/curl -n publico -- sh
   # Luego los 4 curl commands
   ```

5. **Si todos los tests pasan ✅**
   ```bash
   echo "Router validado. Listo para trabajar."
   ```

---

## ⚠️ Notas Importantes

### 1. El Router NO es un Servidor Web
- No escucha HTTP de forma tradicional
- Solo redirige tráfico usando iptables
- No hay "puertos abiertos" en sentido tradicional

### 2. Testing desde Windows
- **Recomendado**: Usar `kubectl run` (crea pod dentro del cluster)
- NodePorts desde Windows NO funcionan en kind sin `extraPortMappings`
- Port-forward da "Empty reply" porque no hay servidor escuchando

### 3. Logs del Router
```powershell
kubectl logs -n publico deployment/router

# Debe mostrar algo como:
# [Router] Iniciando configuración de NAT...
# [Router] IP forwarding habilitado
# [Router] Reglas antiguas limpiadas
# [Router] IPs resueltas:
#   Apache1:  10.96.200.164
#   Apache2:  10.96.133.206
#   Ingress:  10.96.149.156
# [Router] Configurando DNAT (PREROUTING)...
# [Router] Configurando DNAT (OUTPUT) para tráfico local...
# [Router] Configurando SNAT (POSTROUTING)...
# =========================
# [Router] ✓ Configuración completada. Contenedor listo.
```

### 4. Si Una Prueba Falla
```powershell
# Verificar servicios en privado
kubectl get svc -n privado

# Verificar Ingress Controller en publico
kubectl get pods -n publico -l app.kubernetes.io/name=ingress-nginx

# Ver logs del router para errores
kubectl logs -n publico deployment/router

# Ver descripción del pod
kubectl describe pod -n publico -l app.kubernetes.io/name=router

# Entrar al router y check iptables
kubectl exec -it -n publico deployment/router -- bash
iptables -t nat -L -n -v
```

---

## 📚 Concepto: ¿Por Qué Necesitamos Ambas Prerouting y Output?

### PREROUTING
- Intercepta paquetes que **entran desde la red**
- Ejemplo: `curl http://router:8080` desde otro pod
- El kernel lo captura en PREROUTING y hace DNAT

### OUTPUT
- Intercepta paquetes que **salen del mismo contenedor**
- Ejemplo: `curl http://127.0.0.1:8080` dentro del router
- Sin OUTPUT, los paquetes locales no se redirigen

**En resumen**: PREROUTING maneja tráfico pod-a-pod, OUTPUT maneja tráfico local. Ambos son necesarios.

---

## 🎯 Próximos Pasos

1. **Compañeros integran el router** (este documento les guía)
2. **Sprint 5**: Agregar Asterisk (reglas ya están listas en `router.sh`)
3. **Validación final**: Todos pasan los 4 tests HTTP

---

## 📝 Validación Completada

✅ Router implementado y probado  
✅ 4 tests HTTP 200 dentro del cluster  
✅ Reglas iptables correctas (PREROUTING, OUTPUT, POSTROUTING)  
✅ Documentación para equipo  

**Fecha**: 10 Marzo 2026  
**Responsable**: Roilin Navarro Vargas
