import { describe, expect, it } from "vitest";
import {
  blockCommentOpenAtLineStart,
  tokenizeLine,
} from "@/lib/tokenizeLine";

describe("tokenizeLine block comments", () => {
  it("keeps JSDoc prose as a single comment token", () => {
    const { tokens } = tokenizeLine(
      " * Extract the relevant address component value from a geocoder hit for a",
      true,
    );
    expect(tokens).toEqual([
      {
        text: " * Extract the relevant address component value from a geocoder hit for a",
        kind: "comment",
      },
    ]);
    expect(tokens.some((t) => t.kind === "identifier")).toBe(false);
  });

  it("tracks multiline block comment state", () => {
    const code = `/**
 * Returns null if missing.
 */
const x = 1;`;

    expect(blockCommentOpenAtLineStart(code, 1)).toBe(false);
    expect(blockCommentOpenAtLineStart(code, 2)).toBe(true);
    expect(blockCommentOpenAtLineStart(code, 3)).toBe(true);

    const line1 = tokenizeLine("/**");
    expect(line1.inBlockComment).toBe(true);

    const line2 = tokenizeLine(" * Returns null if missing.", line1.inBlockComment);
    expect(line2.tokens.every((t) => t.kind === "comment")).toBe(true);

    const line3 = tokenizeLine(" */", line2.inBlockComment);
    expect(line3.inBlockComment).toBe(false);

    const line4 = tokenizeLine("const x = 1;", line3.inBlockComment);
    expect(line4.tokens.some((t) => t.text === "const" && t.kind === "keyword")).toBe(
      true,
    );
  });

  it("does not treat // inside a string as a comment", () => {
    const { tokens } = tokenizeLine('const s = "http://example.com";');
    expect(tokens.some((t) => t.kind === "comment")).toBe(false);
    expect(tokens.some((t) => t.kind === "string")).toBe(true);
  });
});
