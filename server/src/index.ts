import express from "express";
import cors from "cors";
import * as fs from "fs";
import * as path from "path";
import { parseFocus } from "./parser";

const app = express();
const PORT = 3001;

app.use(cors());

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
      : 2;

  if (!Number.isFinite(depth) || depth < 1 || depth > 3) {
    res.status(400).json({ error: "depth must be 1, 2, or 3" });
    return;
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    res.status(404).json({ error: "File does not exist" });
    return;
  }

  try {
    const result = parseFocus(absolutePath, depth);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Focus parse failed";
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
