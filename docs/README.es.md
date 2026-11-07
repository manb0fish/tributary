<div align="center">

# Tributary

**Una interfaz web rápida y moderna para el cliente BitTorrent [Transmission](https://transmissionbt.com).**

[English](../README.md) · [简体中文](README.zh-CN.md) · **Español** · [Français](README.fr.md) · [Deutsch](README.de.md) · [日本語](README.ja.md)

![Captura de Tributary](screenshot.jpg)

</div>

---

## ¿Qué es esto?

[Transmission](https://transmissionbt.com) es un programa BitTorrent gratuito y muy popular. A menudo funciona en segundo
plano (como "daemon") en un servidor doméstico, un NAS o una Raspberry Pi, y se controla desde el navegador.

**Tributary** es una página web que sustituye a la interfaz web incluida en Transmission. Se ve y se usa como una aplicación de
escritorio, está disponible en 6 idiomas y sigue siendo rápida incluso con miles de torrents. Habla directamente con
Transmission, así que no hace falta instalar ningún servidor ni base de datos adicional.

> Tributary es un proyecto independiente y no está afiliado al equipo de Transmission.

## Funciones

- 📋 **Lista de torrents**: ordena, redimensiona y oculta columnas, selecciona varios a la vez (Shift / Ctrl), menú contextual, fluida con más de 5.000 torrents
- 🔍 **Filtros y búsqueda**: por estado (descargando, sembrando, errores…), por etiqueta, por tracker
- 🔬 **Panel de detalles**: información general con mapa de piezas, árbol de archivos (elige qué descargar), pares, trackers, gráfico de velocidad
- ➕ **Añadir torrents fácilmente**: arrastra un archivo `.torrent` a cualquier parte de la página o pega enlaces magnet
- 🐢 **Modo tortuga** y **preferencias** completas (límites de velocidad, cola, reglas de siembra, red)
- 🌍 **6 idiomas**: English, 简体中文, Español, Français, Deutsch, 日本語, elegido automáticamente según tu navegador
- 🌙 **Temas oscuro y claro**, atajos de teclado (pulsa <kbd>?</kbd> en la aplicación)
- 🎮 **Modo demo**: pruébalo todo con torrents simulados, sin necesidad de Transmission

---

## Inicio rápido: prueba la demo (5 minutos)

Para esto no necesitas Transmission. Tributary detectará que no hay ningún Transmission y pasará al **modo demo** con torrents ficticios.

### 1. Instala Node.js

Descarga e instala la versión **LTS** desde [nodejs.org](https://nodejs.org) (versión 20 o superior).
Para comprobarlo, abre una terminal (en Windows: *PowerShell*; en macOS: *Terminal*) y ejecuta:

```bash
node --version
```

### 2. Descarga el código

Pulsa el botón verde **Code → Download ZIP** de esta página y descomprímelo, o, si tienes Git:

```bash
git clone https://github.com/manb0fish/tributary.git
cd tributary
```

### 3. Instala y arranca

En una terminal dentro de la carpeta `tributary`:

```bash
npm install
npm run dev
```

Ahora abre **http://localhost:5173** en tu navegador. Verás una etiqueta morada de **Demo** arriba a la izquierda. 🎉

Para detenerlo, pulsa <kbd>Ctrl</kbd> + <kbd>C</kbd> en la terminal.

---

## Conéctalo a tu propio Transmission

### 1. Comprueba que Transmission permite el acceso remoto

- **Aplicación de escritorio de Transmission:** abre *Preferencias → Remoto* y marca **Permitir acceso remoto**. El puerto por defecto es **9091**.
- **transmission-daemon** (servidores / NAS): el acceso remoto viene activado. Si configuraste usuario y contraseña, el
  navegador te los pedirá.

### 2. Arranca Tributary apuntando a él

Cambia la dirección por la de la máquina donde corre Transmission (usa `http://localhost:9091` si está en el mismo ordenador).

**macOS / Linux:**

```bash
TRANSMISSION_URL=http://192.168.1.10:9091 npm run dev
```

**Windows (PowerShell):**

```powershell
$env:TRANSMISSION_URL="http://192.168.1.10:9091"; npm run dev
```

Abre **http://localhost:5173**. La barra de estado, abajo a la derecha, debería indicar **Conectado** (punto verde).

---

## Instalación permanente

Con los pasos anteriores, Tributary se ejecuta en tu ordenador. Para que sea **el propio Transmission** quien sirva Tributary
(y puedas abrirlo desde cualquier dispositivo sin nada más en marcha), compílalo una vez y haz que Transmission apunte al resultado.

### 1. Compila

```bash
npm run build
```

Esto crea una carpeta `dist`. Cópiala a la máquina donde corre Transmission, por ejemplo en `/opt/tributary`.

### 2. Indica a Transmission que la use

Transmission lee la variable de entorno `TRANSMISSION_WEB_HOME` al arrancar.

**Linux con systemd** (la mayoría de servidores):

```bash
sudo systemctl edit transmission-daemon
```

Añade estas líneas, guarda y reinicia:

```ini
[Service]
Environment=TRANSMISSION_WEB_HOME=/opt/tributary
```

```bash
sudo systemctl restart transmission-daemon
```

**Docker:** monta la carpeta `dist` dentro del contenedor (por ejemplo en `/tributary`) y añade la variable de entorno
`TRANSMISSION_WEB_HOME=/tributary`.

**Cualquier otro caso:** define `TRANSMISSION_WEB_HOME` con la ruta completa de la carpeta antes de arrancar Transmission.

### 3. Ábrelo

Ve a **http://TU-SERVIDOR:9091/transmission/web/**. ¡Listo!

---

## Consejos

| Para… | Haz esto |
| --- | --- |
| Añadir un torrent | Arrastra un archivo `.torrent` a la página o pulsa **+ Añadir** |
| Seleccionar varios torrents | <kbd>Shift</kbd>+clic para un rango, <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+clic para elegirlos uno a uno |
| Más acciones | Clic derecho sobre un torrent |
| Elegir qué archivos descargar | Selecciona un torrent → pestaña **Archivos** → desmarca archivos |
| Buscar | Pulsa <kbd>/</kbd> y escribe |
| Cambiar idioma o tema | ⚙ (icono de controles, arriba a la derecha) → **Idioma** / **Tema** |
| Ver todos los atajos | Pulsa <kbd>?</kbd> |

Opciones útiles en la URL: `?demo` fuerza el modo demo y `?mock=5000` crea una demo con 5.000 torrents.

## Solución de problemas

<details>
<summary><b>"No se puede conectar con Transmission"</b></summary>

- Revisa la dirección y el puerto (por defecto **9091**) y que Transmission esté en marcha.
- Prueba a abrir directamente `http://DIRECCIÓN:9091/transmission/web/`. Si tampoco carga, el problema está entre tu
  ordenador y Transmission (cortafuegos, IP incorrecta).
- Si recibes **403 Forbidden**, la `rpc-whitelist` de Transmission está bloqueando tu ordenador. Detén Transmission, edita
  `settings.json` para añadir tu IP a `rpc-whitelist` (o pon `rpc-whitelist-enabled` a `false` en una red doméstica de
  confianza) y vuelve a arrancarlo. Transmission sobrescribe `settings.json` al salir, así que detenlo *antes* de editarlo.
</details>

<details>
<summary><b>Sigue mostrando datos de demostración</b></summary>

Tributary vuelve al modo demo cuando no puede conectar. Abre ⚙ → **Conexión** y elige **Solo el daemon real** para ver el
error real; luego revisa el apartado anterior.
</details>

<details>
<summary><b>"Port 5173 is already in use" (puerto en uso)</b></summary>

Otro programa está usando ese puerto. Ciérralo o ejecuta `npm run dev -- --port 5174`.
</details>

---

## Idiomas

Tributary usa automáticamente el idioma de tu navegador. Puedes cambiarlo cuando quieras en ⚙ → **Idioma** o en
*Preferencias → Interfaz*.

**¿Quieres añadir un idioma?** Copia `src/i18n/locales/en.ts` en un archivo nuevo (p. ej. `it.ts`), traduce los textos y
añádelo a la lista `LOCALES` de `src/i18n/index.ts`. Si te falta alguna clave, `npm run typecheck` te dirá exactamente cuál.
¡Las pull requests son bienvenidas!

## Para desarrolladores

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Arranca el servidor de desarrollo con recarga en caliente |
| `npm run build` | Comprueba los tipos y compila en `dist/` |
| `npm run typecheck` | Solo comprueba los tipos |
| `npm run preview` | Sirve en local la carpeta `dist/` compilada |

**Hecho con:** React 19, TypeScript (estricto), Vite, Tailwind CSS 4, Radix UI, TanStack Query / Table / Virtual, Zustand.

```
src/
├── lib/rpc/        Cliente RPC de Transmission (gestiona el intercambio 409 del session-id), tipos, backend de demo
├── lib/            caché de torrents con sondeo incremental, formato, utilidades de estado
├── i18n/           sistema de traducción + un archivo por idioma
├── components/     barra lateral, barra de herramientas, tabla, inspector, diálogos
├── hooks/          carga de datos (TanStack Query), acciones, atajos de teclado
└── store/          estado de la interfaz (Zustand)
```

## Licencia

[GPL-3.0](../LICENSE)
