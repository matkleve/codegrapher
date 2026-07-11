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
| Method (on exported/injectable class) | yes | yes — `enclosingSymbol` = owning class id | yes |
| Property (on exported/injectable class) | yes | yes — `enclosingSymbol` = owning class id | yes — resolves to the property's member row, same-class and cross-file |
| Parameter | yes | yes — `enclosingSymbol` = owning method/function id | no (client-local only, see `localSymbolLinks.ts`) |
| Local (`const`/`let`) | yes | yes — `enclosingSymbol` = owning method/function id, scoped to direct body (not nested closures) | no (client-local only, see `localSymbolLinks.ts`) |

**Resolved:** `resolveVisibleTarget` now tries scoped index entries (`graphNodeForEntry` + `targetFromGraphNode`) before the bare canvas scan (`findDefinitionInLoadedGraph`), so two on-canvas classes with a same-named method or property resolve via `enclosingSymbol`, not scan order. The bare scan remains as a fallback for tokens with no matching entry.

**Known remaining gap (not fixed by this contract):** resolving *which* object a method call targets when the receiver's type isn't known (e.g. `a.charge()` vs `b.charge()` where `a`/`b` are different classes both exposing `charge`) still requires type-checking the call expression, not just scoping the definition — out of scope here. Params/locals are indexed but intentionally not preview-eligible yet (no UI consumer); wiring them into preview edges is separate follow-up work.

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
- [x] `method` and `property` entries carry `enclosingSymbol`
- [x] Given two on-canvas classes with a same-named method or property, hovering resolves to the definition whose `enclosingSymbol` matches — not the first node encountered on canvas (`resolveVisibleTarget.test.ts`)
- [x] Property definitions are resolvable as cross-file preview-edge targets
- [x] Parameters and locals appear in the server index with `enclosingSymbol` set to their owning method/function, scoped to direct body (verified against `fixtures/demo`)
- [x] Existing class/function/interface/type resolution is unaffected (no `enclosingSymbol` required; full client test suite green, no `fixtures/demo` regression)

## References

- Fast assertion: `curl "http://localhost:3001/api/focus?path=<abs>&depth=1"`
- Philosophy/roadmap background: [preview-edges.philosophy.supplement.md](../system/preview-edges.philosophy.supplement.md)
