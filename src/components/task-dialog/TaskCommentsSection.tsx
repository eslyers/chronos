"use client";

import React, { useState } from "react";
import { MessageSquare, Trash2, Loader2, Plus } from "lucide-react";
import type { TaskComment } from "@/lib/context/DataContext";

interface TaskCommentsSectionProps {
  taskId: string;
  comments: TaskComment[];
  onRefresh: () => Promise<void>;
  addTaskComment: (taskId: string, content: string, userName?: string) => Promise<TaskComment>;
  deleteTaskComment: (commentId: string) => Promise<void>;
}

export function TaskCommentsSection({
  taskId,
  comments,
  onRefresh,
  addTaskComment,
  deleteTaskComment,
}: TaskCommentsSectionProps) {
  const [newCommentText, setNewCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !taskId) return;
    setPostingComment(true);
    try {
      await addTaskComment(taskId, newCommentText.trim());
      setNewCommentText("");
      await onRefresh();
    } catch (err) {
      console.error("[TaskCommentsSection] error adding comment:", err);
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    setDeletingCommentId(id);
    try {
      await deleteTaskComment(id);
      await onRefresh();
    } catch (err) {
      console.error("[TaskCommentsSection] error deleting comment:", err);
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <div className="p-6 space-y-5 overflow-y-auto flex-1 flex flex-col justify-between">
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          Discussão Interna ({comments.length})
        </h3>

        {comments.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed rounded-2xl bg-muted/10 space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">
              Nenhum comentário registrado nesta tarefa.
            </p>
            <p className="text-xs text-muted-foreground">
              Seja o primeiro a deixar uma nota, instrução ou atualização.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {comments.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1.5 shadow-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/20 text-blue-600 text-[10px]">
                      {c.user_name ? c.user_name.charAt(0).toUpperCase() : "U"}
                    </span>
                    {c.user_name || "Usuário"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(c.created_at).toLocaleString("pt-BR")}
                    </span>
                    <button
                      type="button"
                      disabled={deletingCommentId === c.id}
                      onClick={() => handleDeleteComment(c.id)}
                      className="text-muted-foreground hover:text-rose-500 text-xs transition-colors p-1 disabled:opacity-50"
                      title="Excluir comentário"
                    >
                      {deletingCommentId === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {c.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form de Envio de Comentário */}
      <div className="space-y-2 pt-3 border-t border-border">
        <textarea
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="Escreva um comentário ou atualização..."
          rows={2}
          className="flex w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all resize-none font-medium"
        />
        <div className="flex justify-end">
          <button
            type="button"
            disabled={postingComment || !newCommentText.trim() || !taskId}
            onClick={handleAddComment}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 h-9 px-4 rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm"
          >
            {postingComment ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Publicar Comentário
          </button>
        </div>
      </div>
    </div>
  );
}
