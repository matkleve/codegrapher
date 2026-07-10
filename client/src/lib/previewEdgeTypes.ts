import type { SemanticTokenKind } from "@/lib/tokenColors";

export type AnchorRef =
  | { type: "element"; el: HTMLElement }
  | { type: "handle"; handle: string };

export type PreviewEdgeSpec = {
  id: string;
  from: AnchorRef;
  to: AnchorRef;
  kind: SemanticTokenKind;
};

export function anchorHandle(ref: AnchorRef): string | null {
  return ref.type === "handle" ? ref.handle : null;
}

export function edgeTouchesHandle(edge: PreviewEdgeSpec, handle: string): boolean {
  return (
    (edge.from.type === "handle" && edge.from.handle === handle) ||
    (edge.to.type === "handle" && edge.to.handle === handle)
  );
}
