"use client";

import { useEffect, useState } from "react";

// Preview de impressão: nó próprio no body (o CSS de impressão isola
// #gantt-print-root via body.gantt-print-mode), removido ao fechar
export function usePrintRoot(open: boolean): HTMLElement | null {
  const [printRoot, setPrintRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const root = document.createElement("div");
    root.id = "gantt-print-root";
    document.body.appendChild(root);
    document.body.classList.add("gantt-print-mode");
    setPrintRoot(root);
    return () => {
      document.body.classList.remove("gantt-print-mode");
      root.remove();
      setPrintRoot(null);
    };
  }, [open]);

  return printRoot;
}
