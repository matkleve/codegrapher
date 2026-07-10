# Service Specs

Server parser and HTTP API contracts consumed by the client.

## Services

- [parser-index](parser-index.md) — symbol index, class/method extraction, indexed vs inert tokens

## API surface

All endpoints live in `server/src/index.ts`. Client proxies `/api/*` to port 3001.

| Endpoint | Spec owner |
| -------- | ---------- |
| `GET /api/file-graph` | parser-index + app-shell |
| `GET /api/focus` | parser-index + ego-graph-model |
| `GET /api/tree` | app-shell |
| `GET /api/file` | _(raw text — no spec yet)_ |
