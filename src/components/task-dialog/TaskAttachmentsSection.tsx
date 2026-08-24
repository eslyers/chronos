"use client";

import React, { useState, useRef } from "react";
import {
  Paperclip,
  Trash2,
  Loader2,
  Plus,
  FileSpreadsheet,
  FileText,
  FileImage,
  FileCode,
  Download,
  Upload,
} from "lucide-react";
import type { TaskAttachment } from "@/lib/context/DataContext";

interface TaskAttachmentsSectionProps {
  taskId: string;
  attachments: TaskAttachment[];
  onRefresh: () => Promise<void>;
  addTaskAttachment: (
    taskId: string,
    file: { name: string; size: number; type: string; url: string }
  ) => Promise<TaskAttachment>;
  deleteTaskAttachment: (attachmentId: string) => Promise<void>;
}

export function TaskAttachmentsSection({
  taskId,
  attachments,
  onRefresh,
  addTaskAttachment,
  deleteTaskAttachment,
}: TaskAttachmentsSectionProps) {
  const [attachName, setAttachName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileDataUrl, setSelectedFileDataUrl] = useState<string | null>(null);
  const [addingAttach, setAddingAttach] = useState(false);
  const [deletingAttachId, setDeletingAttachId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("image")) return <FileImage className="h-4 w-4 text-emerald-500" />;
    if (fileType.includes("sheet") || fileType.includes("excel") || fileType.includes("csv")) {
      return <FileSpreadsheet className="h-4 w-4 text-emerald-600" />;
    }
    if (fileType.includes("pdf") || fileType.includes("document") || fileType.includes("text")) {
      return <FileText className="h-4 w-4 text-blue-500" />;
    }
    return <FileCode className="h-4 w-4 text-indigo-500" />;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!attachName.trim()) {
        setAttachName(file.name);
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedFileDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddAttachment = async () => {
    if (!selectedFile || !taskId) return;
    setAddingAttach(true);
    try {
      const fileName = attachName.trim() || selectedFile.name;
      const fileSize = selectedFile.size;
      const fileType = selectedFile.type || "application/octet-stream";
      const fileUrl = selectedFileDataUrl || URL.createObjectURL(selectedFile);

      await addTaskAttachment(taskId, {
        name: fileName,
        url: fileUrl,
        size: fileSize,
        type: fileType,
      });

      setAttachName("");
      setSelectedFile(null);
      setSelectedFileDataUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await onRefresh();
    } catch (err) {
      console.error("[TaskAttachmentsSection] add error:", err);
    } finally {
      setAddingAttach(false);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    setDeletingAttachId(id);
    try {
      await deleteTaskAttachment(id);
      await onRefresh();
    } catch (err) {
      console.error("[TaskAttachmentsSection] delete error:", err);
    } finally {
      setDeletingAttachId(null);
    }
  };

  return (
    <div className="p-6 space-y-5 overflow-y-auto flex-1 flex flex-col justify-between">
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Paperclip className="h-4 w-4 text-blue-500" />
          Anexos e Documentos de Apoio ({attachments.length})
        </h3>

        {attachments.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed rounded-2xl bg-muted/10 space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">
              Nenhum anexo associado a esta tarefa.
            </p>
            <p className="text-xs text-muted-foreground">
              Envie comprovantes, planilhas, relatórios PDF ou imagens de apoio.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/30 transition-colors gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 border border-border/40">
                    {getFileIcon(a.file_type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate text-foreground">{a.file_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {formatFileSize(a.file_size)} • {new Date(a.uploaded_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={a.file_url}
                    target="_blank"
                    rel="noreferrer"
                    download={a.file_name}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                    title="Baixar ou abrir arquivo"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    disabled={deletingAttachId === a.id}
                    onClick={() => handleDeleteAttachment(a.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors disabled:opacity-50"
                    title="Remover anexo"
                  >
                    {deletingAttachId === a.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload de Novo Anexo */}
      <div className="space-y-3 pt-3 border-t border-border">
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="task-file-upload"
          />
          <div className="flex items-center gap-2">
            <label
              htmlFor="task-file-upload"
              className="flex-1 cursor-pointer flex items-center justify-center gap-2 border-2 border-dashed border-border hover:border-blue-500/60 rounded-xl p-3 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/10 hover:bg-muted/20 transition-all text-center"
            >
              <Upload className="h-4 w-4 text-blue-500" />
              {selectedFile ? (
                <span className="truncate text-blue-600 dark:text-blue-400 font-bold">
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </span>
              ) : (
                "Selecionar arquivo do computador (PDF, Excel, Imagem, etc.)"
              )}
            </label>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2">
              <input
                id="task-attachment-label"
                name="task-attachment-label"
                aria-label="Rótulo ou nome de exibição do anexo"
                type="text"
                placeholder="Rótulo / Nome amigável do arquivo"
                value={attachName}
                onChange={(e) => setAttachName(e.target.value)}
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={addingAttach || !selectedFile || !taskId}
            onClick={handleAddAttachment}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5 h-9 px-4 rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors shadow-sm"
          >
            {addingAttach ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Adicionar Anexo
          </button>
        </div>
      </div>
    </div>
  );
}
