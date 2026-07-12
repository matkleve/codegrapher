# Connection taxonomy — per-kind acceptance criteria

Child of [connection-taxonomy.md](connection-taxonomy.md). Per-kind Actions, Data, and Acceptance Criteria. Parent Data table owns line-style/color/arrowhead summaries — this doc does not duplicate them.

**Build backlog:** each section has a `Status` marker (`implemented` | `not started`).

---

## 1. Usage

**Status:** `implemented`

**What it is:** On-demand dashed preview wire from definition → usage, summoned by hover/Ctrl/pin on an indexed token. Contract owned by [preview-edges.md](preview-edges.md); this section only tracks taxonomy alignment.

### Actions

| # | Trigger | System Response |
| --- | ------- | --------------- |
| 1 | Cold hover indexed token (150ms dwell) | Single def→usage wire |
| 2 | Hover definition | Fan-out to all in-graph usages |
| 3 | Ctrl held | Instant fire; no persistence change |
| 4 | Click token | Pin trace + `TokenContextBar` |
| 5 | Leave / Esc / empty canvas | Clear unpinned trace |

### Data

| Field | Value |
| ----- | ----- |
| Direction | definition → usage |
| Persistent | No |
| Color | Dedicated hue (`--edge-usage`) — not token-kind color |
| Line | Dashed |
| Arrowhead | Open |
| Anchor escalation | class header → member row → line chip |

### Acceptance Criteria

- [x] Cold hover fires after 150ms; pass-over does not flash edges
- [x] Ctrl fires immediately; release returns to plain-hover rules
- [x] Edge direction is always definition → usage
- [x] Wires render only in `PreviewEdgeOverlay`, not as React Flow edges
- [x] Collapse/expand retargets wires via `liveFrom` / `liveTo`
- [x] Off-graph definition shows dashed Load stub, not a solid wire

---

## 2. Transitive (cousin / N-hop)

**Status:** `implemented`

**What it is:** Decayed-opacity extension of usage wires showing 2-hop (and optionally 3-hop) reach from a hovered/pinned token — e.g. A calls B calls C implies a secondary wire A⇢C when `transitiveHopDepth` allows.

### Actions

| # | Trigger | System Response |
| --- | ------- | --------------- |
| 1 | Hover/pin token with 1-hop usages visible | Existing usage wires at full opacity (kind 1) |
| 2 | Same trace, 2-hop reachable symbols on canvas | Additional dashed wires at ~50% opacity |
| 3 | Same trace, 3-hop reachable (if depth ≥ 3) | Additional dashed wires at ~25% opacity |
| 4 | `transitiveHopDepth` = 2 (default) | No wires beyond 2 hops |

### Data

| Field | Value |
| ----- | ----- |
| Direction | definition → usage (each hop) |
| Persistent | No — on-demand only, same as usage |
| Color | Same hue as usage (`--edge-usage`), opacity decayed per hop |
| Line | Dashed |
| Arrowhead | Open |
| Default `transitiveHopDepth` | **2** |
| Computation | **On-demand from hovered/pinned token only** — not eager whole-graph precompute |

Hop chain is built by walking existing usage/call relationships on the current ego-graph, not by a separate persistent call-graph layer.

### Acceptance Criteria

- [x] 1-hop wires unchanged from kind 1 (full opacity)
- [x] 2-hop wires render at visibly lower opacity than 1-hop
- [x] No wire shown beyond `transitiveHopDepth` (default 2)
- [x] Transitive wires clear when trace clears (leave grace / Esc / unpinned)
- [x] Computation runs only for the active hovered/pinned token, not eagerly for all nodes
- [x] Transitive wires use the same anchor escalation rules as usage wires

---

## 3. Inheritance

**Status:** `implemented`

**What it is:** Persistent structural wire for `class Child extends Parent`, child class header → parent class header.

### Actions

