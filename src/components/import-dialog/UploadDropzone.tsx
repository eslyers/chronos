"use client";

import * as React from "react";
import { Upload, Loader2 } from "lucide-react";

interface UploadDropzoneProps {
  dragOver: boolean;
  loading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDragOverChange: (dragOver: boolean) => void;
  onFile: (file: File | undefined | null) => void;
}

// Fase de upload: arrastar e soltar ou escolher o arquivo
export function UploadDropzone({ dragOver, loading, inputRef, onDragOverChange, onFile }: UploadDropzoneProps) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOverChange(true); }}
      onDragLeave={() => onDragOverChange(false)}
      onDrop={(e) => {
        e.preventDefault();
        onDragOverChange(false);
        onFile(e.dataTransfer.files?.[0]);
      }}
      className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
        dragOver ? "border-blue-500 bg-blue-500/5" : "border-zinc-300 dark:border-zinc-700"
      }`}
    >
      {loading ? (
        <div className="space-y-3">
          <Loader2 className="h-10 w-10 mx-auto animate-spin text-blue-500" />
          <p className="text-sm text-muted-foreground">Processando arquivo...</p>
        </div>
      ) : (
        <>
          <Upload className="h-10 w-10 mx-auto mb-3 text-zinc-400" />
          <p className="text-base font-medium mb-1">Arraste sua planilha aqui</p>
          <p className="text-sm text-muted-foreground mb-4">
            ou{" "}
            <button type="button" onClick={() => inputRef.current?.click()} className="text-blue-500 hover:underline font-medium">
              escolha um arquivo
            </button>
            {" "}(.xlsx, .xls, .ods, .csv)
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.ods,.csv"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="hidden"
            aria-label="Arquivo da planilha"
          />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>📋 Colunas reconhecidas automaticamente:</p>
            <p>
              <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">ETAPAS</code>,{" "}
              <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">RESPONSÁVEL</code>,{" "}
              <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">Data ÍNICIO</code>,{" "}
              <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">Data FIM</code>,{" "}
              <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">STATUS</code>,{" "}
              <code className="px-1 bg-zinc-100 dark:bg-zinc-800 rounded">PRIORIDADE</code>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
