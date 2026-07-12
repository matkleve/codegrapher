import type { SourceFile } from "ts-morph";
import { classNodeId } from "./parseTypes";
import type { SymbolEntry } from "./indexerTypes";
import { addSymbol, isExportedDeclaration } from "./indexerUtils";

export function indexInterfacesInFile(
  sf: SourceFile,
  index: Map<string, SymbolEntry[]>,
): void {
  const filePath = sf.getFilePath();

  for (const iface of sf.getInterfaces()) {
    if (!isExportedDeclaration(iface)) continue;
    const ifaceName = iface.getName();
    addSymbol(index, ifaceName, filePath, "interface", iface.getStartLineNumber());

    const ifaceId = classNodeId(filePath, ifaceName);
    for (const prop of iface.getProperties()) {
      addSymbol(index, prop.getName(), filePath, "property", prop.getStartLineNumber(), ifaceId);
    }
    for (const method of iface.getMethods()) {
      addSymbol(index, method.getName(), filePath, "method", method.getStartLineNumber(), ifaceId);
    }
  }

  for (const typeAlias of sf.getTypeAliases()) {
    if (!isExportedDeclaration(typeAlias)) continue;
    addSymbol(index, typeAlias.getName(), filePath, "type", typeAlias.getStartLineNumber());
  }

  for (const enm of sf.getEnums()) {
    if (!isExportedDeclaration(enm)) continue;
    addSymbol(index, enm.getName(), filePath, "type", enm.getStartLineNumber());
  }
}
