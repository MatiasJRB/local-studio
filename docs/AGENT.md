# Operar Local Studio como agente

Esta guía es para un asistente con acceso al checkout, ejecución local y, para configurar la app, control del navegador. No instala un agente dentro de Local Studio. Leé primero [AGENTS.md](../AGENTS.md); usá la [referencia técnica](TECHNICAL.md) para arquitectura y límites.

## Objetivo de la sesión

Convertí el pedido del usuario en un encuadre listo para grabar: fuente prevista, cámara, micrófono, resolución y estilo. Usá lo que ya dijo; preguntá sólo por decisiones que falten y afecten la toma. Si no especificó un estilo, conservá los valores actuales y explicá el resultado. No modifiques el código para ajustar opciones que ya existen en la UI.

Diferenciá **preparado**, **grabando** y **archivo finalizado y revisado**. No afirmes que está grabando por tener la preview abierta ni que se guardó por haber presionado un botón.

## Preparar el entorno

1. Identificá el checkout y su estado antes de editar o instalar. Si falta, cloná `https://github.com/MatiasJRB/local-studio.git` en una carpeta apropiada, sin sobrescribir nada.
2. Comprobá Node y las versiones admitidas en `package.json`. Ejecutá `npm ci` y `npm run dev`; abrí la URL efectiva que informa Vite. Reutilizá una instancia existente cuando corresponda. Para un proceso que deba sobrevivir a la sesión, usá la supervisión disponible en el entorno del usuario y comprobá que siga accesible.
3. Usá Chrome de escritorio como entorno probado. Verificá que aparezcan los controles del estudio y el estado inicial. Una app abierta en móvil no demuestra que la captura de escritorio funcione.
4. Si no tenés control del navegador, entregá la URL y los pasos manuales de [USAGE.md](USAGE.md); indicá qué preparaste y qué debe ajustar el usuario. No declares controles configurados si no los operaste.

## Configurar mediante la interfaz

Preferí labels y roles accesibles. Los IDs de esta tabla son referencias del código actual; verificá el DOM antes de actuar. Usá las acciones de los controles que disparan sus eventos de entrada/cambio. No basta con cambiar un atributo HTML o escribir en `localStorage`.

| Pedido                | Control / ID                                                                         | Valores actuales                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Ubicar en una esquina | Posición de tu cámara / `corner`                                                     | `bottom-right`, `bottom-left`, `top-right`, `top-left`                                           |
| Ubicar libremente     | Cámara y tirador / `camera-move`, `camera-resize`                                    | Arrastre o flechas; Shift acelera. La cámara debe estar disponible para editar sobre la preview. |
| Tamaño                | Tamaño de tu cámara / `size`                                                         | 0.12–0.65; fracción de la altura del video                                                       |
| Forma y espejo        | `shape`, `mirror`                                                                    | `circle` o `rounded`; espejo activado/desactivado                                                |
| Borde                 | `border-color`, `border-width`, `border-opacity`                                     | Color hexadecimal; 0–24 px; opacidad 0–1                                                         |
| Sombra                | `shadow-on`, `shadow-color`, `shadow-opacity`, `shadow-blur`, `shadow-x`, `shadow-y` | Activación; color hexadecimal; 0–1; 0–80 px; desplazamientos −60–60 px                           |
| Resolución            | Resolución / `quality`                                                               | `1080` o `720`, siempre 16:9                                                                     |
| Fuentes opcionales    | Cámara / `want-camera`, Micrófono / `want-mic`                                       | Activadas/desactivadas                                                                           |
| Dispositivos          | Cámara / `camera-device`, Micrófono / `mic-device`                                   | Opciones enumeradas por el navegador tras los permisos                                           |
| Volver al inicio      | Restablecer cámara y estilo / `reset-camera`                                         | Restablece preferencias de cámara y estilo                                                       |

Los valores en píxeles del estilo se refieren al video en 1080p. La posición y estilo se guardan bajo `local-studio-camera-v1` en el almacenamiento del navegador y origen actuales; la resolución y la selección de dispositivos no forman parte de esas preferencias. No borres ni exportes el almacenamiento del usuario para automatizar una configuración.

Ejemplo de traducción de un pedido: “cámara circular abajo a la derecha, borde blanco fino y sombra suave” puede usar `circle`, `bottom-right`, borde `#ffffff` de 3 px y opacidad 1, sombra activada negra con opacidad 0.45, suavidad 20 px y desplazamientos 0/10 px. Es un punto de partida propuesto, no un preset incorporado. Verificá el encuadre y ajustá si el usuario pide otra cosa.

## Elegir las fuentes y grabar

1. Dejá listo el estilo y acompañá al usuario a **Elegir pantalla, ventana o pestaña** (`screen`). El selector nativo, los permisos y la fuente a compartir son decisiones del usuario. No los concedas automáticamente ni simules un consentimiento.
2. Para una reacción, usá la pestaña del video con audio compartido. Un archivo local puede abrirse en `player.html` mediante **Elegir video local**; nunca lo subas ni lo copies al repo. El usuario elige el archivo.
3. Acompañá a **Preparar cámara y micrófono** (`devices`) con las fuentes deseadas. No actives hardware sin autorización. Verificá `screen-state`, `device-state` y los medidores `mic-meter` / `source-meter`. No prometas audio de sistema: sólo hay audio si la fuente entrega una pista.
4. Pedí una toma corta de prueba y revisar imagen y ambos sonidos con auriculares. No ejecutes una grabación sólo para comprobar una configuración visual.
5. El usuario inicia con **Grabar** (`record`) y elige dónde guardar si aparece el selector. Para una reacción, luego reproduce el video. No arranques una toma por tu cuenta.
6. Al finalizar, **Detener y guardar** (`stop`) cierra el archivo. Verificá el estado y `result-note`; puede aparecer **Revisar archivo guardado** (`review-file`) o **Descargar video** (`download`) según el modo. Si requiere un selector o descarga, acompañá ese paso sin asumir que ocurrió.
7. Revisá el video final sólo con autorización para acceder a esa toma. Si no se revisó, informá “archivo finalizado, revisión pendiente”. Al terminar, **Apagar fuentes** (`release`) libera los dispositivos.

## Resolver problemas con evidencia

- **Botón de captura deshabilitado:** comprobá navegador de escritorio, origen local/HTTPS y disponibilidad de `getDisplayMedia`. No eludas restricciones.
- **No hay audio de la fuente:** revisá el estado y si se compartió una pestaña con audio. El audio de pantalla/ventana depende de plataforma; no se arregla cambiando un estilo.
- **No llega micrófono o cámara:** revisá fuentes activadas, dispositivo y permisos con el usuario. No borres preferencias ni concedas permisos en su nombre.
- **Archivo aún abierto:** finalizar con Detener y guardar antes de cerrar el estudio. No prometas recuperar una toma tras un crash.
- **Captura se ve negra:** contenido protegido puede impedirla. Respetá las restricciones del navegador.
- **Sesión larga:** el modo en memoria crece con la duración; la escritura directa depende del navegador. Una prueba corta no garantiza horas de captura ni continuidad bajo suspensión.

Para cambios de código, seguí [CONTRIBUTING.md](../CONTRIBUTING.md) y los checks de AGENTS.md. Usá fuentes sintéticas. Tests y screenshots de la app no autorizan acceder a videos, pantalla o dispositivos reales.
