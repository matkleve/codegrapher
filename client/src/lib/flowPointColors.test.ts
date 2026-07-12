import { describe, expect, it } from "vitest";
import { flowPointColor } from "@/lib/flowPointColors";

describe("flowPointColor", () => {
  it("mutes an unevaluated fetch point", () => {
    expect(flowPointColor({ kind: "fetch", value: { display: "x", kind: "unevaluated" } })).toBe(
      "var(--faint)",
    );
  });

  it("mutes an unknown-value point regardless of substep kind", () => {
    expect(flowPointColor({ kind: "combine", value: { display: "?", kind: "unknown" } })).toBe(
      "var(--faint)",
    );
  });

  it("mutes a substep with no value at all", () => {
    expect(flowPointColor({ kind: "fetch" })).toBe("var(--faint)");
  });

  it("uses the source token's semantic hue for a literal fetch", () => {
    expect(
      flowPointColor({ kind: "fetch", value: { display: "5", kind: "literal" } }, "variable"),
    ).toBe("var(--token-edge-variable)");
  });

  it("falls back to the variable hue for a literal fetch with no known semantic kind", () => {
    expect(flowPointColor({ kind: "fetch", value: { display: "5", kind: "literal" } })).toBe(
      "var(--token-edge-variable)",
    );
  });

  it("uses the result hue for a literal combine, even if the source hue differs", () => {
    expect(
      flowPointColor({ kind: "combine", value: { display: "6", kind: "literal" } }, "function"),
    ).toBe("var(--edge-binding)");
  });

  it("uses the result hue for literal assign/bind points", () => {
    expect(flowPointColor({ kind: "assign", value: { display: "6", kind: "literal" } })).toBe(
      "var(--edge-binding)",
    );
    expect(flowPointColor({ kind: "bind", value: { display: "6", kind: "literal" } })).toBe(
      "var(--edge-binding)",
    );
  });
});
