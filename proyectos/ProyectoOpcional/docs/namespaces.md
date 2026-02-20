# Creación de Namespaces

El proyecto requiere la creación de dos namespaces en Kubernetes: `publico` y `privado`.

## 1. Archivo de Namespaces

Se creó el archivo `k8s/namespaces.yaml` con el siguiente contenido:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: publico
---
apiVersion: v1
kind: Namespace
metadata:
  name: privado
```

## 2. Aplicación de Namespaces

Ejecutar:

```bash
kubectl apply -f k8s/namespaces.yaml
```

## 3. Verificación

Ejecutar:

```bash
kubectl get ns
```

Se debe confirmar la existencia de los namespaces `publico` y `privado`.