# Instalación de Herramientas

Este documento describe la instalación de todas las herramientas necesarias para ejecutar el proyecto de Redes (IC-7602).

---

# Requisitos Previos

- Sistema Operativo: Windows 10/11 (64 bits)
- Virtualización habilitada en BIOS
- Mínimo 8GB de RAM (Recomendado 16GB)
- Conexión a Internet

---

## 1. Docker Desktop

Docker Desktop se utilizará para ejecutar Kubernetes localmente.

### 1.1 Descarga

Descargar desde:

https://www.docker.com/products/docker-desktop/

### 1.2 Instalación

1. Ejecutar el instalador.
2. Seleccionar la opción **Use WSL 2 instead of Hyper-V**.
3. Finalizar instalación.
4. Reiniciar la computadora si es necesario.

---

### 1.3 Activar Kubernetes

1. Abrir Docker Desktop.
2. Ir a **Settings → Kubernetes**.
3. Activar la opción **Enable Kubernetes**.
4. Presionar **Apply & Restart**.
5. Esperar hasta que el estado indique que Kubernetes está corriendo.

---

### 1.4 Verificación

Abrir PowerShell y ejecutar:

```bash
kubectl get nodes
```

Resultado esperado:

```bash
NAME             STATUS   ROLES           AGE
docker-desktop   Ready    control-plane
```

Si el estado es `Ready`, Kubernetes se encuentra funcionando correctamente.

---

## 2. Instalación de Helm

Helm es la herramienta utilizada para automatizar la creación de infraestructura en Kubernetes.

### 2.1 Descarga

1. Ir a:
   https://github.com/helm/helm/releases
2. Descargar el archivo:
   `helm-vX.X.X-windows-amd64.zip`
3. Extraer el archivo ZIP.

---

### 2.2 Instalación

1. Entrar a la carpeta extraída `windows-amd64`.
2. Copiar el archivo `helm.exe`.
3. Mover `helm.exe` a:

```
C:\Windows\System32
```

---

### 2.3 Verificación

Cerrar y volver a abrir PowerShell.

Ejecutar:

```bash
helm version
```

Resultado esperado:

```bash
version.BuildInfo{Version:"v3.x.x"...}
```

Si se muestra la versión, Helm está instalado correctamente.

---

## 3. Instalación de Git

Git se utiliza para el control de versiones y entrega del proyecto.

### 3.1 Descarga

Descargar desde:

https://git-scm.com/

### 3.2 Instalación

1. Ejecutar el instalador.
2. Dejar las opciones por defecto.
3. Finalizar instalación.

---

### 3.3 Verificación

Abrir PowerShell y ejecutar:

```bash
git --version
```

Resultado esperado:

```bash
git version 2.x.x
```

---

# Verificación Final del Entorno

Ejecutar los siguientes comandos para confirmar que todo está correctamente instalado:

```bash
kubectl get nodes
helm version
git --version
docker version
```

Si todos los comandos responden correctamente, el entorno se encuentra listo para iniciar la implementación del proyecto.