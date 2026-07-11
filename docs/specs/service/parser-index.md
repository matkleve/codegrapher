# Parser symbol index

## What It Is

Server-side TypeScript parse that extracts class/module structure and a **symbol index** used for preview-edge resolution. Index entries carry a **scoped identity** — `(filePath, enclosingSymbol, name)` — so lookups can disambiguate same-named members across different classes/functions instead of matching on bare name alone.

## What It Looks Like

N/A (server). Output shapes client `GraphData` and index entries consumed by `IndexContext`.

## Where It Lives

- **Parser:** `server/src/parser.ts`
- **Indexer:** `server/src/indexer.ts`
- **HTTP:** `server/src/index.ts` — `/api/file-graph`, `/api/focus`, `/api/index`

## Actions

| # | Trigger | System Response |
| --- | ------- | --------------- |
| 1 | `GET /api/file-graph?path=` | Parse one file; return classes, methods, edges internal to file |
| 2 | `GET /api/focus?path=&depth=N` | Parse file + import neighborhood to depth N |
| 3 | `GET /api/index?path=` | Build project-wide symbol index, scoped identity per entry |
| 4 | Client merge | Client merges graph JSON; index union updated |

## Component Hierarchy

```text
server/index.ts
└── parser.ts / indexer.ts
    ├── class/method extraction
    ├── method body source lines
    └── symbol index
        ├── module-level symbols (class, function, interface, type, enum)
        └── scoped symbols (method, property, param, local)
```

## Data

`SymbolEntry` shape (target contract — see Acceptance Criteria for rollout status):

```text
{ filePath: string; kind: SymbolKind; line: number; enclosingSymbol?: string }
```

`enclosingSymbol` is the owning declaration's graph-node id (`class:<file>:<Name>`, `method:<file>:<Class>.<name>`, `function:<file>:<name>`) — same id format already used for `GraphNode.id`. Absent for module-level symbols, where `filePath` + `name` is already unambiguous.

| Symbol kind | Indexed today | Scoped identity | Preview eligible |
| ----------- | -------------- | ---------------- | ----------------- |
| Class | yes | n/a (module-level) | yes |
| Function (exported) / exported arrow fn | yes | n/a (module-level) | yes |
| Interface / type alias / enum | yes | n/a (module-level) | partial (type chips only, no body trace) |
| Method (on exported/injectable class) | yes | **missing** — bare name only | yes, but see caveat below |
| Property (on exported/injectable class) | yes | **missing** — bare name only | **no** — indexed but not resolvable as a cross-file trace target |
| Parameter | no | n/a until indexed | no (client-local only, see `localSymbolLinks.ts`) |
| Local (`const`/`let`) | no | n/a until indexed | no (client-local only, see `localSymbolLinks.ts`) |

**Caveat (current bug, not yet fixed):** `findDefinitionInLoadedGraph` (`client/src/lib/resolveVisibleTarget.ts`) resolves a method definition by scanning on-canvas classes for the first method whose `symbolName` matches — it does not consult `enclosingSymbol`. Two on-canvas classes with a same-named method will resolve to whichever one the scan visits first, not necessarily the correct one for the hovered call site's actual target class. Scoped identity (this spec) is required to fix this; see Acceptance Criteria.

## Scoped identity contract (normative)

- Index entries for `method` and `property` kinds **MUST** carry `enclosingSymbol` set to the owning class's graph-node id.
- Adding `param` and `local` kinds **MUST** carry `enclosingSymbol` set to the owning method/function's graph-node id — never indexed as bare names at project scope (locals/params are not addressable outside their body; a project-wide bare-name index entry for them would be meaningless and would collide across every function that happens to use `id` or `result`).
- Resolution (`resolveVisibleTarget`, `findDefinitionInLoadedGraph`) **MUST** prefer the entry whose `enclosingSymbol` matches the call site's resolved container over a bare-name-only match, when both are available.
- The **Ctrl-hover / preview-edge rendering path is unchanged** — this contract only affects *which* definition a token resolves to, not the wire-drawing mechanism (anchors, dwell timing, dashed styling stay as specified in `preview-edges.md`).
- Edges built from scoped entries **MUST** still stay on-demand preview, never a persistent graph layer (`preview-edges.philosophy.supplement.md`).

## State

Stateless per request. Client owns merged ego-graph state.

## File Map

| File | Purpose |
| ---- | ------- |
| `server/src/parser.ts` | AST walk for graph nodes/edges (class/method/function/module) |
| `server/src/indexer.ts` | Project + incremental symbol index, scoped identity |
| `server/src/index.ts` | Route handlers |
| `client/src/lib/resolveVisibleTarget.ts` | Consumes scoped entries to resolve hover/click targets |
| `client/src/lib/localSymbolLinks.ts` | Client-local param/local lexical index (pre-dates server indexing of these kinds) |

## Acceptance Criteria

- [x] Class and method identifiers appear in symbol index
- [x] `fixtures/demo` OrderService.checkout indexes `charge`, `PaymentGateway`
- [x] Focus endpoint returns import-linked files for merge
- [x] Parser errors return HTTP error, not partial silent graph
- [ ] `method` and `property` entries carry `enclosingSymbol`
- [ ] Given two on-canvas classes with a same-named method, hovering a call site resolves to the definition whose `enclosingSymbol` matches the call's resolved class — not the first node encountered on canvas
- [ ] Property definitions are resolvable as cross-file preview-edge targets (currently inert — see caveat above)
- [ ] Parameters and locals appear in the server index with `enclosingSymbol` set to their owning method/function
- [ ] Existing class/function/interface/type resolution is unaffected (no `enclosingSymbol` required, no regression in `fixtures/demo`)

## References

- Fast assertion: `curl "http://localhost:3001/api/focus?path=<abs>&depth=1"`
- Philosophy/roadmap background: [preview-edges.philosophy.supplement.md](../system/preview-edges.philosophy.supplement.md)
