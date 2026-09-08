"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function FieldOpsThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-border bg-card px-3 text-muted-foreground"
        aria-label="Theme"
      >
        <Moon className="h-4 w-4" />
      </button>
    );
  }

  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-muted-foreground transition hover:bg-sidebar-hover hover:text-foreground"
      aria-label={isLight ? "Switch to night theme" : "Switch to day theme"}
      title={isLight ? "Night theme" : "Day theme"}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="hidden sm:inline">{isLight ? "Night" : "Day"}</span>
    </button>
  );
}
