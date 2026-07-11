import type { SimSession } from "@/lib/staticWalk/types";

type SimRunFooterProps = {
  session: SimSession;
  visible: boolean;
};

export function SimRunFooter({ session, visible }: SimRunFooterProps) {
  if (!visible) return null;

  const last = session.steps[session.steps.length - 1];
  const scope = last?.scopeSnapshot;

  return (
    <section className="shrink-0 rounded-md border border-brand-border bg-brand-surface/40 px-2 py-1.5">
      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Result</p>
      {last?.kind === "return" ? (
        <p className="mt-1 font-mono text-2xs text-foreground">{last.text.trim()}</p>
      ) : null}
      {scope && scope.size > 0 ? (
        <ul className="mt-1 space-y-0.5 font-mono text-2xs text-muted-foreground">
          {[...scope.entries()].slice(0, 8).map(([name, val]) => (
            <li key={name}>
              {name} = {val.display}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-2xs text-muted-foreground">End of trace</p>
      )}
    </section>
  );
}