| # | Trigger | System Response |
| --- | ------- | --------------- |
| 1 | Both child and parent class nodes on canvas | Solid inheritance wire always visible |
| 2 | Parent class not yet loaded | No wire; no Load stub (structural, not trace) |
| 3 | User loads parent via focus/merge | Wire appears without hover |
| 4 | Grandparent also on canvas (`A extends B extends C`) | **Direct parent only** — one edge child→parent; no auto-chain to grandparent |

Cross-file resolution: parent class resolved via import graph + `classNodeId(file, name)`, same pattern as `imports` edge target resolution in `server/src/parser.ts`.

### Data

| Field | Value |
| ----- | ----- |
| Direction | child → parent |
| Persistent | Yes, once both endpoints loaded |
| Color | Dedicated structural hue (`--edge-inheritance`) — not token-kind color |
| Line | Solid |
| Arrowhead | Hollow triangle (UML is-a) at parent end |
| Server edge type | `extends` |
| Multi-level | Direct parent only per class pair |

### Acceptance Criteria

- [x] `extends` edge emitted when parser finds heritage clause and resolves parent class id
- [x] Wire renders without hover when both classes are on canvas
- [x] Hollow-triangle arrowhead, solid line, distinguishable from usage and composition
- [x] Only direct parent edge per class — no transitive grandparent wire
- [x] Cross-file parent resolves when parent file is in the same focus batch
- [x] Wire hidden when parent not on canvas (no dashed Load stub)

---

## 4. Implementation

**Status:** `implemented`

**What it is:** Persistent structural wire for `class C implements I`, class header → interface/type node header.

### Actions

| # | Trigger | System Response |
| --- | ------- | --------------- |
| 1 | Class and interface both on canvas | Dotted implementation wire always visible |
| 2 | Class implements multiple interfaces | **One edge per interface** — fan-out from class header to each interface node |
| 3 | Interface not on canvas | No wire for that interface |

### Data

| Field | Value |
| ----- | ----- |
| Direction | class → interface |
| Persistent | Yes |
| Color | Dedicated structural hue (`--edge-implementation`) |
| Line | Dotted |
| Arrowhead | Hollow triangle at interface end |
| Server edge type | `implements` (new — not in `GraphEdge` union today) |
| Multiple interfaces | One edge per implemented interface |

### Acceptance Criteria

- [x] `implements` edge emitted per interface clause when target resolves on canvas
- [x] Dotted line + hollow triangle, visually distinct from inheritance (solid) and usage (dashed)
- [x] Multiple interfaces produce multiple wires, not one aggregated edge
- [x] Wires persist without hover; hidden when interface endpoint not loaded

---

## 5. Override

**Status:** `implemented`

**What it is:** Row-level annotation when a method overrides a parent method. **No canvas edge.**

### Actions

| # | Trigger | System Response |
| --- | ------- | --------------- |
| 1 | Method row on subclass overrides parent method (AST-detected) | Badge on member row header |
| 2 | Click badge | **Opens mini preview edge** to parent method definition (one-hop, on-demand) |
| 3 | Parent method not on canvas | Badge shows `↑ overrides Parent.method`; click offers Load if parent file known |

### Data

| Field | Value |
| ----- | ----- |
| Rendering | Badge on `.member-row` header, right of label |
| Badge text | `↑ overrides {Parent}.{method}` (truncated parent name if long) |
| Edge | None by default; click triggers ephemeral usage-style wire |
| Detection | Server index or parser: method + `enclosingSymbol` + heritage walk |

### Acceptance Criteria

- [x] Override detected for subclass method with same name as resolvable parent method
- [x] Badge visible on member row without expanding method body
- [x] No persistent canvas edge for override relationship
- [x] Click badge summons one-hop preview wire to parent method (or Load stub if off-graph)
- [x] Badge visually distinct from trace-lit state (muted, not gold brand)

---

## 6. Composition / DI

**Status:** `implemented`

**What it is:** Persistent structural wire for constructor parameter-properties (`constructor(private gateway: PaymentGateway)`), owner class → dependency class.

### Actions

| # | Trigger | System Response |
| --- | ------- | --------------- |
| 1 | Owner and dependency class both on canvas | Solid composition wire always visible |
| 2 | Multiple injected dependencies | One edge per parameter-property |
| 3 | Plain constructor param assigned in body (`this.x = x`) | **Out of scope for v1** — parameter-properties only |

