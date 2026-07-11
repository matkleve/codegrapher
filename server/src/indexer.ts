import {
  Project,
  SyntaxKind,
  type ClassDeclaration,
  type SourceFile,
} from "ts-morph";
import * as fs from "fs";
import * as path from "path";
import { resolveImportPath } from "./parser";

export type SymbolKind =
  | "class"
  | "function"
  | "method"
  | "interface"
  | "type"
  | "property";

import {
  buildProjectReferences,
  countReferences,
  serializeReferencesMap,
  type ReferenceEntry,
} from "./referenceIndexer";

export type { ReferenceEntry };

export type SymbolEntry = {
  filePath: string;
  kind: SymbolKind;
  line: number;
};

export type ProjectIndex = {
  folderPath: string;
  symbolCount: number;
  referenceCount: number;
  symbols: Map<string, SymbolEntry[]>;
  references: Map<string, ReferenceEntry[]>;
};

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  "out",
]);

const PRIMITIVE_NAMES = new Set([
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

const TS_KEYWORDS = new Set([
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

function isTsFile(filePath: string): boolean {
  return /\.tsx?$/.test(filePath);
}

function collectTsFiles(dir: string, out: string[] = []): string[] {
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

function isInNodeModules(filePath: string): boolean {
  return filePath.split(path.sep).includes("node_modules");
}

function addSymbol(
  index: Map<string, SymbolEntry[]>,
  name: string | undefined,
  filePath: string,
  kind: SymbolKind,
  line: number,
): void {
  if (!name) return;
  if (PRIMITIVE_NAMES.has(name) || TS_KEYWORDS.has(name)) return;

  const entry: SymbolEntry = { filePath, kind, line };
  const list = index.get(name) ?? [];
  const dup = list.some(
    (e) => e.filePath === entry.filePath && e.kind === entry.kind && e.line === entry.line,
  );
  if (!dup) list.push(entry);
  index.set(name, list);
}

function hasInjectableDecorator(cls: ClassDeclaration): boolean {
  return cls.getDecorators().some((d) => {
    const name = d.getExpression().getText();
    return name === "Injectable" || name.endsWith(".Injectable");
  });
}

function isExportedDeclaration(
  node: { isExported?: () => boolean; hasExportKeyword?: () => boolean },
): boolean {
  if (typeof node.isExported === "function") return node.isExported();
  if (typeof node.hasExportKeyword === "function") return node.hasExportKeyword();
  return false;
}

function kindForImportedName(
  resolvedFile: string,
  name: string,
  project: Project,
): SymbolKind {
  const sf = project.getSourceFile(resolvedFile);
  if (!sf) return "class";

  if (sf.getClass(name)) return "class";
  if (sf.getInterface(name)) return "interface";
  if (sf.getTypeAlias(name)) return "type";
  if (sf.getFunction(name)) return "function";
  if (sf.getEnum(name)) return "type";

  const cls = sf.getClasses().find((c) => c.getName() === name);
  if (cls) return "class";

  return "class";
}

function indexSourceFile(
  sf: SourceFile,
  index: Map<string, SymbolEntry[]>,
  project: Project,
  folderPath: string,
): void {
  const filePath = path.normalize(sf.getFilePath());
  if (isInNodeModules(filePath)) return;
  if (!filePath.startsWith(folderPath)) return;

  for (const cls of sf.getClasses()) {
    const name = cls.getName();
    const line = cls.getStartLineNumber();
    const exported = isExportedDeclaration(cls);
    const injectable = hasInjectableDecorator(cls);

    if (exported || injectable) {
      addSymbol(index, name, filePath, "class", line);
    }

    if (exported || injectable) {
      for (const method of cls.getMethods()) {
        addSymbol(index, method.getName(), filePath, "method", method.getStartLineNumber());
      }
      for (const prop of cls.getProperties()) {
        addSymbol(index, prop.getName(), filePath, "property", prop.getStartLineNumber());
      }
    }
  }

  for (const iface of sf.getInterfaces()) {
    if (!isExportedDeclaration(iface)) continue;
    addSymbol(index, iface.getName(), filePath, "interface", iface.getStartLineNumber());
  }

  for (const typeAlias of sf.getTypeAliases()) {
    if (!isExportedDeclaration(typeAlias)) continue;
    addSymbol(index, typeAlias.getName(), filePath, "type", typeAlias.getStartLineNumber());
  }

  for (const enm of sf.getEnums()) {
    if (!isExportedDeclaration(enm)) continue;
    addSymbol(index, enm.getName(), filePath, "type", enm.getStartLineNumber());
  }

  for (const fn of sf.getFunctions()) {
    if (!isExportedDeclaration(fn)) continue;
    addSymbol(index, fn.getName(), filePath, "function", fn.getStartLineNumber());
  }

  for (const varDecl of sf.getVariableDeclarations()) {
    const parent = varDecl.getParent();
    if (parent?.getKind() !== SyntaxKind.VariableStatement) continue;
    const stmt = parent.asKindOrThrow(SyntaxKind.VariableStatement);
    if (!isExportedDeclaration(stmt)) continue;

    const init = varDecl.getInitializer();
    if (!init) continue;
    const initKind = init.getKind();
    const isFn =
      initKind === SyntaxKind.ArrowFunction ||
      initKind === SyntaxKind.FunctionExpression;
    if (!isFn) continue;

    addSymbol(
      index,
      varDecl.getName(),
      filePath,
      "function",
      varDecl.getStartLineNumber(),
    );
  }

  for (const importDecl of sf.getImportDeclarations()) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    if (!moduleSpecifier.startsWith(".")) continue;

    const resolved = resolveImportPath(filePath, moduleSpecifier);
    if (!resolved || isInNodeModules(resolved)) continue;

    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport) {
      const name = defaultImport.getText();
      const kind = kindForImportedName(resolved, name, project);
      const declLine =
        project.getSourceFile(resolved)?.getClass(name)?.getStartLineNumber() ??
        importDecl.getStartLineNumber();
      addSymbol(index, name, resolved, kind, declLine);
    }

    for (const named of importDecl.getNamedImports()) {
      const name = named.getName();
      const kind = kindForImportedName(resolved, name, project);
      const decl =
        project.getSourceFile(resolved)?.getClass(name) ??
        project.getSourceFile(resolved)?.getInterface(name) ??
        project.getSourceFile(resolved)?.getFunction(name) ??
        project.getSourceFile(resolved)?.getTypeAlias(name);
      const declLine = decl?.getStartLineNumber() ?? importDecl.getStartLineNumber();
      addSymbol(index, name, resolved, kind, declLine);
    }

    const namespaceImport = importDecl.getNamespaceImport();
    if (namespaceImport) {
      addSymbol(
        index,
        namespaceImport.getText(),
        resolved,
        "class",
        importDecl.getStartLineNumber(),
      );
    }
  }
}

export function buildProjectIndex(folderPath: string): ProjectIndex {
  const folderRoot = path.normalize(path.resolve(folderPath));
  if (!fs.existsSync(folderRoot) || !fs.statSync(folderRoot).isDirectory()) {
    throw new Error("Path must be an existing directory");
  }

  const tsconfigPath = path.join(folderRoot, "tsconfig.json");
  const hasTsconfig = fs.existsSync(tsconfigPath);

  const project = hasTsconfig
    ? new Project({ tsConfigFilePath: tsconfigPath })
    : new Project({ skipAddingFilesFromTsConfig: true });

  if (!hasTsconfig) {
    for (const file of collectTsFiles(folderRoot)) {
      project.addSourceFileAtPath(file);
    }
  }

  project.getTypeChecker();

  const symbols = new Map<string, SymbolEntry[]>();

  for (const sf of project.getSourceFiles()) {
    if (isInNodeModules(sf.getFilePath())) continue;
    indexSourceFile(sf, symbols, project, folderRoot);
  }

  let symbolCount = 0;
  for (const list of symbols.values()) symbolCount += list.length;

  const references = buildProjectReferences(project, symbols);

  return {
    folderPath: folderRoot,
    symbolCount,
    referenceCount: countReferences(references),
    symbols,
    references,
  };
}

export function mergeIndexMaps(
  target: Map<string, SymbolEntry[]>,
  source: Map<string, SymbolEntry[]>,
): number {
  let added = 0;
  for (const [name, entries] of source) {
    const list = target.get(name) ?? [];
    for (const entry of entries) {
      const dup = list.some(
        (e) =>
          e.filePath === entry.filePath &&
          e.kind === entry.kind &&
          e.line === entry.line,
      );
      if (!dup) {
        list.push(entry);
        added++;
      }
    }
    target.set(name, list);
  }
  return added;
}

export function indexFilePaths(filePaths: string[]): Map<string, SymbolEntry[]> {
  const symbols = new Map<string, SymbolEntry[]>();
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const unique = [
    ...new Set(
      filePaths.map((fp) => path.normalize(path.resolve(fp))).filter((fp) => {
        return fs.existsSync(fp) && fs.statSync(fp).isFile() && isTsFile(fp);
      }),
    ),
  ];

  project.getTypeChecker();

  for (const filePath of unique) {
    const sf = project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);
    indexSourceFile(sf, symbols, project, path.dirname(filePath));
  }

  return symbols;
}

export function serializeSymbolsMap(
  symbols: Map<string, SymbolEntry[]>,
): Record<string, SymbolEntry[]> {
  const out: Record<string, SymbolEntry[]> = {};
  for (const [name, entries] of symbols) {
    out[name] = entries;
  }
  return out;
}

export function countSymbols(symbols: Map<string, SymbolEntry[]>): number {
  let n = 0;
  for (const list of symbols.values()) n += list.length;
  return n;
}

export function serializeIndex(index: ProjectIndex): {
  folderPath: string;
  symbolCount: number;
  referenceCount: number;
  symbols: Record<string, SymbolEntry[]>;
  references: Record<string, ReferenceEntry[]>;
} {
  const symbols: Record<string, SymbolEntry[]> = {};
  for (const [name, entries] of index.symbols) {
    symbols[name] = entries;
  }
  return {
    folderPath: index.folderPath,
    symbolCount: index.symbolCount,
    referenceCount: index.referenceCount,
    symbols,
    references: serializeReferencesMap(index.references),
  };
}
