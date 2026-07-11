import {
  SyntaxKind,
  type Node,
  type Project,
  type SourceFile,
} from "ts-morph";
import * as path from "path";
import type { SymbolEntry } from "./indexer";

export type ReferenceEntry = {
  filePath: string;
  line: number;
};

const DECL_NAME_PARENTS = new Set<SyntaxKind>([
  SyntaxKind.ClassDeclaration,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.EnumDeclaration,
  SyntaxKind.PropertyDeclaration,
  SyntaxKind.VariableDeclaration,
  SyntaxKind.Parameter,
  SyntaxKind.ImportSpecifier,
  SyntaxKind.ImportClause,
  SyntaxKind.ExportSpecifier,
  SyntaxKind.PropertySignature,
  SyntaxKind.MethodSignature,
]);

function normalizePath(p: string): string {
  return path.normalize(p).replace(/\\/g, "/");
}

function isDeclarationName(node: Node): boolean {
  const parent = node.getParent();
  if (!parent) return false;
  if (!DECL_NAME_PARENTS.has(parent.getKind())) return false;
  const nameNode = "getNameNode" in parent ? (parent as { getNameNode(): Node | undefined }).getNameNode() : undefined;
  return nameNode === node;
}

function findDeclaration(
  sf: SourceFile,
  name: string,
  entry: SymbolEntry,
): Node | undefined {
  const line = entry.line;

  if (entry.kind === "function") {
    const fn = sf.getFunctions().find(
      (f) => f.getName() === name && f.getStartLineNumber() === line,
    );
    if (fn) return fn;
    const vd = sf.getVariableDeclaration(name);
    if (vd && vd.getStartLineNumber() === line) return vd;
    return undefined;
  }

  if (entry.kind === "method") {
    for (const cls of sf.getClasses()) {
      for (const method of cls.getMethods()) {
        if (method.getName() === name && method.getStartLineNumber() === line) {
          return method;
        }
      }
    }
    return undefined;
  }

  if (entry.kind === "class") {
    const cls = sf.getClass(name);
    if (cls && cls.getStartLineNumber() === line) return cls;
    return undefined;
  }

  if (entry.kind === "interface") {
    const iface = sf.getInterface(name);
    if (iface && iface.getStartLineNumber() === line) return iface;
    return undefined;
  }

  if (entry.kind === "property") {
    for (const cls of sf.getClasses()) {
      for (const prop of cls.getProperties()) {
        if (prop.getName() === name && prop.getStartLineNumber() === line) {
          return prop;
        }
      }
    }
  }

  return undefined;
}

/** Reverse index: symbol name → project call/reference sites (TypeScript findReferences). */
export function buildProjectReferences(
  project: Project,
  symbols: Map<string, SymbolEntry[]>,
): Map<string, ReferenceEntry[]> {
  const refs = new Map<string, ReferenceEntry[]>();
  const seen = new Map<string, Set<string>>();

  for (const [name, entries] of symbols) {
    for (const entry of entries) {
      const sf = project.getSourceFile(entry.filePath);
      if (!sf) continue;

      const decl = findDeclaration(sf, name, entry);
      if (!decl) continue;

      const referenced = project.getLanguageService().findReferences(decl);
      if (!referenced) continue;

      for (const refSymbol of referenced) {
        for (const ref of refSymbol.getReferences()) {
          if (ref.isDefinition()) continue;
          const refNode = ref.getNode();
          if (isDeclarationName(refNode)) continue;

          const refFile = normalizePath(refNode.getSourceFile().getFilePath());
          const refLine = refNode.getStartLineNumber();
          const dedupeKey = `${refFile}:${refLine}`;
          const perSymbol = seen.get(name) ?? new Set<string>();
          if (perSymbol.has(dedupeKey)) continue;
          perSymbol.add(dedupeKey);
          seen.set(name, perSymbol);

          const list = refs.get(name) ?? [];
          list.push({ filePath: refFile, line: refLine });
          refs.set(name, list);
        }
      }
    }
  }

  return refs;
}

export function countReferences(refs: Map<string, ReferenceEntry[]>): number {
  let n = 0;
  for (const list of refs.values()) n += list.length;
  return n;
}

export function serializeReferencesMap(
  refs: Map<string, ReferenceEntry[]>,
): Record<string, ReferenceEntry[]> {
  const out: Record<string, ReferenceEntry[]> = {};
  for (const [name, entries] of refs) {
    out[name] = entries;
  }
  return out;
}
