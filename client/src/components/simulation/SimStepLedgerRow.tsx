import { ChevronDown, ChevronRight } from "lucide-react";
import type { SimStep } from "@/lib/staticWalk/types";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<SimStep["kind"], string> = {
  declaration: "declare",
  assignment: "assign",
  call: "call",
  return: "return",
  if: "if",
  await: "await",
  other: "other",
};

type SimStepLedgerRowProps = {
  index: number;
  step: SimStep;
  current: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
};

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-2">
      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

export function SimStepLedgerRow({
  index,
  step,
  current,
  expanded,
  onToggle,
  onSelect,
}: SimStepLedgerRowProps) {
  const { detail } = step;

  return (
    <div
      className={cn(
        "rounded border border-transparent",
        current && "border-brand-border bg-brand-surface",
      )}
    >
      <button
        type="button"
        className="hoverable flex w-full items-start gap-1.5 rounded px-1.5 py-1 text-left"
        onClick={onSelect}
      >
        <span
          className="mt-0.5 inline-flex shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          onKeyDown={(e) => e.stopPropagation()}
          role="button"
          tabIndex={-1}
        >
          {expanded ? (
            <ChevronDown className="size-3" aria-hidden />
          ) : (
            <ChevronRight className="size-3" aria-hidden />
          )}
        </span>
        <span className="w-5 shrink-0 font-mono text-2xs text-muted-foreground">{index + 1}</span>
        <span className="w-8 shrink-0 font-mono text-2xs text-muted-foreground">L{step.lineNumber}</span>
        <span className="w-10 shrink-0 font-mono text-2xs uppercase text-muted-foreground">
          {KIND_LABEL[step.kind]}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-2xs">{step.text.trim()}</span>
      </button>
      {expanded ? (
        <div className="border-t border-border px-2 pb-2 pt-1">
          <pre className="whitespace-pre-wrap font-mono text-2xs text-foreground">{step.text.trim()}</pre>
          {detail.reads.length > 0 ? (
            <DetailSection title="Reads">
              <ul className="space-y-0.5 font-mono text-2xs">
                {detail.reads.map((r) => (
                  <li key={r.name}>
                    {r.name} = <span className="text-muted-foreground">{r.value.display}</span>
                  </li>
                ))}
              </ul>
            </DetailSection>
          ) : null}
          {detail.writes.length > 0 ? (
            <DetailSection title="Writes">
              <ul className="space-y-0.5 font-mono text-2xs">
                {detail.writes.map((w) => (
                  <li key={w.name}>
                    {w.name}: {w.before.display} → {w.after.display}
                  </li>
                ))}
              </ul>
            </DetailSection>
          ) : null}
          {detail.calculated.length > 0 ? (
            <DetailSection title="Calculated">
              <ul className="space-y-0.5 font-mono text-2xs">
                {detail.calculated.map((c) => (
                  <li key={c.name}>
                    {c.name} ← {c.expression} ={" "}
                    <span className="text-muted-foreground">{c.result.display}</span>
                  </li>
                ))}
              </ul>
            </DetailSection>
          ) : null}
          {detail.flow ? (
            <DetailSection title="Flow">
              <p className="font-mono text-2xs text-muted-foreground">
                {detail.flow.kind}
                {detail.flow.targetLabel ? ` → ${detail.flow.targetLabel}` : ""}
              </p>
            </DetailSection>
          ) : null}
          {detail.notes.length > 0 ? (
            <DetailSection title="Notes">
              <ul className="space-y-0.5 text-2xs text-muted-foreground">
                {detail.notes.map((n) => (
                  <li key={n.code}>{n.message}</li>
                ))}
              </ul>
            </DetailSection>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
