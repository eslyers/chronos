"use client";

// ─────────────────────────────────────────────────────────────
// CHRONOS — Comentários e anexos de tarefas (Proposta 4)
// Supabase quando configurado; localStorage no modo demo.
// ─────────────────────────────────────────────────────────────
import { useCallback } from "react";
import { getDataLayer } from "@/lib/data/data-provider";
import { generateId } from "@/lib/data/demo-seed";
import type { NewTaskAttachment, TaskAttachment, TaskComment } from "@/lib/data/models";
import {
  ATTACHMENTS_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  attachmentTooLargeMessage,
  buildAttachmentPath,
} from "@/lib/data/attachments-storage";

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

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
        const rows = (data ?? []) as TaskAttachment[];

        // Arquivos no Storage: troca o caminho por um link assinado temporário
        const paths = rows.map((r) => r.storage_path).filter((p): p is string => !!p);
        if (paths.length === 0) return rows;
        const { data: signed, error: signError } = await supabase.storage
          .from(ATTACHMENTS_BUCKET)
          .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
        if (signError) console.error("[DataContext] createSignedUrls error:", signError);
        const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl] as const));
        return rows.map((r) => (r.storage_path ? { ...r, file_url: urlByPath.get(r.storage_path) ?? null } : r));
      } catch (err) {
        console.error("[DataContext] getTaskAttachments error:", err);
        return [];
      }
    }
    const raw = typeof window !== "undefined" ? localStorage.getItem(`chronos:attachments:${taskId}`) : null;
    return raw ? JSON.parse(raw) : [];
  }, []);

  const addTaskAttachment = useCallback(
    async (taskId: string, file: NewTaskAttachment): Promise<TaskAttachment> => {
      const tooLarge = attachmentTooLargeMessage(file.size);
      if (tooLarge) return reportError("Arquivo muito grande", new Error(tooLarge));

      if (getDataLayer() === "supabase") {
        const { createSPAClient } = await import("@/lib/supabase/client");
        const supabase = createSPAClient();
        const path = buildAttachmentPath(taskId, file.name, crypto.randomUUID());
        try {
          const { error: uploadError } = await supabase.storage
            .from(ATTACHMENTS_BUCKET)
            .upload(path, file.file, { contentType: file.type, upsert: false });
          if (uploadError) throw new Error(uploadError.message);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const client = supabase.from("task_attachments") as any;
          const { data, error } = await client
            .insert({
              task_id: taskId,
              user_id: userId || null,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type,
              storage_path: path,
            })
            .select()
            .single();
          if (error) {
            // Sem o registro, o arquivo ficaria órfão no bucket
            await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
            throw new Error(error.message);
          }
          return data as TaskAttachment;
        } catch (err) {
          return reportError("Não foi possível anexar o arquivo", err);
        }
      }

      // Modo demo: guarda como data URL no localStorage
      const attachmentObj: TaskAttachment = {
        id: generateId("attach"),
        task_id: taskId,
        user_id: userId || null,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        file_url: await blobToDataUrl(file.file),
        uploaded_at: new Date().toISOString(),
      };
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
        // Apaga o registro primeiro (a RLS decide se pode); depois o arquivo
        const { data, error } = await client.delete().eq("id", attachmentId).select("storage_path");
        if (error) throw new Error(error.message);
        const removed = (data ?? []) as { storage_path: string | null }[];
        if (removed.length === 0) throw new Error("Anexo não encontrado ou sem permissão para excluir");
        const paths = removed.map((r) => r.storage_path).filter((p): p is string => !!p);
        if (paths.length > 0) {
          const { error: removeError } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove(paths);
          if (removeError) console.error("[DataContext] arquivo do anexo não removido do Storage:", removeError);
        }
      } catch (err) {
        reportError("Não foi possível excluir o anexo", err);
      }
      return;
    }

    // Modo demo: remove de qualquer tarefa onde estiver
    if (typeof window === "undefined") return;
    for (const key of Object.keys(window.localStorage)) {
      if (!key.startsWith("chronos:attachments:")) continue;
      const list = JSON.parse(window.localStorage.getItem(key) ?? "[]") as TaskAttachment[];
      const next = list.filter((a) => a.id !== attachmentId);
      if (next.length !== list.length) window.localStorage.setItem(key, JSON.stringify(next));
    }
  }, [reportError]);

  return { getTaskComments, addTaskComment, deleteTaskComment, getTaskAttachments, addTaskAttachment, deleteTaskAttachment };
}
