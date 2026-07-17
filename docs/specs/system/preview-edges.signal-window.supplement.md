# Preview edges — signal window supplement

Normative detail for the wire signal's transit model: how a wire grows, how it
behaves on release, and when it's removed. Parent: [preview-edges.md](preview-edges.md).
Companions, all unaffected by this change: [interactions supplement](preview-edges.interactions.supplement.md)
(cascade timing), [anchoring supplement](preview-edges.anchoring.supplement.md)
(anchors, retargeting, wire engine triggers).

**Status:** Replaces the previous grow-then-fade model. Design finalized
2026-07-17, grounded in a working prototype (Signal Lab artifact) and verified
against the running app before this spec was written — see
[signal-wire-port-plan.md](../../project/signal-wire-port-plan.md) for the
before/after comparison and measured numbers that motivated this change.

---

## What changes vs. what stays

**Unchanged:** hop-sequential cascade, per-kind color/dash/marker
(`connectionWireStyle.ts`), anchor resolution waterfall, live retargeting on
expand/collapse, pin lock, legend filters, `wireEngine.ts`'s idle-until-signal
re-measure loop. This supplement narrows to exactly one thing: **what a single
wire's stroke does between "signal starts" and "wire removed."**

**Changed:** a wire no longer (a) draws once via a one-shot WAAPI/RAF stroke
animation then (b) sits static under a CSS `proto-flow` march until (c) fading
out as a flat opacity transition on release. It now runs a continuous
**head/tail signal window** for its entire lifetime, matching the retire
behavior to the reveal behavior instead of treating them as unrelated
animations.

---

## The model

Every wire (`WireElements`, keyed by `spec.id` — this is per-*edge* state, not
a shared clock; different hops already start at different times via the
existing stagger, so per-wire state is the natural fit, not a new concept) owns
two normalized values:

```
head ∈ [0, 1]   — how far the signal has reached toward the target
tail ∈ [0, 1]   — how far the "already-consumed" trailing edge has advanced
```

**While emitting** (the wire's hop is due to start, per the existing
`wireHopStaggerMs` schedule, and the trace/hover signal is still active):
- `head` advances from 0 toward 1 at a constant rate — full transit takes
  `wireRevealMs` (see Timing below). This **is** the existing reveal draw,
  unchanged in mechanism, just reframed as one endpoint of a two-endpoint
  model instead of a one-shot animation.
- `tail` stays pinned at 0 — the wire is a *growing* segment: `[0, head]`.

**On release** (hover ends, or this wire drops out of the active preview-edge
set for any other reason — trace cleared, pin removed, edge kind toggled off),
**both of the following start at the exact same instant — concurrently, not
sequentially:**
- `head` **keeps advancing** to 1 if it hasn't arrived yet — release does not
  freeze it. (The *fact* that an unfinished reveal isn't cut short already
  holds today via `retireWireGroup`'s wait-for-reveal-to-finish branch — that
  outcome is preserved. **How** it's achieved is not: today's code achieves it
  by sequencing — waiting for `head` to fully finish before starting any
  retire animation at all. That sequencing is gone.)
- `tail` **starts advancing the same frame release happens** — it does not
  wait for `head` to finish arriving first, even if `head < 1` at that moment.
  Both values move every frame from release onward, at the same rate, `tail`
  behind `head` by construction (it started later and never overtakes). The
  visible segment `[tail, head]` shrinks from the *source* end, not by
  fading — the wire visually empties out toward the target as if the signal
  that was already in flight keeps going and nothing new is being fed in
  behind it.

**Normative — this is the one thing that could accidentally regress into the
old sequential shape.** A "wait for reveal to finish, then start the consume
sweep" implementation would look correct in the common case (most wires are
already fully arrived by the time a real hover ends, since `wireRevealMs` is
short relative to typical hover duration) and would only visibly diverge from
this spec on a very quick hover that releases before `head` reaches 1 — exactly
the case worth a regression test, precisely because it's easy to miss by eye.

**Removal:** the wire is removed from `wires` (and its DOM group destroyed)
only once **both** `head >= 1` and `tail >= 1` — fully arrived *and* fully
consumed. Never removed while `head < 1` (an unfinished signal is never cut
short) and never removed by an opacity transition — removal and "visually
gone" are the same event now, not two.

This is the same head/tail relationship the Signal Lab artifact's
`makePulsePool` proved out, adapted to per-wire persistent identity instead of
a pooled-clone model — codegrapher's wires already have their own identity via
`spec.id`, so the pool (built in the artifact specifically because it had none)
isn't needed here.

