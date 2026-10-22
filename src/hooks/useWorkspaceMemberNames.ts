"use client";

import { useEffect, useMemo, useState } from "react";
import { useGlobal } from "@/lib/context/GlobalContext";
import { getDataLayer } from "@/lib/data/data-provider";
import { getCurrentWorkspaceId } from "@/lib/data/supabase-data";
import { createSPAClient } from "@/lib/supabase/client";
import { userDisplayName } from "@/lib/display-name";
import type { MemberNames } from "@/lib/workload";

/**
 * Mapa user_id → nome dos membros do workspace atual (profiles.full_name,
 * senão prefixo do e-mail). Tarefas de membros guardam só o assignee_id,
 * então a carga de trabalho precisa deste mapa para exibir os nomes.
 * No modo demo (sem Supabase) traz apenas o usuário logado.
 */
export function useWorkspaceMemberNames(enabled = true): MemberNames {
  const { user } = useGlobal();
  const [fetched, setFetched] = useState<MemberNames>({});
  const userId = user?.id;

  useEffect(() => {
    if (!enabled || !userId || getDataLayer() !== "supabase") return;
    let cancelled = false;

    (async () => {
      try {
        const wsId = await getCurrentWorkspaceId();
        if (!wsId || cancelled) return;

        const supabase = createSPAClient();
        const { data: rows, error } = await supabase
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", wsId);
        if (error) throw error;

        const ids = ((rows ?? []) as { user_id: string | null }[])
          .map((r) => r.user_id)
          .filter((id): id is string => !!id);
        if (ids.length === 0 || cancelled) return;

        const { data: profiles, error: profErr } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        if (profErr) throw profErr;

        const names: MemberNames = {};
        for (const p of (profiles ?? []) as { id: string; full_name: string | null; email: string | null }[]) {
          const name = userDisplayName(p.full_name, p.email, "");
          if (name) names[p.id] = name;
        }
        if (!cancelled) setFetched(names);
      } catch (err) {
        // Sem os nomes a tela continua funcional (rótulo genérico por membro)
        console.warn("[workload] Falha ao carregar nomes dos membros:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  return useMemo(() => {
    // O usuário logado vem do contexto (já reflete edições do próprio perfil)
    if (!user) return fetched;
    return { ...fetched, [user.id]: userDisplayName(user.name, user.email) };
  }, [user, fetched]);
}
