# Preview edges — wayfinding supplement

Normative routing rules for **orthogonal** and **fan/bus** preview wires. Parent: [preview-edges.md](preview-edges.md). Kind taxonomy: [connection-taxonomy.md](connection-taxonomy.md).

## Routing goals

Preview wires must satisfy these invariants (in priority order):

1. **Legibility** — strokes use **corridors** (gutters beside/between code lines). A wire MUST NOT pass through indexed token chips or cover readable source text.
2. **Topology** — when N targets share one source, the overlay reads as **one feed-in → one knot → N branches**, not N unrelated curves.
3. **Kind fidelity** — Usage / binding / transitive stay **cubic** (smooth tree curves). Branch and typesetting stay **orthogonal** (sharp gutter buses). Do not convert data wires to Manhattan to fix routing.
4. **Cluster honesty** — targets that are visually one group (same-line `addr.city ?? addr.town …`) bus together; spatial outliers (e.g. `if (!addr)`) remain **solo** wires.

## Path geometry

Data-kind wires (solo and fan) use one **`peer` cubic** per leg — same `cubicPath` + `chipClearance` + `cubicPortSides` as solo usage preview wires. Branch and typesetting use orthogonal helpers.

Implementation: `layoutFanPaths` in `wirePaths.ts` calls `previewWirePath` for every trunk and spur leg (all `connectionKind`s); `wirePathsFan.ts` owns knot placement only.

## When wires fan

When **2+ wires** share the same source element and the same `connectionKind`, the overlay routes them as a **fan** when their targets form a **Y-proximity cluster**:

- Sort targets by `(y, x, id)`.
- Greedy bucket: add consecutive targets while `max(Y) − min(Y) ≤ FAN_TARGET_Y_SPAN` (**104px**).
- Keep bucket only if `shouldFanCluster` passes (≥2 wires, same outbound direction, not nearly colocated pair).

A distant outlier (e.g. `if (!addr)`) does not prevent bus grouping for nearer same-line targets (e.g. `addr.city ?? addr.town ?? addr.village`).

Explicit `branchFan` groups (built at trace time) always fan. Other kinds fan at **render time** via `wireFanLayout.ts`.

## Cluster shapes

Classify resolved spur endpoints after bucketing:

| Shape | Detection | Example |
| ----- | ----------- | ------- |
| **solo** | 1 wire in bucket | `addr` → `if (!addr)` |
| **horizontal** | ≥2 spurs, `max(y2) − min(y2) ≤ FAN_CLUSTER_Y_SPREAD` (**10px**) | `addr.city ?? addr.town ?? addr.village` |
| **vertical** | ≥2 spurs, Y spread > 10px and ≤ 104px | Usages on consecutive lines in one method |

Horizontal fans split again by source position:

| Sub-shape | Detection | Knot layout |
| --------- | ----------- | ------------- |
| **center-above** | `horizontal` and `sourceY < min(targetY) − 4` | Knot over cluster midpoint, fork row above targets (§ Knot placement) |
| **same-row gutter** | `horizontal` and source on/near target row | Knot in **left gutter** column left of all targets (legacy bus) |

## Fan topology

```text
        source chip
             │
        peer cubic
             ▼
           ◆ knot  (busX, forkY)  — junction disc on wire 0 only
          ╱ │ ╲
   peer    │  peer …
        chip chip chip
```

1. **Trunk** — wire 0 only: peer cubic source → knot.
2. **Knot** — one `preview-edge-junction` at `(busX, forkY)` on the first fan member: soft ring + chevron along average outbound bearing.
3. **Spurs** — peer cubic knot → each target. Vertical clusters: wire 0 also draws shared spine `forkY…spineEndY`.

## Knot placement

One rule for **all** connection kinds — `computeFanBusX` + `fanSpineRange` in `wirePathsFan.ts`:

| Shape | `busX` | `forkY` |
| ----- | ------ | ------- |
| **vertical** | Left gutter: `computeBranchBusX` | `min(target Y)` |
| **horizontal · same-row gutter** | Left gutter − `FAN_CLUSTER_BUS_EXTRA` | `min(target Y)` |
| **horizontal · center-above** (source above same-line targets) | Cluster midpoint `(min(x2)+max(x2))/2` | `min(target Y) − FAN_HORIZONTAL_SPLIT_ABOVE` |
| **solo** | N/A | N/A |

