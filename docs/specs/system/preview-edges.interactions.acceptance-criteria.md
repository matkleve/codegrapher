# Preview edges — interactions acceptance criteria

Parent: [preview-edges.interactions.supplement.md](preview-edges.interactions.supplement.md) · Atlas: [token-hover.atlas.supplement.md](token-hover.atlas.supplement.md)

Verify manually on `fixtures/demo/` unless noted. Timing values: `client/src/lib/traceMotion.ts`.

## Signal + dwell

- [ ] Cold hover: `emitWireSignal` on pointer enter — hop-1 wire has `preview-edge-drawing` and animating `strokeDashoffset` before `TRACE_COMMIT`
- [ ] Pending `dwellColdMs`: `graph-trace-pending` on pane; no `trace-member-lit` until commit
- [ ] Leave before dwell: no commit; signal stops; no stuck wires
- [ ] Warm / Ctrl / keyboard focus: instant commit; signal still fires on enter
- [ ] Import token hover starts signal (load stub wire)
- [ ] Control-flow keyword hover starts signal

## Wires

- [ ] Stroke draw is visible travel (not opacity fade-in) during `preview-edge-drawing`
- [ ] `--trace-strength` on wire path only after `dataset.revealed=1`
- [ ] Hop-2+ wires stagger per `wireHopStaggerMs` from signal epoch
- [ ] Leave: `stopWireSignalEmitting`; in-flight draws finish; then `retireWireGroup` @ `--motion-trace-out`
- [ ] Load stub: wire hidden until `data-load-stub-ready`

## Lit + anchors

- [ ] `beginTrace` sets `hoveredTokenKey` + edges atomically
- [ ] Def fan-out + expand callee: usage `TokenChip` gets `token-chip-lit` + `token-chip-on`
- [ ] `computeTraceLit` recomputes on `revealRevision` + `registryRevision`
- [ ] Wire engine notified on pan/zoom, node drag/resize, reveal expand

## Pin + foreign hover

- [ ] Pinned: foreign hover ephemeral preview; pin unchanged until click
- [ ] Shift+click accumulates pins

## CI

- [ ] `npm run design:check` passes
