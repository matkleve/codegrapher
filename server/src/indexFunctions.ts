import type { SourceFile } from "ts-morph";
import { functionNodeId } from "./parseTypes";
import type { SymbolEntry } from "./indexerTypes";
import { addSymbol, isExportedDeclaration } from "./indexerUtils";
import { indexParamsAndLocals } from "./indexClasses";

export function indexFunctionsInFile(
  sf: SourceFile,
  index: Map<string, SymbolEntry[]>,
): void {
  const filePath = sf.getFilePath();

  for (const fn of sf.getFunctions()) {
    if (!isExportedDeclaration(fn)) continue;
    const name = fn.getName();
    addSymbol(index, name, filePath, "function", fn.getStartLineNumber());
    if (name) {
      indexParamsAndLocals(index, filePath, functionNodeId(filePath, name), fn);
    }
  }
}
