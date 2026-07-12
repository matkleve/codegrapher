import * as fs from "fs";
import * as path from "path";
import type { SymbolEntry, SymbolKind } from "./indexerTypes";

export const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "out",
]);

export const PRIMITIVE_NAMES = new Set([
  "string",
  "number",
  "boolean",
  "void",
  "null",
  "undefined",
  "any",
  "unknown",
  "never",
  "object",
  "symbol",
  "bigint",
  "true",
  "false",
]);

export const TS_KEYWORDS = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "of",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "while",
  "with",
  "yield",
  "async",
  "await",
  "from",
  "as",
  "implements",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "readonly",
  "declare",
  "abstract",
  "type",
  "namespace",
  "module",
  "require",
  "global",
]);

export function isTsFile(filePath: string): boolean {
  return /\.tsx?$/.test(filePath);
}

export function collectTsFiles(dir: string, out: string[] = []): string[] {
  const absolute = path.resolve(dir);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) {
    return out;
  }

  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(absolute, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectTsFiles(full, out);
      continue;
    }
    if (entry.isFile() && isTsFile(entry.name)) {
      out.push(path.normalize(full));
    }
  }
  return out;
}

export function isInNodeModules(filePath: string): boolean {
  return filePath.split(path.sep).includes("node_modules");
}

export function addSymbol(
  index: Map<string, SymbolEntry[]>,
  name: string | undefined,
  filePath: string,
  kind: SymbolKind,
  line: number,
  enclosingSymbol?: string,
): void {
  if (!name) return;
  if (PRIMITIVE_NAMES.has(name) || TS_KEYWORDS.has(name)) return;

  const entry: SymbolEntry = { filePath, kind, line, enclosingSymbol };
  const list = index.get(name) ?? [];
  const dup = list.some(
    (e) => e.filePath === entry.filePath && e.kind === entry.kind && e.line === entry.line,
  );
  if (!dup) list.push(entry);
  index.set(name, list);
}

export function isExportedDeclaration(
  node: { isExported?: () => boolean; hasExportKeyword?: () => boolean },
): boolean {
  if (typeof node.isExported === "function") return node.isExported();
  if (typeof node.hasExportKeyword === "function") return node.hasExportKeyword();
  return false;
}

export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, 0);
  });
}
