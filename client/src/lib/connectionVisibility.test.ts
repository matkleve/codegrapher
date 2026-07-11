import { describe, expect, it } from "vitest";
import {
  DEFAULT_VISIBLE_EDGE_KINDS,
  structuralTypesForVisibleKinds,
} from "@/lib/connectionVisibility";

describe("connectionVisibility", () => {
  it("defaults with module import off", () => {
    expect(DEFAULT_VISIBLE_EDGE_KINDS.has("usage")).toBe(true);
    expect(DEFAULT_VISIBLE_EDGE_KINDS.has("module-import")).toBe(false);
  });

  it("maps visible legend kinds to structural edge types", () => {
    const types = structuralTypesForVisibleKinds(DEFAULT_VISIBLE_EDGE_KINDS);
    expect(types).toEqual(new Set(["extends", "implements", "composition"]));
  });

  it("includes imports when module-import is visible", () => {
    const kinds = new Set([...DEFAULT_VISIBLE_EDGE_KINDS, "module-import" as const]);
    const types = structuralTypesForVisibleKinds(kinds);
    expect(types.has("imports")).toBe(true);
  });
});
