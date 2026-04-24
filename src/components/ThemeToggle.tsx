"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "fabcollab_theme_v1";

type Theme = "light" | "dark";

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
    const system: Theme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const initial = stored ?? system;
    apply(initial);
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    apply(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  if (!theme) {
    return (
      <button
        type="button"
        aria-label="Theme"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-ocean/15 bg-white text-ocean"
      >
        ●
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-ocean/15 bg-white text-ocean transition hover:bg-ocean hover:text-white"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
