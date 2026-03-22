# AUTRUM 
---

## REQUISITOS PREVIOS

- **.NET 6 SDK** (o superior) instalado
- **Micrófono** (para la función de grabación)
- **Windows 10/11**

Verifica la instalación:
```powershell
dotnet --version
```

---

## INSTALACIÓN Y COMPILACIÓN

### PowerShell o Terminal

```powershell
cd C:\Users\roina\Documents\2026-01-2023213657-IC7602\Tareas_Cortas\TC1\Autrum
```

### Compilar el proyecto

```powershell
dotnet build
```

**Resultado esperado:**
```
Compilación correcta.
0 Errores
```

El archivo ejecutable se genera en:
```
bin/Debug/net6.0-windows/Autrum.exe
```

---

## EJECUCIÓN

### Desde PowerShell

```powershell
dotnet run
```

### Opción B: Ejecutar directamente el .exe

```powershell
# Desde la carpeta del proyecto:
.\bin\Debug\net6.0-windows\Autrum.exe

# O con ruta completa:
C:\Users\roi\Documents\2026-01-2023213657-IC7602\Tareas_Cortas\TC1\Autrum\bin\Debug\net6.0-windows\Autrum.exe
```

## SI LA VENTANA NO APARECE

Si ejecutan el .exe directamente en PowerShell, deben de usar `.\`delante:
```powershell
.\Autrum.exe
´´

## ESTRUCTURA

```
Autrum/
├── Autrum.csproj              ← Configuración proyecto
├── Program.cs                 ← Entry point
├── MainForm.cs                ← Interfaz (3 tabs)
├── MainForm.Designer.cs       ← Controles UI
├── AudioRecorder.cs           ← Grabación (NAudio)
├── AudioPlayer.cs             ← Reproducción (NAudio)
├── FftProcessor.cs            ← Análisis FFT
├── AudioComparator.cs         ← Comparación de espectros
├── AtmFileManager.cs          ← Almacenamiento ZIP
└── README.md                  ← Este archivo
```

---

## TECNOLOGÍAS UTILIZADAS

- **C# .NET 6** - Runtime
- **Windows Forms** - Interfaz gráfica
- **NAudio 2.2.1** - Captura y reproducción de audio
- **FFT (Transformada Rápida de Fourier)** - Análisis espectral
- **ZIP Archive** - Formato .atm para guardado

---

## CÁLCULO DE CONFIANZA (COMPARADOR)

La **Similitud General** mostrada en los resultados se calcula combinando dos métricas:

### Fórmula Principal

```
SIMILITUD GENERAL = (Armónica × 0.60) + (Potencia × 0.40)
```

### Componentes

**1. Similitud Armónica (60% del peso)**
   - Mide qué tan similares son las magnitudes de las frecuencias
   - Usa correlación espectral (producto punto normalizado)
   - Rango: 0-100%
   - Fórmula: `correlación = (Σ esp1 · esp2) / (|esp1| × |esp2|)`

**2. Similitud de Potencia (40% del peso)**
   - Mide cuánta energía tiene cada audio
   - Compara la raíz cuadrada de la suma de magnitudes al cuadrado (RMS)
   - Rango: 0-100%
   - Fórmula: `potencia = min(RMS₁/RMS₂, RMS₂/RMS₁)`

### Ejemplo de Cálculo

```
Armónica (60% peso) = 92.30%
Potencia (40% peso) = 78.50%

Similitud General = (92.30 × 0.60) + (78.50 × 0.40)
                  = 55.38 + 31.40
                  = 86.78%
                  ≈ 87.45% (redondeado)
```

### Búsqueda Temporal

El comparador realiza una **búsqueda deslizante** del audio de prueba (grabación 2) sobre el audio de referencia (grabación 1):
- Se desliza una ventana espectral sobre toda la grabación referencia
- En cada posición se calcula la similitud usando la fórmula anterior
- Se reporta la **mejor coincidencia encontrada** y su tiempo exacto en segundos
- Si no hay coincidencia clara, devuelve **TimeFoundSeconds = -1**

---

## SOLUCIÓN DE PROBLEMAS

| Problema | Solución |
|----------|----------|
| `dotnet not found` | Reinicia VS Code/PowerShell después de instalar .NET SDK |
| `Cannot find NAudio` | Ejecuta `dotnet restore` en la carpeta del proyecto |
| `Autrum.exe: The term is not recognized` | Usa `.\Autrum.exe` en PowerShell (con el punto seguido de barra) |
| `App no abre el micrófono` | Revisa permisos de audio en Windows → Configuración → Privacidad |
| `No se compila: "Compilación incorrecta"` | Ejecuta `dotnet clean` y luego `dotnet build` nuevamente |

---

**Versión:** 1.0  
**Última actualización:** 22 de Marzo, 2026
