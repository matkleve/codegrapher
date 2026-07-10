import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      title={label}
      aria-label={label}
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
