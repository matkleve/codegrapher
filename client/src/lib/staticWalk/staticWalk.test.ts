import { describe, expect, it } from "vitest";
import { buildStepList } from "@/lib/staticWalk/buildStepList";
import { extractParamNames, scopeAtStep } from "@/lib/staticWalk/scopeAtStep";

const CHECKOUT_BODY = `    const amount = this.orders.get(id);
    if (amount === undefined) return false;
    return this.gateway.charge(id, amount);`;

describe("buildStepList", () => {
  it("parses checkout body into ordered statements", () => {
    const steps = buildStepList(CHECKOUT_BODY);
    expect(steps.length).toBeGreaterThanOrEqual(2);
    expect(steps[0]!.kind).toBe("declaration");
    expect(steps.some((s) => s.kind === "return")).toBe(true);
  });
});

describe("scopeAtStep", () => {
  it("tracks locals declared at or above the current line", () => {
    const scope1 = scopeAtStep(CHECKOUT_BODY, 1, { id: '"o1"' }, ["id"]);
    expect(scope1.get("id")?.display).toBe('"o1"');
    expect(scope1.has("amount")).toBe(true);
    expect(scope1.get("amount")?.kind).toBe("unevaluated");
  });

  it("selects by source line, so locals above a mid-method start stay in scope", () => {
    const body = "    const a = 1;\n    const b = 2;\n    return this.sink.push(a);";
    // Trace starts at line 2; buildSession slices the step list, but the scope
    // walk keeps `a` (declared on line 1, above the start) and resolves the
    // right statement for each line regardless of the slice offset.
    const scope = scopeAtStep(body, 2, {}, []);
    expect(scope.get("a")?.display).toBe("1");
    expect(scope.get("b")?.display).toBe("2");
  });

  it("extracts param names from signature", () => {
    expect(extractParamNames("checkout(id: string): Promise<boolean>")).toEqual(["id"]);
  });
});
