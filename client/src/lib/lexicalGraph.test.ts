import { describe, expect, it } from "vitest";
import { buildMemberSymbolIndex, paramDefForName } from "@/lib/localSymbolLinks";
import {
  buildLexicalGraph,
  siteKey,
  walkLexicalForward,
  walkLexicalBackward,
} from "@/lib/lexicalGraph";
import {
  buildDefRelativePreviewEdges,
  buildBackwardLexicalRelatives,
} from "@/lib/defRelativePreviewEdges";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { tokenizeLine } from "@/lib/tokenizeLine";

const FLOW = "flow:file:geo.ts";
const MEMBER = "method:file:Geo.extractFieldValue";

const CODE = `export function extractFieldValue(
  result: GeocoderSearchResult,
  field: AddressFieldKind,
): string | null {
  const addr = result.address;
  if (!addr) return null;
  return addr.city;
}`;

const CLASS_DATA: ClassNodeData = {
  label: "Geo",
  filePath: "/geo.ts",
  expandedMethodIds: [MEMBER],
  methods: [
    {
      id: MEMBER,
      label: "extractFieldValue",
      symbolName: "extractFieldValue",
      code: CODE,
      startLine: 10,
    },
  ],
  properties: [],
};

describe("buildLexicalGraph", () => {
  it("inverts usageTargets into usagesOfDef", () => {
    const index = buildMemberSymbolIndex(MEMBER, CODE, 10);
    const graph = buildLexicalGraph(index, CODE, 10);
    const paramDef = paramDefForName(index, MEMBER, "result");
    expect(paramDef).toBeTruthy();
    const usages = graph.usagesOfDef.get(paramDef!.defId) ?? [];
    expect(usages.length).toBeGreaterThan(0);
    const usageKeys = usages.map(siteKey);
    expect(usageKeys.some((k) => k.startsWith("14:"))).toBe(true);
  });

  it("forward walk matches legacy relative edge liveTo tokens", () => {
    const index = buildMemberSymbolIndex(MEMBER, CODE, 10);
    const graph = buildLexicalGraph(index, CODE, 10);
    const paramDef = paramDefForName(index, MEMBER, "result")!;

    const hops = walkLexicalForward(graph, paramDef.defId);
    const bindingHop = hops.find((h) => h.id.startsWith("b-"));
    expect(bindingHop).toBeDefined();
    expect(bindingHop?.depth).toBe(2);

    const cityHop = hops.find((h) => {
      if (h.to.node !== "site") return false;
      const line = CODE.split("\n")[h.to.site.lineNumber - 10] ?? "";
      const tok = tokenizeLine(line).tokens[h.to.site.tokenIndex];
      return tok?.text === "city";
    });
    expect(cityHop).toBeDefined();
    expect(cityHop?.depth).toBe(3);
  });

  it("does not route member-access hops on the same line", () => {
    const multiPropCode = `export function extractFieldValue(
  result: GeocoderSearchResult,
): string | null {
  const addr = result.address;
  return addr.city ?? addr.town ?? addr.village;
}`;
    const index = buildMemberSymbolIndex(MEMBER, multiPropCode, 10);
    const graph = buildLexicalGraph(index, multiPropCode, 10);
    const paramDef = paramDefForName(index, MEMBER, "result")!;
    const hops = walkLexicalForward(graph, paramDef.defId);
    const memberHops = hops.filter((h) => h.kind === "member-access");
    for (const hop of memberHops) {
      if (hop.from.node === "site" && hop.to.node === "site") {
        expect(hop.from.site.lineNumber).not.toBe(hop.to.site.lineNumber);
      }
    }
  });

  it("backward walk reaches addr and result from city", () => {
    const index = buildMemberSymbolIndex(MEMBER, CODE, 10);
    const graph = buildLexicalGraph(index, CODE, 10);
    const returnLine = "  return addr.city;";
    const returnLineNumber = 16;
    const tokens = tokenizeLine(returnLine).tokens;
    const cityIdx = tokens.findIndex(
      (t, i) => t.kind === "identifier" && t.text === "city" && tokens[i - 1]?.text === ".",
    );
    expect(cityIdx).toBeGreaterThan(-1);

    const originEl = document.createElement("span");
    originEl.dataset.symbolName = "city";

    const legacy = buildBackwardLexicalRelatives({
      originEl,
      symbolIndex: index,
      methodCode: CODE,
      methodStartLine: 10,
      flowNodeId: FLOW,
      memberId: MEMBER,
      classData: CLASS_DATA,
      kind: "variable",
      edgeIdPrefix: "test-back",
      startLine: returnLineNumber,
      startTokenIndex: cityIdx,
    });

    const hops = walkLexicalBackward(graph, index, {
      startLine: returnLineNumber,
      startTokenIndex: cityIdx,
    });

    const legacyTokens = legacy.map((e) => e.liveTo?.token);
    const hopDefNames = hops
      .filter((h) => h.to.node === "def")
      .map((h) => h.to.defId.split("::").at(-2));
    const hopSiteTokens = hops
      .filter((h) => h.to.node === "site")
      .map((h) => {
        const site = h.to.site;
        const line = CODE.split("\n")[site.lineNumber - 10] ?? "";
        return tokenizeLine(line).tokens[site.tokenIndex]?.text;
      });

    expect(legacyTokens).toContain("addr");
    expect(legacyTokens).toContain("result");
    expect([...hopDefNames, ...hopSiteTokens]).toContain("addr");
    expect([...hopDefNames, ...hopSiteTokens]).toContain("result");
  });
});
