import { useEffect, useMemo } from "react";
import { Code2 } from "lucide-react";
import { createPortal } from "react-dom";
import { VscodeFileIcon } from "@/components/VscodeFileIcon";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/button";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { openFileInEditor } from "@/api";
import { TOKEN_PILL } from "@/lib/tokenColors";
import { cn } from "@/lib/utils";

export function TokenReferencesDropdown() {
  const {
    tokenDropdown,
    setTokenDropdown,
    findReferences,
    focusFlowNode,
    onLoadFile,
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
    () => references.filter((r) => r.inGraph && r.flowNodeId),
    [references],
  );

  const indexRefs = useMemo(
    () => references.filter((r) => !r.inGraph),
    [references],
  );

  if (!tokenDropdown) return null;

  const { token, x, y, filePath, line } = tokenDropdown;

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
              <li key={`graph-${ref.filePath}-${ref.line}-${idx}`}>
                <button
                  type="button"
                  className={cn(
                    "hoverable flex w-full items-center gap-2 rounded-sm border border-transparent px-2 py-1.5 text-left text-xs",
                    TOKEN_PILL[ref.kind],
                  )}
                  onClick={() => focusFlowNode(ref.flowNodeId!)}
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
        ) : null}
        {indexRefs.length > 0 ? (
          <ul
            className={cn(
              "flex max-h-56 flex-col gap-0.5 overflow-y-auto",
              graphRefs.length > 0 && "mt-2 border-t border-border pt-2",
            )}
          >
            {indexRefs.map((ref, idx) => (
              <li key={`idx-${ref.filePath}-${ref.line}-${idx}`}>
                <button
                  type="button"
                  className={cn(
                    "hoverable flex w-full items-center gap-2 rounded-sm border border-transparent px-2 py-1.5 text-left text-xs",
                    TOKEN_PILL[ref.kind],
                  )}
                  onClick={() => {
                    void onLoadFile(ref.filePath);
                    setTokenDropdown(null);
                  }}
                >
                  <VscodeFileIcon icon="file-type-typescript-official" size={14} />
                  <span className="min-w-0 truncate">
                    {ref.classLabel}{" "}
                    <span className="text-muted-foreground">(line {ref.line})</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            onClick={() => {
              void onLoadFile(filePath);
              setTokenDropdown(null);
            }}
          >
            + Load file into graph
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            onClick={() => {
              void openFileInEditor(filePath, line);
              setTokenDropdown(null);
            }}
          >
            <Code2 className="size-3.5 shrink-0" aria-hidden />
            Open in VS Code
          </Button>
        </div>
      </Container>
    </div>,
    document.body,
  );
}
