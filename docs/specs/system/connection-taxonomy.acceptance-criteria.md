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
| Color | Per token-kind (`TOKEN_EDGE_STROKE`) |
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
| Color | Same token-kind family as usage, opacity decayed per hop |
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
| 2 | User toggles "Show imports" in **graph header** (next to fit/theme controls) | Thin dotted wires importer class → imported class |
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
| Toggle location | Graph header toolbar |
| Default | Off (`visibleEdgeKinds` excludes module import) |

### Acceptance Criteria

- [x] Module-import wires hidden by default
- [x] Graph header toggle shows/hides all import wires on current ego-graph
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

## References

- Parent taxonomy: [connection-taxonomy.md](connection-taxonomy.md)
- Usage contract: [preview-edges.md](preview-edges.md)
- Philosophy (on-demand vs structural): [preview-edges.philosophy.supplement.md](preview-edges.philosophy.supplement.md)
