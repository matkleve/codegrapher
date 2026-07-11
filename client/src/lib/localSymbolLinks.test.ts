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

  it("indexes continuation params when startLine is not 1", () => {
    const code = `export function fn(
  x: number,
): void {
  return x;
}`;
    const index = buildMemberSymbolIndex(MEMBER, code, 40);
    const paramDef = paramDefForName(index, MEMBER, "x");
    expect(paramDef?.lineNumber).toBe(41);
  });
});

describe("buildMemberSymbolIndex buildViewbox", () => {
  const CODE = `export function buildViewbox(lat: number, lng: number): string {
  const delta = 0.1;
  return \`\${lng - delta},\${lat + delta},\${lng + delta},\${lat - delta}\`;
}`;

  it("indexes lng param and two usages on the return line", () => {
    const index = buildMemberSymbolIndex(MEMBER, CODE, 41);
    const lngDef = paramDefForName(index, MEMBER, "lng");
    expect(lngDef?.lineNumber).toBe(41);

    let lngUsages = 0;
    for (const target of index.usageTargets.values()) {
      if (target === lngDef?.defId) lngUsages++;
    }
    expect(lngUsages).toBe(2);
  });
});

describe("buildMemberSymbolIndex destructuring and for-of", () => {
  it("indexes destructuring bindings", () => {
    const code = `fn(): void {
  const { lat, lng } = point;
  console.log(lat, lng);
}`;
    const index = buildMemberSymbolIndex(MEMBER, code, 10);
    expect(paramDefForName(index, MEMBER, "lat")).toBeNull();
    const latLine = "  const { lat, lng } = point;";
    const tokens = tokenizeLine(latLine).tokens;
    const latIdx = tokens.findIndex((t) => t.kind === "identifier" && t.text === "lat");
    expect(defSiteFor(index, 11, latIdx)).toContain("::local::lat::");
  });

  it("indexes for-of loop variables", () => {
    const code = `fn(items: string[]): void {
  for (const item of items) {
    console.log(item);
  }
}`;
    const index = buildMemberSymbolIndex(MEMBER, code, 1);
    const loopLine = "  for (const item of items) {";
    const tokens = tokenizeLine(loopLine).tokens;
    const itemIdx = tokens.findIndex((t) => t.kind === "identifier" && t.text === "item");
    expect(defSiteFor(index, 2, itemIdx)).toContain("::local::item::");
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

  it("anchors binding init on receiver when property name matches local name", () => {
    const code = `fn(): void {
  const importance = result.importance ?? 0.5;
  return lexical + importance;
}`;
    const index = buildMemberSymbolIndex(MEMBER, code);
    const declLine = "  const importance = result.importance ?? 0.5;";
    const tokens = tokenizeLine(declLine).tokens;
    const importanceIndex = tokens.findIndex(
      (t, i) =>
        t.kind === "identifier" &&
        t.text === "importance" &&
        tokens.slice(0, i).some((p) => p.text === "const"),
    );
    const resultIndex = tokens.findIndex((t) => t.kind === "identifier" && t.text === "result");
    expect(importanceIndex).toBeGreaterThan(-1);
    expect(resultIndex).toBeGreaterThan(-1);

    const importanceDefId = defSiteFor(index, 2, importanceIndex);
    expect(importanceDefId).toBeDefined();

    const site = bindingInitFor(index, importanceDefId!);
    expect(site).toEqual({ lineNumber: 2, tokenIndex: resultIndex, token: "result" });
    expect(bindingDefForInit(index, 2, resultIndex)).toBe(importanceDefId);
  });
});
