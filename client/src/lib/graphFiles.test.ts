import { describe, expect, it } from "vitest";
import {
  collectGraphFilePaths,
  isFileInGraph,
  normalizeFilePath,
} from "@/lib/graphFiles";
import type { GraphData } from "@/types";

describe("graphFiles", () => {
  it("normalizes Windows paths and trailing slashes", () => {
    expect(normalizeFilePath("C:\\proj\\src\\A.ts\\")).toBe("C:/proj/src/A.ts");
    expect(normalizeFilePath("/a/b/")).toBe("/a/b");
  });

  it("collects focus file and node paths", () => {
    const data: GraphData = {
      focusFile: "/proj/Main.ts",
      nodes: [
        { id: "a", type: "class", label: "A", filePath: "/proj/A.ts", code: "" },
        { id: "b", type: "method", label: "b", filePath: "/proj/B.ts", code: "", parent: "a" },
      ],
      edges: [],
    };
    const paths = collectGraphFilePaths(data);
    expect(paths.has("/proj/Main.ts")).toBe(true);
    expect(paths.has("/proj/A.ts")).toBe(true);
    expect(paths.has("/proj/B.ts")).toBe(true);
  });

  it("treats normalized paths as equal for in-graph checks", () => {
    const paths = new Set(["/proj/src/File.ts"]);
    expect(isFileInGraph("/proj/src/File.ts", paths)).toBe(true);
    expect(isFileInGraph("\\proj\\src\\File.ts", paths)).toBe(true);
    expect(isFileInGraph("/proj/other.ts", paths)).toBe(false);
  });

  it("handles null graph data", () => {
    expect(collectGraphFilePaths(null).size).toBe(0);
  });
});