### Data

| Field | Value |
| ----- | ----- |
| Direction | owner class → dependency class |
| Persistent | Yes |
| Color | Dedicated structural hue (`--edge-composition`) |
| Line | Solid |
| Arrowhead | Filled diamond (UML has-a) at owner end |
| Server edge type | `composition` |
| Label | Parameter name on edge (optional tooltip) |
| v1 scope | `private` / `public` / `protected` / `readonly` parameter-properties only |

### Acceptance Criteria

- [x] Composition edge emitted for each constructor parameter-property with class-typed annotation
- [x] Filled-diamond arrowhead, solid line, distinguishable from inheritance triangle and usage dashed
- [x] One edge per injected dependency
- [x] Wire persists without hover when both classes on canvas
- [x] Body-assigned properties (`this.foo = foo` without parameter-property) do not emit composition edges in v1

---

## 7. Module import

**Status:** `implemented`

**What it is:** Optional thin wire showing file-level `import` dependency between class nodes. Off by default.

### Actions

| # | Trigger | System Response |
| --- | ------- | --------------- |
| 1 | Default canvas state | No module-import wires |
| 2 | User toggles **Module import** in **ConnectionLegend** (canvas overlay, top-right) | Thin dotted wires importer class → imported class |
| 3 | Toggle off | Wires removed immediately |

Reuses existing `imports` edges from parser where both endpoint classes are on canvas.

### Data

| Field | Value |
| ----- | ----- |
| Direction | importer → imported |
| Persistent | Yes, while toggle on |
| Color | Dedicated muted hue (`--edge-import`) |
| Line | Thin dotted |
| Arrowhead | Open, small |
| Toggle location | `ConnectionLegend` on canvas overlay (top-right) |
| Default | Off (`visibleEdgeKinds` excludes module import) |

### Acceptance Criteria

- [x] Module-import wires hidden by default
- [x] ConnectionLegend toggle shows/hides all import wires on current ego-graph
- [x] Wires use thin dotted style, visually subordinate to usage and structural edges
- [x] Toggling does not affect hover/preview trace behavior
- [x] Only drawn when both importer and imported class nodes are on canvas

---

## 8. Shared-dependency (sibling highlight)

**Status:** `implemented`

**What it is:** When hovering/pinning a symbol that two or more unrelated call sites share, highlight all sibling usages in the dependency's color. **No edge between siblings.**

### Actions

| # | Trigger | System Response |
| --- | ------- | --------------- |
| 1 | Hover/pin definition with multiple in-graph usages | Existing def fan-out (kind 1) |
| 2 | Two usages in different methods with no direct call relationship | Both usage chips lit; **no wire connecting the two methods to each other** |
| 3 | More than 10 sibling usages on canvas | All siblings lit (no cap); optional count badge on definition: "used in N places" |

### Data

| Field | Value |
| ----- | ----- |
| Rendering | Token lit state only (`computeTraceLit`) |
| Edge | None between siblings |
| Color | Shared token's semantic color |
| Sibling cap | **None** — all in-graph usages lit |
| Trigger | Same as usage trace (hover/pin on definition) |

### Acceptance Criteria

- [x] Sibling usages both receive lit/on styling when definition is traced
- [x] No preview edge drawn directly between sibling usage sites
- [x] Behavior composes with kind 1 fan-out (def→each usage wires still drawn)
- [x] Works with 2+ siblings without performance regression on graphs ≤ 50 nodes
- [x] Off-graph siblings still show via Load stub / reference list, not sibling highlight

---

## 9. Binding (initializer → binding)

**Status:** `implemented` (assignment-step sim pulse deferred)

**What it is:** On-demand preview wire showing **where a param or local binding gets its value** on the declaring statement. Distinct from **Usage** (def → later references) and from **Inheritance** (structural `extends`).

Example: `const addr = result.address;`

