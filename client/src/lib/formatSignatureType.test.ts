import { describe, expect, it } from "vitest";
import {
  isIndexedSignatureType,
  isPrimitiveTypeName,
} from "@/lib/formatSignatureType";

describe("signature type indexing", () => {
  const hasSymbol = (name: string) =>
    name === "GeocoderSearchResult" || name === "AddressFieldKind";

  it("treats TS primitives as non-indexed", () => {
    expect(isPrimitiveTypeName("number")).toBe(true);
    expect(isIndexedSignatureType("number", hasSymbol)).toBe(false);
    expect(isIndexedSignatureType("string", hasSymbol)).toBe(false);
  });

  it("detects indexed custom types in params and returns", () => {
    expect(isIndexedSignatureType("GeocoderSearchResult", hasSymbol)).toBe(true);
    expect(isIndexedSignatureType("Promise<GeocoderSearchResult>", hasSymbol)).toBe(
      true,
    );
    expect(isIndexedSignatureType("AddressFieldKind", hasSymbol)).toBe(true);
  });
});
