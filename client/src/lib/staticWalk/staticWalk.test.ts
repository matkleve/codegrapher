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
  it("tracks locals declared above current step", () => {
    const scope0 = scopeAtStep(CHECKOUT_BODY, 0, { id: '"o1"' }, ["id"]);
    expect(scope0.get("id")?.display).toBe('"o1"');
    expect(scope0.has("amount")).toBe(true);

    const scope1 = scopeAtStep(CHECKOUT_BODY, 1, { id: '"o1"' }, ["id"]);
    expect(scope1.get("amount")?.kind).toBe("unevaluated");
  });

  it("extracts param names from signature", () => {
    expect(extractParamNames("checkout(id: string): Promise<boolean>")).toEqual(["id"]);
  });
});
