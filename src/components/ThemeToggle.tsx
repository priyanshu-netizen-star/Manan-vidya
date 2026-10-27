"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "system" | "light" | "dark";
const KEY = "mv-theme";
const ORDER: Theme[] = ["system", "light", "dark"];
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function write(t: Theme) {
  try {
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    /* storage unavailable: the choice still applies to this page */
  }
  if (t === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  listeners.forEach((l) => l());
}

/** Cycles light → dark → system. The choice is a per-browser convenience kept in localStorage. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    read,
    () => "system" as Theme,
  );
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm !px-2"
      onClick={() => write(next)}
      aria-label={`Theme: ${theme}. Switch to ${next}`}
      title={`Theme: ${theme} (click for ${next})`}
    >
      <Icon className="w-4 h-4" aria-hidden />
    </button>
  );
}
