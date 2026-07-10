export type Theme = "light" | "dark";

const STORAGE_KEY = "codegrapher:theme";

export function getStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    // localStorage unavailable — fall through to default
  }
  return "dark";
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // best effort
  }
}

export function applyStoredTheme(): void {
  applyTheme(getStoredTheme());
}
