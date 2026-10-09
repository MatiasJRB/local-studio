# Contribuir a Local Studio

Para arquitectura, límites y detalle de checks, consultá [la referencia técnica](docs/TECHNICAL.md). Si un agente va a operar el estudio, su entrada es [AGENTS.md](AGENTS.md) y [la guía de operación](docs/AGENT.md).

## Preparar el entorno

Node.js 20.19.x, 22.13+ o 24+, `npm ci` y `npm run dev`. Para E2E: `npx playwright install chromium`.

## Proponer un cambio

1. Describí el caso de uso o el bug en un issue, indicando navegador y sistema operativo si corresponde. No adjuntes videos privados ni credenciales.
2. Creá una branch. El proyecto usa `codex/<scope>` para trabajo asistido y acepta otras convenciones descriptivas.
3. Mantené el cambio acotado y agregá un test relevante. Los bugs llevan una regresión que reproduzca el problema.
4. Corré `npm run check`.
5. Abrí un PR con el problema, comportamiento resultante y checks ejecutados. Si cambia la UI, adjuntá captura con fuentes sintéticas.

## Convenciones

Documentación y UI en español; código, comentarios y commits en inglés. Commits Angular (`feat:`, `fix:`, `docs:`, `test:`, `chore:`). Evitá sumar frameworks o dependencias de runtime para cambios que resuelve la plataforma web.

La privacidad local es parte del producto. No agregar uploads, analytics o persistencia de grabaciones sin discutir el requisito. No iniciar fuentes o tomas automáticamente ni eludir permisos.

## Antes de publicar

Revisá el diff y confirmá que no incluye grabaciones, rutas personales, `.env`, secretos ni artefactos privados. Los tests deben usar fuentes sintéticas con almacenamiento de preferencias separado. El checklist no sustituye el selector de captura ni los permisos del usuario.