| Wire | Kind | Direction |
| ---- | ---- | --------- |
| `addr` → `if (addr)` | Usage | binding def → usage |
| `result` → param `result` in signature | Usage | param def → usage |
| `result.address` → `addr` | **Binding** | initializer expr → binding |

### Actions

| # | Trigger | System Response |
| --- | ------- | --------------- |
| 1 | Hover/pin local/param **binding** (`addr` on LHS) | Usage fan-out to in-body references **plus** one binding wire from initializer → binding |
| 2 | Hover/pin **initializer** token on same decl (`address` in `result.address`) | Single binding wire to the bound name on that line |
| 3 | Hover usage only (`addr` in `if (addr)`) | Usage wire to binding def only — no binding wire |
| 4 | `const x = literal;` (no identifier in RHS) | No binding wire |
| 5 | Toggle **Binding** off in legend | Hide binding wires; usage fan-out unchanged |

### Data

| Field | Value |
| ----- | ----- |
| Direction | **initializer → binding** (value flows into the bound name) |
| Persistent | No — hover/Ctrl/pin only |
| Color | `var(--token-edge-variable)` |
| Line | **Dotted** preview overlay (`preview-edge-path--binding`) — not structural `implements` dotted |
| Arrowhead | Open, at binding end |
| Animation | Dot/dash flow **toward binding** (value sink) |
| Scope | Same method body only (`localSymbolLinks.ts`) |
| Init anchor | Rightmost identifier in the `=` RHS on that line (`address` for `result.address`; `foo` for `= foo`) |
| Binding anchor | LHS identifier chip (`addr`) |

### Acceptance Criteria

- [x] `const addr = result.address;` — hovering `addr` shows binding wire from `address` → `addr` in addition to usage fan-out
- [x] Hovering `address` in the initializer shows the same binding wire (initializer → binding)
- [x] Hovering `result` in the initializer still resolves param def → usage only (no binding wire)
- [x] Binding wire uses dotted line + variable color — visually distinct from usage dashed and inheritance solid
- [x] Legend **Binding** toggle hides only binding wires; **Inheritance** toggle hides only `extends` structural wires
- [ ] Assignment-step pulses in [execution-simulator.md](execution-simulator.md) travel along the binding wire when present

---

## 10. Control flow (switch/case, if/else)

**Status:** `implemented` (ternary, and multi-line `switch`/`if` headers, deferred)

**What it is:** On-demand preview wire showing **which branch a value can take** at a `switch` or `if`/`else if`/`else` chain. Distinct from **Usage** (which only wires the discriminant identifier to its other occurrences) and from **Binding** (value → name, not decision → branch).

Example:

```ts
switch (field) {
  case 'city': return addr.city ?? null;
  case 'district': { /* ... */ }
  default: return null;
}
```

Hovering `switch` or `field` fans out to `case 'city'`, `case 'district'`, and `default`. Hovering one `case` wires back to `switch` only.

### Actions

| # | Trigger | System Response |
| --- | ------- | --------------- |
| 1 | Hover/pin the `switch`/`if` **keyword** | Fan-out: one wire from the keyword to every `case`/`default`/`else`/`else if` branch of that statement |
| 2 | Hover/pin the discriminant/condition **identifier** (`field` in `switch (field)`) | Same fan-out as the keyword, in addition to the identifier's normal usage wires |
| 3 | Hover/pin a single branch keyword (`case`, `default`, `else`, `else if`) | One wire back to the `switch`/`if` keyword only — not to sibling branches |
| 4 | A `case`/`if` body contains its own nested `switch`/`if` | Nested statement is its own independent group; hovering the outer head does not fan into the nested statement's branches |
| 5 | Toggle **Control flow** off in legend | Hide all branch wires; usage/binding wires unchanged |

### Data

