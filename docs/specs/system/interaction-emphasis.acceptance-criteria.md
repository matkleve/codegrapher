# Interaction emphasis — acceptance criteria

Parent: [interaction-emphasis.md](interaction-emphasis.md). Verify manually on graph fixtures (`fixtures/demo/`) unless noted.

- [ ] Dwell gates commit only: lit set, row promotion after `dwellColdMs` — not chip ink; signal starts on enter
- [ ] Signal on enter: hop-1 wire stroke visible before commit (`preview-edge-drawing`, animating `strokeDashoffset`)
- [ ] Pending `dwellColdMs`: `graph-trace-pending` on pane; no `trace-member-lit` until commit
- [ ] Leave: emitter off; in-flight draws finish; no instant opacity pop on wires
- [ ] Trace importance eases on `--motion-trace` (120ms) — no snap on row/body/syntax at commit
- [ ] **No** `color` rules on `.token-chip` / `.cursor-pointer` `.token-def-label` in `trace-syntax.css`
- [ ] New clickables use `.hoverable` or `controlTokens` — not `hover:bg-primary`
- [ ] Trace dim is color-only on syntax/chrome — no container opacity / bg wash on code
- [ ] Leave unpinned: wires fade with `retireWireGroup` (120ms) — no frozen dash then pop
- [ ] Chip hover-preview uses hover curve on `--trace-strength`; element opacity stays 1
- [ ] Wire path uses focus curve at rest; hover curve when emphasized
- [ ] Hover branch brighter than same branch at focus for every hop (`traceDepth.test.ts`)
- [ ] Pinned trace: path stays lit; foreign hover ephemeral preview without dimming indexed chips
- [ ] Ctrl held during any trace/pin still shimmers every indexed token
- [ ] Brand hover on member header is `:hover` only, not expanded state
- [ ] `.hoverable:hover` promotes `.control-row-text-*` to `--brand` (`tone="passive"` opts out)
- [ ] Token chip hover and `token-chip-on` same semantic fill — no brand gold, no chip border
- [ ] `controlTokens.ts` and `index.css` stay in sync
