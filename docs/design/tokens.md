# Design tokens

**Who this is for:** anyone styling UI or referencing colors from JS/SVG.  
**Canonical emission:** `client/src/index.css` (`:root` light default, `.dark` class for dark).

---

## Semantic colors

| Token | Role |
| ----- | ---- |
| `--background`, `--foreground` | App shell |
| `--card`, `--card-foreground` | Class node cards |
| `--border`, `--input`, `--ring` | Borders and focus rings |
| `--muted`, `--muted-foreground` | Secondary text |
| `--primary` | Periwinkle action accent (both themes) — **not** default interactive hover |

## Brand (interactive hover)

| Token | Role |
| ----- | ---- |
| `--brand` | Gold hover ink (both themes) |
| `--brand-surface` | Hover fill |
| `--brand-border` | Hover border |
| `--motion-hover-surface`, `--motion-hover-color`, `--ease` | Hover transitions |

**Rule:** New clickable/draggable surfaces MUST use brand tokens via `.hoverable` or `INTERACTIVE_SURFACE` / `INTERACTIVE_ROW` in `client/src/lib/controlTokens.ts`. Do not route interactive hover through `--primary`.

See [brand-book.md](brand-book.md) for the full accent matrix and known inconsistencies.

## Connector / preview edges

Defined in `client/src/styles/connectors.css`:

| Token | Role |
| ----- | ---- |
| `--spring`, `--ease` | Edge/socket motion |
| `TOKEN_EDGE_STROKE` (JS) | Edge stroke — must be a CSS variable via `style`, never hex in SVG attrs |

## Toggle / pressed chrome

| Token | Role |
| ----- | ---- |
| `--interactive-toggle-bg`, `--interactive-toggle-border` | `aria-pressed` map/toolbar toggles |

---

## Tailwind bridge

Brand registered as `brand`, `brand-surface`, `brand-border` in Tailwind config. Prefer CSS variables in new work.
