# Connections (preview edges)

## What it is

Hover an indexed identifier (class or method name) inside an expanded method body,
or on a member row / class header. After a short dwell (~260ms), a dashed
**preview edge** appears showing how that symbol connects within the current
graph. Hold **Ctrl** to reveal every linkable token instantly (with a gold
shimmer and node breathe), and to pin details with Ctrl-click.

Edges always flow **definition → usage** (data-flow direction), regardless of
which end you hover:

- Hover a **usage** (e.g. `charge` inside `OrderService.checkout`) → arrow lands
  on the call site; origin is the definition anchor in `PaymentGateway`.
- Hover a **definition** (e.g. the `charge` member row) → fans out to **every
  visible usage** of that symbol in the graph.

The edge lands as precisely as the target is currently revealed:

- target class collapsed → edge points at the **class header** anchor;
- target method collapsed → edge points at the **member row** anchor;
- target method expanded → edge points at the **exact line** where the symbol appears.

If the definition is not in the current graph, you instead get a small **reference
card** ("load into graph") that pulls it in via `/api/focus`.

## Interaction timing

| Input | Behavior |
| ----- | -------- |
| Plain hover | Preview edge after ~260ms dwell; quick pass-over does nothing |
| Adjacent token switch | ~90ms re-fire when a connection is already warm |
| Mouse leave | ~140ms grace before clearing (prevents flicker between neighbors) |
| Ctrl held | Instant preview + global reveal (shimmer, node breathe) |
| Hover dwell ~620ms | Transient info box ("Ctrl-click to pin") |
| Ctrl-click | Pins info box; click empty canvas to close |
| Wire hit-zone hover | "Jump to …" tooltip follows cursor |
| Wire hit-zone click | Pins info for that end + brief highlight pulse |

Motion: edges bloom in (width/opacity eased with `--ease`); sockets spring in
(`--spring`); dash pattern animates toward the arrowhead while active.

## The philosophy

codegrapher is an *ego-centric* explorer: you never see the whole codebase, you see
the neighborhood of the thing you are looking at right now. A full call-graph of a real
project is a hairball — thousands of permanent edges that no human reads. So the guiding
idea is:

1. **Edges are a question, not a fact.** You don't render every relationship up front;
   you summon one relationship on demand by pointing at the token you're curious about.
   Ctrl is the "explain this" modifier for instant reveal; release Ctrl and the calm
   default returns (plain-hover edges still follow mouse intent).
2. **The edge answers "where does this come from?" at the reader's zoom level.** Because
   the target anchor tracks how far the target is expanded (class → member → line), the
   connection is as specific as your current attention. You're reading `checkout`, you
   hover `charge`, and the line is drawn from the definition of `charge` to your call
   site — the answer, not just its neighborhood.
3. **Direction is fixed.** Definition always feeds usage; hovering either end draws the
   same arrow. Hovering a definition fans out to all visible usages.
4. **Only meaningful nodes connect.** The symbol index holds the things worth navigating
   between — the named, addressable units of the program (classes, methods). That is a
   deliberate signal-to-noise choice, see below.

## What lights up, and why (verified)

Tested on `fixtures/demo` (`OrderService.checkout` expanded, all three classes in the
graph):

| Token in `checkout` body        | Kind            | Hover behavior              |
| ------------------------------- | --------------- | --------------------------- |
| `checkout`                      | method (self)   | interactive chip            |
| `charge`                        | method (other)  | **edge → `charge` in PaymentGateway** |
| `PaymentGateway`                | class           | edge → PaymentGateway node  |
| `orders`, `gateway`             | property        | inert (not indexed)         |
| `amount`, `id`                  | local / param   | inert (not indexed)         |

So today the graph connects **functions and classes**. **Variables, properties, and
object fields do not connect** — the server parser (`server/src/parser.ts`) only puts
class and method names in the symbol index. This is partly principled (a variable named
`id` appears everywhere; edges to it would be pure noise) and partly just unfinished.

## Use cases

**Working today (class/method connections):**

1. **Trace a call to its definition** — reading a method, hover a call to jump your
   eye to the callee's source without leaving the node you're in.
2. **Cross-file "who do I depend on?"** — hover a class/method whose definition
   lives in another file; the reference card loads that file's neighborhood into the
   graph, growing the ego-graph one deliberate hop at a time.
3. **Impact preview before a rename/refactor** — sweep Ctrl across a method body to see,
   at a glance, which of its calls resolve into the current graph vs. reach outside it.
4. **Onboarding read-through** — start from one entry point, follow the gold-highlighted
   symbols outward, building a mental model hop by hop instead of drowning in a full map.

**Unlocked by indexing variables/properties/objects (roadmap):**

5. **Data-flow, not just call-flow** — hover a property (`this.orders`) and see every
   method in the class that reads or writes it: the *state* neighborhood, complementing
   the *call* neighborhood.
6. **Object shape navigation** — hover a field access (`order.total`) and jump to where
   that field is declared on the type/interface.
7. **"What touches this variable?"** — scope-aware highlighting of a local's
   read/write sites within a body, for reasoning about a single value's lifetime.

To enable 5–7, `parser.ts` must index property declarations, parameters, and (scope-
permitting) locals, tagging each with a scope so an `id` in one method never draws an
edge to an unrelated `id` elsewhere. The rendering side already supports arbitrary
per-node line anchors (`previewLineHandle`), so most of the work is in the indexer, not
the canvas.

## Design constraints worth keeping

- **Scope before connect.** The moment variables are indexed, identity must be
  scope-qualified or the graph fills with false edges between same-named locals. Index
  by `(filePath, enclosingSymbol, name)`, not by bare `name`.
- **Stay on-demand.** Even with more symbol types indexed, edges should remain a
  hover-summoned preview, never a persistent layer — the value is the calm default.
- **Anchor to attention.** Keep resolving the target to the finest revealed level
  (class → member → line); that specificity is the feature.
- **Fixed direction.** Always definition → usage; fan-out from definitions.

## Reference prototype

Visual/motion reference: [docs/prototypes/connectors-proto.html](prototypes/connectors-proto.html)
(standalone HTML mockup used to validate the interaction language before porting).
