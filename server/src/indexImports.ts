import type { Project, SourceFile } from "ts-morph";
import type { SymbolEntry, SymbolKind } from "./indexerTypes";
import { addSymbol, isInNodeModules } from "./indexerUtils";
import { resolveImportPath } from "./parsePaths";

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

export function indexImportsInFile(
  sf: SourceFile,
  index: Map<string, SymbolEntry[]>,
  project: Project,
): void {
  const filePath = sf.getFilePath();

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
