import { describe, expect, it } from "vitest";
import { buildStepFlow } from "@/lib/staticWalk/buildStepFlow";
import { tokenizeLine } from "@/lib/tokenizeLine";

const LINE = 1;

function tokensFor(text: string) {
  return tokenizeLine(text).tokens;
}

describe("buildStepFlow", () => {
  it("returns no substeps when there is no binding", () => {
    expect(buildStepFlow(LINE, tokensFor("this.sink.push(a);"), null, [])).toEqual([]);
  });

  it("decomposes A = B * C into fetch/combine/assign/bind (S1-S4 worked example)", () => {
    const text = "A = B * C;";
    const tokens = tokensFor(text);
    const reads = [
      { name: "B", value: { display: "2", kind: "literal" as const } },
      { name: "C", value: { display: "3", kind: "literal" as const } },
    ];
    const substeps = buildStepFlow(LINE, tokens, { name: "A", expression: "B * C" }, reads);

    expect(substeps.map((s) => s.kind)).toEqual(["fetch", "fetch", "combine", "assign", "bind"]);

    const bIndex = tokens.findIndex((t) => t.text === "B");
    const cIndex = tokens.findIndex((t) => t.text === "C");
    const starIndex = tokens.findIndex((t) => t.text === "*");
    const eqIndex = tokens.findIndex((t) => t.text === "=");
    const aIndex = tokens.findIndex((t) => t.text === "A");

    expect(substeps[0]).toEqual({
      kind: "fetch",
      source: [],
      target: { line: LINE, tokenIndex: bIndex },
      value: { display: "2", kind: "literal" },
    });
    expect(substeps[1]).toEqual({
      kind: "fetch",
      source: [],
      target: { line: LINE, tokenIndex: cIndex },
      value: { display: "3", kind: "literal" },
    });
    // S2 combine: B, C converge on `*`; a result point is born there.
    expect(substeps[2]).toEqual({
      kind: "combine",
      source: [
        { line: LINE, tokenIndex: bIndex },
        { line: LINE, tokenIndex: cIndex },
      ],
      target: { line: LINE, tokenIndex: starIndex },
      value: { display: "6", kind: "literal" },
    });
    // S3 assign: result moves `*` -> `=`.
    expect(substeps[3]).toEqual({
      kind: "assign",
      source: [{ line: LINE, tokenIndex: starIndex }],
      target: { line: LINE, tokenIndex: eqIndex },
      value: { display: "6", kind: "literal" },
    });
    // S4 bind: result moves `=` -> A.
    expect(substeps[4]).toEqual({
      kind: "bind",
      source: [{ line: LINE, tokenIndex: eqIndex }],
      target: { line: LINE, tokenIndex: aIndex },
      value: { display: "6", kind: "literal" },
    });
  });

  it("decomposes A = (B + C) * D innermost-first, per the precedence worked example", () => {
    const text = "A = (B + C) * D;";
    const tokens = tokensFor(text);
    const reads = [
      { name: "B", value: { display: "1", kind: "literal" as const } },
      { name: "C", value: { display: "2", kind: "literal" as const } },
      { name: "D", value: { display: "4", kind: "literal" as const } },
    ];
    const substeps = buildStepFlow(LINE, tokens, { name: "A", expression: "(B + C) * D" }, reads);

    expect(substeps.map((s) => s.kind)).toEqual([
      "fetch",
      "fetch",
      "fetch",
      "combine",
      "combine",
      "assign",
      "bind",
    ]);
    // fetch B, C, D together (leaf order, left to right) before any combine.
    const fetchedNames = tokens.filter((_t, i) => substeps.slice(0, 3).some((s) => s.target.tokenIndex === i));
    expect(fetchedNames.map((t) => t.text)).toEqual(["B", "C", "D"]);

    const plusIndex = tokens.findIndex((t) => t.text === "+");
    const starIndex = tokens.findIndex((t) => t.text === "*");

    // combine `+` (B, C) fires before combine `*` (result, D) — innermost first.
    expect(substeps[3]!.target).toEqual({ line: LINE, tokenIndex: plusIndex });
    expect(substeps[3]!.value).toEqual({ display: "3", kind: "literal" });
    expect(substeps[4]!.target).toEqual({ line: LINE, tokenIndex: starIndex });
    expect(substeps[4]!.source[0]).toEqual({ line: LINE, tokenIndex: plusIndex });
    expect(substeps[4]!.value).toEqual({ display: "12", kind: "literal" });
  });

  it("marks the combine value unevaluated when an operand can't be resolved", () => {
    const text = "A = B * C;";
    const tokens = tokensFor(text);
    const reads = [{ name: "B", value: { display: "this.orders.get(id)", kind: "unevaluated" as const } }];
    const substeps = buildStepFlow(LINE, tokens, { name: "A", expression: "B * C" }, reads);
    const combine = substeps.find((s) => s.kind === "combine");
    expect(combine?.value?.kind).toBe("unevaluated");
  });

  it("still emits assign/bind (no combine) for a plain copy with no operator", () => {
    const text = "A = B;";
    const tokens = tokensFor(text);
    const reads = [{ name: "B", value: { display: "5", kind: "literal" as const } }];
    const substeps = buildStepFlow(LINE, tokens, { name: "A", expression: "B" }, reads);
    expect(substeps.map((s) => s.kind)).toEqual(["fetch", "assign", "bind"]);
    expect(substeps[1]!.value).toEqual({ display: "5", kind: "literal" });
  });

  it("is undecomposable for a call whose result isn't fetched from local scope", () => {
    const text = "A = foo(B, C);";
    const tokens = tokensFor(text);
    const substeps = buildStepFlow(LINE, tokens, { name: "A", expression: "foo(B, C)" }, []);
    expect(substeps).toEqual([]);
  });

  it("is undecomposable for template-literal interpolation", () => {
    const text = "A = `total: ${B}`;";
    const tokens = tokensFor(text);
    const substeps = buildStepFlow(LINE, tokens, { name: "A", expression: "`total: ${B}`" }, []);
    expect(substeps).toEqual([]);
  });

  it("is undecomposable for a ternary expression", () => {
    const text = "A = B ? C : D;";
    const tokens = tokensFor(text);
    const substeps = buildStepFlow(LINE, tokens, { name: "A", expression: "B ? C : D" }, []);
    expect(substeps).toEqual([]);
  });

  it("is undecomposable beyond the max nesting depth", () => {
    const text = "A = (((B + C)));";
    const tokens = tokensFor(text);
    const substeps = buildStepFlow(LINE, tokens, { name: "A", expression: "(((B + C)))" }, []);
    expect(substeps).toEqual([]);
  });

  it("returns no substeps when the binding name can't be located in the tokens", () => {
    const tokens = tokensFor("A = B * C;");
    const substeps = buildStepFlow(LINE, tokens, { name: "missing", expression: "B * C" }, []);
    expect(substeps).toEqual([]);
  });
});
