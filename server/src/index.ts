import express from "express";
import cors from "cors";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execFileAsync = promisify(execFile);
import { pickFolderNative } from "./browseFolder";
import {
  buildProjectIndex,
  countSymbols,
  indexFilePaths,
  serializeIndex,
  serializeSymbolsMap,
} from "./indexer";
import { parseFileGraph, parseFocus } from "./parser";

const app = express();
const PORT = 3001;

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", "coverage"]);

const indexCache = new Map<
  string,
  ReturnType<typeof serializeIndex>
>();

app.use(cors());

app.get("/api/index", (req, res) => {
  const dirPath = req.query.path;
  if (typeof dirPath !== "string" || !dirPath.trim()) {
    res.status(400).json({ error: "Missing or invalid path query parameter" });
    return;
  }

  const folderRoot = path.normalize(path.resolve(dirPath));

  try {
    const cached = indexCache.get(folderRoot);
    if (cached) {
      res.json(cached);
      return;
    }

    const index = buildProjectIndex(folderRoot);
    const payload = serializeIndex(index);
    indexCache.set(folderRoot, payload);
    res.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Index build failed";
    res.status(500).json({ error: message });
  }
});

app.post("/api/browse-folder", (_req, res) => {
  try {
    const selected = pickFolderNative();
    if (!selected) {
      res.status(200).json({ cancelled: true });
      return;
    }
    res.json({ path: selected });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Folder picker failed";
    res.status(500).json({ error: message });
  }
});

app.get("/api/tree", (req, res) => {
  const dirPath = req.query.path;
  if (typeof dirPath !== "string" || !dirPath.trim()) {
    res.status(400).json({ error: "Missing or invalid path query parameter" });
    return;
  }

  const absolutePath = path.resolve(dirPath);
  if (!fs.existsSync(absolutePath)) {
    res.status(404).json({ error: "Path does not exist" });
    return;
  }

  if (!fs.statSync(absolutePath).isDirectory()) {
    res.status(400).json({ error: "Path must be a directory" });
    return;
  }

  try {
    const entries = fs
      .readdirSync(absolutePath, { withFileTypes: true })
      .filter((entry) => {
        if (entry.name.startsWith(".")) return false;
        if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) return false;
        if (entry.isFile() && !/\.tsx?$/.test(entry.name)) return false;
        return entry.isDirectory() || entry.isFile();
      })
      .map((entry) => ({
        name: entry.name,
        path: path.normalize(path.join(absolutePath, entry.name)),
        type: entry.isDirectory() ? ("directory" as const) : ("file" as const),
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    res.json({ path: absolutePath, entries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read directory";
    res.status(500).json({ error: message });
  }
});

app.get("/api/file-graph", (req, res) => {
  res.setTimeout(30_000);

  const filePath = req.query.path;
  if (typeof filePath !== "string" || !filePath.trim()) {
    res.status(400).json({ error: "Missing or invalid path query parameter" });
    return;
  }

  try {
    const result = parseFileGraph(path.resolve(filePath));
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
    res.status(500).json({ error: message });
  }
});

app.get("/api/focus", (req, res) => {
  res.setTimeout(30_000);

  const filePath = req.query.path;
  if (typeof filePath !== "string" || !filePath.trim()) {
    res.status(400).json({ error: "Missing or invalid path query parameter" });
    return;
  }

  const depthRaw = req.query.depth;
  const depth =
    typeof depthRaw === "string" && depthRaw.trim() !== ""
      ? Number.parseInt(depthRaw, 10)
      : 1;

  if (!Number.isFinite(depth) || depth < 1 || depth > 3) {
    res.status(400).json({ error: "depth must be 1, 2, or 3" });
    return;
  }

  try {
    const result = parseFocus(path.resolve(filePath), depth);
    const filePaths = [...new Set(result.nodes.map((n) => n.filePath))];
    const newSymbols = indexFilePaths(filePaths);

    res.json({
      ...result,
      symbols: serializeSymbolsMap(newSymbols),
      symbolCount: countSymbols(newSymbols),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Focus parse failed";
    res.status(500).json({ error: message });
  }
});

app.get("/api/open", async (req, res) => {
  const filePath = req.query.path;
  const lineRaw = req.query.line;

  if (typeof filePath !== "string" || !filePath.trim()) {
    res.status(400).json({ error: "Missing or invalid path query parameter" });
    return;
  }

  const line =
    typeof lineRaw === "string" && lineRaw.trim() !== ""
      ? Number.parseInt(lineRaw, 10)
      : 1;

  if (!Number.isFinite(line) || line < 1) {
    res.status(400).json({ error: "line must be a positive integer" });
    return;
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  try {
    await execFileAsync("code", ["--goto", `${absolutePath}:${line}`]);
    res.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to open file in VS Code";
    res.status(500).json({ error: message });
  }
});

app.get("/api/file", (req, res) => {
  const filePath = req.query.path;
  if (typeof filePath !== "string" || !filePath.trim()) {
    res.status(400).json({ error: "Missing or invalid path query parameter" });
    return;
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  if (!fs.statSync(absolutePath).isFile()) {
    res.status(400).json({ error: "Path must be a file" });
    return;
  }

  try {
    const content = fs.readFileSync(absolutePath, "utf-8");
    res.type("text/plain").send(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Read failed";
    res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`codegrapher server listening on http://localhost:${PORT}`);
});
