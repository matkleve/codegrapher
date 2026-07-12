# Preview edges — wayfinding supplement

Normative routing rules for **orthogonal** and **fan/bus** preview wires. Parent: [preview-edges.md](preview-edges.md).

## Fan / bus topology

When **2+ wires** share the same source element and the same `connectionKind`, the overlay routes them as a **fan** when their targets form a **Y-proximity cluster** (maximal consecutive groups sorted by target Y where span ≤ **104px**, `FAN_TARGET_Y_SPAN`). A distant outlier (e.g. `if (!addr)`) does not prevent bus grouping for nearer targets on the same line (e.g. `addr.city ?? addr.town ?? addr.vil`).

1. **Trunk** — exit source, drop beside the head line, run to a shared **bus column**
2. **Knot** — junction disc at `(busX, busTopY)` where trunk meets the bus
3. **Spurs** — tap from the bus into each target

| Kind | Spur geometry |
| ---- | ------------- |
| Control flow (`branch`) | Orthogonal gutter bus + horizontal tap |
| Usage / binding / transitive | **Cubic trunk** (same exit curve as solo wires) + cubic bus drop + cubic spurs |
| Typesetting | Solo rounded Manhattan only — never bus-fanned |

Explicit `branchFan` groups (built at trace time) always fan. Other kinds fan at **render time** via `wireFanLayout.ts` when clustering rules pass (same `connectionKind` + source element only).

## Member lane allocator

Within one member row, multiple **orthogonal** wires (`branch`, `typesetting`) receive staggered `lane` indices (±1, ±2…) passed to `previewWirePath` so above-line typesetting corridors and branch buses do not coincide.

## Junction knots

Each fan member draws `preview-edge-junction` at its **spur fork** `(busX, targetY)` — where the shared trunk meets that wire's tap. No separate bus-guide overlay; the trunk is part of the dashed wire path.

## Acceptance

- [ ] Given def hover with 2+ usage sites within 104px vertical span, when trace fires, then wires share one trunk + knot and cubic spurs
- [ ] Given def hover with one distant usage and 2+ same-line usages, when trace fires, then same-line wires bus together and the outlier uses solo routing
- [ ] Given def hover with sites farther apart, when trace fires, then each wire uses solo cubic routing
- [ ] Given `switch` with 2+ branches, when control-flow trace fires, then existing `branchFan` trunk + junction + guide apply
- [ ] Given two typesetting wires in one member, when both fire, then distinct orthogonal lanes prevent corridor overlap
