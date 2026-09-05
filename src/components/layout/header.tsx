"use client";

import Link from "next/link";
import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore, type ReactElement } from "react";
import { useTheme } from "next-themes";
import { IconButton } from "@/components/primitives/icon-button";

type ThemeName = "light" | "dark" | "system";

const order: Record<ThemeName, ThemeName> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const labels: Record<ThemeName, string> = {
  light: "claro",
  dark: "oscuro",
  system: "según el sistema",
};

const icons: Record<ThemeName, ReactElement> = {
  light: <Sun aria-hidden="true" className="h-5 w-5" />,
  dark: <Moon aria-hidden="true" className="h-5 w-5" />,
  system: <Monitor aria-hidden="true" className="h-5 w-5" />,
};

const emptySubscribe = () => () => {};

/** true en el cliente tras hidratar, false en el prerender (sin `setState`). */
function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const current: ThemeName =
    mounted && (theme === "light" || theme === "dark" || theme === "system") ? theme : "system";

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-chrome/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-subheading font-semibold text-text">
          Tolva
        </Link>
        <IconButton
          aria-label={`Cambiar tema (actual: ${labels[current]})`}
          icon={icons[current]}
          onClick={() => setTheme(order[current])}
        />
      </div>
    </header>
  );
}
