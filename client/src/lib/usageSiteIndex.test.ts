import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import {
  buildUsageSiteIndex,
  isLexicalDefinitionLine,
} from "@/lib/usageSiteIndex";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

function classNode(
  id: string,
  methods: ClassNodeData["methods"],
  properties: ClassNodeData["properties"] = [],
): Node {
  const data: ClassNodeData = {
    label: "Svc",
    fileName: "Svc.ts",
    filePath: "/svc.ts",
    graphNodeId: `class:${id}`,
    nodeKind: "class",
    properties,
    methods,
    expandedPropertyIds: [],
    expandedMethodIds: [],
    collapsed: false,
  };
  return { id, type: "class", data, position: { x: 0, y: 0 } };
}

describe("buildUsageSiteIndex", () => {
  it("indexes only symbols in the indexed set", () => {
    const nodes = [
      classNode("flow-1", [
        {
          id: "m1",
          label: "run",
          symbolName: "run",
          code: "return charge(id) + validate(x);",
        },
      ]),
    ];
    const index = buildUsageSiteIndex(nodes, new Set(["charge", "validate"]));
    expect(index.get("charge")).toHaveLength(1);
    expect(index.get("validate")).toHaveLength(1);
    expect(index.has("run")).toBe(false);
  });

  it("indexes every occurrence of the same token on one line", () => {
    const nodes = [
      classNode("flow-1", [
        {
          id: "m1",
          label: "run",
          symbolName: "run",
          code: "return charge(charge);",
        },
      ]),
    ];
    const index = buildUsageSiteIndex(nodes, new Set(["charge"]));
    expect(index.get("charge")).toHaveLength(2);
  });

  it("scans property bodies", () => {
    const nodes = [
      classNode(
        "flow-1",
        [],
        [
          {
            id: "p1",
            label: "gateway",
            symbolName: "gateway",
            code: "new PaymentGateway()",
          },
        ],
      ),
    ];
    const index = buildUsageSiteIndex(nodes, new Set(["PaymentGateway"]));
    expect(index.get("PaymentGateway")).toHaveLength(1);
  });

  it("skips param names on signature lines but indexes body references", () => {
    const nodes = [
      classNode("flow-1", [
        {
          id: "m-sub",
          label: "buildSubtitle",
          symbolName: "buildSubtitle",
          code: "buildSubtitle(field: AddressFieldKind): string {\n  return field;\n}",
        },
        {
          id: "m-score",
          label: "scoreGeocoderHit",
          symbolName: "scoreGeocoderHit",
          code: "scoreGeocoderHit(result: T, field: F): number {\n  const value = extractFieldValue(result, field);\n}",
        },
      ]),
    ];
    const index = buildUsageSiteIndex(
      nodes,
      new Set(["field", "extractFieldValue"]),
    );
    const fieldSites = index.get("field") ?? [];
    expect(fieldSites.filter((s) => s.lineNumber === 1)).toHaveLength(0);
    expect(fieldSites.some((s) => s.memberId === "m-sub" && s.lineNumber === 2)).toBe(
      true,
    );
    expect(fieldSites.some((s) => s.memberId === "m-score" && s.lineNumber === 2)).toBe(
      true,
    );
  });

  it("indexes 500 lines × 20 symbols under 100ms", () => {
    const symbols = new Set(
      Array.from({ length: 20 }, (_, i) => `sym${i}`),
    );
    const line = `return ${[...symbols].join(" + ")};`;
    const code = Array.from({ length: 500 }, () => line).join("\n");
    const nodes = [
      classNode("flow-1", [
        { id: "m1", label: "big", symbolName: "big", code },
      ]),
    ];
    const start = performance.now();
    const index = buildUsageSiteIndex(nodes, symbols);
    const elapsed = performance.now() - start;
    expect(index.size).toBe(20);
    expect(elapsed).toBeLessThan(100);
  });
});

describe("isLexicalDefinitionLine", () => {
  it("treats signature params and declarations as definitions", () => {
    expect(isLexicalDefinitionLine("buildSubtitle(field: Kind): string {", "field")).toBe(
      true,
    );
    expect(isLexicalDefinitionLine("const value = extractFieldValue(r, f);", "value")).toBe(
      true,
    );
    expect(isLexicalDefinitionLine("function extractFieldValue() {}", "extractFieldValue")).toBe(
      true,
    );
    expect(isLexicalDefinitionLine("scoreGeocoderHit(result: T, field: F)", "result")).toBe(
      true,
    );
  });

  it("treats call arguments as usages", () => {
    expect(
      isLexicalDefinitionLine("const value = extractFieldValue(result, field);", "field"),
    ).toBe(false);
    expect(
      isLexicalDefinitionLine("const value = extractFieldValue(result, field);", "result"),
    ).toBe(false);
  });
});
