# Preview edges — interactions supplement

Normative detail for token trace, anchor resolution, pin lock, and live wire retargeting. Parent: [preview-edges.md](preview-edges.md).

---

## Trace state machine

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Idle

  Idle --> HoverPending: pointer enters indexed token
  HoverPending --> Idle: leave before dwell
  HoverPending --> Tracing: dwell elapsed / Ctrl held

  Tracing --> Idle: leave grace elapsed (unpinned)
  Tracing --> Pinned: click token / wire end

  Pinned --> Idle: Esc / empty canvas click / clearTokenInfo
  Pinned --> Pinned: click different token (replace pin set)
  Pinned --> Pinned: Shift+click different token (accumulate pin)

  note right of Tracing
    traceTokenKey = hoveredTokenKey
    graph-trace-active
  end note

  note right of Pinned
    pinned trace lit + graph-trace-pinned
    foreign hover: ephemeral preview (pin on click)
  end note
```

**Atomic commit:** `beginTrace(tokenKey, edges)` sets `hoveredTokenKey` + `previewEdges` in one call so lit paint and wires appear together (no staggered shadow).

**Effective trace lit:** `mergeTraceLit(pinned, hover)` when both differ; `pinnedPreviewEdges` restore on hover leave.

---

## Hover intent timing

Constants: `client/src/lib/hoverIntent.ts`

```mermaid
sequenceDiagram
  participant U as User pointer
  participant H as scheduleHoverFire
  participant T as Timer
  participant B as beginTrace

  U->>H: enter token A (cold)
  H->>T: fire in 150ms
  U->>H: leave A before 150ms
  H->>T: cancel fire
  Note over B: no trace

  U->>H: enter token A (cold)
  H->>T: fire in 150ms
  T->>B: onFire → edges + lit
  U->>H: enter token B (warm)
  H->>T: fire in 80ms
  T->>B: replace trace with B

  U->>H: leave token
  H->>T: clear in 150ms grace
  T->>B: endTrace (if unpinned)
```

| Constant | Value | Effect |
| -------- | ----- | ------ |
| `FIRE_COLD_MS` | 150 | First hover dwell |
| `FIRE_WARM_MS` | 80 | Adjacent token while warm |
| `LEAVE_GRACE_MS` | 150 | Anti-flicker between neighbors |
| Ctrl held | 0 | Instant fire via `fireDelayMs` |

---

## Edge direction and fan-out

Direction is **always definition → usage**, regardless of which end the user hovers.

```mermaid
flowchart TB
  subgraph usage_hover [Hover usage chip]
    U1[Call site chip] -->|single edge| D1[Definition anchor]
  end

  subgraph def_hover [Hover definition label]
    D2[Member / class def label] -->|fan-out| U2[Usage 1]
    D2 --> U3[Usage 2]
    D2 --> U4[Usage N]
  end
```

| Hover target | Edge builder | Count |
| ------------ | ------------ | ----- |
| Usage in `CodeLine` | `buildUsagePreviewEdge` | 1 |
| Member row / class title def | `buildDefinitionPreviewEdges` | All usages in ego-graph |
| Local param / local var | `buildLocalPreviewEdges` | In-body only |

**Graph-aware fan-out:** `resolveDefinitionUsageSites` scans `graphData` + live `ClassNodeData` for `\btoken\b` matches, not only visible DOM chips. Signature line of the source member is skipped.

**DOM fan-out:** Member signature tokens (`isDefinitionSignatureLine`) carry `data-symbol-role="definition"` in `CodeLine` so they are not counted as usage anchors when tracing from the member-row label.

**Same-class usage → def:** `resolveVisibleTarget` MUST NOT skip `flowNodeId === sourceFlowId`; wire lands on `.member-row-label` element when present.

---

## Anchor resolution waterfall

Finest revealed level wins. Re-evaluated every frame while trace is active (`liveFrom` / `liveTo` on `PreviewEdgeSpec`).

```mermaid
flowchart TD
  Start([Resolve usage site]) --> Chip{Usage chip in DOM?}
  Chip -->|yes| E1[element: TokenChip]
  Chip -->|no| Body{Class body expanded?}
  Body -->|no| H1[handle: previewTargetTop]
  Body -->|yes| Member{Method row expanded?}
  Member -->|no| H2[handle: previewMemberHandle]
  Member -->|yes| Line{Line visible?}
  Line -->|chip later| E1
  Line -->|no chip yet| H3[handle: previewLineHandle]

  Start2([Resolve definition site]) --> Label{Def label in DOM?}
  Label -->|yes| E2[element: member-row-label / node-card-title]
  Label -->|no| Fallback[Same waterfall as usage handles]
