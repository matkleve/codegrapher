import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchProjectIndex } from "@/api";
import {
  IDLE_INDEX_PROGRESS,
  type IndexProgressStatus,
} from "@/lib/indexProgress";
import type { ProjectIndexResponse, ReferenceEntry, SymbolEntry } from "@/types";

type IndexContextValue = {
  folderPath: string | null;
  symbolCount: number;
  referenceCount: number;
  indexing: boolean;
  indexStatus: IndexProgressStatus;
  symbols: Map<string, SymbolEntry[]>;
  references: Map<string, ReferenceEntry[]>;
  loadIndex: (folderPath: string) => Promise<ProjectIndexResponse>;
  lookup: (name: string) => SymbolEntry | undefined;
  lookupAll: (name: string) => SymbolEntry[];
  lookupReferences: (name: string) => ReferenceEntry[];
  hasSymbol: (name: string) => boolean;
  mergeSymbols: (incoming: Record<string, SymbolEntry[]>) => void;
};

const IndexContext = createContext<IndexContextValue | null>(null);

function entriesToMap<T>(entries: Record<string, T[]>): Map<string, T[]> {
  return new Map(Object.entries(entries));
}

export function IndexProvider({ children }: { children: ReactNode }) {
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [symbolCount, setSymbolCount] = useState(0);
  const [referenceCount, setReferenceCount] = useState(0);
  const [symbols, setSymbols] = useState<Map<string, SymbolEntry[]>>(new Map());
  const [references, setReferences] = useState<Map<string, ReferenceEntry[]>>(
    new Map(),
  );
  const [indexing, setIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState<IndexProgressStatus>(IDLE_INDEX_PROGRESS);

  const loadIndex = useCallback(async (path: string) => {
    setIndexing(true);
    setIndexStatus({ phase: "files", done: 0, total: 0 });
    try {
      const data = await fetchProjectIndex(path, setIndexStatus);
      setFolderPath(data.folderPath);
      setSymbolCount(data.symbolCount);
      setReferenceCount(data.referenceCount ?? 0);
      setSymbols(entriesToMap(data.symbols));
      setReferences(entriesToMap(data.references ?? {}));
      return data;
    } finally {
      setIndexing(false);
      setIndexStatus(IDLE_INDEX_PROGRESS);
    }
  }, []);

  const lookup = useCallback(
    (name: string) => symbols.get(name)?.[0],
    [symbols],
  );

  const lookupAll = useCallback(
    (name: string) => symbols.get(name) ?? [],
    [symbols],
  );

  const lookupReferences = useCallback(
    (name: string) => references.get(name) ?? [],
    [references],
  );

  const hasSymbol = useCallback(
    (name: string) => symbols.has(name),
    [symbols],
  );

  const mergeSymbols = useCallback((incoming: Record<string, SymbolEntry[]>) => {
    setSymbols((prev) => {
      const next = new Map(prev);
      for (const [name, entries] of Object.entries(incoming)) {
        const list = next.get(name) ?? [];
        for (const entry of entries) {
          const dup = list.some(
            (e) =>
              e.filePath === entry.filePath &&
              e.kind === entry.kind &&
              e.line === entry.line,
          );
          if (!dup) list.push(entry);
        }
        next.set(name, list);
      }
      let count = 0;
      for (const list of next.values()) count += list.length;
      setSymbolCount(count);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      folderPath,
      symbolCount,
      referenceCount,
      indexing,
      indexStatus,
      symbols,
      references,
      loadIndex,
      lookup,
      lookupAll,
      lookupReferences,
      hasSymbol,
      mergeSymbols,
    }),
    [
      folderPath,
      symbolCount,
      referenceCount,
      indexing,
      indexStatus,
      symbols,
      references,
      loadIndex,
      lookup,
      lookupAll,
      lookupReferences,
      hasSymbol,
      mergeSymbols,
    ],
  );

  return <IndexContext.Provider value={value}>{children}</IndexContext.Provider>;
}

export function useIndex(): IndexContextValue {
  const ctx = useContext(IndexContext);
  if (!ctx) {
    throw new Error("useIndex must be used within IndexProvider");
  }
  return ctx;
}
