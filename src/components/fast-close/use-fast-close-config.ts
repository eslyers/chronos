"use client";

import { useEffect, useState } from "react";
import {
  FASTCLOSE_GLOBAL_CONFIG_KEY,
  fastCloseConfigKey,
  parseFastCloseConfig,
  serializeFastCloseConfig,
} from "@/lib/fast-close";

/**
 * Configuração da régua do Fast Close (D0, alcance e offsets personalizados),
 * carregada/salva no localStorage por projeto (com fallback global).
 */
export function useFastCloseConfig(projectId: string) {
  const [offsetRange, setOffsetRange] = useState("D-5_D+5");
  const [customOffsets, setCustomOffsets] = useState<number[] | undefined>(undefined);
  const [useD0, setUseD0] = useState(true);

  // Carregar preferência salva do D0/offsets do localStorage para o projeto selecionado
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved =
      localStorage.getItem(fastCloseConfigKey(projectId)) || localStorage.getItem(FASTCLOSE_GLOBAL_CONFIG_KEY);
    if (saved) {
      try {
        const parsed = parseFastCloseConfig(saved);
        if (parsed.useD0 !== undefined) setUseD0(parsed.useD0);
        if (parsed.customOffsets !== undefined) setCustomOffsets(parsed.customOffsets);
        if (parsed.offsetRange !== undefined) setOffsetRange(parsed.offsetRange);
      } catch (err) {
        console.warn("Error parsing fastclose config:", err);
      }
    }
  }, [projectId]);

  // Função atômica para salvar a configuração inteira no localStorage
  const saveProjectConfig = (newUseD0: boolean, newCustomOffsets?: number[], newOffsetRange?: string) => {
    if (typeof window === "undefined") return;
    const payload = serializeFastCloseConfig({
      useD0: newUseD0,
      customOffsets: newCustomOffsets ?? customOffsets,
      offsetRange: newOffsetRange ?? offsetRange,
    });

    localStorage.setItem(fastCloseConfigKey(projectId), payload);
    localStorage.setItem(FASTCLOSE_GLOBAL_CONFIG_KEY, payload);
  };

  // Troca do alcance de Ds: descarta os offsets personalizados da tela
  const changeOffsetRange = (range: string) => {
    setOffsetRange(range);
    setCustomOffsets(undefined);
    saveProjectConfig(useD0, undefined, range);
  };

  // Salvamento atômico vindo do WorkdayConfigDialog
  const applyRulerConfig = (newUseD0: boolean, newOffsets: number[]) => {
    setUseD0(newUseD0);
    setCustomOffsets(newOffsets);
    saveProjectConfig(newUseD0, newOffsets, offsetRange);
  };

  return { useD0, customOffsets, offsetRange, changeOffsetRange, applyRulerConfig };
}
