# Page Specs

Route- and shell-level composition contracts.

## Pages

- [app-shell](app-shell.md) — file explorer + graph canvas layout, graph loading gestures

## Rules

- **Click file in tree** → replace graph (`/api/file-graph`)
- **Drag file onto canvas** → merge (`/api/focus` depth 1)
- Page specs own *which API* fires; service specs own *response shape*
