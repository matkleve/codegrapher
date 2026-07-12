# Interaction emphasis — acceptance criteria

Parent: [interaction-emphasis.md](interaction-emphasis.md). Verify manually on graph fixtures (`fixtures/demo/`) unless noted.

- [ ] Pending dwell: surround dims at pointer enter; focal chip keeps semantic ink + pending strength — no faint→relight on chip text
- [ ] Dwell gates commit only: lit set, wires, row promotion after 40ms — not chip ink permission
- [ ] Trace importance eases on `--motion-trace` (120ms) — no snap on row/body/syntax at commit
- [ ] **No** `color` rules on `.token-chip` / `.cursor-pointer` `.token-def-label` in `trace-syntax.css`
- [ ] New clickables use `.hoverable` or `controlTokens` — not `hover:bg-primary`
- [ ] Trace dim is color-only on syntax/chrome — no container opacity / bg wash on code
- [ ] Pin or dwell trace: strength unchanged when pointer leaves class card
- [ ] Chip hover-preview uses hover curve on `--trace-strength`; element opacity stays 1
- [ ] Wire path uses focus curve at rest; hover curve when emphasized
- [ ] Hover branch brighter than same branch at focus for every hop (`traceDepth.test.ts`)
- [ ] Pinned trace: path stays lit; foreign hover ephemeral preview without dimming indexed chips
- [ ] Ctrl held during any trace/pin still shimmers every indexed token
- [ ] Brand hover on member header is `:hover` only, not expanded state
- [ ] `.hoverable:hover` promotes `.control-row-text-*` to `--brand` (`tone="passive"` opts out)
- [ ] Token chip hover and `token-chip-on` same semantic fill — no brand gold, no chip border
- [ ] `controlTokens.ts` and `index.css` stay in sync
