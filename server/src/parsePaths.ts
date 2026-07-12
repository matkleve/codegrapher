import * as fs from "fs";
import * as path from "path";

export function isTsFile(filePath: string): boolean {
  return /\.tsx?$/.test(filePath);
}

export function resolveImportPath(fromFile: string, moduleSpecifier: string): string | null {
  const base = path.resolve(path.dirname(fromFile), moduleSpecifier);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) {
    return path.normalize(base);
  }
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = base + ext;
    if (fs.existsSync(candidate)) {
      return path.normalize(candidate);
    }
  }
  return null;
}
