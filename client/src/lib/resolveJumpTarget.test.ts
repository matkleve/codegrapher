import { describe, expect, it } from "vitest";
import { pickJumpWireEnd } from "@/lib/resolveJumpTarget";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";

const getNode = () => undefined;

function edge(
  overrides: Partial<PreviewEdgeSpec> & Pick<PreviewEdgeSpec, "id">,
): PreviewEdgeSpec {
  return {
    from: { type: "element", el: document.createElement("span") },
    to: { type: "element", el: document.createElement("span") },
    kind: "type",
    ...overrides,
  };
}

describe("pickJumpWireEnd", () => {
  it("jumps away from the focused from endpoint", () => {
    const spec = edge({
      id: "e1",
      liveFrom: {
        token: "result",
        flowNodeId: "f",
        memberId: "m",
        lineNumber: 53,
        tokenIndex: 0,
        role: "usage",
        traceKey: "f::m::53::0::result",
      },
      liveTo: {
        token: "GeocoderSearchResult",
        flowNodeId: "f",
        memberId: "m",
        lineNumber: 53,
        tokenIndex: 2,
        role: "usage",
        traceKey: "f::m::53::2::GeocoderSearchResult",
      },
    });
    expect(pickJumpWireEnd(spec, "f::m::53::0::result", getNode)).toBe("from");
  });

  it("jumps away from the focused to endpoint", () => {
    const spec = edge({
      id: "e1",
      liveFrom: {
        token: "result",
        flowNodeId: "f",
        memberId: "m",
        lineNumber: 53,
        tokenIndex: 0,
        role: "usage",
        traceKey: "f::m::53::0::result",
      },
      liveTo: {
        token: "GeocoderSearchResult",
        flowNodeId: "f",
        memberId: "m",
        lineNumber: 53,
        tokenIndex: 2,
        role: "usage",
        traceKey: "f::m::53::2::GeocoderSearchResult",
      },
    });
    expect(pickJumpWireEnd(spec, "f::m::53::2::GeocoderSearchResult", getNode)).toBe("to");
  });

  it("prefers downstream when focus is unknown", () => {
    const spec = edge({
      id: "e1",
      liveFrom: {
        token: "result",
        flowNodeId: "f",
        memberId: "m",
        lineNumber: 53,
        tokenIndex: 0,
        role: "usage",
      },
      liveTo: {
        token: "GeocoderSearchResult",
        flowNodeId: "f",
        memberId: "m",
        lineNumber: 53,
        tokenIndex: 2,
        role: "usage",
      },
    });
    expect(pickJumpWireEnd(spec, null, getNode)).toBe("from");
  });

  it("prefers definition when wire runs def to usage", () => {
    const spec = edge({
      id: "e1",
      liveFrom: {
        token: "field",
        flowNodeId: "f",
        memberId: "m",
        role: "definition",
      },
      liveTo: {
        token: "field",
        flowNodeId: "f",
        memberId: "m",
        lineNumber: 55,
        tokenIndex: 1,
        role: "usage",
      },
    });
    expect(pickJumpWireEnd(spec, null, getNode)).toBe("from");
  });
});
