import { normalizeFilePath } from "@/lib/graphFiles";
import type { ExternalReferenceCard } from "@/lib/resolveVisibleTarget";
import type { TokenReference } from "@/lib/semanticLookup";

export const LOAD_PICKER_SEARCH_THRESHOLD = 6;

export type LoadTargetItem = {
  filePath: string;
  line: number;
  label: string;
  subtitle?: string;
};

export function fileBaseName(filePath: string): string {
  const normalized = normalizeFilePath(filePath);
  const slash = normalized.lastIndexOf("/");
  return slash >= 0 ? normalized.slice(slash + 1) : normalized;
}

export function fileDirHint(filePath: string): string {
  const normalized = normalizeFilePath(filePath);
  const slash = normalized.lastIndexOf("/");
  if (slash <= 0) return "";
  return normalized.slice(0, slash);
}

export function fromExternalCards(cards: ExternalReferenceCard[]): LoadTargetItem[] {
  return cards.map((card) => ({
    filePath: card.filePath,
    line: card.line,
    label: card.symbolName,
    subtitle: fileDirHint(card.filePath),
  }));
}

export function fromTokenReferences(refs: TokenReference[]): LoadTargetItem[] {
  return refs.map((ref) => ({
    filePath: ref.filePath,
    line: ref.line,
    label: ref.memberLabel ? `${ref.classLabel}.${ref.memberLabel}` : ref.classLabel,
    subtitle: fileDirHint(ref.filePath),
  }));
}

function sameFolderScore(filePath: string, contextDir: string): number {
  if (!contextDir) return 0;
  const dir = fileDirHint(filePath);
  if (dir === contextDir) return 2;
  if (dir.startsWith(contextDir) || contextDir.startsWith(dir)) return 1;
  return 0;
}

export function sortLoadTargets(
  targets: LoadTargetItem[],
  contextFilePath?: string,
): LoadTargetItem[] {
  const contextDir = contextFilePath ? fileDirHint(contextFilePath) : "";
  return [...targets].sort((a, b) => {
    const folderDelta =
      sameFolderScore(b.filePath, contextDir) - sameFolderScore(a.filePath, contextDir);
    if (folderDelta !== 0) return folderDelta;
    const nameDelta = fileBaseName(a.filePath).localeCompare(fileBaseName(b.filePath));
    if (nameDelta !== 0) return nameDelta;
    return a.filePath.localeCompare(b.filePath);
  });
}

export function filterLoadTargets(
  targets: LoadTargetItem[],
  query: string,
): LoadTargetItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return targets;
  return targets.filter(
    (t) =>
      t.filePath.toLowerCase().includes(q) ||
      t.label.toLowerCase().includes(q) ||
      (t.subtitle?.toLowerCase().includes(q) ?? false),
  );
}
