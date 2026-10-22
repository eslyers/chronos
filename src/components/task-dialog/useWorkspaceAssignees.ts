"use client";

import { useEffect, useState } from "react";
import { createSPAClient } from "@/lib/supabase/client";

export type WorkspaceAssignee = { id: string; email: string; full_name: string | null };

/**
 * Membros do workspace do projeto (opções de responsável) e o id do workspace
 * (usado no convite). Recarrega a cada abertura do diálogo ou troca de projeto.
 */
export function useWorkspaceAssignees(open: boolean, projectId: string | undefined) {
  const [assignees, setAssignees] = useState<WorkspaceAssignee[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !projectId) return;
    const memberProjectId = projectId;

    let isMounted = true;
    async function loadMembers() {
      try {
        const supabase = createSPAClient();
        const { data: proj } = await supabase
          .from("projects")
          .select("workspace_id")
          .eq("id", memberProjectId)
          .maybeSingle();

        const projData = proj as { workspace_id: string } | null;
        const fetchedWsId = projData?.workspace_id;
        if (!isMounted) return;
        setWorkspaceId(fetchedWsId ?? null);
        if (!fetchedWsId) {
          setAssignees([]);
          return;
        }

        const { data: members } = await supabase
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", fetchedWsId);

        const userIds = ((members as { user_id: string }[] | null) ?? []).map((m) => m.user_id);
        if (!userIds.length) {
          if (isMounted) setAssignees([]);
          return;
        }

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", userIds)
          .order("email");

        if (isMounted) {
          setAssignees((profiles as WorkspaceAssignee[] | null) ?? []);
        }
      } catch (err) {
        console.error("[TaskDialog] error loading assignees:", err);
        if (isMounted) setAssignees([]);
      }
    }

    loadMembers();
    return () => {
      isMounted = false;
    };
  }, [open, projectId]);

  return { assignees, workspaceId };
}
