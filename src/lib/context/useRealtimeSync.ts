"use client";

// ─────────────────────────────────────────────────────────────
// CHRONOS — Sincronização em tempo real (Supabase Realtime)
// Assina as mudanças de projetos, etapas, tarefas e dependências. A RLS vale
// também para o Realtime: o usuário só recebe o que pode ler. Se a conexão
// cair e voltar, recarrega os dados para não perder eventos do intervalo.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import { createSPAClient } from "@/lib/supabase/client";
import { REALTIME_TABLES, type RealtimeChange, type RealtimeEventType, type RealtimeTable } from "@/lib/data/realtime-apply";

type Options = {
  enabled: boolean;
  onChange: (change: RealtimeChange) => void;
  /** Chamado ao reconectar depois de uma queda. */
  onReconnect: () => void;
};

export function useRealtimeSync({ enabled, onChange, onReconnect }: Options) {
  // Refs: o canal não precisa ser recriado quando os callbacks mudam
  const onChangeRef = useRef(onChange);
  const onReconnectRef = useRef(onReconnect);
  useEffect(() => {
    onChangeRef.current = onChange;
    onReconnectRef.current = onReconnect;
  }, [onChange, onReconnect]);

  useEffect(() => {
    if (!enabled) return;
    const supabase = createSPAClient();
    let wasSubscribed = false;
    let dropped = false;

    let channel = supabase.channel("chronos-data");
    for (const table of REALTIME_TABLES) {
      channel = channel.on(
        // O tipo do overload de postgres_changes não é inferido pelo laço
        "postgres_changes" as never,
        { event: "*", schema: "public", table } as never,
        ((payload: { eventType: RealtimeEventType; new: Record<string, unknown>; old: Record<string, unknown> }) => {
          onChangeRef.current({
            table: table as RealtimeTable,
            eventType: payload.eventType,
            new: payload.eventType === "DELETE" ? null : payload.new,
            old: payload.eventType === "INSERT" ? null : payload.old,
          });
        }) as never
      );
    }

    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") {
        if (wasSubscribed && dropped) onReconnectRef.current();
        wasSubscribed = true;
        dropped = false;
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        dropped = true;
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled]);
}
