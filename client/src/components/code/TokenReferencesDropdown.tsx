import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { VscodeFileIcon } from "@/components/VscodeFileIcon";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/button";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { openFileInEditor } from "@/api";
import { countExternalOccurrences } from "@/lib/symbolIndex";
import { TOKEN_PILL } from "@/lib/tokenColors";
import { fileDisplayName } from "@/lib/recentFiles";
import { cn } from "@/lib/utils";

export function TokenReferencesDropdown() {
  const {
    tokenDropdown,
    setTokenDropdown,
    findReferences,
    focusFlowNode,
    onLoadFile,
    graphData,
  } = useGraphInteraction();

  useEffect(() => {
    if (!tokenDropdown) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTokenDropdown(null);
    };
    const onPointer = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-token-dropdown]")) return;
      setTokenDropdown(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [setTokenDropdown, tokenDropdown]);

  const references = useMemo(
    () => (tokenDropdown ? findReferences(tokenDropdown.token) : []),
    [findReferences, tokenDropdown],
  );

  const graphRefs = useMemo(
    () => references.filter((r) => r.inGraph),
    [references],
  );

  if (!tokenDropdown) return null;

  const { token, x, y, filePath, line } = tokenDropdown;
  const externalCount = countExternalOccurrences(token, filePath, graphData);
  const fileName = fileDisplayName(filePath);

  return createPortal(
    <div
      data-token-dropdown
      className="pointer-events-auto fixed z-50 min-w-48 shadow-lg"
      style={{ left: x, top: y }}
    >
      <Container className="p-2">
        <p className="mb-2 font-mono text-xs font-medium text-foreground">{token}</p>
        {graphRefs.length > 0 ? (
          <ul className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
            {graphRefs.map((ref, idx) => (
              <li key={`${ref.graphNodeId}-${ref.line}-${idx}`}>
                <button
                  type="button"
                  className={cn(
                    "hoverable flex w-full items-center gap-2 rounded-sm border border-transparent px-2 py-1.5 text-left text-xs",
                    TOKEN_PILL[ref.kind],
                  )}
                  onClick={() => focusFlowNode(ref.flowNodeId)}
                >
                  <VscodeFileIcon icon="file-type-typescript-official" size={14} />
                  <span className="min-w-0 truncate">
                    {ref.memberLabel
                      ? `${ref.classLabel} → ${ref.memberLabel}`
                      : ref.classLabel}{" "}
                    <span className="text-muted-foreground">(line {ref.line})</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              Found {externalCount || references.length || 0} time(s) in {fileName}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => {
                onLoadFile(filePath);
                setTokenDropdown(null);
              }}
            >
              + Load file into graph
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => {
                void openFileInEditor(filePath, line);
                setTokenDropdown(null);
              }}
            >
              Edit in source
            </Button>
          </div>
        )}
      </Container>
    </div>,
    document.body,
  );
}
