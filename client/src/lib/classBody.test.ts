import { describe, expect, it } from "vitest";
import {
  buildClassProperties,
  buildTypeAliasMembers,
  inferSymbolName,
  isTypeAliasCode,
} from "@/lib/classBody";

describe("inferSymbolName", () => {
  it("captures the property name, not the type, for interface-style fields", () => {
    expect(inferSymbolName("value: string;")).toBe("value");
    expect(inferSymbolName("subtitle?: string;")).toBe("subtitle");
  });

  it("captures the property name when preceded by a leading doc comment", () => {
    const code = [
      '/** Secondary line, e.g. "Vienna, Austria" for a street result. */',
      "subtitle?: string;",
    ].join("\n");
    expect(inferSymbolName(code)).toBe("subtitle");
  });

  it("still captures the name for class fields with modifiers", () => {
    expect(inferSymbolName("public readonly value: string;")).toBe("value");
    expect(inferSymbolName("private count = 0;")).toBe("count");
  });

  it("handles decorated fields", () => {
    expect(inferSymbolName("@Input() foo: string;")).toBe("foo");
  });

  it("returns null for the constructor", () => {
    expect(inferSymbolName("constructor(private foo: string) {}")).toBeNull();
  });
});

describe("buildClassProperties", () => {
  it("does not leak a leading class decorator's config into the properties list", () => {
    const code = `@Injectable({ providedIn: 'root' })
export class AddressFieldSuggestService {
  private cache = new Map();

  suggest(query: string) {
    return this.cache.get(query);
  }
}`;
    const props = buildClassProperties("node-1", code, [
      {
        id: "m1",
        label: "suggest",
        code: "suggest(query: string) {\n    return this.cache.get(query);\n  }",
      },
    ]);

    expect(props).toHaveLength(1);
    expect(props[0]?.symbolName).toBe("cache");
    expect(props.some((p) => p.symbolName === "providedIn")).toBe(false);
  });

  it("labels interface members by property name for a doc-commented interface", () => {
    const code = `interface AddressResult {
  /** Canonical display value to write to the DB column. */
  value: string;
  /** Secondary line, e.g. "Vienna, Austria" for a street result. */
  subtitle?: string;
  source: 'org db' | 'geocoder';
}`;
    const props = buildClassProperties("node-1", code, []);
    const labels = props.map((p) => p.label);
    const symbolNames = props.map((p) => p.symbolName);

    expect(labels).not.toContain("String");
    expect(symbolNames).toContain("value");
    expect(symbolNames).toContain("subtitle");
    expect(symbolNames).toContain("source");
  });
});

describe("isTypeAliasCode", () => {
  it("recognizes exported and non-exported type aliases", () => {
    expect(isTypeAliasCode("export type AddressFieldKind = 'a' | 'b';")).toBe(true);
    expect(isTypeAliasCode("type AddressFieldKind = 'a' | 'b';")).toBe(true);
  });

  it("does not match classes or interfaces", () => {
    expect(isTypeAliasCode("export class Foo {}")).toBe(false);
    expect(isTypeAliasCode("interface Foo {}")).toBe(false);
  });
});

describe("buildTypeAliasMembers", () => {
  it("splits a union-of-literals into one member per literal", () => {
    const code = "export type AddressFieldKind = 'country' | 'city' | 'district';";
    const members = buildTypeAliasMembers("node-1", code, 5);

    expect(members.map((m) => m.label)).toEqual(["country", "city", "district"]);
    expect(members.every((m) => m.startLine === 5)).toBe(true);
  });

  it("locates each member on its own line for a multi-line union", () => {
    const code = [
      "export type AddressFieldKind =",
      "  | 'country'",
      "  | 'city'",
      "  | 'district';",
    ].join("\n");
    const members = buildTypeAliasMembers("node-1", code, 10);

    expect(members.map((m) => m.startLine)).toEqual([11, 12, 13]);
  });

  it("ignores | nested inside generics or object shapes", () => {
    const code = "export type Handler = ((a: 'x' | 'y') => void) | null;";
    const members = buildTypeAliasMembers("node-1", code, 1);

    expect(members).toHaveLength(2);
    expect(members[0]?.label).toBe("((a: 'x' | 'y') => void)");
    expect(members[1]?.label).toBe("null");
  });

  it("returns no members for a non-union alias (nothing to wire beyond the node itself)", () => {
    const code = "export type AddressFieldContextRef = AddressFieldContext;";
    expect(buildTypeAliasMembers("node-1", code)).toEqual([]);
  });
});
