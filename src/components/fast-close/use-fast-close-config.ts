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
    try {
      const saved =
        localStorage.getItem(fastCloseConfigKey(projectId)) || localStorage.getItem(FASTCLOSE_GLOBAL_CONFIG_KEY);
      if (!saved) return;
      const parsed = parseFastCloseConfig(saved);
      if (parsed.useD0 !== undefined) setUseD0(parsed.useD0);
      if (parsed.customOffsets !== undefined) setCustomOffsets(parsed.customOffsets);
      if (parsed.offsetRange !== undefined) setOffsetRange(parsed.offsetRange);
    } catch (err) {
      // localStorage indisponível ou JSON inválido: mantém os padrões
      console.warn("Error loading fastclose config:", err);
    }
  }, [projectId]);

  // Salva a configuração inteira (explícita: `undefined` em customOffsets
  // significa "sem offsets personalizados", não "manter os atuais")
  const saveProjectConfig = (config: { useD0: boolean; customOffsets: number[] | undefined; offsetRange: string }) => {
    if (typeof window === "undefined") return;
    try {
      const payload = serializeFastCloseConfig(config);
      localStorage.setItem(fastCloseConfigKey(projectId), payload);
      localStorage.setItem(FASTCLOSE_GLOBAL_CONFIG_KEY, payload);
    } catch (err) {
      console.warn("Error saving fastclose config:", err);
    }
  };

  // Troca do alcance de Ds: descarta os offsets personalizados (na tela e no
  // armazenamento — antes eles voltavam ao recarregar a página)
  const changeOffsetRange = (range: string) => {
    setOffsetRange(range);
    setCustomOffsets(undefined);
    saveProjectConfig({ useD0, customOffsets: undefined, offsetRange: range });
  };

  // Salvamento atômico vindo do WorkdayConfigDialog
  const applyRulerConfig = (newUseD0: boolean, newOffsets: number[]) => {
    setUseD0(newUseD0);
    setCustomOffsets(newOffsets);
    saveProjectConfig({ useD0: newUseD0, customOffsets: newOffsets, offsetRange });
  };

  return { useD0, customOffsets, offsetRange, changeOffsetRange, applyRulerConfig };
}
