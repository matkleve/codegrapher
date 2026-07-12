import { Project, type SourceFile } from "ts-morph";
import * as fs from "fs";
import * as path from "path";
import {
  indexClassesInFile,
  indexExportedArrowFunctions,
} from "./indexClasses";
import { indexFunctionsInFile } from "./indexFunctions";
import { indexImportsInFile } from "./indexImports";
import { indexInterfacesInFile } from "./indexInterfaces";
import {
  collectTsFiles,
  isInNodeModules,
  isTsFile,
  yieldToEventLoop,
} from "./indexerUtils";
import type { IndexProgressEvent, ProjectIndex, SymbolEntry } from "./indexerTypes";
import {
  buildProjectReferences,
  countReferences,
  serializeReferencesMap,
  type ReferenceEntry,
} from "./referenceIndexer";

export type { ReferenceEntry };
export type { SymbolKind, SymbolEntry, ProjectIndex, IndexProgressEvent } from "./indexerTypes";

function indexSourceFile(
  sf: SourceFile,
  index: Map<string, SymbolEntry[]>,
  project: Project,
  folderPath: string,
): void {
  const filePath = path.normalize(sf.getFilePath());
  if (isInNodeModules(filePath)) return;
  if (!filePath.startsWith(folderPath)) return;

  indexClassesInFile(sf, index);
  indexInterfacesInFile(sf, index);
  indexFunctionsInFile(sf, index);
  indexExportedArrowFunctions(sf, index);
  indexImportsInFile(sf, index, project);
}

export async function buildProjectIndex(
  folderPath: string,
  onProgress?: (event: IndexProgressEvent) => void | Promise<void>,
): Promise<ProjectIndex> {
  const report = async (event: IndexProgressEvent) => {
    if (!onProgress) return;
    await onProgress(event);
    await yieldToEventLoop();
  };

  const folderRoot = path.normalize(path.resolve(folderPath));
  if (!fs.existsSync(folderRoot) || !fs.statSync(folderRoot).isDirectory()) {
    throw new Error(`Folder not found: ${folderRoot}`);
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

  const symbols = new Map<string, SymbolEntry[]>();
  const sourceFiles = project
    .getSourceFiles()
    .filter((sf) => !isInNodeModules(sf.getFilePath()));
  const fileTotal = sourceFiles.length;

  await report({ phase: "files", done: 0, total: fileTotal });
  await report({ phase: "preparing", total: fileTotal });
  project.getTypeChecker();

  for (let i = 0; i < sourceFiles.length; i++) {
    const sf = sourceFiles[i];
    const currentFile = path.basename(sf.getFilePath());
    await report({
      phase: "files",
      done: i,
      total: fileTotal,
      currentFile,
    });
    indexSourceFile(sf, symbols, project, folderRoot);
  }

  if (fileTotal > 0) {
    await report({ phase: "files", done: fileTotal, total: fileTotal });
  }

  let symbolCount = 0;
  for (const list of symbols.values()) symbolCount += list.length;

  await report({ phase: "references", filesTotal: fileTotal });
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