```

Handle ids are **per-node** (`previewLineHandle(memberId, line)`, `previewTargetTop(flowNodeId)`). Never use a shared handle id across nodes.

---

## Live wire retargeting on expand/collapse

```mermaid
sequenceDiagram
  participant U as User
  participant N as ClassNode state
  participant E as PreviewEdgeSpec
  participant O as PreviewEdgeOverlay rAF
  participant L as computeTraceLit

  U->>E: pin trace on normalizeForDedup (def)
  Note over E: liveTo hints per usage site
  U->>N: expand deduplicateSuggestions
  loop each animation frame
    O->>E: refinePreviewEdge(liveTo)
    O->>O: measure DOM anchors
    Note over O: wire moves member handle → line chip
  end
  N->>L: revealRevision bumps (expandedMethodIds)
  L->>E: refinePreviewEdge + absorb usage chip
  Note over L: token-chip-lit + token-chip-on on call site
```

**Normative:** When a pinned/hovering **definition fan-out** wire retargets to a usage chip (member body was collapsed at pin time, expanded after), the call-site `TokenChip` MUST receive `token-chip-lit` and `token-chip-on` — not only a line-handle socket.

`computeTraceLit` MUST use the same `refinePreviewEdge` path as the overlay and MUST re-run when `revealRevision` changes (member/class expand state).

### Def title → open callee (acceptance path)

```mermaid
flowchart TD
  A[Click function title<br/>buildSubtitle def] --> B[Fan-out edges + liveTo hints]
  B --> C{Caller method expanded?}
  C -->|no| D[Wire ends at member handle]
  C -->|yes| E[Wire ends at usage TokenChip]
  D --> F[User expands caller row]
  F --> G[revealRevision + refinePreviewEdge]
  G --> E
  E --> H[Chip lit + socket on + wire on chip anchor]
```

Implementation: `client/src/lib/computeTraceLit.ts` (lit sets), `client/src/lib/traceLitController.ts` (imperative DOM classes), `GraphInteractionContext` `revealRevision` dep.

---

## Modifier stack (normative)

| Input | Effect |
| ----- | ------ |
| Hover | Dwell → preview edges (cold/warm timing) |
| Ctrl | Instant preview; dim syntax/keywords; shimmer indexed tokens |
| Click token / wire | Pin one trace (**replaces** existing pins) |
| Shift+click token | **Accumulate** pin — add trace; merged lit + wires *(planned)* |
| Esc / empty canvas | Clear all pins |
| Expand class/member header during pin | Pin + wires **stay**; anchors retarget via `revealRevision` |

---

## Pin lock

While `pinnedTokenKey` is set, the **pinned trace stays lit** (context bar, pinned endpoints, pinned wires after hover ends). **Foreign token hover** still runs the normal dwell → `beginTrace` preview (chip-on, wires, lit chain) but does **not** change the pin until the user **clicks** the new token.

```mermaid
flowchart LR
  Pin[pinnedTokenKey set] --> G1[scheduleHoverFire: any indexed key]
  Pin --> G2[beginTrace: updates ephemeral previewEdges]
  Pin --> G3[graph-trace-pinned on canvas]
  Pin --> G4[hover leave clears hoverPreviewEdges only]
  Pin --> G5[previewEdges = pinned + hover in parallel]
  Pin --> OK[Click: replace pin set]
  Pin --> Acc[Shift+click: accumulate pin]
