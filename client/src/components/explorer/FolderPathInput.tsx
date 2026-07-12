import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { inputScrollFadeMaskClass, useInputScrollFade } from "@/hooks/useInputScrollFade";
import { INTERACTIVE_SURFACE } from "@/lib/controlTokens";
import { cn } from "@/lib/utils";

type FolderPathInputProps = {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  disabled?: boolean;
};

export function FolderPathInput({
  value,
  onChange,
  onEnter,
  disabled,
}: FolderPathInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fade = useInputScrollFade(inputRef, value);

  return (
    <div
      className={cn(
        INTERACTIVE_SURFACE,
        "relative min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-background",
        "focus-within:border-brand-border focus-within:bg-brand-surface",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        onScroll={fade.syncFade}
        placeholder="/absolute/path/to/project"
        disabled={disabled}
        title={value || undefined}
        aria-label="Project folder path"
        className={cn(
          "h-[var(--control-height-lg)] overflow-x-auto rounded-none border-0 bg-transparent px-2.5 shadow-none [scrollbar-width:none]",
          "font-mono text-[length:var(--font-size-xs)] focus-visible:ring-0",
          inputScrollFadeMaskClass(fade),
        )}
      />
    </div>
  );
}
