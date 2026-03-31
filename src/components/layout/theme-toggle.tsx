"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  // Start with "dark" so server + first client render match (no hydration mismatch),
  // then flip to the stored preference in useEffect.
  const [light, setLight] = useState(false);

  useEffect(() => {
    const fromDom =
      document.documentElement.getAttribute("data-theme") === "light" ||
      localStorage.getItem("theme") === "light";
    document.documentElement.setAttribute("data-theme", fromDom ? "light" : "dark");
    // Defer state update to avoid cascading renders warnings.
    const t = setTimeout(() => setLight(fromDom), 0);
    return () => clearTimeout(t);
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    const mode = next ? "light" : "dark";
    localStorage.setItem("theme", mode);
    document.documentElement.setAttribute("data-theme", mode);
    window.dispatchEvent(new Event("theme-change"));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="p-1.5 rounded-md border border-transparent bg-transparent text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-subtle)] transition-colors"
      title={light ? "Dark mode" : "Light mode"}
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
    >
      {light ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
    </button>
  );
}
