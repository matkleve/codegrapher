/** Resolved theme colors for Cytoscape (reads shadcn CSS variables). */
export interface GraphThemeColors {
  background: string;
  foreground: string;
  primary: string;
  muted: string;
  border: string;
  card: string;
  accent: string;
  ring: string;
  mutedForeground: string;
  popover: string;
  destructive: string;
}

function readCssVar(variable: string, property: "backgroundColor" | "color" = "backgroundColor"): string {
  const probe = document.createElement("div");
  probe.className = "pointer-events-none fixed opacity-0";
  probe.style.setProperty(property, `var(${variable})`);
  document.documentElement.appendChild(probe);
  const value = getComputedStyle(probe)[property];
  document.documentElement.removeChild(probe);
  return value || "transparent";
}

/** Read computed spacing from a Tailwind utility class (e.g. p-5, gap-2). */
export function readTailwindSpacing(className: string): number {
  const probe = document.createElement("div");
  probe.className = className;
  document.documentElement.appendChild(probe);
  const style = getComputedStyle(probe);
  const value =
    parseFloat(style.paddingTop) ||
    parseFloat(style.gap) ||
    parseFloat(style.rowGap) ||
    0;
  document.documentElement.removeChild(probe);
  return value;
}

export function readTailwindMinSize(
  className: string,
  property: "minWidth" | "minHeight" = "minWidth",
): number {
  const probe = document.createElement("div");
  probe.className = className;
  document.documentElement.appendChild(probe);
  const value = parseFloat(getComputedStyle(probe)[property]) || 0;
  document.documentElement.removeChild(probe);
  return value;
}

export function getGraphTheme(): GraphThemeColors {
  return {
    background: readCssVar("--background"),
    foreground: readCssVar("--foreground", "color"),
    primary: readCssVar("--primary"),
    muted: readCssVar("--muted"),
    border: readCssVar("--border"),
    card: readCssVar("--card"),
    accent: readCssVar("--accent"),
    ring: readCssVar("--ring"),
    mutedForeground: readCssVar("--muted-foreground", "color"),
    popover: readCssVar("--popover"),
    destructive: readCssVar("--destructive"),
  };
}
