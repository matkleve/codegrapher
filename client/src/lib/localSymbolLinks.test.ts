import { describe, expect, it } from "vitest";
import {
  bindingDefForInit,
  bindingInitFor,
  buildMemberSymbolIndex,
  defSiteFor,
  paramDefForName,
  usageTargetFor,
} from "@/lib/localSymbolLinks";
import { tokenizeLine } from "@/lib/tokenizeLine";

const MEMBER = "method:file:Svc.fn";

const MULTILINE_SIG = `extractFieldValue(
  result: GeocoderSearchResult,
  field: string,
): string {
  const addr = result.address_components;
  return addr;
}`;

describe("buildMemberSymbolIndex multiline params", () => {
  it("indexes continuation-line params and links body usages", () => {
    const index = buildMemberSymbolIndex(MEMBER, MULTILINE_SIG);
    const paramDef = paramDefForName(index, MEMBER, "result");
    expect(paramDef?.lineNumber).toBe(2);

    const line = "  const addr = result.address_components;";
    const tokens = tokenizeLine(line).tokens;
    const resultIndex = tokens.findIndex(
      (t, i) =>
        t.kind === "identifier" &&
        t.text === "result" &&
        tokens[i - 1]?.text !== ".",
    );
    expect(resultIndex).toBeGreaterThan(-1);
    expect(usageTargetFor(index, 5, resultIndex)).toBe(paramDef?.defId);
  });

  it("does not treat a param declaration as a usage of itself", () => {
    const index = buildMemberSymbolIndex(MEMBER, MULTILINE_SIG);
    const paramDef = paramDefForName(index, MEMBER, "result");
    const line = "  result: GeocoderSearchResult,";
    const tokens = tokenizeLine(line).tokens;
    const resultIndex = tokens.findIndex(
      (t) => t.kind === "identifier" && t.text === "result",
    );
    expect(resultIndex).toBeGreaterThan(-1);
    expect(defSiteFor(index, 2, resultIndex)).toBe(paramDef?.defId);
    expect(usageTargetFor(index, 2, resultIndex)).toBeUndefined();
  });
});

describe("buildMemberSymbolIndex binding inits", () => {
  const BODY = `getAddress(result: SearchResult): string | null {
  const addr = result.address;
  if (addr) return addr;
  return null;
}`;

  it("maps initializer property to local binding", () => {
    const index = buildMemberSymbolIndex(MEMBER, BODY);
    const addrLine = "  const addr = result.address;";
    const tokens = tokenizeLine(addrLine).tokens;
    const addrIndex = tokens.findIndex((t) => t.kind === "identifier" && t.text === "addr");
    const addressIndex = tokens.findIndex(
      (t, i) => t.kind === "identifier" && t.text === "address" && tokens[i - 1]?.text === ".",
    );
    expect(addrIndex).toBeGreaterThan(-1);
    expect(addressIndex).toBeGreaterThan(-1);

    const addrDefId = defSiteFor(index, 2, addrIndex);
    expect(addrDefId).toBeDefined();

    const site = bindingInitFor(index, addrDefId!);
    expect(site).toEqual({ lineNumber: 2, tokenIndex: addressIndex, token: "address" });
    expect(bindingDefForInit(index, 2, addressIndex)).toBe(addrDefId);
  });

  it("skips binding when RHS has no identifier", () => {
    const code = `fn(): void {
  const n = 1;
}`;
    const index = buildMemberSymbolIndex(MEMBER, code);
    expect(index.bindingInitOf.size).toBe(0);
  });
});