| Field | Value |
| ----- | ----- |
| Direction | **condition/keyword → branch** (decision flows outward to each possible branch) |
| Persistent | No — hover/Ctrl/pin only |
| Color | Dedicated hue, `var(--edge-control-flow)` — not a token-kind color |
| Line | Dash-dot (`preview-edge-branch`), distinct from usage dashed and binding dotted |
| Arrowhead | Filled, at branch end |
| Scope | Same method body only (`controlFlowLinks.ts`), naive line/brace-depth scan (no full AST) |
| Head anchor | The `switch`/`if` keyword token |
| Branch anchor | The `case`/`default` keyword (switch) or `else`/`else if` keyword (if-chain) |
| Condition anchor | Any identifier inside the head's own `(...)`, single-line headers only |

### Acceptance Criteria

- [x] Hovering `switch` in `switch (field) { case 'city': ...; case 'district': ...; default: ... }` draws one wire to each of `case 'city'`, `case 'district'`, and `default`
- [x] Hovering the discriminant identifier (`field`) draws the same branch fan-out, alongside its existing usage wire(s)
- [x] Hovering a single `case`/`default` wires back to `switch` only, not to sibling cases
- [x] `if (n > 10) { ... } else if (n > 0) { ... } else { ... }` chains `else if` and `else` as branches of the same group as `if`
- [x] A case body's own nested braces (e.g. `case 'x': { ... }`) do not close the outer `switch` group early
- [x] A nested `switch`/`if` inside a branch body is its own group — hovering the outer head never fans into it
- [x] Control-flow wires use the dedicated `--edge-control-flow` hue and dash-dot line — visually distinct from usage, binding, and structural edges
- [x] Legend **Control flow** toggle hides only branch wires; Usage/Binding toggles are unaffected
- [ ] Ternary (`cond ? a : b`) is not yet indexed — tracked as a follow-up
- [ ] Multi-line `switch (`/`if (` headers (discriminant on a different line than the keyword) are not yet indexed — known limitation, single-line headers only

---

## 11. Trace strength (provenance hop decay)

**Status:** `implemented`

**What it is:** Stepped wire opacity and endpoint emphasis for **provenance** relationships summoned in the same trace as a primary usage wire — param/local usage → signature param → indexed type → type definition. Distinct from §2 Transitive (call-graph N-hop). Full contract: [preview-edges.trace-strength.supplement.md](preview-edges.trace-strength.supplement.md).

### Actions

| # | Trigger | System Response |
| --- | ------- | --------------- |
| 1 | Hover body usage of param `field: AddressFieldKind` | Tier 1 param→usage + tier 2 sig-type→param + tier 3 type def→sig-type (or Load stub) |
| 2 | Hover param def `field` | Tier 1 fan-out to all usages + tier 2/3 type chain |
| 3 | Hover sig-type only | Tier 1 only (no reverse cascade to usages) |
| 4 | Same trace includes control-flow fan-out | Branch wires stay tier 1 `--edge-control-flow` |

### Data

| Field | Value |
| ----- | ----- |
| Tier 1 opacity | 100% (no hop class) |
| Tier 2 opacity | ~42% (`preview-wire--hop2`) |
| Tier 3 opacity | ~22% (`preview-wire--hop3`) |
| Kind | Usage (`--edge-usage`) for provenance segments |
| Endpoint tier 2/3 | `token-chip-endpoint-sibling` + `flow-anchor-endpoint-sibling` |
| Sibling usages on single-usage hover | Lit optional; **no** extra usage wires |

### Acceptance Criteria

- [x] Body usage hover draws three-tier provenance chain when param has indexed type
- [x] Tier 2/3 wires visibly weaker than tier 1
- [x] Param def fan-out keeps all usage wires at tier 1; type chain at tier 2/3
- [x] Cascaded Load stub does not open a second connection menu
- [ ] Load of module-level type alias mounts graph node and upgrades stub on rebuild — verify manually after Load
- [x] Control-flow wires in same trace are not decayed
- [x] Provenance `hop` does not set `connectionKind: "transitive"` (legend still buckets under Usage)

---

## References

- Parent taxonomy: [connection-taxonomy.md](connection-taxonomy.md)
- Usage contract: [preview-edges.md](preview-edges.md)
- Philosophy (on-demand vs structural): [preview-edges.philosophy.supplement.md](preview-edges.philosophy.supplement.md)
