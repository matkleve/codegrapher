# Execution simulator — interactions acceptance criteria

Supplement to [interactions index](execution-simulator.interactions.supplement.md). Testable UX checks for modes, surfaces, and bounds.

---

## Anchors & range

- [ ] Given expanded method, Alt+click gutter sets ▶ and opens Inputs tab
- [ ] Given expanded method, plain click gutter toggles ■ on that line
- [ ] Given ▶ and no ■, range shade spans start through `methodStartLine + codeLines - 1` (file-absolute)
- [ ] Given armed trace, panel banner shows `L{start}→L{effectiveEnd}` with `(method end)` when ■ unset
- [ ] Given active run, gutter clicks ignored; only → on current step line
- [ ] Given ▶ on member A, setting ▶ on member B clears ■ if ■ was on another member
- [ ] Given Alt+click on current ▶ line when armed, disarm to idle

---

## Run & transport

- [ ] Given armed + inputs, Start run enters active paused at step 0 with toolbar
- [ ] Given active run, Play advances until last step then auto-pauses
- [ ] Given active run, Pause freezes index without clearing session
- [ ] Given active run, Esc and toolbar X return to armed with ▶/■ unchanged
- [ ] Given ledger row click, `currentIndex` and canvas highlight sync

---

## Clear / deselect

- [ ] Given armed, Clear setup removes ▶/■ and shade (idle)
- [ ] Given armed, Esc disarms (idle)
- [ ] Given active, Stop and clear ends session and removes anchors (idle)
- [ ] Given active only, Exit preserves anchors (armed)

---

## Entry surfaces

- [ ] Given token chip right-click on body line, sim menu shows three actions with correct `methodStartLine`
- [ ] Given line with no token chips, gutter still sets anchors; no context menu on whitespace
- [ ] Given collapsed member header chip, sim menu uses signature line as start
- [ ] Idle Run tab mentions Alt+click, plain click, Shift+click, and token menu

---

## Paths & persistence

- [ ] Save current persists `methodStartLine` in `SimTracePath`
- [ ] Run saved path restores anchors and enters active with correct step count
- [ ] Run saved path with node off canvas shows alert; does not enter active

---

## Inputs

- [ ] Apply during active rebuilds steps and clamps scrub index
- [ ] Apply when armed only updates draft (no session)

---

## Regression

- [ ] Hover preview traces still work during active run (coexist; not suppressed)
- [ ] `graph-sim-active` on exit clears sim chrome; value-flow pulses cleared

## Vision (S1+ — not yet implemented)

- [ ] Toolbar discrete tick strip replaces range slider — [transport-panel supplement](execution-simulator.transport-panel.supplement.md)
- [ ] Run tab Start / Δ / End layout
- [ ] Two-click line-number anchors with cross-class reachability warning — [vision supplement](execution-simulator.vision.supplement.md)
- [ ] Canvas Start/Stop/Mock scenario nodes (S2)
