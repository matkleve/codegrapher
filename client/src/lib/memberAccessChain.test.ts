import { describe, expect, it } from "vitest";
import { memberAccessReceiverIndices } from "@/lib/memberAccessChain";
import { tokenizeLine } from "@/lib/tokenizeLine";

function idxOf(line: string, text: string, occurrence = 0): number {
  const tokens = tokenizeLine(line).tokens;
  let seen = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]!.text === text) {
      if (seen === occurrence) return i;
      seen++;
    }
  }
  return -1;
}

describe("memberAccessReceiverIndices", () => {
  it("returns the receiver for a single-level property access", () => {
    const line = "  parts.push(context.country);";
    const tokens = tokenizeLine(line).tokens;
    const countryIdx = idxOf(line, "country");
    const contextIdx = idxOf(line, "context");

    expect(memberAccessReceiverIndices(tokens, countryIdx)).toEqual([contextIdx]);
  });

  it("returns no receivers when the token is not itself in property-access position", () => {
    const line = "  parts.push(context.country);";
    const tokens = tokenizeLine(line).tokens;
    const contextIdx = idxOf(line, "context");

    expect(memberAccessReceiverIndices(tokens, contextIdx)).toEqual([]);
  });

  it("walks the full chain for a.b.c, nearest receiver first", () => {
    const line = "return a.b.c;";
    const tokens = tokenizeLine(line).tokens;
    const aIdx = idxOf(line, "a");
    const bIdx = idxOf(line, "b");
    const cIdx = idxOf(line, "c");

    expect(memberAccessReceiverIndices(tokens, cIdx)).toEqual([bIdx, aIdx]);
    expect(memberAccessReceiverIndices(tokens, bIdx)).toEqual([aIdx]);
    expect(memberAccessReceiverIndices(tokens, aIdx)).toEqual([]);
  });

  it("stops at a non-identifier receiver (e.g. a call result)", () => {
    const line = "return getAddr().city;";
    const tokens = tokenizeLine(line).tokens;
    const cityIdx = idxOf(line, "city");

    expect(memberAccessReceiverIndices(tokens, cityIdx)).toEqual([]);
  });

  it("ignores whitespace between the dot and the identifiers", () => {
    const line = "return context . country;";
    const tokens = tokenizeLine(line).tokens;
    const countryIdx = idxOf(line, "country");
    const contextIdx = idxOf(line, "context");

    expect(memberAccessReceiverIndices(tokens, countryIdx)).toEqual([contextIdx]);
  });
});
