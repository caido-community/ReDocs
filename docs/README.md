# ReDocs example fixtures

These files are **comprehensive test fixtures** for ReDocs import and for the Bruno OpenCollection YAML parser.

## `example-bruno.yaml`

- **Format:** Bruno OpenCollection (multi-document YAML, `---` separated).
- **Covers:** GET, POST, PUT, DELETE; multiple headers; JSON body (including multiline `data: |`); query params; bearer auth and `{{token}}` variables.
- **Use:** Import in ReDocs to verify Bruno YAML detection and parsing. Also exercised by `packages/backend` tests (`minimalYaml.test.ts`).

## `example-insomnia.json`

- **Format:** Insomnia export (v4 `resources` array with Workspace and Request objects).
- **Covers:** GET (with query and path params), POST (JSON and form body), PUT, DELETE; header formats (string and array); bearer, API key, and basic auth.
- **Use:** Import in ReDocs to verify Insomnia detection and parsing.

Run backend tests (from repo root or `packages/backend` after `pnpm install`):

```bash
cd packages/backend && pnpm test
```

Run lint/typecheck from backend:

```bash
cd packages/backend && pnpm lint && pnpm typecheck && pnpm knip
```

From repo root, use `pnpm lint`, `pnpm typecheck` (runs all packages).
