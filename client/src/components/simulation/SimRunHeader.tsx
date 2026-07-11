import type { SimSession } from "@/lib/staticWalk/types";

type SimRunHeaderProps = {
  session: SimSession;
};

export function SimRunHeader({ session }: SimRunHeaderProps) {
  const inputEntries = Object.entries(session.inputs).filter(([, v]) => v !== "");
  const initialScope = session.steps[0]?.scopeSnapshot;

  return (
    <section className="shrink-0 rounded-md border border-border bg-muted/30 px-2 py-1.5">
      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Start</p>
      {inputEntries.length > 0 ? (
        <p className="mt-1 font-mono text-2xs text-foreground">
          {inputEntries.map(([k, v]) => `${k}=${v}`).join(" · ")}
        </p>
      ) : (
        <p className="mt-1 text-2xs text-muted-foreground">No input parameters</p>
      )}
      {initialScope && initialScope.size > 0 ? (
        <ul className="mt-1 space-y-0.5 font-mono text-2xs text-muted-foreground">
          {[...initialScope.entries()].slice(0, 8).map(([name, val]) => (
            <li key={name}>
              {name} = {val.display}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
