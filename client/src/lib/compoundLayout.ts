import type { Core, NodeSingular } from "cytoscape";
import { readTailwindMinSize, readTailwindSpacing } from "@/lib/cytoscapeTheme";

function sortChildren(children: NodeSingular[]): NodeSingular[] {
  return [...children].sort((a, b) =>
    String(a.data("label") ?? "").localeCompare(String(b.data("label") ?? "")),
  );
}

function layoutChildrenInParent(
  parent: NodeSingular,
  padding: number,
  gap: number,
  innerWidth: number,
): void {
  const children = sortChildren(parent.children());
  if (children.length === 0) return;

  children.forEach((child) => {
    child.grabbable(false);
    child.ungrabify();
    child.style({
      width: innerWidth,
      "text-halign": "left",
      "text-valign": "top",
      "text-margin-x": readTailwindSpacing("p-2"),
      "text-margin-y": readTailwindSpacing("p-2"),
    });
  });

  let yOffset = padding;

  children.forEach((child) => {
    const h = Math.max(child.height(), readTailwindMinSize("min-h-7", "minHeight"));
    child.position({ x: 0, y: yOffset + h / 2 });
    yOffset += h + gap;
  });
}

/** Stack method/function nodes vertically inside compound parents (relative positions). */
export function layoutCompoundChildren(cy: Core): void {
  const padding = readTailwindSpacing("p-5");
  const gap = readTailwindSpacing("gap-2");
  const innerWidth = readTailwindMinSize("min-w-48", "minWidth");

  cy.nodes(":parent").forEach((parent) => {
    layoutChildrenInParent(parent, padding, gap, innerWidth);
  });
}

export function readFitPadding(): number {
  return readTailwindSpacing("p-10");
}

export function runGraphLayout(cy: Core): void {
  const topLevel = cy.nodes().filter((n) => !n.isChild());

  if (topLevel.length === 0) {
    cy.resize();
    return;
  }

  const layout = topLevel.layout({
    name: "dagre",
    rankDir: "TB",
    nodeSep: readTailwindSpacing("gap-8"),
    rankSep: readTailwindSpacing("gap-10"),
    animate: false,
  });

  layout.on("layoutstop", () => {
    try {
      layoutCompoundChildren(cy);
      cy.resize();
      if (cy.nodes().length > 0) {
        cy.fit(undefined, readFitPadding());
      }
    } catch (err) {
      console.error("Compound layout failed:", err);
    }
  });

  layout.run();
}
