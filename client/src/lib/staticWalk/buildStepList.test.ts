import { describe, expect, it } from "vitest";
import { buildStepList } from "@/lib/staticWalk/buildStepList";

describe("buildStepList", () => {
  it("assigns 1-based line numbers matching the source", () => {
    const code = "    const a = 1;\n    const b = 2;\n    return a + b;";
    const steps = buildStepList(code);
    expect(steps.map((s) => s.lineNumber)).toEqual([1, 2, 3]);
    expect(steps.map((s) => s.text)).toEqual([
      "    const a = 1;",
      "    const b = 2;",
      "    return a + b;",
    ]);
  });

  it("skips blank lines, brace-only lines, and comments", () => {
    const code = [
      "  {",
      "",
      "  // a comment",
      "  const a = 1;",
      "  }",
    ].join("\n");
    const steps = buildStepList(code);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.lineNumber).toBe(4);
    expect(steps[0]!.kind).toBe("declaration");
  });

  it("classifies each statement kind", () => {
    const code = [
      "    const a = 1;",
      "    a = 2;",
      "    this.sink.push(a);",
      "    return a;",
      "    if (a === 2) return false;",
      "    await this.repo.save(a);",
    ].join("\n");
    const steps = buildStepList(code);
    expect(steps.map((s) => s.kind)).toEqual([
      "declaration",
      "assignment",
      "call",
      "return",
      "if",
      "await",
    ]);
  });

  it("drops trailing statement fragments that never terminate with a semicolon", () => {
    // "kind: other" statements are only kept when they already end with ';' —
    // a bare open-ended fragment (no assignment/call shape, no terminator)
    // is filtered out rather than surfaced as a bogus step.
    const code = "    someBareIdentifier\n    const a = 1;";
    const steps = buildStepList(code);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.text.trim()).toBe("const a = 1;");
  });

  it("respects startLine and endLine to slice a sub-range", () => {
    const code = "    const a = 1;\n    const b = 2;\n    const c = 3;\n    return a + b + c;";
    const steps = buildStepList(code, 2, 3);
    expect(steps.map((s) => s.lineNumber)).toEqual([2, 3]);
    expect(steps.map((s) => s.text.trim())).toEqual(["const b = 2;", "const c = 3;"]);
  });

  it("clamps endLine beyond the source length to the last line", () => {
    const code = "    const a = 1;\n    return a;";
    const steps = buildStepList(code, 1, 100);
    expect(steps).toHaveLength(2);
  });

  it("returns an empty list for an empty or whitespace-only body", () => {
    expect(buildStepList("")).toEqual([]);
    expect(buildStepList("\n  \n\t\n")).toEqual([]);
  });

  it("treats a call statement inside an if-condition as 'if', not 'call'", () => {
    const steps = buildStepList("    if (this.isReady()) return true;");
    expect(steps[0]!.kind).toBe("if");
  });
});
