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

  it("splits expression interpolations like the line scanner", () => {
    const token = "`${lng - delta},${lat + delta},${lng + delta},${lat - delta}`";
    const parts = parseTemplateLiteralParts(token);
    expect(parts.filter((p) => p.kind === "interpolation").map((p) => p.name)).toEqual([
      "lng",
      "lat",
      "lng",
      "lat",
    ]);
    expect(parts.filter((p) => p.kind === "interpolation").map((p) => p.raw)).toEqual([
      "${lng - delta}",
      "${lat + delta}",
      "${lng + delta}",
      "${lat - delta}",
    ]);
  });
});
