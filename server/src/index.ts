import express from "express";
import cors from "cors";
import * as fs from "fs";
import * as path from "path";
import { getParseStatus, startParse } from "./parseJob";

const app = express();
const PORT = 3001;

app.use(cors());

function validateDirectory(dirPath: unknown): string | { error: string; status: number } {
  if (typeof dirPath !== "string" || !dirPath.trim()) {
    return { error: "Missing or invalid path query parameter", status: 400 };
  }

  const absolutePath = path.resolve(dirPath);
  if (!fs.existsSync(absolutePath)) {
    return { error: "Path does not exist", status: 404 };
  }

  if (!fs.statSync(absolutePath).isDirectory()) {
    return { error: "Path must be a directory", status: 400 };
  }

  return absolutePath;
}

app.get("/api/status", (_req, res) => {
  res.json(getParseStatus());
});

app.get("/api/parse", (req, res) => {
  res.setTimeout(30_000);

  const validated = validateDirectory(req.query.path);
  if (typeof validated !== "string") {
    res.status(validated.status).json({ error: validated.error });
    return;
  }

  const started = startParse(validated);
  if (!started.ok) {
    res.status(409).json({ error: started.error });
    return;
  }

  res.json({ started: true });
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
