import { describe, expect, it } from "vitest";
import { formatExplorerError } from "./explorerErrors";

describe("formatExplorerError", () => {
  it("guides when the API server is down", () => {
    const msg = formatExplorerError(
      new Error("Can't reach the API server (port 3001). In a terminal, cd to the codegrapher folder and run npm run dev."),
    );
    expect(msg).toContain("port 3001");
    expect(msg).toContain("npm run dev");
  });

  it("guides when the server reports folder not found", () => {
    const msg = formatExplorerError(new Error("Folder not found: /home/matthias/Project"), {
      folderPath: "/home/matthias/Project",
    });
    expect(msg).toContain("/home/matthias/Project");
    expect(msg).toContain("folder icon");
  });

  it("guides for indexing failures", () => {
    const msg = formatExplorerError(new Error("Failed to index project"), {
      folderPath: "/tmp/demo",
      phase: "index",
    });
    expect(msg).toContain("/tmp/demo");
    expect(msg).toContain("TypeScript");
  });

  it("guides when no path was entered", () => {
    const msg = formatExplorerError("Enter an absolute folder path or browse");
    expect(msg).toContain("No folder path entered");
  });
});
