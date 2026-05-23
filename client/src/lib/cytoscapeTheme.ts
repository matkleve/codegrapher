function readCssColor(variable: string): string {
  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.backgroundColor = `var(${variable})`;
  document.documentElement.appendChild(probe);
  const color = getComputedStyle(probe).backgroundColor;
  document.documentElement.removeChild(probe);
  return color || "#333";
}

export interface GraphThemeColors {
  card: string;
  border: string;
  foreground: string;
  primary: string;
  muted: string;
  ring: string;
  background: string;
  mutedForeground: string;
  popover: string;
  destructive: string;
}

export function getGraphTheme(): GraphThemeColors {
  return {
    card: readCssColor("--card"),
    border: readCssColor("--border"),
    foreground: readCssColor("--foreground"),
    primary: readCssColor("--primary"),
    muted: readCssColor("--muted"),
    ring: readCssColor("--ring"),
    background: readCssColor("--background"),
    mutedForeground: readCssColor("--muted-foreground"),
    popover: readCssColor("--popover"),
    destructive: readCssColor("--destructive"),
  };
}