---

## Rendering: JS-driven only during transit, CSS the rest of the time

**Normative, and a deliberate departure from the artifact:** the artifact
drove every frame through JS (`applySegment`) uniformly, settled or not,
because it had a handful of DOM nodes and performance was never a concern. The
real app can have many simultaneous wires held open by a long hover — driving
per-frame JS math for a wire that's just sitting fully connected would be
wasted work compared to the existing, cheap CSS `proto-flow` march.

| State | head | tail | Rendering |
| ----- | ---- | ---- | --------- |
| Growing | `< 1` | `0` | JS-driven: `stroke-dasharray`/`-dashoffset` windowed to `[0, head]`, same technique as today's `armPathStrokeDraw`/`runStrokeDraw` |
| **Settled** (arrived, still emitting) | `1` | `0` | **CSS-driven** — `preview-edge-marching` class + `proto-flow` keyframe, exactly as today. No per-frame JS while a wire just sits connected. |
| Consuming | `1` | `> 0, < 1` | JS-driven: windowed to `[tail, 1]`, mirrors the growing case with tail in place of head |
| Gone | `1` | `1` | Removed |

A wire only touches JS-driven per-frame math while actually in the Growing or
Consuming rows above — i.e., exactly the windows where something is visibly
changing. `wireEngine.ts`'s existing idle-until-signal loop (see interactions
supplement, "Wire engine — re-measure triggers") is the right owner for this
tick — it already idles at rest and only runs while there's activity to
track; this model **extends** what counts as "activity" (a wire in transit)
rather than introducing a second, competing RAF loop.

---

## Timing

| Constant | Old value | New value | Meaning now |
| -------- | --------- | --------- | ------------ |
| `wireRevealMs` | 120 (code) — **specs said 240, stale before this change** | **420** (initial value — tune by eye, not measured against real usage yet) | Full source→target transit time for **either** direction of travel: how long `head` takes 0→1, and how long `tail` takes 0→1 once released. One constant, two uses. |
| `wireHopStaggerMs` | 120 (code) — specs said 100, stale | **420**, tracks `wireRevealMs` | Unchanged coupling: a hop's `head` does not start advancing until the previous hop's `head` reached 1. Must move with `wireRevealMs` or cascades desync — this was already true and already documented, just re-stated here because it directly affects the new value. |
| `wireFanStaggerMs` | 14 (code) — specs said 25, stale | unchanged, 14 | Tie-break stagger within one hop; independent of this change |

The 240/100/25 numbers in the interactions supplement predate this change and
were already wrong relative to the shipped code (120/120/14) — not something
this port introduced. Corrected here as part of touching this area; see
`SPEC-DRIFT.md`.

**420ms is a starting point, not a derived number.** It was chosen as
"noticeably slower than the old 120ms (imperceptible), nowhere near the
artifact's 1.5s demo default (would make routine hovering feel heavy)." Land
it, use the app, retune — a single named constant, one-line change either way.

---

## Interaction with existing normative rules

- **Fire-and-forget cascade** (`token-hover.atlas.supplement.md`, "Hop-sequential
  cascade"): unchanged. A short hover still completes the full cascade — the
  existing `keepWireSignalAlive`/`wireCascadeDurationMs` mechanism, which
  already exists to let `head` finish arriving on early release, now *also*
  covers letting `tail` finish its own consume sweep on the same wire before
  removal — no new mechanism, same one, doing one more job.
- **Load stub wires:** consume behavior applies the same way once
  `data-load-stub-ready` — unchanged gating, only the retire animation changes.
- **Pinned wires:** a pinned wire's signal does not consume on a *foreign*
  hover ending — only on the pin itself clearing (Esc, empty-canvas click,
  replace-pin). Ephemeral hover-only wires on a pinned canvas consume on their
  own hover end, independent of pin state — same locality rule that already
  governs which wires exist in `previewEdges` at all.

---

## What is *not* changing here

- **Click-to-jump on a wire is being removed**, and the data-inspector
  addition — both covered in [signal-wire-port-plan.md](../../project/signal-wire-port-plan.md)
  and the Actions table in the parent spec. Orthogonal to the head/tail model
  above; mentioned here only so this file doesn't read as silent on it.
- Per-kind color/dash/marker identity: fully unchanged, this document only
  concerns the transit animation, not `connectionWireStyle.ts`.
