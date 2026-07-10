# Parser symbol index

## What It Is

Server-side TypeScript parse that extracts class/module structure and a **symbol index** of class and method names used for preview-edge resolution.

## What It Looks Like

N/A (server). Output shapes client `GraphData` and index entries consumed by `IndexContext`.

## Where It Lives

- **Parser:** `server/src/parser.ts`
- **HTTP:** `server/src/index.ts` — `/api/file-graph`, `/api/focus`

## Actions

| # | Trigger | System Response |
| --- | ------- | --------------- |
| 1 | `GET /api/file-graph?path=` | Parse one file; return classes, methods, edges internal to file |
| 2 | `GET /api/focus?path=&depth=N` | Parse file + import neighborhood to depth N |
| 3 | Client merge | Client merges graph JSON; index union updated |

## Component Hierarchy

```text
server/index.ts
└── parser.ts
    ├── class/method extraction
    ├── method body source lines
    └── symbol index (classes + methods only)
```

## Data

| Symbol kind | Indexed | Preview eligible |
| ----------- | ------- | ---------------- |
| Class name | yes | yes |
| Method name | yes | yes |
| Property | no | inert |
| Local / param | no | inert |

## State

Stateless per request. Client owns merged ego-graph state.

## File Map

| File | Purpose |
| ---- | ------- |
| `server/src/parser.ts` | AST walk + index |
| `server/src/index.ts` | Route handlers |

## Acceptance Criteria

- [ ] Class and method identifiers appear in symbol index
- [ ] Properties and locals do not produce preview edges (until roadmap indexing)
- [ ] `fixtures/demo` OrderService.checkout indexes `charge`, `PaymentGateway`
- [ ] Focus endpoint returns import-linked files for merge
- [ ] Parser errors return HTTP error, not partial silent graph

## Roadmap

Scope-qualified indexing for properties/locals — see [preview-edges.philosophy.supplement.md](../system/preview-edges.philosophy.supplement.md).

## References

- Fast assertion: `curl "http://localhost:3001/api/focus?path=<abs>&depth=1"`
