# Execution simulator — modes & anchors

Supplement to [interactions index](execution-simulator.interactions.supplement.md). Owns mode FSM, anchor lifecycle, implicit end, and clear/deselect semantics.

---

## Mode state machine

```mermaid
stateDiagram-v2
  direction TB

  [*] --> Idle

  Idle --> Armed: set ▶ start
  Armed --> Idle: disarm
  Armed --> OrphanEnd: set ■ only
  OrphanEnd --> Armed: set ▶ same member
  OrphanEnd --> Idle: disarm / clear ■

  Armed --> Preflight: Shift+run / context Run / gutter run
  Preflight --> Armed: Cancel
  Preflight --> ActivePaused: Start confirm

  Armed --> ActivePaused: Inputs → Start run / Paths → Run

  ActivePaused --> ActivePlaying: Play
  ActivePlaying --> ActivePaused: Pause / last step
  ActivePaused --> ActivePlaying: Play

  ActivePaused --> Armed: exit run
  ActivePlaying --> Armed: exit run
  ActivePaused --> Idle: stop and clear
  ActivePlaying --> Idle: stop and clear

  Armed --> Preflight: run gesture again

  note right of Idle
    No markers
    Panel closed or idle hint
  end note

  note right of Armed
    ▶ set; effective end known
    Range shade; gutter editable
    Panel shows L{start}→L{end}
  end note

  note right of OrphanEnd
    ■ only; no shade
    Prompt: set start
  end note

  note right of ActivePaused
    simActive; graph-sim-active
    Gutter → on PC line only
    Toolbar visible
  end note
```

---

## Anchor lifecycle

```mermaid
flowchart TB
  subgraph start [▶ Start]
    SA[Alt+click gutter] --> Armed
    SC[Token menu: Start trace here] --> Armed
    SR[Token menu: Run start→end] --> Preflight
  end

  subgraph end [■ End]
    EA[Plain click gutter] --> Toggle
    EC[Token menu: Set as end point] --> SetEnd
    Toggle -->|same line| ClearEnd[implicit end]
    Toggle -->|other line| MoveEnd
    SetEnd --> ArmedOrOrphan
    ArmedOrOrphan{▶ set?}
    ArmedOrOrphan -->|yes| Armed
    ArmedOrOrphan -->|no| OrphanEnd
  end

  subgraph clear [Clear]
    D1[Panel: Clear setup] --> Idle
    D2[Esc when armed] --> Idle
    D3[Alt+click ▶ line again] --> Idle
    D4[Exit run X / Esc active] --> Armed
    D5[Stop and clear] --> Idle
  end
```

| Marker | Set | Move | Clear |
| ------ | --- | ---- | ----- |
| **▶** | Alt+gutter · menu Start trace here | Alt+another line | Disarm · Alt+same ▶ line · Esc (armed) |
| **■** | Plain gutter · menu Set end | Plain+another line | Plain+same ■ line (→ implicit end) |
| **→** | System on active step | Step/scrub/play | Exit run |

**Cross-member rule:** setting ▶ on member A MUST clear ■ if `endAnchor.memberId !== A`.

During **active run**, anchor gestures are disabled. `lineGutterRole` returns **only** `current` (→) — not ▶/■ on other lines.

---

## Implicit end

When ■ is not set on the same member as ▶:

```text
effectiveEndFileLine = methodStartLine + code.split("\n").length - 1
```

| UI element | MUST show |
| ---------- | --------- |
| Panel armed banner | `L{start}→L{effectiveEnd}` + muted `(method end)` when ■ unset |
| Range shade | `startLine … effectiveEndFileLine` inclusive (file-absolute) |
| Paths “Current” | Same range label |
| Gutter | No ■ glyph when implicit |

Engine walk uses the same `effectiveEndFileLine` converted to code-relative in `buildSession`.

```mermaid
flowchart LR
  subgraph file [File-absolute UI]
    FS[startLine]
    FE[effectiveEndFileLine]
  end
  subgraph code [Code-relative engine]
    CS[toRel start]
    CE[toRel end]
  end
  FS --> CS
  FE --> CE
  CS --> BSL[buildStepList]
  CE --> BSL
```

Bridge: `methodStartLine` on `SimAnchor`. See [workspace supplement](execution-simulator.workspace.supplement.md) line-base convention.

---

## Preflight flow

```mermaid
sequenceDiagram
  participant U as User
  participant G as Gutter / menu
  participant C as SimulationContext
  participant M as Preflight modal
  participant S as Session

  U->>G: run gesture
  G->>C: set anchors + open preflight
  C->>M: preflightOpen=true
  alt Cancel
    U->>M: Cancel
    M->>C: preflightOpen=false
    Note over C: stay armed
  else Start
    U->>M: Start
    M->>C: confirmPreflight
    C->>S: buildSession + simActive
  end
```

**Skip preflight:** Inputs tab **Start run** or Paths **Run** call `activateSession` directly when inputs already on draft.

---

## Exit vs disarm

```mermaid
flowchart TD
  A[User wants out] --> Q{Active run?}
  Q -->|no| D[Disarm]
  Q -->|yes| Q2{Keep markers?}
  Q2 -->|yes| E[Exit run → armed]
  Q2 -->|no| SC[Stop and clear → idle]
  D --> I[idle]
  SC --> I
  E --> AR[armed]
```

| Action | `simActive` | `session` | `startAnchor` | `endAnchor` |
| ------ | ----------- | --------- | ------------- | ----------- |
| Exit run | false | null | kept | kept |
| Disarm | false | null | null | null |
| Stop and clear | false | null | null | null |

**Esc:** active → exit run; armed → disarm; idle → no-op.

---

## Orphan end state

`endAnchor` set, `startAnchor` null:

- Show ■ on that line only
- No range shade
- Panel Paths/Inputs: hint “Set a start point (Alt+click gutter)”
- Plain click ■ again clears end → idle

---

## References

- Index: [execution-simulator.interactions.supplement.md](execution-simulator.interactions.supplement.md)
- Surfaces: [execution-simulator.surfaces.supplement.md](execution-simulator.surfaces.supplement.md)
- AC: [execution-simulator.interactions.acceptance-criteria.md](execution-simulator.interactions.acceptance-criteria.md)
