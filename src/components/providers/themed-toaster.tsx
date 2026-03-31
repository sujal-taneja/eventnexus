"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function ThemedToaster() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const read = (): "light" | "dark" =>
      document.documentElement.getAttribute("data-theme") === "light"
        ? "light"
        : "dark";
    const t = setTimeout(() => setTheme(read()), 0);
    const obs = new MutationObserver(() => setTheme(read()));
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      clearTimeout(t);
      obs.disconnect();
    };
  }, []);

  return (
    <Toaster
      theme={theme}
      position="top-right"
      offset={68}
      toastOptions={{
        className: "glass border-[var(--border-subtle)]",
        duration: 3500,
      }}
    />
  );
}
