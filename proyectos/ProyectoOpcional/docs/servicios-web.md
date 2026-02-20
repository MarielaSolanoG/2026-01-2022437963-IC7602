# Módulo 1 – Implementación de Servicios Web Internos

## Objetivo

Implementar dos servidores web (Apache1 y Apache2) dentro del namespace `privado` de Kubernetes.  

Cada servidor debe:

- Ejecutarse como un Deployment con 1 réplica
- Exponerse mediante un Service tipo ClusterIP
- Utilizar una imagen Docker personalizada
- Ser desplegado mediante Helm

Este módulo establece la base para la configuración posterior del Router e Ingress.

---

# 1. Creación de Imagen Docker – Apache1

## 1.1 Estructura del Proyecto

```
charts/apache1/app/
│
├── Dockerfile
└── index.html
```

## 1.2 Archivo index.html

```html
<h1>Hola Apache1</h1>
```

## 1.3 Dockerfile

```dockerfile
FROM httpd:2.4
COPY index.html /usr/local/apache2/htdocs/
```

## 1.4 Construcción de la Imagen

Desde la carpeta `app/`:

```bash
docker build -t apache1-custom .
```

## 1.5 Verificación Local

```bash
docker run -p 8085:80 apache1-custom
```

Acceder en el navegador:

```
http://localhost:8085
```

Debe mostrarse:

```
Hola Apache1
```

---

# 2. Creación de Imagen Docker – Apache2

Se repite el mismo procedimiento modificando únicamente el contenido del archivo HTML.

## 2.1 index.html

```html
<h1>Hola Apache2</h1>
```

## 2.2 Construcción

```bash
docker build -t apache2-custom .
```

## 2.3 Verificación Local

```bash
docker run -p 8086:80 apache2-custom
```

Acceder en el navegador:

```
http://localhost:8086
```

Debe mostrarse:

```
Hola Apache2
```

---

# 3. Creación del Helm Chart – Apache1

## 3.1 Generación del Chart

Desde la carpeta `charts/`:

```bash
helm create apache1
```

## 3.2 Configuración de values.yaml

Se ajustó el archivo `charts/apache1/values.yaml`:

```yaml
replicaCount: 1

image:
  repository: apache1-custom
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
```

---

# 4. Despliegue en Namespace Privado

Instalación del chart:

```bash
helm install apache1 ./charts/apache1 -n privado --create-namespace
```

---

# 5. Verificación en Kubernetes

Comprobación de recursos:

```bash
kubectl get pods -n privado
kubectl get svc -n privado
```

Prueba mediante port-forward:

```bash
kubectl port-forward svc/apache1 8080:80 -n privado
```

Acceso:

```
http://localhost:8080
```

Resultado esperado:

```
Hola Apache1
```

---

# 6. Creación del Helm Chart – Apache2

## 6.1 Generación

```bash
helm create apache2
```

## 6.2 Configuración de values.yaml

```yaml
replicaCount: 1

image:
  repository: apache2-custom
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80
```

---

# 7. Despliegue Apache2

```bash
helm install apache2 ./charts/apache2 -n privado --create-namespace
```

---

# 8. Verificación Apache2

```bash
kubectl port-forward svc/apache2 8081:80 -n privado
```

Acceso:

```
http://localhost:8081
```

Resultado esperado:

```
Hola Apache2
```

---

# 9. Resultado Final del Módulo

Al finalizar este módulo se obtuvo:

- Dos Deployments activos en namespace `privado`
- Dos Services tipo ClusterIP
- Ambas aplicaciones funcionando correctamente
- Infraestructura automatizada mediante Helm

Estado final verificado con:

```bash
kubectl get deploy,svc,pods -n privado
```

Los servicios web se encuentran operativos y listos para ser integrados con el Router y el Ingress.