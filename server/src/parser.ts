import { Project, type SourceFile } from "ts-morph";
import * as fs from "fs";
import * as path from "path";
import {
  addNode,
  createAccumulator,
  type ParseAccumulator,
} from "./parseAccumulator";
import { parseClassesInto } from "./parseClasses";
import { parseInterfacesInto } from "./parseInterfaces";
import { parseModuleInto } from "./parseModule";
import { isTsFile, resolveImportPath } from "./parsePaths";
import { addClassImportEdges, addStructuralEdges } from "./parseStructuralEdges";
import {
  MAX_FOCUS_NODES,
  type FocusResult,
  classNodeId,
  functionNodeId,
  methodNodeId,
} from "./parseTypes";

export {
  MAX_FOCUS_NODES,
  classNodeId,
  functionNodeId,
  methodNodeId,
  resolveImportPath,
};
export type { FocusResult, GraphEdge, GraphNode, StructuralEdgeType } from "./parseTypes";

function getRelativeImports(sourceFile: SourceFile, fromFile: string): string[] {
  const imports: string[] = [];
  for (const importDecl of sourceFile.getImportDeclarations()) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();
    if (!moduleSpecifier.startsWith(".")) continue;
    const resolved = resolveImportPath(fromFile, moduleSpecifier);
    if (resolved) imports.push(resolved);
  }
  return imports;
}

function collectFilesWithinDepth(focusFile: string, depth: number): Set<string> {
  const focus = path.normalize(path.resolve(focusFile));
  const files = new Set<string>([focus]);
  const queue: { file: string; hop: number }[] = [{ file: focus, hop: 0 }];
  const project = new Project({ skipAddingFilesFromTsConfig: true });

  while (queue.length > 0) {
    const { file, hop } = queue.shift()!;
    if (hop >= depth) continue;

    const sourceFile = project.addSourceFileAtPath(file);
    for (const imported of getRelativeImports(sourceFile, file)) {
      if (!files.has(imported)) {
        files.add(imported);
        queue.push({ file: imported, hop: hop + 1 });
      }
    }
  }

  return files;
}

function parseFileInto(
  acc: ParseAccumulator,
  filePath: string,
  sourceFile: SourceFile,
  maxNodes: number,
  options: { compoundClasses: boolean; includeFileNode: boolean },
): void {
  const { includeFileNode } = options;
  const fileId = `file:${filePath}`;

  if (includeFileNode) {
    if (
      !addNode(
        acc,
        {
          id: fileId,
          type: "file",
          label: path.basename(filePath),
          filePath,
          code: sourceFile.getFullText(),
          startLine: 1,
          loaded: true,
        },
        maxNodes,
      )
    ) {
      return;
    }
  }

  parseClassesInto(acc, filePath, sourceFile, maxNodes, options);
  parseInterfacesInto(acc, filePath, sourceFile, maxNodes);
  if (acc.limitReached) return;
  parseModuleInto(acc, filePath, sourceFile, maxNodes, options);
}

function assertFocusFile(focusFile: string): void {
  if (!fs.existsSync(focusFile)) {
    throw new Error("File does not exist");
  }
  if (!fs.statSync(focusFile).isFile()) {
    throw new Error("Path must be a file");
  }
  if (!isTsFile(focusFile)) {
    throw new Error("File must be a .ts or .tsx file");
  }
}

export function parseFileGraph(
  filePath: string,
  maxNodes: number = MAX_FOCUS_NODES,
): FocusResult {
  const focusFile = path.normalize(path.resolve(filePath));
  assertFocusFile(focusFile);

  const acc = createAccumulator();
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.addSourceFileAtPath(focusFile);

  parseFileInto(acc, focusFile, sourceFile, maxNodes, {
    compoundClasses: true,
    includeFileNode: false,
  });

  addClassImportEdges(acc, focusFile, sourceFile);
  addStructuralEdges(acc, focusFile, sourceFile);

  return {
    nodes: acc.nodes,
    edges: acc.edges,
    truncated: acc.truncated || undefined,
    focusFile,
  };
}

export function parseFocus(
  filePath: string,
  depth: number,
  maxNodes: number = MAX_FOCUS_NODES,
): FocusResult {
  const focusFile = path.normalize(path.resolve(filePath));
  assertFocusFile(focusFile);

  const clampedDepth = Math.max(1, Math.min(3, Math.floor(depth)));
  const filesToParse = collectFilesWithinDepth(focusFile, clampedDepth);

  const acc = createAccumulator();
  const project = new Project({ skipAddingFilesFromTsConfig: true });

  const sortedFiles = [...filesToParse].sort((a, b) => {
    if (a === focusFile) return -1;
    if (b === focusFile) return 1;
    return a.localeCompare(b);
  });

  for (const fp of sortedFiles) {
    if (acc.limitReached) break;
    if (!isTsFile(fp)) continue;

    const sourceFile = project.addSourceFileAtPath(fp);
    parseFileInto(acc, fp, sourceFile, maxNodes, {
      compoundClasses: true,
      includeFileNode: false,
    });
  }

  for (const fp of sortedFiles) {
    if (acc.limitReached) break;
    if (!isTsFile(fp)) continue;
    const sourceFile = project.getSourceFile(fp);
    if (!sourceFile) continue;
    addClassImportEdges(acc, fp, sourceFile);
    addStructuralEdges(acc, fp, sourceFile);
  }

  return {
    nodes: acc.nodes,
    edges: acc.edges,
    truncated: acc.truncated || undefined,
    focusFile,
  };
}
