# Política de deprecación GraphQL — FlowPay (I058)

## Objetivo

Evitar breaking changes en clientes (web, integraciones) al renombrar o retirar campos.

## Reglas

1. **Nunca** eliminar un campo GraphQL en el mismo release en que se depreca.
2. Marcar con `deprecationReason` en Pothos / SDL, por ejemplo:
   ```ts
   page: t.exposeInt('page', {
     deprecationReason: 'Usar cursor/nextCursor (I057). Retiro previsto: 2026-12-01.',
   })
   ```
3. Incluir en el mensaje: **alternativa** + **fecha de retiro** (mínimo 90 días).
4. Anunciar en `docs/RELEASE-NOTES.md` bajo “Breaking / Deprecations”.
5. Tras la fecha de retiro: eliminar campo + actualizar allowlist persisted ops si aplica.
6. Los clientes oficiales (`src/lib/graphql/queries`) deben migrar antes del retiro.

## Checklist al deprecar

- [ ] `deprecationReason` en schema
- [ ] Nota en RELEASE-NOTES
- [ ] Issue/ticket con fecha de retiro
- [ ] Cliente oficial deja de usar el campo
