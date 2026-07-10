# Token interaction — use cases

**Non-normative.** UX research framing for what a coder does with a **keyword**
(an indexed class / function / variable name) in a class node. Feeds the
contract in [specs/system/token-interactions.md](../specs/system/token-interactions.md).

Design lens: reading code is not reading prose. A coder scans, jumps, and asks
"where does this come from / go to" dozens of times a minute. Every keyword is a
question waiting to be asked. The interactions below turn each keyword into a
one-gesture answer **without leaving the line you're on**.

---

## Personas (coders understanding code)

| Persona | Situation | Dominant question |
| ------- | --------- | ----------------- |
| **Newcomer** | Dropped into an unfamiliar repo | "What is this and where is it defined?" |
| **Tracer** | Debugging a wrong value / call path | "Where does this flow from and to?" |
| **Refactorer** | About to rename / change a symbol | "What is the blast radius — every usage?" |
| **Reviewer** | Reading a diff, limited context | "Understand this symbol without opening 5 files" |
| **Architect** | Mapping module relationships | "How do these classes depend on each other?" |

## Jobs to be done

1. **Identify** — know a keyword's kind (class / function / variable) at a glance.
2. **Go to definition** — jump from a usage to where it's declared.
3. **Find usages** — from a definition, see everywhere it's used.
4. **Trace data flow** — which methods read/write a given property.
5. **Judge locality** — is the definition on screen, or off in another file?
6. **Pull in** — bring an off-screen definition into the graph.
7. **Survey** — reveal everything navigable at once.
8. **Hold context** — keep one relationship open while reading around it.
9. **Reduce noise** — dim everything unrelated to the current question.

---

## Use-case catalog

Each maps a coder intent to the gesture that answers it. `Kind` marks which
keyword kinds the case applies to (C = class, F = function/method, V = variable/property).

| # | As a… | I want to… | So that… | Gesture | Kind |
| --- | ----- | ---------- | -------- | ------- | ---- |
| U1 | Newcomer | see what a name *is* | I don't guess from spelling | glance — kind color + chip | C F V |
| U2 | Newcomer | reach a symbol's definition | I stop grepping | **hover** → trace edge to def | C F V |
| U3 | Tracer | follow a value to where it's read | I find the wrong branch | **hover a property** → wires to every reader | V |
| U4 | Refactorer | see every usage of a definition | I know the blast radius before renaming | **hover the definition** → fan-out wires to usages | C F V |
| U5 | Reviewer | read a symbol's facts in place | I don't open another file | **click (pin)** → info box; long-hover → transient ⚠ | C F V |
| U6 | Reviewer | keep that context while I read on | the answer doesn't vanish when I move | **click to pin**; click-away / Esc to close | C F V |
| U7 | Architect | reveal everything clickable | I see the navigable surface at once | **hold Ctrl** (reveal only) → shimmer all, dampen rest | C F V |
| U8 | Tracer | focus one relationship | surrounding code stops competing | trace **dims** non-lit, **brightens** the pair | C F V |
| U9 | Reader | keep a function's body legible while its name is lit | I read the call in context | function lights its **own body**; a variable does **not** light functions (top→bottom) | F / V |
| U10 | Tracer | know a wire leads somewhere before I commit | I don't jump blind | **hover the wire's first ~cm** → "Jump to X" tip at cursor | C F V |
| U11 | Newcomer | jump along a wire to the far end | I move through the graph by connection | **click the wire hit-zone** → focus far endpoint | C F V |
| U12 | Explorer | tell an on-screen def from an off-screen one | I know if I must load it | in-graph → solid trace; **off-graph → dashed Load connector** | C F V |
| U13 | Explorer | pull an off-screen definition in | I grow the ego-graph one deliberate hop | **hover an external keyword** → **Load** pill → click loads it | C F V |
| U14 | Any | brush past code without triggering noise | scanning stays calm | plain hover requires a **dwell**; Ctrl fires instantly | C F V |
| U15 | Any | abandon a trace | I return to the calm default | move away / **Esc** / click empty canvas | C F V |

---

## Design principles carried into the spec

- **Question, not fact.** Edges are summoned per keyword, never a standing layer.
- **Answer at the reader's zoom.** The edge lands as precisely as the target is
  revealed: class header → member row → exact line.
- **Direction encodes meaning.** Always **definition → usage** (the source feeds
  its readers), independent of which end you hover.
- **Calm by default.** Dwell-gate plain hover; only Ctrl makes everything loud.
- **Locality is legible.** Solid = here, dashed = elsewhere (must be loaded).

## References

- Contract: [specs/system/token-interactions.md](../specs/system/token-interactions.md)
- Mechanism: [specs/system/preview-edges.md](../specs/system/preview-edges.md)
- Emphasis: [specs/system/interaction-emphasis.md](../specs/system/interaction-emphasis.md)
- Philosophy: [specs/system/ego-graph-model.md](../specs/system/ego-graph-model.md)
