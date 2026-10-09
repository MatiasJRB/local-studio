# Local Studio — instrucciones para agentes

Herramienta personal open source para grabar pantalla, cámara y audio localmente. Documentación y UI en español; código, comentarios y commits en inglés.

## Punto de entrada

Para operar el estudio por pedido del usuario, leé [docs/AGENT.md](docs/AGENT.md). Para uso manual, [docs/USAGE.md](docs/USAGE.md). Para instalación, arquitectura y límites, [docs/TECHNICAL.md](docs/TECHNICAL.md). El README es la landing pública: conservarlo centrado en funcionalidades y casos de uso.

El agente usa los controles existentes de la interfaz para configurar el estudio según lo que pide el usuario. No hay un agente embebido ni un protocolo de automatización dedicado.

## Contrato

- JavaScript nativo y Vite. Mantener la aplicación estática: no agregar cuentas, uploads, analytics ni servicios externos sin un requisito explícito.
- Las grabaciones, permisos y selección de fuentes pertenecen al usuario. No empezar una grabación ni conceder permisos automáticamente.
- Sólo persistir preferencias de presentación. Nunca guardar capturas, credenciales, rutas personales ni identificadores de dispositivos en el repositorio.
- No incluir grabaciones privadas en tests, docs o previews. Usar fuentes sintéticas; tests con namespace de almacenamiento separado.
- El canvas es la salida del video; tiradores y controles de edición viven en DOM y no se exportan.
- UI oscura, accesible por teclado y usable en pantallas chicas. La grabación de pantalla requiere navegador de escritorio compatible.
- Mantener el selector de captura nativo y las restricciones del navegador; no simular permisos ni prometer audio del sistema en toda plataforma.

## Checks

`npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` antes de pushear. Feature nuevo lleva test; bugfix lleva regresión. Los tests E2E simulan cámara/pantalla/micrófono sin tocar hardware. No confundirlos con validación de captura real o sesiones largas.

Commits Angular. Para cambios posteriores al bootstrap, branch `codex/<scope>` y PR con problema, comportamiento resultante y checks reales. No combinar push y merge; no publicar deploys ni enviar comunicaciones sin autorización puntual.
