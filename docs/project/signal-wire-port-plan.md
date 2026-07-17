# Signal wire port plan

Bring the wire-signal behavior prototyped in the Signal Lab artifact into the real
app's hover/trace wires, where it's genuinely missing — not a rewrite of the whole
preview-edge system. Companion to
[`execution-debugger-plan.md`](./execution-debugger-plan.md) (different concern:
that's real code execution, this is the visual signal layer) and to
[`trace-engine-consolidation-plan.md`](./trace-engine-consolidation-plan.md), whose
`traceEngine` slice (`signal`, `arrivals`) this plan reads from and writes to.

**Status:** Design only (2026-07-17). Grounded in empirical testing of the running
app (Playwright against `codegrapher-dev`, hovering `charge` in
`fixtures/demo/OrderService.ts:checkout`), not just source reading — the numbers
below are measured, not estimated.

---

## What's actually there vs. what's missing

The instinct going in was "port the artifact's mechanic in, replace the current
system." Reading `wireDomCreate.ts` / `wireDomSync.ts` / `wireReveal.ts` first, and
then actually driving the app headless to confirm, found a narrower gap than
expected:

| Artifact behavior | Real app today | Verdict |
| --- | --- | --- |
| Nothing exists until fired | `hideWireUntilReveal` — already true | Keep, no change |
| Independent concurrent signals | Every wire already has its own DOM identity (`Map<string,WireElements>` keyed by `spec.id`) — the pulse-pool problem the artifact solved doesn't exist here | Keep, no change |
| Authentic per-kind dash/speed while flowing | `preview-edge-marching` + per-kind CSS (`preview-edge.css`) — this is where the artifact's numbers *came from* | Keep, no change |
| Visible growth on fire | `playWireReveal`/`runStrokeDraw` do the same dasharray/dashoffset grow **but `wireRevealMs = 120`** (`traceMotion.ts:20`) — measured via Playwright: fully grown and marching within ~180ms of first paint. Reads as instant pop-in, not a visible grow. | **Change — too fast to register** |
| Release keeps traveling to target, then disappears | `retireWireGroup` fades the *whole* wire's opacity to 0 over `MOTION_TRACE_OUT_MS`, then removes it — measured: opacity 0.94 → 0.25 → removed within ~250ms, no travel | **Change — wrong behavior, not just wrong speed** |
| Click a wire to inspect its data | Doesn't exist. `hitMid.onclick` is currently wired to a "jump to endpoint" tooltip (`usePreviewEdgeOverlay.ts:144`) — but that capability is **redundant**: `TokenConnectionMenuPanel`/`connectionMenu.ts` already gives every token a right-click "All connections" menu with `jump`/`load`/`openEditor` per connection, covering the same endpoints. | **Remove the wire's jump tooltip, add data-inspector as the wire's click behavior** |

Net: two timing/behavior fixes to existing code, one genuinely new feature. Not a
system replacement — the reveal/hop/junction/warm-retarget machinery is real,
tuned work (see `interaction-model-audit.md`) and stays as-is.

---

## 1. Visible growth

`client/src/lib/traceMotion.ts`:
```ts
wireRevealMs: 120,       // → raise
wireHopStaggerMs: 120,   // coupled to wireRevealMs by design comment — must move together
```
Proposed default: **420ms**. Reasoning: fast enough to not make routine hovering
feel sluggish (this fires on every hover, far more often than the artifact's
deliberate key-press), slow enough that the dasharray/dashoffset sweep is
perceivable — a 120ms→420ms change is roughly the gap between "instant" and
"just barely watchable" for a human eye. Not a hard number — should be tuned by
eye against real usage before landing, and flagged as a single named constant so
it's a one-line change to retune later.

`wireHopStaggerMs` must track it 1:1 (existing coupling, don't break it) or
multi-hop cascades will desync — hop *N* currently starts exactly when hop
*N-1*'s reveal finishes; that invariant is asserted by
`interaction-model-audit.md`'s cascade-timing findings and should get a
regression test (see Testing below) before this ships, not just eyeballed.

---

## 2. Release: consume instead of fade

**Normative spec, now written first:**
[preview-edges.signal-window.supplement.md](../specs/system/preview-edges.signal-window.supplement.md).
This section is a short pointer to it, not a duplicate — implement against the
spec, not this summary.

Today, `retireWireGroup` (`wireDomSync.ts:34`) either waits for an in-progress
reveal to finish then fades, or fades immediately if already revealed — always via
a CSS `opacity` transition on the whole group, over `MOTION_TRACE_OUT_MS`.

New behavior, per the spec: every wire gets a persistent `head`/`tail` pair.
`head` grows 0→1 while emitting (unchanged mechanism from today's reveal draw).
On release, **`head` keeps advancing if unfinished AND `tail` starts advancing
the same frame — concurrently, not sequentially.** `tail` chases `head` at the
same rate; the drawn segment is `[tail, head]`; the wire is removed only once
both reach 1. Rendering is JS-driven (`stroke-dasharray`/`-dashoffset`
windowing) only while a wire is actually growing or consuming — a settled,
fully-arrived, still-held wire stays on the existing cheap CSS
`preview-edge-marching` class, unchanged.

**The concurrency detail is the one easy way to get this subtly wrong:** a
"wait for `head` to finish, then start the consume sweep" implementation would
pass a casual look (most real hovers already outlast `wireRevealMs`, so `head`
is almost always already at 1 by the time release happens) but is not what the
spec requires, and only diverges from it on a fast hover that releases before
`head` arrives. Test that case explicitly, don't eyeball it.

- New function in `wireReveal.ts`, e.g. `runStrokeConsume(wire, len, onDone)` —
  reuses the same `stroke-dasharray`/`-dashoffset` windowing technique as the
  grow path, tail-driven instead of head-driven, on the same 420ms
  (`wireRevealMs`) rate — **not** `MOTION_TRACE_OUT_MS`, which belongs to the
  surround/lit-DOM importance clock, a separate concept per the spec.
- Ties into the existing `traceEngine` arrivals slice
  (`setWireEndpointArrival`/`wireSignalArrival`) if useful for a future
  data-inspector feed (see below) — the arrival-progress plumbing already exists
  for the *grow* direction, the consume direction can reuse the same shape.

---

## 3. Jump moves to the Connections menu; wire-click becomes the data inspector

Two moves, done together:

- **Remove `hitMid`'s jump-to-endpoint wiring** in `usePreviewEdgeOverlay.ts`
  (`armWire`/`showMidTooltip`/`hideMidTooltip` and the `onclick` that calls
  `onWireClick`). The capability isn't lost — it already exists, more fully, in
  `TokenConnectionMenuPanel` (right-click either endpoint token → "All
  connections" → `jump`). One canonical place for "jump to the other end,"
  instead of two.
- **Wire-click now opens the data inspector directly** — no shared tooltip
  needed, since it's no longer contesting space with jump. This matches the
  artifact's original "click a lane" trigger far more closely than the
  shared-tooltip compromise this plan started with.
- **Content:** per-kind synthetic example text, same idea validated in the
  artifact (grounded in `CONNECTION_KIND_DESCRIPTION` from
  `connectionWireStyle.ts`, using real fixture names) — reused as-is, this part
  doesn't need rediscovery.
- **Panel:** same docked-bottom-right-on-first-use pattern as the artifact,
  same reasoning (no permanent sidebar tax on canvas space).
- **Log entries:** keyed by `spec.id` (the edge's own persistent identity —
  already exists, no pool needed), pushed on reveal-start ("sending"), marked
  delivered on `finishReveal`.

**Verify before removing:** confirm every jump target the wire tooltip
currently reaches (`pickJumpWireEnd`) has a corresponding row in
`connectionMenu.ts`'s row-building logic for both of the wire's endpoint
tokens — the two systems are built from different underlying data
(`PreviewEdgeSpec`/structural edges vs. `UsageSiteRecord`/`CallSiteReference`/
`TokenReference`), so "should be redundant" needs a quick side-by-side check
against a few real edges before the old path is deleted, not just an
assumption from reading both files.

---

## File map (changed / new)

| File | Change |
| --- | --- |
| `client/src/lib/traceMotion.ts` | `wireRevealMs` 120 → 420 (tune by eye), `wireHopStaggerMs` follows |
| `client/src/lib/wireReveal.ts` | add `runStrokeConsume`; `finishReveal`/`stripWireRevealStroke` unchanged |
| `client/src/lib/wireDomSync.ts` | `retireWireGroup` calls consume sweep, not opacity transition |
| `client/src/components/graph/usePreviewEdgeOverlay.ts` | remove `hitMid` jump wiring (`armWire`/`showMidTooltip`/`hideMidTooltip`/`onclick`); wire `hitMid.onclick` to open the data inspector instead |
| `client/src/components/graph/` (new) | `WireDataInspector.tsx` — the docked panel |
| `client/src/lib/` (new) | `wireDataLog.ts` — per-`spec.id` packet log, mirrors artifact's `inspector` module |
| `docs/specs/system/preview-edges.signal-window.supplement.md` | **done** — new supplement, the normative source for the head/tail model |
| `docs/specs/system/preview-edges.md` | **done** — Actions #7/#8, child-spec link |
| `docs/specs/system/preview-edges.interactions.supplement.md` | **done** — timing table, visual commit timeline, Leave section, wire-click line |
| `docs/specs/system/token-hover.atlas.supplement.md` | **done** — lifecycle summary, Leave row |
| `docs/specs/SPEC-DRIFT.md` | **done** — logged the pre-existing 240/100/25ms spec-vs-120/120/14ms-code drift found while making this change, and the jump-tooltip supersession |

---

## Migration — ordered, each phase demoable

Specs (above) are written **first**, ahead of any code — this plan is now
implementing against an already-normative contract, not writing docs to catch
up after the fact.

1. **Bump `wireRevealMs`/`wireHopStaggerMs` to 420.** Smallest possible change,
   immediately visible, cheapest to revert if it feels wrong. Re-run the
   cascade-timing assertions from `interaction-model-audit.md` before shipping.
2. **Head/tail signal window + `runStrokeConsume`, wired into `retireWireGroup`.**
   Implements the concurrent-release model from the signal-window supplement.
   No new UI. Verify via Playwright: (a) the common case — release after
   arrival, tail sweeps to target, no fade; (b) the easy-to-get-wrong case — a
   fast hover that releases before `head` reaches 1, confirming `tail` starts
   moving immediately rather than waiting.
3. **Verify jump redundancy, then cut over.** Side-by-side check (see above) on
   a handful of real edges across all 8 kinds; once confirmed, remove
   `hitMid`'s jump wiring and land the docked inspector panel on the freed-up
   click. Two sub-steps, but one shippable phase — removing jump without the
   inspector ready would be a regression, not a cleanup.

---

## Testing

- Extend `wireReveal.test.ts` with the consume-sweep behavior (mirrors existing
  reveal tests structurally).
- A Playwright/manual probe repeating exactly the measurement done for this plan
  (hover a real token, sample `stroke-dasharray`/`-dashoffset`/opacity over time)
  should become a permanent regression check — this is precisely the kind of
  "looks right in code review, wrong in the browser" gap this plan exists to fix,
  and it should not be able to regress silently again.
- Re-verify hop-cascade sequencing (0, 120, 240ms → 0, 420, 840ms after the
  timing change) — existing cascade tests almost certainly hardcode the old
  numbers.

## Risks

- **`wireHopStaggerMs` coupling is easy to miss** — it's a comment-documented
  invariant, not enforced by a type or test today. Add a test that asserts they
  move together, not just fix the values once.
- **420ms is a guess, not measured against real usage.** Land it, use the app for
  a while, retune — this is explicitly a "ship and feel it" constant, not a
  derived one.
- **Perceived sluggishness** if the growth duration is tuned too high — the whole
  reason this file exists is that 120ms was too *fast* to perceive; overcorrecting
  into "too slow to feel responsive" is the same class of mistake in the other
  direction. Re-test with real interaction, not just code review, before calling
  a value final.

## References

- Measured findings: this session's live Playwright probe against
  `codegrapher-dev` (`fixtures/demo/OrderService.ts`, `checkout` → `charge`)
- Reveal mechanism: `client/src/lib/wireReveal.ts`
- Timing constants: `client/src/lib/traceMotion.ts`
- Existing click behavior (jump tooltip, being removed): `client/src/components/graph/usePreviewEdgeOverlay.ts`
- Where jump moves to (already exists): `client/src/components/code/TokenConnectionMenuPanel.tsx`, `client/src/lib/connectionMenu.ts`
- Cascade timing invariants: `interaction-model-audit.md`
- Signal state plumbing: `trace-engine-consolidation-plan.md`
