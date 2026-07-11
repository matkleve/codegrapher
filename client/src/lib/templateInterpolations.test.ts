import { describe, expect, it } from "vitest";
import {
  parseTemplateLiteralParts,
  templateInterpolationSites,
} from "@/lib/templateInterpolations";

describe("templateInterpolationSites", () => {
  it("finds identifiers inside template interpolations", () => {
    const line =
      "  return `${lng - delta},${lat + delta},${lng + delta},${lat - delta}`;";
    expect(templateInterpolationSites(line).map((s) => s.name)).toEqual([
      "lng",
      "lat",
      "lng",
      "lat",
    ]);
  });
});

describe("parseTemplateLiteralParts", () => {
  it("splits a template literal into text and interpolation parts", () => {
    const parts = parseTemplateLiteralParts("`${lng},${lat}`");
    expect(parts).toEqual([
      { kind: "interpolation", name: "lng", raw: "${lng}" },
      { kind: "text", text: "," },
      { kind: "interpolation", name: "lat", raw: "${lat}" },
    ]);
  });
});
