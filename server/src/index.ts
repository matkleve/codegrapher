import express from "express";
import cors from "cors";
import * as fs from "fs";
import * as path from "path";
import { parseDirectory } from "./parser";

const app = express();
const PORT = 3001;

app.use(cors());

app.get("/api/parse", (req, res) => {
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
    const result = parseDirectory(absolutePath);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Parse failed";
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
