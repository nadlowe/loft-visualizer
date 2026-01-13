import { useEffect } from "react";
import { useShortcuts } from "./useShortcuts";

export function useKeyboardShortcuts() {
  const shortcuts = useShortcuts();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const shortcut = shortcuts.find((s) => s.match(e));
      if (shortcut) {
        shortcut.action(e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts]);
}
