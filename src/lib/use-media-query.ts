"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Observa uma media query (ex.: "(max-width: 639px)").
 * SSR-safe: no servidor e na hidratação devolve `serverDefault`, e o React
 * re-renderiza com o valor real do navegador logo em seguida.
 */
export function useMediaQuery(query: string, serverDefault = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : serverDefault),
    () => serverDefault
  );
}