```

| Action | Unpinned trace | Pinned trace |
| ------ | -------------- | ------------ |
| Hover other token | Switch after dwell | **Ephemeral preview** (pin unchanged) |
| Leave hovered token | endTrace | Clear hover edges only; pinned wires stay |
| Pass-over CSS on dim tokens | Stays `--faint` | Stays `--faint` until dwell fires |
| Expand member | Live retarget wires | Live retarget wires |
| Click other token | Pin | **Replace** pin set (single trace) |
| Shift+click other token | Pin | **Accumulate** — add trace; prior pins stay lit *(planned)* |
| Empty canvas / Esc | endTrace | clearTokenInfo (all pins) |

**Effective trace lit:** `mergeTraceLit(computeTraceLit(pinned…), computeTraceLit(hover…))` when hover key differs from pin. **`previewEdges`** exposed to the overlay is `pinnedPreviewEdges + hoverPreviewEdges` in parallel while both are active.

---

## Visual modes (CSS root classes)

Applied on graph pane wrapper (`GraphFlowCanvas`):

```mermaid
flowchart TB
  subgraph classes [Canvas classes]
    C[graph-ctrl-preview] -->|Ctrl held| Shimmer[indexed token glint]
    T[graph-trace-active] -->|traceTokenKey set| Dim[dim non-lit tokens color-only]
    P[graph-trace-pinned] -->|pinnedTokenKey set| Pin[pinned trace + ephemeral hover preview]
  end
```

| Mode | Lit tokens | Dim tokens | Node header |
| ---- | ---------- | ---------- | ----------- |
| Idle | semantic colors | normal | card background |
| Trace active | semantic + endpoints `token-chip-on` | `--faint` text, **no bg wash** | **no tint** (stays white/card) |
| Ctrl + trace | shimmer stays on for every indexed token (Ctrl always wins) | faint + shimmer | no tint |
| Pinned | pinned trace lit + optional hover preview | faint until dwell (or immediately if Ctrl held) | no tint |

**Active chips (`token-chip-on`):** inset `0.5px` ring at ~76% semantic `currentColor`; pinned source (`token-chip-source`) keeps semantic ink on hover/focus while a foreign hover preview runs; ephemeral preview endpoints use brand inset ring.

**Sockets (`FlowAnchor`):** bloom on endpoints only (`token-chip-on`); soft glow via `currentColor` + tight box-shadow (not oversized blur).

---

## Trace hosts (where hover starts)

```mermaid
flowchart LR
  subgraph hosts [Indexed trace hosts]
    CL[CodeLine TokenChip usage]
    MR[CollapsibleMemberRow label def]
    NH[NodeCardHeader title def]
  end

  hosts --> SCH[scheduleHoverFire]
  SCH --> FIR[onFire → build edges]
  FIR --> BT[beginTrace]
  BT --> CTX[GraphInteractionContext]
  CTX --> LIT[computeTraceLit]
  CTX --> OVL[PreviewEdgeOverlay]
```

**Click pin** opens docked `TokenContextBar` (not a floating popover). Plain click replaces the pin set with one trace; **Shift+click** adds a trace to the accumulated set without clearing earlier pins *(planned — see SPEC-DRIFT)*. Wire click pins trace + scroll + flash. Ctrl does not pin — it only accelerates hover reveal and dims syntax (`graph-ctrl-preview`).

---

## Out of graph

```mermaid
flowchart LR
  Hover[Hover indexed usage] --> R{resolveVisibleTarget}
  R -->|in graph| Edge[preview edge]
  R -->|external only| Card[reference card → /api/focus]
  R -->|same graph file not loaded| Card
```

---

## File map (interaction layer)

| File | Role |
| ---- | ---- |
| `GraphInteractionContext.tsx` | State, timers, pin, beginTrace/endTrace |
| `useTokenTrace.ts` | Per-host hover + pin hooks |
| `hoverIntent.ts` | Dwell constants |
| `buildPreviewEdges.ts` | Edge specs + live hints |
| `linksForElement.ts` | Def fan-out + usage sites |
| `resolveVisibleTarget.ts` | Usage → def target |
| `resolveLiveAnchor.ts` | Per-frame anchor refine |
| `computeTraceLit.ts` | Lit / endpoint sets |
| `preview-wires.css` | Wires, sockets |
| `trace-modes.css` | Trace dim |
