import { describe, expect, it } from "vitest";
import { extractParamNames, scopeAtStep } from "@/lib/staticWalk/scopeAtStep";

describe("scopeAtStep", () => {
  it("resolves a param bound to a literal input as kind literal", () => {
    const scope = scopeAtStep("    return id;", 1, { id: '"o1"' }, ["id"]);
    expect(scope.get("id")).toEqual({ display: '"o1"', kind: "literal" });
  });

  it("marks a param with no matching input as unknown", () => {
    const scope = scopeAtStep("    return id;", 1, {}, ["id"]);
    expect(scope.get("id")).toEqual({ display: "?", kind: "unknown" });
  });

  it("resolves a declaration initialized from a numeric literal", () => {
    const scope = scopeAtStep("    const total = 42;", 1, {}, []);
    expect(scope.get("total")).toEqual({ display: "42", kind: "literal" });
  });

  it("resolves a declaration initialized from a string literal", () => {
    const scope = scopeAtStep('    const name = "alice";', 1, {}, []);
    expect(scope.get("name")).toEqual({ display: '"alice"', kind: "literal" });
  });

  it("resolves a declaration initialized from a boolean literal", () => {
    const scope = scopeAtStep("    const ok = true;", 1, {}, []);
    expect(scope.get("ok")).toEqual({ display: "true", kind: "literal" });
  });

  it("resolves a declaration initialized from a param that is a raw input key", () => {
    const scope = scopeAtStep("    const a = id;", 1, { id: "1" }, ["id"]);
    expect(scope.get("a")).toEqual({ display: "1", kind: "literal" });
  });

  it("does not chase a local-to-local reference through the growing scope, so it is unevaluated", () => {
    // parseInitializer only resolves identifiers against the raw `inputs`
    // record, not against previously-assigned locals — so referencing an
    // earlier local (as opposed to a param) always falls through to unevaluated.
    const scope = scopeAtStep("    const a = id;\n    const b = a;", 2, { id: "1" }, ["id"]);
    expect(scope.get("a")).toEqual({ display: "1", kind: "literal" });
    expect(scope.get("b")).toEqual({ display: "a", kind: "unevaluated" });
  });

  it("marks an explicit undefined initializer as kind unknown", () => {
    const scope = scopeAtStep("    const a = undefined;", 1, {}, []);
    expect(scope.get("a")).toEqual({ display: "undefined", kind: "unknown" });
  });

  it("marks an await expression's binding as unevaluated, stripping the await keyword", () => {
    const scope = scopeAtStep("    const saved = await this.repo.save(id);", 1, {}, []);
    expect(scope.get("saved")).toEqual({ display: "this.repo.save(id)", kind: "unevaluated" });
  });

  it("marks a this.-property read as unevaluated", () => {
    const scope = scopeAtStep("    const rate = this.config.rate;", 1, {}, []);
    expect(scope.get("rate")).toEqual({ display: "this.config.rate", kind: "unevaluated" });
  });

  it("marks any other unresolvable expression (e.g. a call) as unevaluated", () => {
    const scope = scopeAtStep("    const amount = this.orders.get(id);", 1, { id: '"o1"' }, ["id"]);
    expect(scope.get("amount")?.kind).toBe("unevaluated");
  });

  it("updates scope on plain re-assignment, overwriting the prior value", () => {
    const code = "    let total = 1;\n    total = 2;";
    const scope = scopeAtStep(code, 2, {}, []);
    expect(scope.get("total")).toEqual({ display: "2", kind: "literal" });
  });

  it("stops walking once past currentLine, excluding later declarations", () => {
    const code = "    const a = 1;\n    const b = 2;";
    const scope = scopeAtStep(code, 1, {}, []);
    expect(scope.has("a")).toBe(true);
    expect(scope.has("b")).toBe(false);
  });

  it("returns only the seeded params when currentLine is before any statement", () => {
    const scope = scopeAtStep("    const a = 1;", 0, { id: "1" }, ["id"]);
    expect(scope.has("a")).toBe(false);
    expect(scope.get("id")).toEqual({ display: "1", kind: "literal" });
  });
});

describe("extractParamNames", () => {
  it("extracts multiple plain params", () => {
    expect(extractParamNames("charge(id: string, amount: number): boolean")).toEqual(["id", "amount"]);
  });

  it("strips a single access modifier from constructor-shorthand params", () => {
    expect(extractParamNames("constructor(private gateway: Gateway, public id: string)")).toEqual([
      "gateway",
      "id",
    ]);
  });

  it("drops a param whose modifier list has more than one keyword (regex only strips one)", () => {
    // PARAM_RE only matches a single optional modifier keyword, so a stacked
    // modifier like "private readonly" fails to match and the param is skipped.
    expect(extractParamNames("constructor(private readonly gateway: Gateway, public id: string)")).toEqual(["id"]);
  });

  it("returns an empty array for a signature with no parens", () => {
    expect(extractParamNames("get total")).toEqual([]);
  });

  it("returns an empty array for an empty parameter list", () => {
    expect(extractParamNames("noop()")).toEqual([]);
  });
});
