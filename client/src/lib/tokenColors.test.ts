import { describe, expect, it } from "vitest";
import {
  isTypeAnnotationContext,
  semanticForCodeIdentifier,
} from "@/lib/tokenColors";

describe("isTypeAnnotationContext", () => {
  it("treats colon as type position", () => {
    expect(isTypeAnnotationContext(":")).toBe(true);
  });

  it("does not treat nullish coalescing as type position", () => {
    expect(isTypeAnnotationContext("?", "?")).toBe(false);
  });

  it("still treats conditional-type question as type position", () => {
    expect(isTypeAnnotationContext("?", "extends")).toBe(true);
  });
});

describe("semanticForCodeIdentifier", () => {
  it("keeps locals as variable after ??", () => {
    expect(semanticForCodeIdentifier(undefined, "?", "?")).toBe("variable");
  });

  it("uses type ink after colon annotations", () => {
    expect(semanticForCodeIdentifier(undefined, ":")).toBe("type");
  });
});
