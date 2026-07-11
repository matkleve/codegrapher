# Class node

## What It Is

React Flow compound node rendering one parsed class: header, collapsible property/method sections, inline source with token chips, and live snap-to-content resize.

## What It Looks Like

Rounded card with file-type chip, camelCase-split title, expand chevron. Method row headers show compact param and return-type tags parsed from the signature. Member rows stack vertically; expanded methods show monospace source with a **left gutter line number** per row — the actual 1-based line number in the source file (not a per-member count restarting at 1), so it matches what an editor would show at that line; hovering a source line applies brand-tinted row background (simulation current line uses a stronger highlight). Resize handle at bottom; height always fits open content.

## Where It Lives

- **Component:** `ClassNode.tsx` (render only)
- **Hooks:** `useClassNodeController` → commit, members, resize
- **Parent:** React Flow via `flowNodeTypes.ts`

## Actions

| # | User Action | System Response | Triggers |
| --- | ----------- | --------------- | -------- |
| 1 | Clicks header (not chip or title token) | Toggle body collapsed | `onToggleCollapsed` on header |
| 2 | Clicks indexed title | Pin definition trace | `useTokenPin` |
| 3 | Drags header | Move node | `node-drag-handle` on header root |
| 4 | Clicks member row | Expand/collapse inline source | `onToggleMethod` / `onToggleProperty` |
| 4b | **Double-clicks** anywhere in member row (header or body) | Reading focus: expand member, widen node, scroll into view; `?focus=` URL | `focusReadingMember` |
| 5 | Clicks section header | Bulk expand/collapse section | `onToggleMethodsSection` |
| 6 | Drags resize control | Live snap height to content | `useClassNodeResize` |
| 7 | Hovers indexed token in body | Preview edge — see [preview-edges](../../system/preview-edges.md) | `GraphInteractionContext` |
| 7a | Hovers local/param binding or initializer | Usage fan-out + **binding** wire (init → binding) — see [connection-taxonomy](../../system/connection-taxonomy.md) § Binding | `buildBindingPreviewEdges` |
| 7b | Hovers `switch`/`if` keyword or its condition/discriminant | **Control flow** fan-out to every `case`/`default`/`else`/`else if` branch — see [connection-taxonomy](../../system/connection-taxonomy.md) § Control flow | `buildControlFlowPreviewEdges` |
| 7c | Hovers a single `case`/`default`/`else`/`else if` branch | One **Control flow** wire back to the `switch`/`if` keyword | `buildControlFlowPreviewEdges` |
| 7d | Hovers indexed param or type in signature tags | Trace dims row + signature; edge when target resolves | `MemberSignatureTags` |
| 7e | Hovers a property in a `a.b.c` member-access chain | Own **Usage** wire (if resolvable) **plus** its receiver's own wire, cascaded leftward — see [preview-edges.interactions.supplement.md](../../system/preview-edges.interactions.supplement.md) § Member-access cascade | `buildReceiverCascadeEdges` |
| 8 | Hovers member def label | Def fan-out to usages | `buildDefinitionPreviewEdges` |
| 9 | Right-click → path mode | _(graph-level)_ path highlight when second node picked | graph chrome |

## Component Hierarchy

```text
ClassNode
├── Handle (previewTargetTop — invisible)
├── FlowAnchor (class header)
├── NodeCardHeader (title def + FlowAnchor socket)
├── [body expanded]
│   ├── MemberSection (properties)
│   │   └── CollapsibleMemberRow → CodeLine
│   └── MemberSection (methods)
│       └── CollapsibleMemberRow → CodeLine
└── NodeResizeControl
```

## Data

| Field | Source |
| ----- | ------ |
| `ClassNodeData` | `/api/file-graph` / merge |
| `methods[]`, `properties[]` | server parser |
| method header tags | client `parseMethodSignature` on method `code` |
| `width`, `height` | node state + resize commit |

## State

| State | Default | Effect |
| ----- | ------- | ------ |
| `collapsed` | false | Hides member sections |
| per-member `expanded` | false | Shows CodeLine block |
| `height` | computed | Snap-to-content; no CSS height transition on card |

## File Map

| File | Purpose |
| ---- | ------- |
| `ClassNode.tsx` | Render |
| `useClassNodeController.ts` | Composes hooks |
| `useClassNodeCommit.ts` | Single node writer |
| `useClassNodeMembers.ts` | Member toggles |
| `useClassNodeResize.ts` | Snap resize |
| `classNodeLayout.ts` | Height math |

## Wiring

Resize MUST commit via `computeClassNodeHeight` — do not bind card CSS height to React Flow's raw drag height (render loop risk). `useLayoutEffect` refines resting height when not dragging.

## Interaction emphasis

- [x] Member rows and header use brand hover via shared tokens
- [x] Path highlight uses `ring-ring`, not brand

## References

- Preview interactions: [preview-edges.interactions.supplement.md](../system/preview-edges.interactions.supplement.md)

## Acceptance Criteria

- [ ] Collapsed node shows header only; body does not overflow card
- [ ] Resize never leaves empty space below last visible row
- [ ] Shrinking height closes members top→bottom before clipping
- [ ] Method row headers show param + return tags when signature parses
- [x] Header param names use TokenChip connectors (def → in-body usages)
- [x] Param usage wires anchor at the in-body declaration when hovering a usage; hovering a def fans out only from that chip (header twin lights, no duplicate wire)
- [ ] Only expanded method bodies expose indexed token chips for preview
- [ ] `previewTargetTop(id)` handle is unique per node
- [ ] Double-clicking anywhere in a member row (header or inline body) expands it and scrolls it into reading position
- [ ] ClassNode.tsx stays render-only; logic in hooks
