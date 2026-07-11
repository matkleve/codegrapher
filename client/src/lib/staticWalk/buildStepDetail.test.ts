import { describe, expect, it } from "vitest";
import { buildStepDetail } from "@/lib/staticWalk/buildStepDetail";

const BODY = `    const amount = this.orders.get(id);
    if (amount === undefined) return false;
    return this.gateway.charge(id, amount);`;

describe("buildStepDetail", () => {
  it("lists reads and calculated binding for a declaration", () => {
    const detail = buildStepDetail(
      BODY,
      1,
      "    const amount = this.orders.get(id);",
      "declaration",
      { id: '"o1"' },
      ["id"],
    );
    expect(detail.reads.some((r) => r.name === "id")).toBe(true);
    expect(detail.calculated[0]?.name).toBe("amount");
    expect(detail.writes[0]?.name).toBe("amount");
  });

  it("notes unevaluated await and static if conditions", () => {
    const awaitDetail = buildStepDetail(
      "    await this.repo.save(x);",
      1,
      "    await this.repo.save(x);",
      "await",
      {},
      [],
    );
    expect(awaitDetail.notes.some((n) => n.code === "static.await")).toBe(true);

    const ifDetail = buildStepDetail(
      BODY,
      2,
      "    if (amount === undefined) return false;",
      "if",
      { id: '"o1"' },
      ["id"],
    );
    expect(ifDetail.notes.some((n) => n.code === "static.condition")).toBe(true);
    expect(ifDetail.reads.some((r) => r.name === "amount")).toBe(true);
  });
});
