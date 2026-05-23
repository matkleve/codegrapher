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
