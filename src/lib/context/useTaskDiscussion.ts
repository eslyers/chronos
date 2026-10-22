"use client";

// ─────────────────────────────────────────────────────────────
// CHRONOS — Comentários e anexos de tarefas (Proposta 4)
// Supabase quando configurado; localStorage no modo demo.
// ─────────────────────────────────────────────────────────────
import { useCallback } from "react";
import { getDataLayer } from "@/lib/data/data-provider";
import { generateId } from "@/lib/data/demo-seed";
import type { TaskAttachment, TaskComment } from "@/lib/data/models";

export function useTaskDiscussion(
  userId: string,
  reportError: (title: string, err: unknown) => never
) {
  const getTaskComments = useCallback(async (taskId: string): Promise<TaskComment[]> => {
    if (getDataLayer() === "supabase") {
      try {
        const { createSPAClient } = await import("@/lib/supabase/client");
        const supabase = createSPAClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = supabase.from("task_comments") as any;
        const { data, error } = await client
          .select("*")
          .eq("task_id", taskId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return (data ?? []) as TaskComment[];
      } catch (err) {
        console.error("[DataContext] getTaskComments error:", err);
        return [];
      }
    }
    const raw = typeof window !== "undefined" ? localStorage.getItem(`chronos:comments:${taskId}`) : null;
    return raw ? JSON.parse(raw) : [];
  }, []);

  const addTaskComment = useCallback(
    async (taskId: string, content: string, userName?: string): Promise<TaskComment> => {
      const now = new Date().toISOString();
      const commentObj: TaskComment = {
        id: generateId("comment"),
        task_id: taskId,
        user_id: userId || null,
        user_name: userName || "Usuário",
        content,
        created_at: now,
      };

      if (getDataLayer() === "supabase") {
        try {
          const { createSPAClient } = await import("@/lib/supabase/client");
          const supabase = createSPAClient();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const client = supabase.from("task_comments") as any;
          const { data, error } = await client
            .insert({
              task_id: taskId,
              user_id: userId || null,
              user_name: userName || "Usuário",
              content,
            })
            .select()
            .single();
          if (error) throw new Error(error.message);
          return data as TaskComment;
        } catch (err) {
          return reportError("Não foi possível publicar o comentário", err);
        }
      }

      const current = await getTaskComments(taskId);
      const updated = [...current, commentObj];
      if (typeof window !== "undefined") {
        localStorage.setItem(`chronos:comments:${taskId}`, JSON.stringify(updated));
      }
      return commentObj;
    },
    [userId, getTaskComments, reportError]
  );

  const deleteTaskComment = useCallback(async (commentId: string) => {
    if (getDataLayer() === "supabase") {
      try {
        const { createSPAClient } = await import("@/lib/supabase/client");
        const supabase = createSPAClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = supabase.from("task_comments") as any;
        const { error } = await client.delete().eq("id", commentId);
        if (error) throw new Error(error.message);
      } catch (err) {
        reportError("Não foi possível excluir o comentário", err);
      }
    }
  }, [reportError]);

  const getTaskAttachments = useCallback(async (taskId: string): Promise<TaskAttachment[]> => {
    if (getDataLayer() === "supabase") {
      try {
        const { createSPAClient } = await import("@/lib/supabase/client");
        const supabase = createSPAClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = supabase.from("task_attachments") as any;
        const { data, error } = await client
          .select("*")
          .eq("task_id", taskId)
          .order("uploaded_at", { ascending: false });
        if (error) throw error;
        return (data ?? []) as TaskAttachment[];
      } catch (err) {
        console.error("[DataContext] getTaskAttachments error:", err);
        return [];
      }
    }
    const raw = typeof window !== "undefined" ? localStorage.getItem(`chronos:attachments:${taskId}`) : null;
    return raw ? JSON.parse(raw) : [];
  }, []);

  const addTaskAttachment = useCallback(
    async (
      taskId: string,
      file: { name: string; size: number; type: string; url: string }
    ): Promise<TaskAttachment> => {
      const now = new Date().toISOString();
      const attachmentObj: TaskAttachment = {
        id: generateId("attach"),
        task_id: taskId,
        user_id: userId || null,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        file_url: file.url,
        uploaded_at: now,
      };

      if (getDataLayer() === "supabase") {
        try {
          const { createSPAClient } = await import("@/lib/supabase/client");
          const supabase = createSPAClient();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const client = supabase.from("task_attachments") as any;
          const { data, error } = await client
            .insert({
              task_id: taskId,
              user_id: userId || null,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              file_url: file.url,
            })
            .select()
            .single();
          if (error) throw new Error(error.message);
          return data as TaskAttachment;
        } catch (err) {
          return reportError("Não foi possível anexar o arquivo", err);
        }
      }

      const current = await getTaskAttachments(taskId);
      const updated = [attachmentObj, ...current];
      if (typeof window !== "undefined") {
        localStorage.setItem(`chronos:attachments:${taskId}`, JSON.stringify(updated));
      }
      return attachmentObj;
    },
    [userId, getTaskAttachments, reportError]
  );

  const deleteTaskAttachment = useCallback(async (attachmentId: string) => {
    if (getDataLayer() === "supabase") {
      try {
        const { createSPAClient } = await import("@/lib/supabase/client");
        const supabase = createSPAClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = supabase.from("task_attachments") as any;
        const { error } = await client.delete().eq("id", attachmentId);
        if (error) throw new Error(error.message);
      } catch (err) {
        reportError("Não foi possível excluir o anexo", err);
      }
    }
  }, [reportError]);

  return { getTaskComments, addTaskComment, deleteTaskComment, getTaskAttachments, addTaskAttachment, deleteTaskAttachment };
}
