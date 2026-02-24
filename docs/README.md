# ReDocs example fixtures

These files are **test fixtures** for ReDocs import. Use them to verify detection and parsing for each supported format.

| File | Format | Use |
|------|--------|-----|
| `example-postman.json` | Postman Collection v2.1 | Import to test Postman detection and request parsing (GET/POST, headers, body, variables). |
| `example-openapi.json` | OpenAPI 3.0 | Import to test OpenAPI detection and path/operation parsing. |
| `example-insomnia.json` | Insomnia export (v4) | Import to test Insomnia detection (GET/POST/PUT/DELETE, auth, form/JSON body). |
| `example-bruno.yaml` | Bruno OpenCollection YAML | Import to test Bruno YAML detection and multi-doc parsing (headers, body, auth). |
| `example-environment.json` | Postman environment | Import to test environment detection and variable import (with `environment` in filename). |

## Running tests

From repo root (after `pnpm install`):

```bash
pnpm test
pnpm lint && pnpm typecheck && pnpm knip
```

From `packages/backend`: `pnpm lint`, `pnpm typecheck`, `pnpm knip`.
