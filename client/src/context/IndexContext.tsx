import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchProjectIndex } from "@/api";
import type { ProjectIndexResponse, SymbolEntry } from "@/types";

type IndexContextValue = {
  folderPath: string | null;
  symbolCount: number;
  indexing: boolean;
  symbols: Map<string, SymbolEntry[]>;
  loadIndex: (folderPath: string) => Promise<ProjectIndexResponse>;
  lookup: (name: string) => SymbolEntry | undefined;
  lookupAll: (name: string) => SymbolEntry[];
  hasSymbol: (name: string) => boolean;
  mergeSymbols: (incoming: Record<string, SymbolEntry[]>) => void;
};

const IndexContext = createContext<IndexContextValue | null>(null);

function entriesToMap(symbols: Record<string, SymbolEntry[]>): Map<string, SymbolEntry[]> {
  return new Map(Object.entries(symbols));
}

export function IndexProvider({ children }: { children: ReactNode }) {
  const [folderPath, setFolderPath] = useState<string | null>(null);
  const [symbolCount, setSymbolCount] = useState(0);
  const [symbols, setSymbols] = useState<Map<string, SymbolEntry[]>>(new Map());
  const [indexing, setIndexing] = useState(false);

  const loadIndex = useCallback(async (path: string) => {
    setIndexing(true);
    try {
      const data = await fetchProjectIndex(path);
      setFolderPath(data.folderPath);
      setSymbolCount(data.symbolCount);
      setSymbols(entriesToMap(data.symbols));
      return data;
    } finally {
      setIndexing(false);
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
      indexing,
      symbols,
      loadIndex,
      lookup,
      lookupAll,
      hasSymbol,
      mergeSymbols,
    }),
    [
      folderPath,
      symbolCount,
      indexing,
      symbols,
      loadIndex,
      lookup,
      lookupAll,
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