`connectionKind` affects **stroke style** only (`previewWirePath` cubic vs orthogonal), not knot position.

## Fan trunk and spurs

All fan segments use the same **`peer` cubic** as solo usage wires (`cubicPath` + `chipClearance` + `cubicPortSides`) — one curve per leg, no special trunk assembly.

| Leg | From | To |
| --- | ---- | -- |
| **Trunk** (wire 0) | Source chip | Knot `(busX, forkY)` |
| **Spur** (each member) | Knot | Target chip |
| **Spine** (vertical wire 0 only) | `forkY` | lowest target Y — `treeSpinePath` in gutter |

| Shape | Trunk |
| ----- | ----- |
| **horizontal · center-above** | Peer cubic source → knot |
| **vertical** | Peer cubic source → left-gutter knot + spine on wire 0 |
| **horizontal · same-row gutter** | Peer cubic source → knot |
| **solo** | Peer cubic end-to-end |
| **branch** | Orthogonal `computeBranchTrunk` — unchanged |

## Spurs by connection kind

| Kind | Spur geometry |
| ---- | ------------- |
| **branch** | `previewWirePath` with `fanLeg: "spur"` (orthogonal tap) |
| **usage / binding / transitive** | `previewWirePath` with `fanLeg: "spur"` (cubic) |
| **typesetting** | Solo rounded Manhattan only — never bus-fanned |

## Member lane allocator

Within one member row, multiple **orthogonal** wires (`branch`, `typesetting`) receive staggered `lane` indices (±1, ±2…) passed to `previewWirePath` so above-line typesetting corridors and branch buses do not coincide.

## Constants

| Constant | Value | Role |
| -------- | ----- | ---- |
| `FAN_TARGET_Y_SPAN` | 104px | Max vertical span to bucket targets into one fan |
| `FAN_TARGET_MIN_SPREAD` | 12px | Skip fan for nearly colocated pairs |
| `FAN_CLUSTER_Y_SPREAD` | 10px | Same-line vs vertical cluster split |
| `FAN_CLUSTER_BUS_EXTRA` | 20px | Extra left gutter before tight clusters |
| `FAN_HORIZONTAL_SPLIT_ABOVE` | 20px | Fork row above same-line cluster |
| `ORTHOGONAL_STUB` | 24px | Chip entry/exit stub |
| `ORTHOGONAL_TRUNK_PAD` | 12px | Gutter padding from chip left edge |

## File map

| File | Role |
| ---- | ---- |
| `wireFanLayout.ts` | Cluster bucketing, fan member layout, junction bearing |
| `wirePathsFan.ts` | Knot placement, trunk/spur path assembly, cluster shape |
| `previewWirePaths.ts` | `cubicPath` (peer profile) |
| `wirePathsOrthogonal.ts` | Branch/typesetting corridors, `belowRectY`, `treeSpinePath` |
| `previewEdgeJunction.ts` | Knot disc + chevron |
| `wireDomSync.ts` | Applies `pathD` + junction to SVG DOM |

## Acceptance

- [ ] Given solo usage wire def → usage, when trace fires, then path uses `peer` profile (may shallow-dip below row) and no junction knot
- [ ] Given 2+ usage sites within 104px vertical span, when trace fires, then wires share one `fanTrunk` + knot + `fanSpur` branches
- [ ] Given one distant usage and 2+ same-line usages from one source, when trace fires, then same-line wires bus together and the outlier uses solo `peer` routing
- [ ] Given same-line cluster and source **above** target row, when trace fires, then knot is at cluster center X and `forkY` is `FAN_HORIZONTAL_SPLIT_ABOVE` above the row
- [ ] Given center-above fan, when trace fires, then trunk is one peer cubic (same geometry as solo usage) source → knot
- [ ] Given center-above fan, when trace fires, then spurs are cubic (`fanSpur`) and do not U-sag below the target row
- [ ] Given vertical usage cluster, when trace fires, then trunk uses left gutter + shared spine on wire 0; spurs tap each row
- [ ] Given same-line cluster and source on the target row, when trace fires, then knot uses left-gutter `busX` (same-row gutter sub-shape)
- [ ] Given `switch` with 2+ branches, when control-flow trace fires, then orthogonal `branchFan` trunk + junction apply (unchanged)
- [ ] Given two typesetting wires in one member, when both fire, then distinct orthogonal lanes prevent corridor overlap
