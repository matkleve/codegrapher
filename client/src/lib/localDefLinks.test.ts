import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { buildLocalPreviewEdges, linksForElement } from "@/lib/localDefLinks";
import { buildMemberSymbolIndex } from "@/lib/localSymbolLinks";
import { templateInterpolationSites } from "@/lib/templateInterpolations";
import { tokenizeLine } from "@/lib/tokenizeLine";
import { registerTraceHost } from "@/lib/elementRegistry";
import { makeUsageTokenKey } from "@/lib/traceKeys";

const MEMBER = "fn:file:buildViewbox";
const FLOW = "flow:file:geo.ts";
const START_LINE = 41;

const CODE = `export function buildViewbox(lat: number, lng: number): string {
  const delta = 0.1;
  return \`\${lng - delta},\${lat + delta},\${lng + delta},\${lat - delta}\`;
}`;

function chip(
  traceKey: string,
  attrs: Record<string, string>,
): HTMLElement {
  const el = document.createElement("span");
  el.className = "token-chip";
  el.dataset.traceKey = traceKey;
  for (const [k, v] of Object.entries(attrs)) {
    el.dataset[k] = v;
  }
  registerTraceHost(el);
  return el;
}

describe("localDefLinks buildViewbox param fan-out", () => {
  let pane: HTMLElement;
  let index: ReturnType<typeof buildMemberSymbolIndex>;

  beforeEach(() => {
    pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.appendChild(pane);

    index = buildMemberSymbolIndex(MEMBER, CODE, START_LINE);
    const lngDefId = `local-def::${MEMBER}::param::lng::${START_LINE}`;
    const sigLine = CODE.split("\n")[0]!;
    const lngParamIndex = tokenizeLine(sigLine).tokens.findIndex((t) => t.text === "lng");

    const headerLng = chip(makeUsageTokenKey(FLOW, MEMBER, START_LINE, lngParamIndex, "lng"), {
      localDefId: lngDefId,
      symbolName: "lng",
      symbolRole: "definition",
    });
    pane.appendChild(headerLng);

    const bodyLngDef = chip(makeUsageTokenKey(FLOW, MEMBER, START_LINE, lngParamIndex, "lng"), {
      localDefId: lngDefId,
      symbolName: "lng",
      symbolRole: "definition",
    });
    pane.appendChild(bodyLngDef);

    const returnLine = START_LINE + 2;
    const returnLineText = CODE.split("\n")[2]!;
    for (const site of templateInterpolationSites(returnLineText)) {
      if (site.name !== "lng") continue;
      const use = chip(
        makeUsageTokenKey(FLOW, MEMBER, returnLine, site.tokenIndex, "lng"),
        {
        localTargetId: lngDefId,
        symbolName: "lng",
        symbolRole: "usage",
      });
      pane.appendChild(use);
    }
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("links param def to every in-body usage", () => {
    const lngDefId = `local-def::${MEMBER}::param::lng::${START_LINE}`;
    const def = pane.querySelector<HTMLElement>(
      `[data-local-def-id="${lngDefId}"][data-symbol-role="definition"]`,
    )!;
    const pairs = linksForElement(def);
    expect(pairs.length).toBeGreaterThanOrEqual(2);
    expect(pairs.every((p) => p.from === def || p.from.dataset.localDefId === lngDefId)).toBe(
      true,
    );
    expect(pairs.every((p) => p.to.dataset.localTargetId === lngDefId)).toBe(true);
  });

  it("builds preview edge specs for def hover", () => {
    const def = pane.querySelector<HTMLElement>("[data-local-def-id]")!;
    const edges = buildLocalPreviewEdges(def, "variable", "lng-def");
    expect(edges.length).toBeGreaterThanOrEqual(2);
    expect(edges.every((e) => e.from.type === "element" && e.to.type === "element")).toBe(
      true,
    );
    expect(edges.every((e) => e.kind === "variable")).toBe(true);
  });

  it("indexes two lng usages on the return line", () => {
    let usageCount = 0;
    const lngDefId = `local-def::${MEMBER}::param::lng::${START_LINE}`;
    for (const target of index.usageTargets.values()) {
      if (target === lngDefId) usageCount++;
    }
    expect(usageCount).toBe(2);
  });
});
