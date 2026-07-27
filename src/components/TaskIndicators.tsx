"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare, Paperclip } from "lucide-react";
import { useData } from "@/lib/context/DataContext";

export function TaskIndicators({ taskId }: { taskId: string }) {
  const { getTaskComments, getTaskAttachments } = useData();
  const [commentCount, setCommentCount] = useState(0);
  const [attachCount, setAttachCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadCounts() {
      try {
        const [comments, attachments] = await Promise.all([
          getTaskComments(taskId),
          getTaskAttachments(taskId),
        ]);
        if (active) {
          setCommentCount(comments.length);
          setAttachCount(attachments.length);
        }
      } catch (err) {
        console.error("Error loading task counts:", err);
      }
    }
    loadCounts();
    return () => {
      active = false;
    };
  }, [taskId, getTaskComments, getTaskAttachments]);

  if (commentCount === 0 && attachCount === 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 shrink-0">
      {commentCount > 0 && (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 rounded-md shadow-xs"
          title={`${commentCount} comentário(s)`}
        >
          <MessageSquare className="h-3 w-3 text-blue-500" />
          {commentCount}
        </span>
      )}
      {attachCount > 0 && (
        <span
          className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded-md shadow-xs"
          title={`${attachCount} anexo(s)`}
        >
          <Paperclip className="h-3 w-3 text-purple-500" />
          {attachCount}
        </span>
      )}
    </div>
  );
}
