"use client";

import { useCallback, useEffect, useState } from "react";
import { useData, type TaskComment, type TaskAttachment } from "@/lib/context/DataContext";
import type { TaskDialogTab } from "./TaskDialogTabs";

/** Aba ativa + comentários e anexos da tarefa em edição (limpos ao fechar). */
export function useTaskActivity(open: boolean, taskId: string | undefined) {
  const { getTaskComments, getTaskAttachments } = useData();

  const [activeTab, setActiveTab] = useState<TaskDialogTab>("details");
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  // Carregar comentários e anexos
  const refreshComments = useCallback(async () => {
    if (taskId) {
      const data = await getTaskComments(taskId);
      setComments(data);
    }
  }, [taskId, getTaskComments]);

  const refreshAttachments = useCallback(async () => {
    if (taskId) {
      const data = await getTaskAttachments(taskId);
      setAttachments(data);
    }
  }, [taskId, getTaskAttachments]);

  useEffect(() => {
    if (open && taskId) {
      refreshComments();
      refreshAttachments();
    } else {
      setActiveTab("details");
      setComments([]);
      setAttachments([]);
    }
  }, [open, taskId, refreshComments, refreshAttachments]);

  return { activeTab, setActiveTab, comments, attachments, refreshComments, refreshAttachments };
}
